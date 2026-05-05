const express = require('express')
const router = express.Router()
const { addItem, getAllItems, updateStock, deleteItem } = require('../controllers/inventoryController')
const authMiddleware = require('../middleware/auth')

router.post('/', authMiddleware, addItem)
router.get('/', authMiddleware, getAllItems)
router.put('/:id', authMiddleware, updateStock)
router.delete('/:id', authMiddleware, deleteItem)

module.exports = router