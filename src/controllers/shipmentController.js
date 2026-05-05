const prisma = require('../utils/prisma')
const crypto = require('crypto')
const { sendPush } = require('../utils/push')

const SHIPMENT_PUSH = {
  DISPATCHED:       (code) => ({ title: '🚚 Order Dispatched', body: `Your order (${code}) is on its way!` }),
  OUT_FOR_DELIVERY: (code) => ({ title: '🛵 Out for Delivery', body: `Your order (${code}) is nearby — arriving soon!` }),
  DELIVERED:        (code) => ({ title: '✅ Order Delivered', body: `Your order (${code}) has been delivered. Enjoy!` }),
  FAILED:           (code) => ({ title: '❌ Delivery Failed', body: `We couldn't deliver order (${code}). We'll reach out shortly.` }),
}

const genTrackingCode = () => 'PB' + crypto.randomBytes(3).toString('hex').toUpperCase()

// GET all shipments (with order + partner info)
const getShipments = async (req, res) => {
  try {
    const { status } = req.query
    const shipments = await prisma.shipment.findMany({
      where: status ? { status } : {},
      include: {
        order: { include: { customer: { select: { name: true, phone: true } }, product: { select: { name: true } } } },
        deliveryPartner: { select: { id: true, name: true, phone: true, vehicle: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    res.json({ shipments })
  } catch (err) { res.status(500).json({ message: err.message }) }
}

// GET single shipment by trackingCode (public — for customer tracking)
const trackShipment = async (req, res) => {
  try {
    const shipment = await prisma.shipment.findUnique({
      where: { trackingCode: req.params.code },
      include: {
        order: { include: { customer: { select: { name: true } }, product: { select: { name: true, unit: true } } } },
        deliveryPartner: { select: { name: true, phone: true, vehicle: true } },
      },
    })
    if (!shipment) return res.status(404).json({ message: 'Tracking code not found' })
    res.json({ shipment })
  } catch (err) { res.status(500).json({ message: err.message }) }
}

// POST create shipment for a confirmed order
const createShipment = async (req, res) => {
  try {
    const { orderId, deliveryAddress, deliveryPincode, paymentType, codAmount, estimatedDelivery, deliveryPartnerId } = req.body
    if (!orderId || !deliveryAddress) return res.status(400).json({ message: 'Order ID and delivery address required' })

    const order = await prisma.order.findUnique({ where: { id: parseInt(orderId) } })
    if (!order) return res.status(404).json({ message: 'Order not found' })

    const existing = await prisma.shipment.findUnique({ where: { orderId: parseInt(orderId) } })
    if (existing) return res.status(400).json({ message: 'Shipment already exists for this order' })

    const shipment = await prisma.shipment.create({
      data: {
        orderId: parseInt(orderId),
        deliveryAddress,
        deliveryPincode,
        paymentType: paymentType || 'COD',
        codAmount: parseFloat(codAmount || order.totalPrice - order.paidAmount),
        estimatedDelivery: estimatedDelivery ? new Date(estimatedDelivery) : null,
        deliveryPartnerId: deliveryPartnerId ? parseInt(deliveryPartnerId) : null,
        trackingCode: genTrackingCode(),
        status: 'PREPARING',
      },
      include: {
        order: { include: { customer: true, product: { select: { name: true } } } },
        deliveryPartner: true,
      },
    })

    // Update order to CONFIRMED if still PENDING
    if (order.status === 'PENDING') {
      await prisma.order.update({ where: { id: parseInt(orderId) }, data: { status: 'CONFIRMED' } })
    }

    res.json({ message: 'Shipment created', shipment })
  } catch (err) { res.status(500).json({ message: err.message }) }
}

// PUT update shipment status / assign partner
const updateShipment = async (req, res) => {
  try {
    const { status, deliveryPartnerId, deliveryNotes, estimatedDelivery, codCollected } = req.body
    const id = parseInt(req.params.id)

    const updateData = {}
    if (status) updateData.status = status
    if (deliveryPartnerId !== undefined) updateData.deliveryPartnerId = deliveryPartnerId ? parseInt(deliveryPartnerId) : null
    if (deliveryNotes !== undefined) updateData.deliveryNotes = deliveryNotes
    if (estimatedDelivery) updateData.estimatedDelivery = new Date(estimatedDelivery)
    if (codCollected !== undefined) updateData.codCollected = codCollected

    if (status === 'DISPATCHED') updateData.pickedAt = new Date()
    if (status === 'DELIVERED') {
      updateData.deliveredAt = new Date()
      if (codCollected) updateData.codCollected = true
    }

    const shipment = await prisma.shipment.update({
      where: { id },
      data: updateData,
      include: {
        order: { include: { customer: { select: { name: true, phone: true, pushToken: true } }, product: { select: { name: true } } } },
        deliveryPartner: { select: { name: true, phone: true } },
      },
    })

    // Auto-complete order on delivery
    if (status === 'DELIVERED') {
      await prisma.order.update({ where: { id: shipment.orderId }, data: { status: 'COMPLETED' } })
    }

    // Push notification to customer
    if (status && SHIPMENT_PUSH[status]) {
      const pushToken = shipment.order?.customer?.pushToken
      if (pushToken) {
        const { title, body } = SHIPMENT_PUSH[status](shipment.trackingCode)
        sendPush(pushToken, title, body)
      }
    }

    res.json({ message: 'Shipment updated', shipment })
  } catch (err) { res.status(500).json({ message: err.message }) }
}

// GET delivery stats for dashboard
const getDeliveryStats = async (req, res) => {
  try {
    const [total, byStatus, codPending] = await Promise.all([
      prisma.shipment.count(),
      prisma.shipment.groupBy({ by: ['status'], _count: true }),
      prisma.shipment.count({ where: { paymentType: 'COD', codCollected: false, status: 'DELIVERED' } }),
    ])
    res.json({ total, byStatus, codPending })
  } catch (err) { res.status(500).json({ message: err.message }) }
}

module.exports = { getShipments, trackShipment, createShipment, updateShipment, getDeliveryStats }
