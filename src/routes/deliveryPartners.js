const express = require('express')
const router = express.Router()
const authMiddleware = require('../middleware/auth')
const { requireRole } = require('../middleware/auth')
const { getPartners, addPartner, updatePartner, deletePartner } = require('../controllers/deliveryPartnerController')

router.get('/', authMiddleware, requireRole('OWNER', 'MANAGER'), getPartners)
router.post('/', authMiddleware, requireRole('OWNER', 'MANAGER'), addPartner)
router.put('/:id', authMiddleware, requireRole('OWNER', 'MANAGER'), updatePartner)
router.delete('/:id', authMiddleware, requireRole('OWNER'), deletePartner)

module.exports = router
