const express = require('express')
const router = express.Router()
const authMiddleware = require('../middleware/auth')
const { requireRole } = require('../middleware/auth')
const { getExpenses, addExpense, updateExpense, deleteExpense } = require('../controllers/expenseController')

router.get('/', authMiddleware, requireRole('OWNER', 'MANAGER'), getExpenses)
router.post('/', authMiddleware, requireRole('OWNER', 'MANAGER'), addExpense)
router.put('/:id', authMiddleware, requireRole('OWNER', 'MANAGER'), updateExpense)
router.delete('/:id', authMiddleware, requireRole('OWNER'), deleteExpense)

module.exports = router
