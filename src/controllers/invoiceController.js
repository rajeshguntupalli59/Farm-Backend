const PDFDocument = require('pdfkit')
const prisma = require('../utils/prisma')

const generateInvoice = async (req, res) => {
  try {
    const { id } = req.params
    const order = await prisma.order.findUnique({
      where: { id: parseInt(id) },
      include: { customer: true, product: { include: { category: true } } }
    })
    if (!order) return res.status(404).json({ message: 'Order not found' })
    const doc = new PDFDocument({ margin: 50 })
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${order.id}.pdf`)
    doc.pipe(res)
    doc.fontSize(28).fillColor('#166534').text('Kruthik Farm', 50, 50)
    doc.fontSize(12).fillColor('#4b5563').text('Fresh Products Direct from Farm', 50, 85)
    doc.fontSize(10).fillColor('#6b7280').text('India', 50, 100)
    doc.moveTo(50, 120).lineTo(550, 120).strokeColor('#166534').lineWidth(2).stroke()
    doc.fontSize(20).fillColor('#111827').text('INVOICE', 50, 135)
    doc.fontSize(10).fillColor('#6b7280')
    doc.text(`Invoice #: INV-${String(order.id).padStart(4, '0')}`, 50, 160)
    doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString('en-IN')}`, 50, 175)
    doc.text(`Status: ${order.status}`, 50, 190)
    doc.fontSize(12).fillColor('#166534').text('Customer Details', 50, 220)
    doc.fontSize(10).fillColor('#374151')
    doc.text(`Name: ${order.customer.name}`, 50, 240)
    doc.text(`Phone: ${order.customer.phone}`, 50, 255)
    if (order.customer.address) doc.text(`Address: ${order.customer.address}`, 50, 270)
    doc.fontSize(12).fillColor('#166534').text('Product Details', 300, 220)
    doc.fontSize(10).fillColor('#374151')
    doc.text(`Name: ${order.product.name}`, 300, 240)
    doc.text(`Category: ${order.product.category?.name}`, 300, 255)
    doc.text(`Quantity: ${order.quantity} ${order.product.unit}`, 300, 270)
    doc.text(`Price per ${order.product.unit}: Rs.${order.product.price}`, 300, 285)
    doc.moveTo(50, 310).lineTo(550, 310).strokeColor('#d1d5db').lineWidth(1).stroke()
    doc.fontSize(12).fillColor('#166534').text('Payment Details', 50, 325)
    doc.fontSize(10).fillColor('#111827')
    doc.rect(50, 345, 500, 25).fillColor('#f0fdf4').fill()
    doc.fillColor('#166534').text('Description', 60, 352)
    doc.text('Amount', 450, 352)
    doc.fillColor('#374151')
    doc.rect(50, 370, 500, 25).fillColor('#ffffff').fill()
    doc.fillColor('#374151').text('Total Price', 60, 377)
    doc.text(`Rs. ${order.totalPrice?.toLocaleString('en-IN')}`, 450, 377)
    doc.rect(50, 395, 500, 25).fillColor('#f9fafb').fill()
    doc.fillColor('#374151').text('Amount Paid', 60, 402)
    doc.text(`Rs. ${order.paidAmount?.toLocaleString('en-IN')}`, 450, 402)
    const balance = order.totalPrice - order.paidAmount
    doc.rect(50, 420, 500, 25).fillColor('#ffffff').fill()
    doc.fillColor(balance > 0 ? '#dc2626' : '#166534')
    doc.text('Balance Due', 60, 427)
    doc.text(`Rs. ${balance?.toLocaleString('en-IN')}`, 450, 427)
    doc.rect(50, 455, 500, 35).fillColor('#166534').fill()
    doc.fontSize(14).fillColor('#ffffff')
    doc.text('Total Amount', 60, 465)
    doc.text(`Rs. ${order.totalPrice?.toLocaleString('en-IN')}`, 440, 465)
    if (order.note) doc.fontSize(10).fillColor('#6b7280').text(`Note: ${order.note}`, 50, 505)
    doc.moveTo(50, 560).lineTo(550, 560).strokeColor('#d1d5db').lineWidth(1).stroke()
    doc.fontSize(10).fillColor('#6b7280')
    doc.text('Thank you for your business!', 50, 575, { align: 'center' })
    doc.text('Kruthik Farm · India', 50, 590, { align: 'center' })
    doc.end()
  } catch (error) {
    res.status(500).json({ message: 'Failed to generate invoice' })
  }
}

module.exports = { generateInvoice }