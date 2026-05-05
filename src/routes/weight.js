const express = require('express')
const router = express.Router()
const authMiddleware = require('../middleware/auth')
const { requireRole } = require('../middleware/auth')
const { getWeightLogs, addWeightLog, deleteWeightLog } = require('../controllers/weightController')

router.get('/:animalId', authMiddleware, getWeightLogs)
router.post('/', authMiddleware, requireRole('OWNER', 'MANAGER'), addWeightLog)
router.delete('/:id', authMiddleware, requireRole('OWNER', 'MANAGER'), deleteWeightLog)

module.exports = router
