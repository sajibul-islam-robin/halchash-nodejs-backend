import express from 'express';
import { Coupon, CouponUsage } from '../models/halchash_models.js';
import { authenticateAdmin } from '../middleware/auth.js';
import { logActivity } from '../middleware/activityLog.js';

const router = express.Router();

// Admin routes
router.use(authenticateAdmin);
router.use(logActivity);

// Get all coupons
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, active } = req.query;
    const query = {};

    if (active === 'true') {
      query.is_active = true;
      query.$or = [
        { expiry_date: { $exists: false } },
        { expiry_date: { $gte: new Date() } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const coupons = await Coupon.find(query)
      .populate('created_by', 'full_name username')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Coupon.countDocuments(query);

    // Get usage stats for each coupon
    const couponsWithStats = await Promise.all(
      coupons.map(async (coupon) => {
        const usageCount = await CouponUsage.countDocuments({ coupon_id: coupon._id });
        return {
          ...coupon.toObject(),
          usage_count: usageCount,
          remaining_uses: coupon.usage_limit ? coupon.usage_limit - usageCount : null
        };
      })
    );

    res.json({
      success: true,
      coupons: couponsWithStats,
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

// Get single coupon
router.get('/:id', async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id)
      .populate('created_by', 'full_name username');

    if (!coupon) {
      return res.status(404).json({
        success: false,
        error: 'Coupon not found'
      });
    }

    const usageCount = await CouponUsage.countDocuments({ coupon_id: coupon._id });
    const usages = await CouponUsage.find({ coupon_id: coupon._id })
      .populate('user_id', 'name email')
      .populate('order_id', 'order_number total_amount')
      .sort({ used_at: -1 });

    res.json({
      success: true,
      coupon: {
        ...coupon.toObject(),
        usage_count: usageCount,
        usages
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create coupon
router.post('/', async (req, res) => {
  try {
    const {
      code,
      discount_percentage,
      discount_amount,
      description,
      expiry_date,
      min_purchase_amount,
      max_discount_amount,
      usage_limit
    } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Coupon code is required'
      });
    }

    if (!discount_percentage && !discount_amount) {
      return res.status(400).json({
        success: false,
        error: 'Either discount percentage or discount amount is required'
      });
    }

    const coupon = new Coupon({
      code: code.toUpperCase(),
      discount_percentage: discount_percentage || null,
      discount_amount: discount_amount || null,
      description,
      expiry_date: expiry_date ? new Date(expiry_date) : null,
      min_purchase_amount: min_purchase_amount || 0,
      max_discount_amount,
      usage_limit: usage_limit || null,
      created_by: req.admin._id
    });

    await coupon.save();
    await coupon.populate('created_by', 'full_name username');

    res.status(201).json({
      success: true,
      coupon
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'Coupon code already exists'
      });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update coupon
router.put('/:id', async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({
        success: false,
        error: 'Coupon not found'
      });
    }

    const {
      code,
      discount_percentage,
      discount_amount,
      description,
      expiry_date,
      min_purchase_amount,
      max_discount_amount,
      usage_limit,
      is_active
    } = req.body;

    if (code) coupon.code = code.toUpperCase();
    if (discount_percentage !== undefined) coupon.discount_percentage = discount_percentage;
    if (discount_amount !== undefined) coupon.discount_amount = discount_amount;
    if (description !== undefined) coupon.description = description;
    if (expiry_date !== undefined) coupon.expiry_date = expiry_date ? new Date(expiry_date) : null;
    if (min_purchase_amount !== undefined) coupon.min_purchase_amount = min_purchase_amount;
    if (max_discount_amount !== undefined) coupon.max_discount_amount = max_discount_amount;
    if (usage_limit !== undefined) coupon.usage_limit = usage_limit;
    if (typeof is_active === 'boolean') coupon.is_active = is_active;

    await coupon.save();
    await coupon.populate('created_by', 'full_name username');

    res.json({
      success: true,
      coupon
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete coupon
router.delete('/:id', async (req, res) => {
  try {
    await Coupon.findByIdAndDelete(req.params.id);
    res.json({
      success: true,
      message: 'Coupon deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

