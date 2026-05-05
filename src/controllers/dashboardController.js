const prisma = require('../utils/prisma')

const getDashboard = async (req, res) => {
  try {
    const [
      totalProducts,
      availableProducts,
      totalOrders,
      completedOrders,
      totalEmployees,
      totalCustomers,
      categories,
      recentOrders,
      allProducts,
      completedOrdersData
    ] = await Promise.all([
      prisma.product.count(),
      prisma.product.count({ where: { isAvailable: true } }),
      prisma.order.count(),
      prisma.order.count({ where: { status: 'COMPLETED' } }),
      prisma.user.count(),
      prisma.customer.count(),
      prisma.category.findMany({
        where: { isActive: true },
        include: { _count: { select: { products: true } } }
      }),
      prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { name: true } },
          product: { select: { name: true, category: { select: { emoji: true } } } }
        }
      }),
      prisma.product.findMany({
        select: { price: true, stock: true, minStock: true, name: true, category: { select: { emoji: true } } }
      }),
      prisma.order.findMany({
        where: { status: 'COMPLETED' },
        select: { totalPrice: true, paidAmount: true }
      })
    ])

    const totalInventoryValue = allProducts.reduce((sum, p) => sum + (p.price * p.stock), 0)
    const lowStockProducts = allProducts.filter(p => p.minStock > 0 && p.stock <= p.minStock)
    const totalRevenue = completedOrdersData.reduce((sum, o) => sum + (o.paidAmount || 0), 0)
    const pendingPayments = completedOrdersData.reduce((sum, o) => sum + ((o.totalPrice || 0) - (o.paidAmount || 0)), 0)

    res.json({
      message: 'Dashboard data fetched successfully',
      summary: {
        totalProducts,
        availableProducts,
        totalOrders,
        completedOrders,
        totalInventoryValue,
        totalRevenue,
        pendingPayments,
        totalEmployees,
        totalCustomers,
        categories
      },
      recentOrders,
      lowStockProducts
    })
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong' })
  }
}

module.exports = { getDashboard }
