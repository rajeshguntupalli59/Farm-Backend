const express = require('express')
const router = express.Router()
const authMiddleware = require('../middleware/auth')
const { requireRole } = require('../middleware/auth')
const { getBreedingRecords, addBreedingRecord, updateBreedingRecord, deleteBreedingRecord } = require('../controllers/breedingController')

router.get('/', authMiddleware, requireRole('OWNER', 'MANAGER'), getBreedingRecords)
router.post('/', authMiddleware, requireRole('OWNER', 'MANAGER'), addBreedingRecord)
router.put('/:id', authMiddleware, requireRole('OWNER', 'MANAGER'), updateBreedingRecord)
router.delete('/:id', authMiddleware, requireRole('OWNER', 'MANAGER'), deleteBreedingRecord)

module.exports = router
