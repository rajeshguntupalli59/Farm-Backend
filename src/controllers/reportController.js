const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const getReports = async (req, res) => {
  try {
    const { period } = req.query // 'week' | 'month' | 'year'
    const now = new Date()
    let start
    if (period === 'week') start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    else if (period === 'year') start = new Date(now.getFullYear(), 0, 1)
    else start = new Date(now.getFullYear(), now.getMonth(), 1) // default: this month

    const [orders, expenses, products, animals] = await Promise.all([
      prisma.order.findMany({
        where: { createdAt: { gte: start }, status: { not: 'CANCELLED' } },
        include: { product: { select: { name: true, categoryId: true } } },
      }),
      prisma.expense.findMany({ where: { date: { gte: start } } }),
      prisma.product.findMany({ include: { orders: { where: { status: 'COMPLETED' } }, category: { select: { name: true, emoji: true } } } }),
      prisma.animal.findMany({ select: { status: true, type: true } }),
    ])

    // Revenue
    const totalRevenue = orders.reduce((s, o) => s + (o.paidAmount || 0), 0)
    const pendingRevenue = orders.reduce((s, o) => s + Math.max(0, o.totalPrice - o.paidAmount), 0)
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
    const netProfit = totalRevenue - totalExpenses

    // Expenses by category
    const expenseByCategory = expenses.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount
      return acc
    }, {})

    // Orders by status
    const ordersByStatus = orders.reduce((acc, o) => {
      acc[o.status] = (acc[o.status] || 0) + 1
      return acc
    }, {})

    // Top products by revenue
    const productRevenue = {}
    orders.forEach(o => {
      const key = o.product.name
      productRevenue[key] = (productRevenue[key] || 0) + o.paidAmount
    })
    const topProducts = Object.entries(productRevenue)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, revenue]) => ({ name, revenue }))

    // Monthly revenue for chart (last 6 months)
    const monthlyData = []
    for (let i = 5; i >= 0; i--) {
      const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59)
      const mOrders = await prisma.order.findMany({
        where: { createdAt: { gte: mStart, lte: mEnd }, status: { not: 'CANCELLED' } },
      })
      const mExpenses = await prisma.expense.findMany({
        where: { date: { gte: mStart, lte: mEnd } },
      })
      monthlyData.push({
        month: mStart.toLocaleString('en-IN', { month: 'short' }),
        revenue: mOrders.reduce((s, o) => s + o.paidAmount, 0),
        expenses: mExpenses.reduce((s, e) => s + e.amount, 0),
      })
    }

    // Animal summary
    const animalSummary = animals.reduce((acc, a) => {
      if (!acc[a.type]) acc[a.type] = { AVAILABLE: 0, SOLD: 0, DEAD: 0 }
      acc[a.type][a.status]++
      return acc
    }, {})

    // Flatten animalSummary to array for frontend consumption
    const animalSummaryArray = Object.entries(animalSummary).map(([type, counts]) => ({ type, ...counts }))
    // Flatten expenseBreakdown to array
    const expenseBreakdownArray = Object.entries(expenseByCategory).map(([category, amount]) => ({ category, amount }))

    res.json({
      // Flat keys — used by mobile
      totalRevenue,
      totalExpenses,
      netProfit,
      pendingRevenue,
      totalOrders: orders.length,
      // Summary wrapper — used by frontend web
      summary: { revenue: totalRevenue, expenses: totalExpenses, pendingRevenue, ordersCount: orders.length },
      // Chart data — both names for compatibility
      monthly: monthlyData,
      monthlyData,
      // Other data
      topProducts,
      expenseBreakdown: expenseBreakdownArray,
      ordersByStatus,
      animalSummary: animalSummaryArray,
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// Public order — no auth needed, customer places order from catalog
const publicOrder = async (req, res) => {
  try {
    const { customerName, customerPhone, productId, quantity, notes } = req.body
    if (!customerName || !customerPhone || !productId || !quantity) {
      return res.status(400).json({ message: 'Name, phone, product and quantity are required' })
    }
    const product = await prisma.product.findUnique({ where: { id: parseInt(productId) } })
    if (!product || !product.isAvailable) return res.status(404).json({ message: 'Product not available' })

    let customer = await prisma.customer.findFirst({ where: { phone: customerPhone } })
    if (!customer) {
      customer = await prisma.customer.create({ data: { name: customerName, phone: customerPhone } })
    }

    const order = await prisma.order.create({
      data: {
        customerId: customer.id,
        productId: parseInt(productId),
        quantity: parseFloat(quantity),
        totalPrice: product.price * parseFloat(quantity),
        paidAmount: 0,
        status: 'PENDING',
        note: notes || `Online order from catalog`,
      },
      include: {
        product: { select: { name: true, unit: true, price: true } },
        customer: { select: { name: true, phone: true } },
      },
    })
    res.json({ message: 'Order placed! We will contact you shortly.', order })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

module.exports = { getReports, publicOrder }
