const prisma = require('../utils/prisma')
const { uploadToCloudinary } = require('../utils/cloudinary')

const addProduct = async (req, res) => {
  try {
    const { name, nameTelugu, categoryId, unit, price, stock, minStock, description, descTelugu } = req.body
    if (!name || !categoryId || !unit || !price) {
      return res.status(400).json({ message: 'Name, category, unit and price required' })
    }
    let photoUrl = null
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer)
      photoUrl = result.secure_url
    }
    const product = await prisma.product.create({
      data: {
        name,
        nameTelugu,
        categoryId: parseInt(categoryId),
        unit,
        price: parseFloat(price),
        stock: parseFloat(stock || 0),
        minStock: parseFloat(minStock || 0),
        description,
        descTelugu,
        photoUrl,
        userId: req.user.userId
      },
      include: { category: { include: { parent: true } } }
    })
    await prisma.productLog.create({
      data: {
        productId: product.id,
        action: 'ADDED',
        quantity: parseFloat(stock || 0),
        note: `${name} added to catalog`
      }
    })
    res.status(201).json({ message: 'Product added!', product })
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong' })
  }
}

const getAllProducts = async (req, res) => {
  try {
    const { categoryId, isAvailable, search } = req.query
    const products = await prisma.product.findMany({
      where: {
        ...(categoryId && { categoryId: parseInt(categoryId) }),
        ...(isAvailable !== undefined && { isAvailable: isAvailable === 'true' }),
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { nameTelugu: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } }
          ]
        })
      },
      include: {
        category: { include: { parent: true } },
        addedBy: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    })
    res.json({ message: 'Products fetched', count: products.length, products })
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong' })
  }
}

const getProductById = async (req, res) => {
  try {
    const { id } = req.params
    const product = await prisma.product.findUnique({
      where: { id: parseInt(id) },
      include: {
        category: { include: { parent: true } },
        addedBy: { select: { name: true } },
        stockLogs: { orderBy: { createdAt: 'desc' }, take: 10 }
      }
    })
    if (!product) return res.status(404).json({ message: 'Product not found' })
    res.json({ product })
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong' })
  }
}

const updateProduct = async (req, res) => {
  try {
    const { id } = req.params
    const { name, nameTelugu, categoryId, unit, price, stock, minStock, description, descTelugu, isAvailable } = req.body
    let photoUrl = undefined
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer)
      photoUrl = result.secure_url
    }
    const product = await prisma.product.update({
      where: { id: parseInt(id) },
      data: {
        ...(name && { name }),
        ...(nameTelugu !== undefined && { nameTelugu }),
        ...(categoryId && { categoryId: parseInt(categoryId) }),
        ...(unit && { unit }),
        ...(price !== undefined && price !== '' && { price: parseFloat(price) }),
        ...(stock !== undefined && { stock: parseFloat(stock) }),
        ...(minStock !== undefined && { minStock: parseFloat(minStock) }),
        ...(description !== undefined && { description }),
        ...(descTelugu !== undefined && { descTelugu }),
        ...(isAvailable !== undefined && { isAvailable: isAvailable === 'true' || isAvailable === true }),
        ...(photoUrl && { photoUrl })
      },
      include: { category: { include: { parent: true } } }
    })
    res.json({ message: 'Product updated!', product })
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong' })
  }
}

const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params
    await prisma.productLog.deleteMany({ where: { productId: parseInt(id) } })
    await prisma.product.delete({ where: { id: parseInt(id) } })
    res.json({ message: 'Product deleted!' })
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong' })
  }
}

module.exports = { addProduct, getAllProducts, getProductById, updateProduct, deleteProduct }
