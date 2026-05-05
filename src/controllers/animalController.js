const prisma = require('../utils/prisma')
const { uploadToCloudinary } = require('../utils/cloudinary')

const addAnimal = async (req, res) => {
  try {
    const { name, type, breed, age, weight, price, description } = req.body
    if (!name || !type || !price) {
      return res.status(400).json({ message: 'Name, type and price are required' })
    }
    const validTypes = ['SHEEP', 'GOAT', 'CHICKEN', 'HEN']
    if (!validTypes.includes(type)) {
      return res.status(400).json({ message: 'Type must be SHEEP, GOAT, CHICKEN or HEN' })
    }
    let photoUrl = null
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer)
      photoUrl = result.secure_url
    }
    const animal = await prisma.animal.create({
      data: {
        name, type, breed, age,
        weight: weight ? parseFloat(weight) : null,
        price: parseFloat(price),
        description, photoUrl,
        userId: req.user.userId
      }
    })
    await prisma.animalStockLog.create({
      data: { animalId: animal.id, action: 'ADDED', quantity: 1, note: `${name} added to inventory` }
    })
    res.status(201).json({ message: 'Animal added successfully!', animal })
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong' })
  }
}

const getAllAnimals = async (req, res) => {
  try {
    const { type, status, search } = req.query
    const animals = await prisma.animal.findMany({
      where: {
        ...(type && { type }),
        ...(status && { status }),
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { breed: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } }
          ]
        })
      },
      include: { addedBy: { select: { name: true, phone: true } } },
      orderBy: { createdAt: 'desc' }
    })
    res.json({ message: 'Animals fetched successfully', count: animals.length, animals })
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong' })
  }
}

const getAnimalById = async (req, res) => {
  try {
    const { id } = req.params
    const animal = await prisma.animal.findUnique({
      where: { id: parseInt(id) },
      include: { addedBy: { select: { name: true } }, stockLogs: { orderBy: { createdAt: 'desc' }, take: 10 } }
    })
    if (!animal) return res.status(404).json({ message: 'Animal not found' })
    res.json({ animal })
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong' })
  }
}

const updateAnimal = async (req, res) => {
  try {
    const { id } = req.params
    const { name, type, breed, age, weight, price, description, status } = req.body
    let photoUrl = undefined
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer)
      photoUrl = result.secure_url
    }
    const animal = await prisma.animal.update({
      where: { id: parseInt(id) },
      data: {
        ...(name && { name }),
        ...(type && { type }),
        ...(breed !== undefined && { breed }),
        ...(age !== undefined && { age }),
        ...(weight !== undefined && weight !== '' && { weight: parseFloat(weight) }),
        ...(price !== undefined && price !== '' && { price: parseFloat(price) }),
        ...(description !== undefined && { description }),
        ...(status && { status }),
        ...(photoUrl && { photoUrl })
      }
    })
    res.json({ message: 'Animal updated successfully!', animal })
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong' })
  }
}

const deleteAnimal = async (req, res) => {
  try {
    const { id } = req.params
    await prisma.animalStockLog.deleteMany({ where: { animalId: parseInt(id) } })
    await prisma.animal.delete({ where: { id: parseInt(id) } })
    res.json({ message: 'Animal deleted successfully!' })
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong' })
  }
}

module.exports = { addAnimal, getAllAnimals, getAnimalById, updateAnimal, deleteAnimal }
