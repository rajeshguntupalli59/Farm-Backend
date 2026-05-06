const express = require('express')
const router = express.Router()
const { placeBooking, getMyBookings, cancelBooking, getAllBookings, updateBooking } = require('../controllers/bookingController')
const authMiddleware = require('../middleware/auth')
const { requireRole } = require('../middleware/auth')
const customerAuth = require('../middleware/customerAuth')

router.post('/', customerAuth, placeBooking)
router.get('/me', customerAuth, getMyBookings)
router.patch('/me/:id/cancel', customerAuth, cancelBooking)
router.get('/', authMiddleware, requireRole('OWNER', 'MANAGER'), getAllBookings)
router.put('/:id', authMiddleware, requireRole('OWNER', 'MANAGER'), updateBooking)

module.exports = router
