const cloudinary = require('cloudinary').v2
const multer = require('multer')

// Cloudinary auto-reads CLOUDINARY_URL from .env
// No extra config needed!

// Store file in memory before uploading to Cloudinary
const storage = multer.memoryStorage()
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('Only images allowed!'), false)
    }
  }
})

// Upload image buffer to Cloudinary
const uploadToCloudinary = (buffer) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { folder: 'pashu-bazaar/animals' },
      (error, result) => {
        if (error) reject(error)
        else resolve(result)
      }
    ).end(buffer)
  })
}

module.exports = { upload, uploadToCloudinary }