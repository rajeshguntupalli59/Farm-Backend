const prisma = require('../utils/prisma')

const addItem = async (req, res) => {
  try {
    const { name, category, unit, quantity, minQuantity, costPerUnit, supplier, note } = req.body
    if (!name || !category || !unit || !quantity || !minQuantity || !costPerUnit) {
      return res.status(400).json({ message: 'All required fields must be filled' })
    }
    const item = await prisma.inventory.create({
      data: {
        name,
        category,
        unit,
        quantity: parseFloat(quantity),
        minQuantity: parseFloat(minQuantity),
        costPerUnit: parseFloat(costPerUnit),
        supplier,
        note
      }
    })
    await prisma.inventoryLog.create({
      data: {
        inventoryId: item.id,
        action: 'ADDED',
        quantity: parseFloat(quantity),
        note: `Initial stock added`
      }
    })
    res.status(201).json({ message: 'Item added!', item })
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong' })
  }
}

const getAllItems = async (req, res) => {
  try {
    const { category } = req.query
    const items = await prisma.inventory.findMany({
      where: { ...(category && { category }) },
      orderBy: { createdAt: 'desc' }
    })
    const lowStock = items.filter(i => i.quantity <= i.minQuantity)
    res.json({ message: 'Items fetched', count: items.length, lowStockCount: lowStock.length, items })
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong' })
  }
}

const updateStock = async (req, res) => {
  try {
    const { id } = req.params
    const { action, quantity, note } = req.body
    if (!action || !quantity) return res.status(400).json({ message: 'Action and quantity required' })
    const item = await prisma.inventory.findUnique({ where: { id: parseInt(id) } })
    if (!item) return res.status(404).json({ message: 'Item not found' })
    let newQuantity
    if (action === 'ADD') {
      newQuantity = item.quantity + parseFloat(quantity)
    } else if (action === 'REMOVE') {
      if (item.quantity < parseFloat(quantity)) {
        return res.status(400).json({ message: 'Not enough stock' })
      }
      newQuantity = item.quantity - parseFloat(quantity)
    } else {
      return res.status(400).json({ message: 'Action must be ADD or REMOVE' })
    }
    const updated = await prisma.inventory.update({
      where: { id: parseInt(id) },
      data: { quantity: newQuantity }
    })
    await prisma.inventoryLog.create({
      data: {
        inventoryId: parseInt(id),
        action,
        quantity: parseFloat(quantity),
        note
      }
    })
    const isLowStock = newQuantity <= item.minQuantity
    res.json({
      message: 'Stock updated!',
      item: updated,
      warning: isLowStock ? `⚠️ Low stock alert! Only ${newQuantity} ${item.unit} remaining` : null
    })
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong' })
  }
}

const deleteItem = async (req, res) => {
  try {
    const { id } = req.params
    await prisma.inventoryLog.deleteMany({ where: { inventoryId: parseInt(id) } })
    await prisma.inventory.delete({ where: { id: parseInt(id) } })
    res.json({ message: 'Item deleted!' })
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong' })
  }
}

module.exports = { addItem, getAllItems, updateStock, deleteItem }