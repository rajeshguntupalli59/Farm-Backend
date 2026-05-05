const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const getExpenses = async (req, res) => {
  try {
    const { category, from, to, period } = req.query
    const where = {}
    if (category) where.category = category
    if (period) {
      const now = new Date()
      let start
      if (period === 'week') start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      else if (period === 'year') start = new Date(now.getFullYear(), 0, 1)
      else start = new Date(now.getFullYear(), now.getMonth(), 1)
      where.date = { gte: start }
    } else if (from || to) {
      where.date = {}
      if (from) where.date.gte = new Date(from)
      if (to) where.date.lte = new Date(to)
    }
    const expenses = await prisma.expense.findMany({
      where,
      include: { user: { select: { name: true } } },
      orderBy: { date: 'desc' },
    })
    const total = expenses.reduce((sum, e) => sum + e.amount, 0)
    res.json({ expenses, total })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

const addExpense = async (req, res) => {
  try {
    const { category, description, amount, paidTo, date } = req.body
    const expense = await prisma.expense.create({
      data: {
        category,
        description,
        amount: parseFloat(amount),
        paidTo,
        date: date ? new Date(date) : new Date(),
        userId: req.user.id,
      },
    })
    res.json({ message: 'Expense recorded', expense })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

const updateExpense = async (req, res) => {
  try {
    const { category, description, amount, paidTo, date } = req.body
    const expense = await prisma.expense.update({
      where: { id: parseInt(req.params.id) },
      data: { category, description, amount: parseFloat(amount), paidTo, date: date ? new Date(date) : undefined },
    })
    res.json({ message: 'Updated', expense })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

const deleteExpense = async (req, res) => {
  try {
    await prisma.expense.delete({ where: { id: parseInt(req.params.id) } })
    res.json({ message: 'Deleted' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

module.exports = { getExpenses, addExpense, updateExpense, deleteExpense }
