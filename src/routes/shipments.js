const express = require('express')
const router = express.Router()
const authMiddleware = require('../middleware/auth')
const { requireRole } = require('../middleware/auth')
const { getShipments, trackShipment, createShipment, updateShipment, getDeliveryStats } = require('../controllers/shipmentController')

router.get('/track/:code', trackShipment)  // public — no auth
router.get('/stats', authMiddleware, requireRole('OWNER', 'MANAGER'), getDeliveryStats)
router.get('/', authMiddleware, requireRole('OWNER', 'MANAGER'), getShipments)
router.post('/', authMiddleware, requireRole('OWNER', 'MANAGER'), createShipment)
router.put('/:id', authMiddleware, requireRole('OWNER', 'MANAGER'), updateShipment)

module.exports = router
