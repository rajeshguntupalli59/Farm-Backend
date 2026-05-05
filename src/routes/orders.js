const express = require('express')
const router = express.Router()
const { createOrder, getAllOrders, getOrderById, updateOrderStatus } = require('../controllers/orderController')
const authMiddleware = require('../middleware/auth')

router.post('/', authMiddleware, createOrder)
router.get('/', authMiddleware, getAllOrders)
router.get('/:id', authMiddleware, getOrderById)
router.put('/:id', authMiddleware, updateOrderStatus)

module.exports = router
