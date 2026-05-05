const express = require('express')
const router = express.Router()
const { addProduct, getAllProducts, getProductById, updateProduct, deleteProduct } = require('../controllers/productController')
const authMiddleware = require('../middleware/auth')
const { requireRole } = require('../middleware/auth')
const { upload } = require('../utils/cloudinary')

router.get('/public', getAllProducts)
router.get('/', authMiddleware, getAllProducts)
router.get('/:id', authMiddleware, getProductById)
router.post('/', authMiddleware, requireRole('OWNER', 'MANAGER'), upload.single('photo'), addProduct)
router.put('/:id', authMiddleware, requireRole('OWNER', 'MANAGER'), upload.single('photo'), updateProduct)
router.delete('/:id', authMiddleware, requireRole('OWNER'), deleteProduct)

module.exports = router
