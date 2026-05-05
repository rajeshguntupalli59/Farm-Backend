const express = require('express')
const router = express.Router()
const rateLimit = require('express-rate-limit')
const {
  customerLogin, sendOtpRequest, verifyOtpAndRegister,
  placeCustomerOrder, getMyOrders, cancelMyOrder, savePushToken,
  addCustomer, updateCustomer, getAllCustomers, getCustomerById
} = require('../controllers/customerController')
const authMiddleware = require('../middleware/auth')
const customerAuth = require('../middleware/customerAuth')

const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 3,
  keyGenerator: (req) => req.body?.phone || 'unknown',
  validate: { xForwardedForHeader: false },
  message: { message: 'Too many OTP requests. Please wait 10 minutes.' }
})

// Public — customer auth
router.post('/login', customerLogin)                        // no OTP — just phone
router.post('/send-otp', otpLimiter, sendOtpRequest)        // registration only
router.post('/verify-otp', verifyOtpAndRegister)            // registration only

// Customer self-service (BEFORE /:id)
router.get('/me/orders', customerAuth, getMyOrders)
router.post('/me/orders', customerAuth, placeCustomerOrder)
router.patch('/me/orders/:id/cancel', customerAuth, cancelMyOrder)
router.post('/me/push-token', customerAuth, savePushToken)

// Staff-only
router.post('/', authMiddleware, addCustomer)
router.get('/', authMiddleware, getAllCustomers)
router.get('/:id', authMiddleware, getCustomerById)
router.put('/:id', authMiddleware, updateCustomer)

module.exports = router
