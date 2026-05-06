require('dotenv').config()
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')

const authRoutes = require('./routes/auth')
const employeeRoutes = require('./routes/employees')
const dashboardRoutes = require('./routes/dashboard')
const customerRoutes = require('./routes/customers')
const orderRoutes = require('./routes/orders')
const inventoryRoutes = require('./routes/inventory')
const invoiceRoutes = require('./routes/invoice')
const upiRoutes = require('./routes/upi')
const categoryRoutes = require('./routes/categories')
const productRoutes = require('./routes/products')
const animalRoutes = require('./routes/animals')
const healthRoutes = require('./routes/health')
const weightRoutes = require('./routes/weight')
const breedingRoutes = require('./routes/breeding')
const expenseRoutes = require('./routes/expenses')
const taskRoutes = require('./routes/tasks')
const attendanceRoutes = require('./routes/attendance')
const reportRoutes = require('./routes/reports')
const deliveryPartnerRoutes = require('./routes/deliveryPartners')
const shipmentRoutes = require('./routes/shipments')
const settingsRoutes = require('./routes/settings')
const reviewRoutes = require('./routes/reviews')
const bookingRoutes = require('./routes/bookings')

const { startDailySummaryCron } = require('./utils/dailySummary')

const app = express()

// Security headers — prevents clickjacking, XSS, MIME sniffing
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))

// Limit request body to 10MB (prevents large payload attacks)
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:3000', 'http://localhost:19006']

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, curl)
    if (!origin) return callback(null, true)
    if (allowedOrigins.includes(origin)) return callback(null, true)
    callback(new Error('Not allowed by CORS'))
  },
  credentials: true,
}))

// General API rate limiter — 200 req/15min per IP
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
})

// Strict limiter for public endpoints — 30 req/15min per IP
const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { message: 'Too many requests from this IP.' },
  standardHeaders: true,
  legacyHeaders: false,
})

// Login brute-force protection — 10 attempts per 15 min per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Too many login attempts. Try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
})

app.use('/api', generalLimiter)
app.use('/api/reports/public-order', publicLimiter)
app.use('/api/products/public', publicLimiter)
app.use('/api/animals/public', publicLimiter)
app.use('/api/delivery/shipments/track', publicLimiter)

app.use('/api/auth/login', loginLimiter)
app.use('/api/auth', authRoutes)
app.use('/api/employees', employeeRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/customers', customerRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/inventory', inventoryRoutes)
app.use('/api/invoice', invoiceRoutes)
app.use('/api/upi', upiRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/products', productRoutes)
app.use('/api/animals', animalRoutes)
app.use('/api/health', healthRoutes)
app.use('/api/weight', weightRoutes)
app.use('/api/breeding', breedingRoutes)
app.use('/api/expenses', expenseRoutes)
app.use('/api/tasks', taskRoutes)
app.use('/api/attendance', attendanceRoutes)
app.use('/api/reports', reportRoutes)
app.use('/api/delivery/partners', deliveryPartnerRoutes)
app.use('/api/delivery/shipments', shipmentRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/reviews', reviewRoutes)
app.use('/api/bookings', bookingRoutes)

app.get('/', (req, res) => {
  res.json({ message: 'Kruthik Farm API is running! 🐐' })
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`)
  startDailySummaryCron()
})
