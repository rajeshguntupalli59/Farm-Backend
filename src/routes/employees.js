const express = require('express')
const router = express.Router()
const { addEmployee, getAllEmployees, updateEmployee, deleteEmployee } = require('../controllers/employeeController')
const authMiddleware = require('../middleware/auth')
const { requireRole } = require('../middleware/auth')

router.get('/', authMiddleware, requireRole('OWNER', 'MANAGER'), getAllEmployees)
router.post('/', authMiddleware, requireRole('OWNER', 'MANAGER'), addEmployee)
router.put('/:id', authMiddleware, requireRole('OWNER'), updateEmployee)
router.delete('/:id', authMiddleware, requireRole('OWNER'), deleteEmployee)

module.exports = router
