const cron = require('node-cron')
const prisma = require('./prisma')
const { sendPush } = require('./push')

async function sendDailySummary() {
  try {
    const owner = await prisma.user.findFirst({ where: { role: 'OWNER', pushToken: { not: null } } })
    if (!owner?.pushToken) return

    const [pendingCount, confirmedCount, outstandingAgg] = await Promise.all([
      prisma.order.count({ where: { status: 'PENDING' } }),
      prisma.order.count({ where: { status: 'CONFIRMED' } }),
      prisma.order.aggregate({
        where: { status: { in: ['PENDING', 'CONFIRMED'] } },
        _sum: { totalPrice: true, paidAmount: true },
      }),
    ])

    const total = outstandingAgg._sum.totalPrice || 0
    const paid = outstandingAgg._sum.paidAmount || 0
    const outstanding = Math.max(0, total - paid)

    const parts = []
    if (pendingCount > 0) parts.push(`${pendingCount} pending`)
    if (confirmedCount > 0) parts.push(`${confirmedCount} confirmed`)
    const orderLine = parts.length ? parts.join(', ') + ' order' + (pendingCount + confirmedCount > 1 ? 's' : '') : 'No open orders'

    const body = outstanding > 0
      ? `${orderLine} · ₹${outstanding.toLocaleString('en-IN')} outstanding`
      : `${orderLine} · All payments collected`

    await sendPush(owner.pushToken, '🌅 Good morning! Farm summary', body)
  } catch (err) {
    console.error('Daily summary cron error:', err.message)
  }
}

// Runs every day at 9:00 AM (server local time)
function startDailySummaryCron() {
  cron.schedule('0 9 * * *', sendDailySummary)
  console.log('✅ Daily summary cron scheduled at 9:00 AM')
}

module.exports = { startDailySummaryCron, sendDailySummary }
