const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const prisma = require('../utils/prisma')
const { generate, sendViaSms } = require('../utils/otp')

const OTP_TTL_MS = 5 * 60 * 1000
const MAX_ATTEMPTS = 3

// REGISTER — only used internally by employee creation (OWNER only via /api/employees)
// Role is NOT accepted from request body — always defaults to EMPLOYEE
const register = async (req, res) => {
  try {
    const { name, phone, password } = req.body

    if (!name || !phone || !password) {
      return res.status(400).json({ message: 'Name, phone and password are required' })
    }
    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({ message: 'Phone must be exactly 10 digits' })
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' })
    }

    const existingUser = await prisma.user.findUnique({ where: { phone } })
    if (existingUser) {
      return res.status(400).json({ message: 'This phone number is already registered' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: { name, phone, password: hashedPassword, role: 'EMPLOYEE' }
    })

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.status(201).json({
      message: 'Account created successfully!',
      token,
      user: { id: user.id, name: user.name, phone: user.phone, role: user.role }
    })

  } catch (error) {
    res.status(500).json({ message: 'Something went wrong' })
  }
}

// LOGIN — checks phone and password and returns a token
const login = async (req, res) => {
  try {
    const { phone, password } = req.body

    if (!phone || !password) {
      return res.status(400).json({ message: 'Phone and password are required' })
    }

    const user = await prisma.user.findUnique({ where: { phone } })

    // Use same message for missing user and wrong password — prevents guessing valid phone numbers
    if (!user) {
      return res.status(400).json({ message: 'Invalid phone or password' })
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Invalid phone or password' })
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({
      message: 'Login successful!',
      token,
      user: { id: user.id, name: user.name, phone: user.phone, role: user.role }
    })

  } catch (error) {
    res.status(500).json({ message: 'Something went wrong' })
  }
}

// SETUP OWNER — only works once, when no OWNER account exists yet
const setupOwner = async (req, res) => {
  try {
    const existing = await prisma.user.findFirst({ where: { role: 'OWNER' } })
    if (existing) {
      return res.status(403).json({ message: 'Owner account already exists. Please login.' })
    }

    const { name, phone, password } = req.body
    if (!name || !phone || !password) {
      return res.status(400).json({ message: 'Name, phone and password are required' })
    }
    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({ message: 'Phone must be 10 digits' })
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' })
    }

    const taken = await prisma.user.findUnique({ where: { phone } })
    if (taken) return res.status(400).json({ message: 'Phone already registered' })

    const hashedPassword = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: { name, phone, password: hashedPassword, role: 'OWNER' }
    })

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.status(201).json({
      message: 'Owner account created!',
      token,
      user: { id: user.id, name: user.name, phone: user.phone, role: user.role }
    })
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong' })
  }
}

const forgotPassword = async (req, res) => {
  try {
    const { phone } = req.body
    if (!phone) return res.status(400).json({ message: 'Phone number required' })
    const user = await prisma.user.findUnique({ where: { phone: phone.trim() } })
    if (!user) return res.status(404).json({ message: 'No staff account found with this number' })

    await prisma.otpCode.deleteMany({ where: { phone: phone.trim() } })
    const code = generate()
    await prisma.otpCode.create({ data: { phone: phone.trim(), code, expiresAt: new Date(Date.now() + OTP_TTL_MS) } })
    const sent = await sendViaSms(phone.trim(), code)
    if (!sent) return res.status(500).json({ message: 'Failed to send OTP. Try again.' })
    res.json({ message: 'OTP sent to your registered phone number' })
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong' })
  }
}

const resetPassword = async (req, res) => {
  try {
    const { phone, code, password } = req.body
    if (!phone || !code || !password) return res.status(400).json({ message: 'Phone, OTP and new password required' })
    if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' })

    const devBypass = process.env.NODE_ENV !== 'production' && code.trim() === '123456'

    if (!devBypass) {
      const record = await prisma.otpCode.findFirst({ where: { phone: phone.trim() }, orderBy: { createdAt: 'desc' } })
      if (!record) return res.status(400).json({ message: 'OTP not found. Please request a new one.' })
      if (new Date() > record.expiresAt) {
        await prisma.otpCode.delete({ where: { id: record.id } })
        return res.status(400).json({ message: 'OTP expired. Please request a new one.' })
      }
      if (record.attempts >= MAX_ATTEMPTS) return res.status(400).json({ message: 'Too many wrong attempts. Request a new OTP.' })
      if (record.code !== code.trim()) {
        await prisma.otpCode.update({ where: { id: record.id }, data: { attempts: { increment: 1 } } })
        return res.status(400).json({ message: 'Incorrect OTP' })
      }
      await prisma.otpCode.delete({ where: { id: record.id } })
    }
    const hashed = await bcrypt.hash(password, 10)
    await prisma.user.update({ where: { phone: phone.trim() }, data: { password: hashed } })
    res.json({ message: 'Password reset successfully! You can now login.' })
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong' })
  }
}

const saveStaffPushToken = async (req, res) => {
  try {
    const { pushToken } = req.body
    if (!pushToken) return res.status(400).json({ message: 'pushToken required' })
    await prisma.user.update({ where: { id: req.user.userId }, data: { pushToken } })
    res.json({ message: 'Push token saved' })
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong' })
  }
}

module.exports = { register, login, setupOwner, forgotPassword, resetPassword, saveStaffPushToken }
