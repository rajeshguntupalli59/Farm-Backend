const express = require('express')
const router = express.Router()
const { register, login, setupOwner, forgotPassword, resetPassword, saveStaffPushToken } = require('../controllers/authController')
const authMiddleware = require('../middleware/auth')

router.post('/login', login)
router.post('/register', register)
router.post('/setup-owner', setupOwner)   // one-time only — blocked after first owner exists
router.post('/forgot-password', forgotPassword)
router.post('/reset-password', resetPassword)
router.post('/push-token', authMiddleware, saveStaffPushToken)

module.exports = router
