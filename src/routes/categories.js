const express = require('express')
const router = express.Router()
const { addCategory, getAllCategories, updateCategory, deleteCategory } = require('../controllers/categoryController')
const authMiddleware = require('../middleware/auth')
const { requireRole } = require('../middleware/auth')

router.get('/', getAllCategories)
router.post('/', authMiddleware, requireRole('OWNER', 'MANAGER'), addCategory)
router.put('/:id', authMiddleware, requireRole('OWNER', 'MANAGER'), updateCategory)
router.delete('/:id', authMiddleware, requireRole('OWNER'), deleteCategory)

module.exports = router
