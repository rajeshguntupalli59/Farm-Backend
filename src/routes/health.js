const express = require('express')
const router = express.Router()
const authMiddleware = require('../middleware/auth')
const { requireRole } = require('../middleware/auth')
const { getHealthRecords, getAllHealthRecords, addHealthRecord, updateHealthRecord, deleteHealthRecord } = require('../controllers/healthController')

router.get('/', authMiddleware, requireRole('OWNER', 'MANAGER'), getAllHealthRecords)
router.get('/:animalId', authMiddleware, getHealthRecords)
router.post('/', authMiddleware, requireRole('OWNER', 'MANAGER'), addHealthRecord)
router.put('/:id', authMiddleware, requireRole('OWNER', 'MANAGER'), updateHealthRecord)
router.delete('/:id', authMiddleware, requireRole('OWNER', 'MANAGER'), deleteHealthRecord)

module.exports = router
