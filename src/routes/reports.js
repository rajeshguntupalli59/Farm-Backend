const express = require('express')
const router = express.Router()
const authMiddleware = require('../middleware/auth')
const { requireRole } = require('../middleware/auth')
const { getReports, publicOrder } = require('../controllers/reportController')

router.get('/', authMiddleware, requireRole('OWNER', 'MANAGER'), getReports)
router.post('/public-order', publicOrder)

module.exports = router
