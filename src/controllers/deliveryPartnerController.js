const prisma = require('../utils/prisma')

// GET all partners with shipment count
const getPartners = async (req, res) => {
  try {
    const partners = await prisma.deliveryPartner.findMany({
      include: { _count: { select: { shipments: true } } },
      orderBy: { name: 'asc' },
    })
    res.json({ partners })
  } catch (err) { res.status(500).json({ message: err.message }) }
}

// POST create partner
const addPartner = async (req, res) => {
  try {
    const { name, phone, vehicle, areas } = req.body
    if (!name || !phone) return res.status(400).json({ message: 'Name and phone required' })
    const partner = await prisma.deliveryPartner.create({
      data: { name, phone, vehicle: vehicle || null, areas: areas || [], isAvailable: true },
    })
    res.json({ message: 'Delivery partner added', partner })
  } catch (err) { res.status(500).json({ message: err.message }) }
}

// PUT update partner
const updatePartner = async (req, res) => {
  try {
    const { name, phone, vehicle, areas, isAvailable } = req.body
    const partner = await prisma.deliveryPartner.update({
      where: { id: parseInt(req.params.id) },
      data: { name, phone, vehicle: vehicle || null, areas: areas || [], isAvailable },
    })
    res.json({ message: 'Updated', partner })
  } catch (err) { res.status(500).json({ message: err.message }) }
}

// DELETE partner
const deletePartner = async (req, res) => {
  try {
    await prisma.deliveryPartner.delete({ where: { id: parseInt(req.params.id) } })
    res.json({ message: 'Deleted' })
  } catch (err) { res.status(500).json({ message: err.message }) }
}

module.exports = { getPartners, addPartner, updatePartner, deletePartner }
