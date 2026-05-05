const prisma = require('../utils/prisma')
const bcrypt = require('bcryptjs')

// ADD NEW EMPLOYEE
const addEmployee = async (req, res) => {
  try {
    const { name, phone, password, role } = req.body

    if (req.user.role === 'EMPLOYEE') {
      return res.status(403).json({ message: 'You do not have permission to add employees' })
    }

    if (!name || !phone || !password) {
      return res.status(400).json({ message: 'Name, phone and password are required' })
    }
    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({ message: 'Phone must be exactly 10 digits' })
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' })
    }

    // MANAGER can only create EMPLOYEE accounts — not OWNER or another MANAGER
    const allowedRole = req.user.role === 'OWNER'
      ? (['OWNER', 'MANAGER', 'EMPLOYEE'].includes(role) ? role : 'EMPLOYEE')
      : 'EMPLOYEE'

    const existing = await prisma.user.findUnique({ where: { phone } })
    if (existing) {
      return res.status(400).json({ message: 'This phone number is already registered' })
    }

    const { salary } = req.body
    const hashedPassword = await bcrypt.hash(password, 10)
    const employee = await prisma.user.create({
      data: { name, phone, password: hashedPassword, role: allowedRole, salary: salary ? parseFloat(salary) : null }
    })

    res.status(201).json({
      message: 'Employee added successfully!',
      employee: { id: employee.id, name: employee.name, phone: employee.phone, role: employee.role, salary: employee.salary, createdAt: employee.createdAt }
    })

  } catch (error) {
    res.status(500).json({ message: 'Something went wrong' })
  }
}

// GET ALL EMPLOYEES
const getAllEmployees = async (req, res) => {
  try {
    // Only OWNER and MANAGER can view employees
    if (req.user.role === 'EMPLOYEE') {
      return res.status(403).json({ 
        message: 'You do not have permission to view employees' 
      })
    }

    const employees = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        salary: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    })

    res.json({
      message: 'Employees fetched successfully',
      count: employees.length,
      employees
    })

  } catch (error) {
    res.status(500).json({ message: 'Something went wrong' })
  }
}

// UPDATE EMPLOYEE
const updateEmployee = async (req, res) => {
  try {
    // Only OWNER can update employees
    if (req.user.role !== 'OWNER') {
      return res.status(403).json({ 
        message: 'Only owner can update employees' 
      })
    }

    const { id } = req.params
    const { name, phone, role, salary } = req.body

    const employee = await prisma.user.update({
      where: { id: parseInt(id) },
      data: {
        ...(name && { name }),
        ...(phone && { phone }),
        ...(role && { role }),
        ...(salary !== undefined && { salary: salary !== '' ? parseFloat(salary) : null }),
      },
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        salary: true,
      }
    })

    res.json({
      message: 'Employee updated successfully!',
      employee
    })

  } catch (error) {
    res.status(500).json({ message: 'Something went wrong' })
  }
}

// DELETE EMPLOYEE
const deleteEmployee = async (req, res) => {
  try {
    // Only OWNER can delete employees
    if (req.user.role !== 'OWNER') {
      return res.status(403).json({ 
        message: 'Only owner can delete employees' 
      })
    }

    const { id } = req.params

    await prisma.user.delete({
      where: { id: parseInt(id) }
    })

    res.json({ message: 'Employee removed successfully!' })

  } catch (error) {
    res.status(500).json({ message: 'Something went wrong' })
  }
}

module.exports = { addEmployee, getAllEmployees, updateEmployee, deleteEmployee }
