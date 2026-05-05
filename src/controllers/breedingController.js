const prisma = require('../utils/prisma')

const getBreedingRecords = async (req, res) => {
  try {
    const records = await prisma.breedingRecord.findMany({
      include: { female: { select: { id: true, name: true, type: true, breed: true } } },
      orderBy: { matingDate: 'desc' },
    })
    res.json({ records })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

const addBreedingRecord = async (req, res) => {
  try {
    const { femaleId, maleName, matingDate, expectedDue, notes } = req.body
    const mating = new Date(matingDate)
    const expected = expectedDue ? new Date(expectedDue) : new Date(mating.getTime() + 150 * 24 * 60 * 60 * 1000)
    const record = await prisma.breedingRecord.create({
      data: {
        femaleId: parseInt(femaleId),
        maleName,
        matingDate: mating,
        expectedDue: expected,
        notes,
        status: 'PREGNANT',
      },
      include: { female: { select: { name: true, type: true } } },
    })
    res.json({ message: 'Breeding record added', record })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

const updateBreedingRecord = async (req, res) => {
  try {
    const { id } = req.params
    const { status, actualDue, litterCount, notes } = req.body
    const record = await prisma.breedingRecord.update({
      where: { id: parseInt(id) },
      data: {
        status,
        actualDue: actualDue ? new Date(actualDue) : undefined,
        litterCount: litterCount ? parseInt(litterCount) : undefined,
        notes,
      },
    })
    res.json({ message: 'Updated', record })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

const deleteBreedingRecord = async (req, res) => {
  try {
    await prisma.breedingRecord.delete({ where: { id: parseInt(req.params.id) } })
    res.json({ message: 'Deleted' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

module.exports = { getBreedingRecords, addBreedingRecord, updateBreedingRecord, deleteBreedingRecord }
