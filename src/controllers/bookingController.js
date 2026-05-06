const prisma = require('../utils/prisma')

// Customer — place a booking for an animal
const placeBooking = async (req, res) => {
  try {
    const customerId = req.customer.customerId
    const { animalId, eventDate, notes } = req.body
    if (!animalId || !eventDate)
      return res.status(400).json({ message: 'animalId and eventDate are required' })

    const animal = await prisma.animal.findUnique({ where: { id: parseInt(animalId) } })
    if (!animal || animal.status !== 'AVAILABLE')
      return res.status(400).json({ message: 'Animal is not available for booking' })

    const booking = await prisma.animalBooking.create({
      data: {
        customerId,
        animalId: parseInt(animalId),
        eventDate: new Date(eventDate),
        notes: notes || null,
      },
      include: {
        animal: { select: { name: true, type: true, breed: true, price: true, photoUrl: true } }
      }
    })
    res.status(201).json({ booking })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// Customer — get my bookings
const getMyBookings = async (req, res) => {
  try {
    const customerId = req.customer.customerId
    const bookings = await prisma.animalBooking.findMany({
      where: { customerId },
      include: {
        animal: { select: { name: true, type: true, breed: true, price: true, photoUrl: true } }
      },
      orderBy: { createdAt: 'desc' }
    })
    res.json({ bookings })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// Customer — cancel a booking
const cancelBooking = async (req, res) => {
  try {
    const customerId = req.customer.customerId
    const booking = await prisma.animalBooking.findUnique({ where: { id: parseInt(req.params.id) } })
    if (!booking || booking.customerId !== customerId)
      return res.status(404).json({ message: 'Booking not found' })
    if (booking.status === 'COMPLETED' || booking.status === 'CANCELLED')
      return res.status(400).json({ message: 'Cannot cancel this booking' })

    await prisma.animalBooking.update({
      where: { id: parseInt(req.params.id) },
      data: { status: 'CANCELLED' }
    })
    res.json({ message: 'Booking cancelled' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// Staff — get all bookings
const getAllBookings = async (req, res) => {
  try {
    const bookings = await prisma.animalBooking.findMany({
      include: {
        customer: { select: { name: true, phone: true } },
        animal: { select: { name: true, type: true, breed: true, price: true } }
      },
      orderBy: { eventDate: 'asc' }
    })
    res.json({ bookings })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// Staff — update booking status / deposit
const updateBooking = async (req, res) => {
  try {
    const { status, paidDeposit, depositAmount, notes } = req.body
    const booking = await prisma.animalBooking.update({
      where: { id: parseInt(req.params.id) },
      data: {
        ...(status && { status }),
        ...(paidDeposit !== undefined && { paidDeposit: parseFloat(paidDeposit) }),
        ...(depositAmount !== undefined && { depositAmount: parseFloat(depositAmount) }),
        ...(notes !== undefined && { notes }),
      },
      include: {
        customer: { select: { name: true, phone: true } },
        animal: { select: { name: true, type: true } }
      }
    })
    res.json({ booking })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

module.exports = { placeBooking, getMyBookings, cancelBooking, getAllBookings, updateBooking }
