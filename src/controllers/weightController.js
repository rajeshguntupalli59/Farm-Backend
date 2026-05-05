const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const getWeightLogs = async (req, res) => {
  try {
    const { animalId } = req.params
    const logs = await prisma.weightLog.findMany({
      where: { animalId: parseInt(animalId) },
      include: { user: { select: { name: true } } },
      orderBy: { date: 'asc' },
    })
    res.json({ logs })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

const addWeightLog = async (req, res) => {
  try {
    const { animalId, weight, date, notes } = req.body
    const log = await prisma.weightLog.create({
      data: {
        animalId: parseInt(animalId),
        weight: parseFloat(weight),
        date: date ? new Date(date) : new Date(),
        notes,
        userId: req.user.id,
      },
    })
    // Update the animal's current weight
    await prisma.animal.update({ where: { id: parseInt(animalId) }, data: { weight: parseFloat(weight) } })
    res.json({ message: 'Weight logged', log })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

const deleteWeightLog = async (req, res) => {
  try {
    await prisma.weightLog.delete({ where: { id: parseInt(req.params.id) } })
    res.json({ message: 'Deleted' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

module.exports = { getWeightLogs, addWeightLog, deleteWeightLog }
