const buildWhatsAppLink = (phone, message) => {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  const formatted = digits.startsWith('91') ? digits : `91${digits.replace(/^0/, '')}`
  return `https://wa.me/${formatted}?text=${encodeURIComponent(message)}`
}

const orderStatusMessage = (order, status) => {
  const name = order.customer?.name || 'Customer'
  const product = order.product?.name || 'your order'
  const amount = order.totalPrice
  const paid = order.paidAmount || 0
  const due = amount - paid

  if (status === 'CONFIRMED')
    return `Hi ${name}! Your order for ${product} (₹${amount}) has been CONFIRMED. Amount paid: ₹${paid}, Balance due: ₹${due}. Thank you! - Kruthik Farm`
  if (status === 'COMPLETED')
    return `Hi ${name}! Your order for ${product} has been COMPLETED. Thank you for shopping with Kruthik Farm!`
  if (status === 'CANCELLED')
    return `Hi ${name}, your order for ${product} has been CANCELLED. Please contact us if you have any questions. - Kruthik Farm`
  return `Hi ${name}, your order #${order.id} status has been updated to: ${status}. - Kruthik Farm`
}

const shipmentStatusMessage = (shipment, status) => {
  const name = shipment.order?.customer?.name || 'Customer'
  const product = shipment.order?.product?.name || 'your order'
  const code = shipment.trackingCode

  if (status === 'DISPATCHED')
    return `Hi ${name}! Your ${product} has been dispatched. Track your order: tracking code ${code}. - Kruthik Farm`
  if (status === 'OUT_FOR_DELIVERY')
    return `Hi ${name}! Your ${product} is out for delivery today. Please be available. Tracking: ${code}. - Kruthik Farm`
  if (status === 'DELIVERED')
    return `Hi ${name}! Your ${product} has been delivered successfully. Thank you for shopping with Kruthik Farm!`
  if (status === 'FAILED')
    return `Hi ${name}, delivery attempt for ${product} failed. We will reschedule. Tracking: ${code}. - Kruthik Farm`
  return `Hi ${name}, your shipment (${code}) status: ${status}. - Kruthik Farm`
}

module.exports = { buildWhatsAppLink, orderStatusMessage, shipmentStatusMessage }
