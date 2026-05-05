const express = require('express')
const router = express.Router()
const { generateUPIQR } = require('../controllers/upiController')
const authMiddleware = require('../middleware/auth')

router.get('/:id', authMiddleware, generateUPIQR)

module.exports = router