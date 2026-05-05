const jwt = require('jsonwebtoken')

module.exports = (req, res, next) => {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ message: 'Please login to continue' })
  try {
    const decoded = jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET)
    if (!decoded.customerId) return res.status(401).json({ message: 'Invalid customer token' })
    req.customer = decoded
    next()
  } catch {
    res.status(401).json({ message: 'Session expired. Please login again.' })
  }
}
