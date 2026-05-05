const express = require('express')
const router = express.Router()
const { generateInvoice } = require('../controllers/invoiceController')
const authMiddleware = require('../middleware/auth')

router.get('/:id', authMiddleware, generateInvoice)

module.exports = router