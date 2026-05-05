const prisma = require('../utils/prisma')

const addCategory = async (req, res) => {
  try {
    const { name, nameTelugu, emoji, description, parentId, sortOrder } = req.body
    if (!name) return res.status(400).json({ message: 'Category name required' })

    const category = await prisma.category.create({
      data: {
        name,
        nameTelugu,
        emoji: emoji || '📦',
        description,
        sortOrder: sortOrder ? parseInt(sortOrder) : 0,
        ...(parentId && { parentId: parseInt(parentId) })
      },
      include: { parent: { select: { id: true, name: true } }, subcategories: true }
    })
    res.status(201).json({ message: 'Category added!', category })
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong' })
  }
}

const getAllCategories = async (req, res) => {
  try {
    const { flat } = req.query

    if (flat === 'true') {
      const categories = await prisma.category.findMany({
        where: { isActive: true },
        include: {
          _count: { select: { products: true } },
          parent: { select: { id: true, name: true } }
        },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }]
      })
      return res.json({ message: 'Categories fetched', categories })
    }

    // Tree: top-level categories with subcategories nested
    const categories = await prisma.category.findMany({
      where: { isActive: true, parentId: null },
      include: {
        _count: { select: { products: true } },
        subcategories: {
          where: { isActive: true },
          include: { _count: { select: { products: true } } },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }]
        }
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }]
    })
    res.json({ message: 'Categories fetched', categories })
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong' })
  }
}

const updateCategory = async (req, res) => {
  try {
    const { id } = req.params
    const { name, nameTelugu, emoji, description, isActive, sortOrder, parentId } = req.body
    const category = await prisma.category.update({
      where: { id: parseInt(id) },
      data: {
        ...(name && { name }),
        ...(nameTelugu !== undefined && { nameTelugu }),
        ...(emoji && { emoji }),
        ...(description !== undefined && { description }),
        ...(isActive !== undefined && { isActive }),
        ...(sortOrder !== undefined && { sortOrder: parseInt(sortOrder) }),
        ...(parentId !== undefined && { parentId: parentId ? parseInt(parentId) : null })
      },
      include: { parent: { select: { id: true, name: true } }, subcategories: true }
    })
    res.json({ message: 'Category updated!', category })
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong' })
  }
}

const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params
    // Soft delete — also deactivate subcategories
    await prisma.category.updateMany({
      where: { OR: [{ id: parseInt(id) }, { parentId: parseInt(id) }] },
      data: { isActive: false }
    })
    res.json({ message: 'Category removed!' })
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong' })
  }
}

module.exports = { addCategory, getAllCategories, updateCategory, deleteCategory }
