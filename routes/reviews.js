import express from 'express';
import { Review, Product, User, Order } from '../models/halchash_models.js';
import { authenticateAdmin } from '../middleware/auth.js';
import { logActivity } from '../middleware/activityLog.js';

const router = express.Router();

// Public route - Get reviews for a product
router.get('/product/:productId', async (req, res) => {
  try {
    const reviews = await Review.find({ 
      product_id: req.params.productId,
      is_approved: true 
    })
      .populate('user_id', 'name avatar')
      .sort({ created_at: -1 });

    res.json({
      success: true,
      reviews
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin routes
router.use(authenticateAdmin);
router.use(logActivity);

// Get all reviews
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, approved, product_id } = req.query;
    const query = {};

    if (approved === 'true') {
      query.is_approved = true;
    } else if (approved === 'false') {
      query.is_approved = false;
    }
    if (product_id) query.product_id = product_id;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const reviews = await Review.find(query)
      .populate('user_id', 'name email')
      .populate('product_id', 'name image')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Review.countDocuments(query);

    res.json({
      success: true,
      reviews,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Approve review
router.post('/:id/approve', async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({
        success: false,
        error: 'Review not found'
      });
    }

    review.is_approved = true;
    await review.save();

    // Update product rating
    const reviews = await Review.find({ 
      product_id: review.product_id, 
      is_approved: true 
    });
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

    await Product.findByIdAndUpdate(review.product_id, {
      rating: avgRating,
      reviews_count: reviews.length
    });

    res.json({
      success: true,
      review
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Reject/Delete review
router.delete('/:id', async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({
        success: false,
        error: 'Review not found'
      });
    }

    const productId = review.product_id;
    await Review.findByIdAndDelete(req.params.id);

    // Update product rating
    const reviews = await Review.find({ 
      product_id: productId, 
      is_approved: true 
    });
    const avgRating = reviews.length > 0 
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
      : 0;

    await Product.findByIdAndUpdate(productId, {
      rating: avgRating,
      reviews_count: reviews.length
    });

    res.json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Respond to review
router.post('/:id/respond', async (req, res) => {
  try {
    const { admin_response } = req.body;
    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { admin_response },
      { new: true }
    );

    if (!review) {
      return res.status(404).json({
        success: false,
        error: 'Review not found'
      });
    }

    res.json({
      success: true,
      review
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

