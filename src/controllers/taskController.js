const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const getTasks = async (req, res) => {
  try {
    const { status, assignedTo } = req.query
    const where = {}
    if (status) where.status = status
    // Employees only see their own tasks
    if (req.user.role === 'EMPLOYEE') {
      where.assignedToId = req.user.id
    } else if (assignedTo) {
      where.assignedToId = parseInt(assignedTo)
    }
    const tasks = await prisma.task.findMany({
      where,
      include: {
        assignedTo: { select: { id: true, name: true, role: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
    })
    res.json({ tasks })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

const createTask = async (req, res) => {
  try {
    const { title, description, assignedToId, dueDate, priority } = req.body
    const task = await prisma.task.create({
      data: {
        title,
        description,
        assignedToId: parseInt(assignedToId),
        createdById: req.user.id,
        dueDate: dueDate ? new Date(dueDate) : null,
        priority: priority || 'NORMAL',
        status: 'PENDING',
      },
      include: {
        assignedTo: { select: { name: true } },
      },
    })
    res.json({ message: 'Task created', task })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

const updateTask = async (req, res) => {
  try {
    const { id } = req.params
    const { status, title, description, dueDate, priority, assignedToId } = req.body
    // Employees can only update status of their own tasks
    if (req.user.role === 'EMPLOYEE') {
      const task = await prisma.task.findUnique({ where: { id: parseInt(id) } })
      if (task.assignedToId !== req.user.id) return res.status(403).json({ message: 'Forbidden' })
    }
    const task = await prisma.task.update({
      where: { id: parseInt(id) },
      data: {
        status,
        title,
        description,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        priority,
        assignedToId: assignedToId ? parseInt(assignedToId) : undefined,
      },
    })
    res.json({ message: 'Updated', task })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

const deleteTask = async (req, res) => {
  try {
    await prisma.task.delete({ where: { id: parseInt(req.params.id) } })
    res.json({ message: 'Deleted' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

module.exports = { getTasks, createTask, updateTask, deleteTask }
