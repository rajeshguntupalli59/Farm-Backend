const express = require('express')
const router = express.Router()
const authMiddleware = require('../middleware/auth')
const { requireRole } = require('../middleware/auth')
const { getAttendance, markAttendance, getAttendanceSummary } = require('../controllers/attendanceController')

router.get('/', authMiddleware, requireRole('OWNER', 'MANAGER'), getAttendance)
router.get('/summary', authMiddleware, requireRole('OWNER', 'MANAGER'), getAttendanceSummary)
router.post('/', authMiddleware, requireRole('OWNER', 'MANAGER'), markAttendance)

module.exports = router
