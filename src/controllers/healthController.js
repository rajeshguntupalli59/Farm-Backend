const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const getHealthRecords = async (req, res) => {
  try {
    const { animalId } = req.params
    const records = await prisma.healthRecord.findMany({
      where: { animalId: parseInt(animalId) },
      include: { user: { select: { name: true } } },
      orderBy: { date: 'desc' },
    })
    res.json({ records })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

const getAllHealthRecords = async (req, res) => {
  try {
    const { type, upcoming } = req.query
    const where = {}
    if (type) where.type = type
    if (upcoming === 'true') {
      where.nextDueDate = { lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }
    }
    const records = await prisma.healthRecord.findMany({
      where,
      include: {
        animal: { select: { id: true, name: true, type: true } },
        user: { select: { name: true } },
      },
      orderBy: { date: 'desc' },
    })
    res.json({ records })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

const addHealthRecord = async (req, res) => {
  try {
    const { animalId, type, medicine, dose, notes, date, nextDueDate } = req.body
    const record = await prisma.healthRecord.create({
      data: {
        animalId: parseInt(animalId),
        type,
        medicine,
        dose,
        notes,
        date: date ? new Date(date) : new Date(),
        nextDueDate: nextDueDate ? new Date(nextDueDate) : null,
        userId: req.user.id,
      },
      include: { animal: { select: { name: true, type: true } } },
    })
    res.json({ message: 'Health record added', record })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

const updateHealthRecord = async (req, res) => {
  try {
    const { id } = req.params
    const { type, medicine, dose, notes, date, nextDueDate } = req.body
    const record = await prisma.healthRecord.update({
      where: { id: parseInt(id) },
      data: { type, medicine, dose, notes, date: date ? new Date(date) : undefined, nextDueDate: nextDueDate ? new Date(nextDueDate) : null },
    })
    res.json({ message: 'Updated', record })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

const deleteHealthRecord = async (req, res) => {
  try {
    await prisma.healthRecord.delete({ where: { id: parseInt(req.params.id) } })
    res.json({ message: 'Deleted' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

module.exports = { getHealthRecords, getAllHealthRecords, addHealthRecord, updateHealthRecord, deleteHealthRecord }
