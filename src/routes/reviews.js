const express = require('express')
const router = express.Router()
const { addReview, getProductReviews, getAllReviews, deleteReview, restoreReview } = require('../controllers/reviewController')
const authMiddleware = require('../middleware/auth')
const { requireRole } = require('../middleware/auth')
const customerAuth = require('../middleware/customerAuth')

router.get('/product/:productId', getProductReviews)           // public
router.post('/', customerAuth, addReview)                      // customer
router.get('/', authMiddleware, requireRole('OWNER', 'MANAGER'), getAllReviews)  // staff
router.patch('/:id/hide', authMiddleware, requireRole('OWNER'), deleteReview)   // owner
router.patch('/:id/restore', authMiddleware, requireRole('OWNER'), restoreReview) // owner

module.exports = router
