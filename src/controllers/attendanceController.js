const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const getAttendance = async (req, res) => {
  try {
    const { userId, month, year } = req.query
    const where = {}
    if (userId) where.userId = parseInt(userId)
    if (month && year) {
      const start = new Date(parseInt(year), parseInt(month) - 1, 1)
      const end = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59)
      where.date = { gte: start, lte: end }
    }
    const records = await prisma.attendance.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, role: true } },
        markedBy: { select: { name: true } },
      },
      orderBy: { date: 'desc' },
    })
    res.json({ records })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

const markAttendance = async (req, res) => {
  try {
    const { userId, status, date, notes } = req.body
    const attendanceDate = date ? new Date(date) : new Date()
    const dayStart = new Date(attendanceDate.getFullYear(), attendanceDate.getMonth(), attendanceDate.getDate())
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)

    // Upsert — one record per user per day
    const existing = await prisma.attendance.findFirst({
      where: { userId: parseInt(userId), date: { gte: dayStart, lt: dayEnd } },
    })
    let record
    if (existing) {
      record = await prisma.attendance.update({
        where: { id: existing.id },
        data: { status, notes, markedById: req.user.id },
      })
    } else {
      record = await prisma.attendance.create({
        data: {
          userId: parseInt(userId),
          status,
          notes,
          date: dayStart,
          markedById: req.user.id,
        },
      })
    }
    res.json({ message: 'Attendance marked', record })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

const getAttendanceSummary = async (req, res) => {
  try {
    const { month, year } = req.query
    const m = parseInt(month) || new Date().getMonth() + 1
    const y = parseInt(year) || new Date().getFullYear()
    const start = new Date(y, m - 1, 1)
    const end = new Date(y, m, 0, 23, 59, 59)

    const employees = await prisma.user.findMany({
      where: { role: { in: ['EMPLOYEE', 'MANAGER'] } },
      select: { id: true, name: true, role: true },
    })

    const records = await prisma.attendance.findMany({
      where: { date: { gte: start, lte: end } },
    })

    const summary = employees.map(emp => {
      const empRecords = records.filter(r => r.userId === emp.id)
      return {
        ...emp,
        present: empRecords.filter(r => r.status === 'PRESENT').length,
        absent: empRecords.filter(r => r.status === 'ABSENT').length,
        halfDay: empRecords.filter(r => r.status === 'HALF_DAY').length,
        leave: empRecords.filter(r => r.status === 'LEAVE').length,
        total: empRecords.length,
      }
    })
    res.json({ summary, month: m, year: y })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

module.exports = { getAttendance, markAttendance, getAttendanceSummary }
