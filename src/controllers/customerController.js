const prisma = require('../utils/prisma')
const jwt = require('jsonwebtoken')
const { generate, sendViaSms } = require('../utils/otp')

const INDIAN_PHONE = /^[6-9]\d{9}$/
const OTP_TTL_MS = 5 * 60 * 1000 // 5 minutes
const MAX_ATTEMPTS = 3

const signToken = (customer) =>
  jwt.sign({ customerId: customer.id, phone: customer.phone }, process.env.JWT_SECRET, { expiresIn: '30d' })

// ─── OTP FLOW ────────────────────────────────────────────────────────────────

const sendOtpRequest = async (req, res) => {
  try {
    const { phone } = req.body
    if (!phone || !INDIAN_PHONE.test(phone.trim())) {
      return res.status(400).json({ message: 'Enter a valid 10-digit Indian mobile number' })
    }

    // Delete any existing OTPs for this phone
    await prisma.otpCode.deleteMany({ where: { phone: phone.trim() } })

    const code = generate()
    const expiresAt = new Date(Date.now() + OTP_TTL_MS)
    await prisma.otpCode.create({ data: { phone: phone.trim(), code, expiresAt } })

    const sent = await sendViaSms(phone.trim(), code)
    if (!sent) return res.status(500).json({ message: 'Failed to send OTP. Please try again.' })

    res.json({ message: 'OTP sent to your mobile number' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Something went wrong' })
  }
}

const customerLogin = async (req, res) => {
  try {
    const { phone } = req.body
    if (!phone) return res.status(400).json({ message: 'Phone number is required' })

    const customer = await prisma.customer.findUnique({
      where: { phone: phone.trim() },
      include: {
        orders: {
          include: { product: { include: { category: true } } },
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!customer) {
      return res.status(404).json({ message: 'No account found. Please register first.' })
    }

    res.json({ message: 'Login successful!', token: signToken(customer), customer })
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong' })
  }
}

const verifyOtpAndRegister = async (req, res) => {
  try {
    const { phone, code, name, address } = req.body

    if (!phone || !code) return res.status(400).json({ message: 'Phone and OTP required' })
    if (!name?.trim()) return res.status(400).json({ message: 'Name is required' })

    const otp = await prisma.otpCode.findFirst({
      where: { phone: phone.trim() },
      orderBy: { createdAt: 'desc' }
    })

    // Dev bypass — accept 123456 as universal OTP when SMS isn't configured
    const devBypass = process.env.NODE_ENV !== 'production' && code.trim() === '123456'

    if (!devBypass) {
      if (!otp) {
        return res.status(400).json({ message: 'No OTP found. Please request a new one.' })
      }
      if (new Date() > otp.expiresAt) {
        await prisma.otpCode.delete({ where: { id: otp.id } })
        return res.status(400).json({ message: 'OTP expired. Please request a new one.' })
      }
      if (otp.attempts >= MAX_ATTEMPTS) {
        await prisma.otpCode.delete({ where: { id: otp.id } })
        return res.status(400).json({ message: 'Too many wrong attempts. Please request a new OTP.' })
      }
      if (otp.code !== code.trim()) {
        await prisma.otpCode.update({
          where: { id: otp.id },
          data: { attempts: { increment: 1 } }
        })
        const left = MAX_ATTEMPTS - otp.attempts - 1
        return res.status(400).json({ message: `Wrong OTP. ${left} attempt(s) remaining.` })
      }
      await prisma.otpCode.delete({ where: { id: otp.id } })
    }

    const existing = await prisma.customer.findUnique({ where: { phone: phone.trim() } })
    if (existing) {
      return res.status(400).json({ message: 'This phone is already registered. Please login instead.' })
    }

    const customer = await prisma.customer.create({
      data: { name: name.trim(), phone: phone.trim(), address: address?.trim() || null }
    })
    res.status(201).json({
      message: 'Account created!',
      token: signToken(customer),
      customer: { ...customer, orders: [] }
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Something went wrong' })
  }
}

// ─── CUSTOMER SELF-SERVICE ───────────────────────────────────────────────────

const placeCustomerOrder = async (req, res) => {
  try {
    const { productId, quantity, note } = req.body
    const customerId = req.customer.customerId

    if (!productId || !quantity) return res.status(400).json({ message: 'Product and quantity required' })

    const product = await prisma.product.findUnique({
      where: { id: parseInt(productId) },
      include: { category: true }
    })

    if (!product || !product.isAvailable) {
      return res.status(404).json({ message: 'Product not available' })
    }

    const order = await prisma.order.create({
      data: {
        customerId,
        productId: product.id,
        quantity: parseFloat(quantity),
        totalPrice: product.price * parseFloat(quantity),
        paidAmount: 0,
        status: 'PENDING',
        note: note || null
      },
      include: { product: { include: { category: true } } }
    })

    // Notify owner
    const owner = await prisma.user.findFirst({ where: { role: 'OWNER', pushToken: { not: null } } })
    if (owner?.pushToken) {
      const customerRecord = await prisma.customer.findUnique({ where: { id: customerId } })
      const { sendPush } = require('../utils/push')
      sendPush(owner.pushToken, '🛒 New Order!',
        `${order.product.name} × ${order.quantity} from ${customerRecord?.name || 'Customer'}`)
    }

    res.status(201).json({ message: 'Order placed successfully!', order })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Something went wrong' })
  }
}

const getMyOrders = async (req, res) => {
  try {
    const customerId = req.customer.customerId
    const orders = await prisma.order.findMany({
      where: { customerId },
      include: {
        product: { include: { category: true } },
        shipment: true
      },
      orderBy: { createdAt: 'desc' }
    })
    res.json({ orders })
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong' })
  }
}

const cancelMyOrder = async (req, res) => {
  try {
    const customerId = req.customer.customerId
    const orderId = parseInt(req.params.id)

    const order = await prisma.order.findUnique({ where: { id: orderId } })
    if (!order) return res.status(404).json({ message: 'Order not found' })
    if (order.customerId !== customerId) return res.status(403).json({ message: 'Not your order' })
    if (!['PENDING', 'CONFIRMED'].includes(order.status)) {
      return res.status(400).json({ message: 'Only pending or confirmed orders can be cancelled' })
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: { status: 'CANCELLED' },
      include: { product: { include: { category: true } } }
    })
    res.json({ message: 'Order cancelled', order: updated })
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong' })
  }
}

const savePushToken = async (req, res) => {
  try {
    const customerId = req.customer.customerId
    const { pushToken } = req.body
    if (!pushToken) return res.status(400).json({ message: 'pushToken required' })
    await prisma.customer.update({ where: { id: customerId }, data: { pushToken } })
    res.json({ message: 'Push token saved' })
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong' })
  }
}

// ─── STAFF ───────────────────────────────────────────────────────────────────

const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params
    const { name, address } = req.body
    const customer = await prisma.customer.update({
      where: { id: parseInt(id) },
      data: {
        ...(name?.trim() && { name: name.trim() }),
        address: address !== undefined ? (address?.trim() || null) : undefined,
      }
    })
    res.json({ message: 'Customer updated!', customer })
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong' })
  }
}

const addCustomer = async (req, res) => {
  try {
    const { name, phone, address } = req.body
    if (!name || !phone) return res.status(400).json({ message: 'Name and phone required' })
    const existing = await prisma.customer.findUnique({ where: { phone } })
    if (existing) return res.status(400).json({ message: 'Phone already registered' })
    const customer = await prisma.customer.create({ data: { name, phone, address } })
    res.status(201).json({ message: 'Customer added!', customer })
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong' })
  }
}

const getAllCustomers = async (req, res) => {
  try {
    const customers = await prisma.customer.findMany({
      include: { orders: true },
      orderBy: { createdAt: 'desc' }
    })
    res.json({ message: 'Customers fetched', count: customers.length, customers })
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong' })
  }
}

const getCustomerById = async (req, res) => {
  try {
    const { id } = req.params
    const customer = await prisma.customer.findUnique({
      where: { id: parseInt(id) },
      include: { orders: { include: { product: { include: { category: true } } } } }
    })
    if (!customer) return res.status(404).json({ message: 'Customer not found' })
    res.json({ customer })
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong' })
  }
}

module.exports = {
  customerLogin, sendOtpRequest, verifyOtpAndRegister,
  placeCustomerOrder, getMyOrders, cancelMyOrder, savePushToken,
  addCustomer, updateCustomer, getAllCustomers, getCustomerById
}
