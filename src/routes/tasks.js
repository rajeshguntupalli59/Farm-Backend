const express = require('express')
const router = express.Router()
const authMiddleware = require('../middleware/auth')
const { requireRole } = require('../middleware/auth')
const { getTasks, createTask, updateTask, deleteTask } = require('../controllers/taskController')

router.get('/', authMiddleware, getTasks)
router.post('/', authMiddleware, requireRole('OWNER', 'MANAGER'), createTask)
router.put('/:id', authMiddleware, updateTask)
router.delete('/:id', authMiddleware, requireRole('OWNER', 'MANAGER'), deleteTask)

module.exports = router
