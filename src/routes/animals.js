const express = require('express')
const router = express.Router()
const { addAnimal, getAllAnimals, getAnimalById, updateAnimal, deleteAnimal } = require('../controllers/animalController')
const authMiddleware = require('../middleware/auth')
const { requireRole } = require('../middleware/auth')
const { upload } = require('../utils/cloudinary')

router.get('/public', getAllAnimals)
router.get('/', authMiddleware, getAllAnimals)
router.get('/:id', authMiddleware, getAnimalById)
router.post('/', authMiddleware, requireRole('OWNER', 'MANAGER'), upload.single('photo'), addAnimal)
router.put('/:id', authMiddleware, requireRole('OWNER', 'MANAGER'), upload.single('photo'), updateAnimal)
router.delete('/:id', authMiddleware, requireRole('OWNER'), deleteAnimal)

module.exports = router
