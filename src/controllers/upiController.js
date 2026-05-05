const QRCode = require('qrcode')
const prisma = require('../utils/prisma')

const generateUPIQR = async (req, res) => {
  try {
    const { id } = req.params
    const order = await prisma.order.findUnique({
      where: { id: parseInt(id) },
      include: { customer: true, product: true }
    })
    if (!order) return res.status(404).json({ message: 'Order not found' })
    const balanceDue = order.totalPrice - order.paidAmount
    if (balanceDue <= 0) return res.status(400).json({ message: 'Order already fully paid' })
    const upiId = process.env.UPI_ID || 'yourname@upi'
    const businessName = 'Kruthik Farm'
    const note = `Order #${order.id} — ${order.product.name}`
    const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(businessName)}&am=${balanceDue}&cu=INR&tn=${encodeURIComponent(note)}`
    const qrCodeBase64 = await QRCode.toDataURL(upiUrl, {
      width: 300, margin: 2,
      color: { dark: '#166534', light: '#ffffff' }
    })
    res.json({ message: 'UPI QR generated!', qrCode: qrCodeBase64, upiId, amount: balanceDue, orderId: order.id, customerName: order.customer.name, productName: order.product.name, note })
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong' })
  }
}

module.exports = { generateUPIQR }