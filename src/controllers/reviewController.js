const prisma = require('../utils/prisma')

// Customer — add or update their review for a product
const addReview = async (req, res) => {
  try {
    const customerId = req.customer.customerId
    const { productId, rating, comment } = req.body
    if (!productId || !rating || rating < 1 || rating > 5)
      return res.status(400).json({ message: 'productId and rating (1-5) are required' })

    // Customer must have a completed order for this product
    const order = await prisma.order.findFirst({
      where: { customerId, productId: parseInt(productId), status: 'COMPLETED' }
    })
    if (!order) return res.status(403).json({ message: 'You can only review products you have purchased' })

    const review = await prisma.review.upsert({
      where: { customerId_productId: { customerId, productId: parseInt(productId) } },
      update: { rating: parseInt(rating), comment: comment || null, isVisible: true },
      create: { customerId, productId: parseInt(productId), rating: parseInt(rating), comment: comment || null },
      include: { customer: { select: { name: true } } }
    })
    res.json({ review })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// Public — get reviews for a product
const getProductReviews = async (req, res) => {
  try {
    const productId = parseInt(req.params.productId)
    const reviews = await prisma.review.findMany({
      where: { productId, isVisible: true },
      include: { customer: { select: { name: true } } },
      orderBy: { createdAt: 'desc' }
    })
    const avg = reviews.length
      ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
      : 0
    res.json({ reviews, average: avg, total: reviews.length })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// Staff (owner) — list all reviews with optional filter
const getAllReviews = async (req, res) => {
  try {
    const reviews = await prisma.review.findMany({
      include: {
        customer: { select: { name: true, phone: true } },
        product:  { select: { name: true, category: { select: { emoji: true, name: true } } } }
      },
      orderBy: { createdAt: 'desc' }
    })
    res.json({ reviews })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// Owner — hide (soft delete) a review
const deleteReview = async (req, res) => {
  try {
    await prisma.review.update({
      where: { id: parseInt(req.params.id) },
      data: { isVisible: false }
    })
    res.json({ message: 'Review hidden' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// Owner — restore a hidden review
const restoreReview = async (req, res) => {
  try {
    await prisma.review.update({
      where: { id: parseInt(req.params.id) },
      data: { isVisible: true }
    })
    res.json({ message: 'Review restored' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

module.exports = { addReview, getProductReviews, getAllReviews, deleteReview, restoreReview }
