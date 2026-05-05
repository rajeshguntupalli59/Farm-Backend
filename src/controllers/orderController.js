const prisma = require('../utils/prisma')
const { buildWhatsAppLink, orderStatusMessage } = require('../utils/notify')
const { sendPush } = require('../utils/push')

const PUSH_MESSAGES = {
  CONFIRMED:  (name) => ({ title: '✅ Order Confirmed!', body: `Your order for ${name} has been confirmed.` }),
  COMPLETED:  (name) => ({ title: '🎉 Order Completed!', body: `Your order for ${name} is complete. Thank you!` }),
  CANCELLED:  (name) => ({ title: '❌ Order Cancelled',  body: `Your order for ${name} has been cancelled.` }),
}

const createOrder = async (req, res) => {
  try {
    const { customerId, productId, quantity, totalPrice, paidAmount, note } = req.body
    if (!customerId || !productId || !totalPrice) return res.status(400).json({ message: 'Customer, product and price required' })
    const product = await prisma.product.findUnique({ where: { id: parseInt(productId) } })
    if (!product) return res.status(404).json({ message: 'Product not found' })
    if (!product.isAvailable) return res.status(400).json({ message: 'Product not available' })
    const order = await prisma.order.create({
      data: {
        customerId: parseInt(customerId),
        productId: parseInt(productId),
        quantity: parseFloat(quantity || 1),
        totalPrice: parseFloat(totalPrice),
        paidAmount: parseFloat(paidAmount || 0),
        note,
        status: 'PENDING'
      },
      include: { customer: true, product: { include: { category: true } } }
    })
    await prisma.productLog.create({
      data: { productId: parseInt(productId), action: 'RESERVED', quantity: parseFloat(quantity || 1), note: `Reserved for ${order.customer.name}` }
    })
    res.status(201).json({ message: 'Order created!', order })
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong' })
  }
}

const getAllOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query
    const skip = (parseInt(page) - 1) * parseInt(limit)
    const where = {}
    if (status && status !== 'ALL') where.status = status

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: { customer: true, product: { include: { category: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.order.count({ where }),
    ])
    res.json({
      message: 'Orders fetched',
      orders,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) }
    })
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong' })
  }
}

const getOrderById = async (req, res) => {
  try {
    const { id } = req.params
    const order = await prisma.order.findUnique({
      where: { id: parseInt(id) },
      include: { customer: true, product: { include: { category: true } } }
    })
    if (!order) return res.status(404).json({ message: 'Order not found' })
    res.json({ order })
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong' })
  }
}

const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params
    const { status, paidAmount } = req.body

    // Fetch current order before update to know previous status
    const current = await prisma.order.findUnique({ where: { id: parseInt(id) } })
    if (!current) return res.status(404).json({ message: 'Order not found' })

    const order = await prisma.order.update({
      where: { id: parseInt(id) },
      data: {
        ...(status && { status }),
        ...(paidAmount !== undefined && { paidAmount: parseFloat(paidAmount) })
      },
      include: { customer: true, product: { include: { category: true } } }
    })

    // Stock deduction: PENDING/null → CONFIRMED deducts stock
    if (status === 'CONFIRMED' && current.status !== 'CONFIRMED') {
      const updatedProduct = await prisma.product.update({
        where: { id: order.productId },
        data: { stock: { decrement: order.quantity } }
      })
      await prisma.productLog.create({
        data: { productId: order.productId, action: 'SOLD', quantity: order.quantity, note: `Confirmed order #${order.id} for ${order.customer.name}` }
      })
      // Low stock push to owner
      if (updatedProduct.minStock > 0 && updatedProduct.stock <= updatedProduct.minStock) {
        const owner = await prisma.user.findFirst({ where: { role: 'OWNER', pushToken: { not: null } } })
        if (owner?.pushToken) {
          const label = updatedProduct.stock <= 0 ? 'OUT OF STOCK' : 'Low stock'
          sendPush(owner.pushToken, `⚠️ ${label}`,
            `${updatedProduct.name}: ${updatedProduct.stock} ${updatedProduct.stock <= 0 ? 'remaining (ZERO)' : 'remaining'}`)
        }
      }
    }

    // Stock restore: CONFIRMED → CANCELLED restores stock
    if (status === 'CANCELLED' && current.status === 'CONFIRMED') {
      await prisma.product.update({
        where: { id: order.productId },
        data: { stock: { increment: order.quantity } }
      })
      await prisma.productLog.create({
        data: { productId: order.productId, action: 'RESTOCKED', quantity: order.quantity, note: `Order #${order.id} cancelled — stock restored` }
      })
    } else if (status === 'CANCELLED') {
      await prisma.productLog.create({
        data: { productId: order.productId, action: 'CANCELLED', quantity: order.quantity, note: `Order #${order.id} cancelled` }
      })
    }

    // Send push notification to customer if they have a token
    const needsStatusPush = status && PUSH_MESSAGES[status]
    const newPaid = paidAmount !== undefined ? parseFloat(paidAmount) : null
    const needsPaymentPush = newPaid !== null && newPaid > (current.paidAmount || 0)

    if (needsStatusPush || needsPaymentPush) {
      const fullCustomer = await prisma.customer.findUnique({ where: { id: order.customerId } })
      if (fullCustomer?.pushToken) {
        if (needsStatusPush) {
          const { title, body } = PUSH_MESSAGES[status](order.product.name)
          sendPush(fullCustomer.pushToken, title, body)
        }
        if (needsPaymentPush) {
          const remaining = Math.max(0, order.totalPrice - newPaid)
          const body = remaining <= 0
            ? `Full payment of ₹${newPaid} received for ${order.product.name}. Thank you!`
            : `₹${newPaid} received for ${order.product.name}. Remaining balance: ₹${remaining}.`
          sendPush(fullCustomer.pushToken, '💰 Payment Received', body)
        }
      }
    }

    if (['CONFIRMED', 'CANCELLED', 'COMPLETED'].includes(status)) {
      const msg = orderStatusMessage(order, status)
      const waLink = buildWhatsAppLink(order.customer.phone, msg)
      return res.json({ message: 'Order updated!', order, whatsappLink: waLink })
    }

    res.json({ message: 'Order updated!', order })
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong' })
  }
}

module.exports = { createOrder, getAllOrders, getOrderById, updateOrderStatus }