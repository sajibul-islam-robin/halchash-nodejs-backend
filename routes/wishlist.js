import express from 'express';
import { Wishlist, Product } from '../models/halchash_models.js';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();

// All wishlist routes require an authenticated user
router.use(authenticateUser);

// Get current user's wishlist
router.get('/', async (req, res) => {
  try {
    const items = await Wishlist.find({ user_id: req.user._id })
      .populate('product_id', 'name price discount_price image images');

    const formatted = items.map((item) => ({
      id: item._id,
      product_id: item.product_id?._id,
      product: item.product_id || null,
      created_at: item.created_at,
    }));

    res.json({
      success: true,
      wishlist: formatted,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add product to wishlist
router.post('/', async (req, res) => {
  try {
    const { product_id } = req.body;

    if (!product_id) {
      return res.status(400).json({
        success: false,
        error: 'product_id is required',
      });
    }

    const product = await Product.findById(product_id);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found',
      });
    }

    const existing = await Wishlist.findOne({
      user_id: req.user._id,
      product_id,
    });

    if (existing) {
      return res.json({
        success: true,
        message: 'Already in wishlist',
      });
    }

    const item = new Wishlist({
      user_id: req.user._id,
      product_id,
    });
    await item.save();

    res.status(201).json({
      success: true,
      message: 'Added to wishlist',
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Remove product from wishlist
router.delete('/', async (req, res) => {
  try {
    const { product_id } = req.body;

    if (!product_id) {
      return res.status(400).json({
        success: false,
        error: 'product_id is required',
      });
    }

    await Wishlist.deleteOne({
      user_id: req.user._id,
      product_id,
    });

    res.json({
      success: true,
      message: 'Removed from wishlist',
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;


