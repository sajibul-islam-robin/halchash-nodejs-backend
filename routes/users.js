import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { User, BlockedUser, Cart, Wishlist, Order } from '../models/halchash_models.js';
import { authenticateAdmin } from '../middleware/auth.js';
import { logActivity } from '../middleware/activityLog.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for avatar uploads
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads/avatars'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed'));
  }
});

// Admin routes
router.use(authenticateAdmin);
router.use(logActivity);

// Get all users
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, search, blocked } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    if (blocked === 'true') {
      query.is_blocked = true;
    } else if (blocked === 'false') {
      query.is_blocked = false;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const users = await User.find(query)
      .select('-password')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      users,
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

// Get single user
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Get user stats
    const ordersCount = await Order.countDocuments({ user_id: user._id });
    const cartItemsCount = await Cart.countDocuments({ user_id: user._id });
    const wishlistItemsCount = await Wishlist.countDocuments({ user_id: user._id });

    res.json({
      success: true,
      user: {
        ...user.toObject(),
        stats: {
          orders: ordersCount,
          cart_items: cartItemsCount,
          wishlist_items: wishlistItemsCount
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Block user
router.post('/:id/block', async (req, res) => {
  try {
    const { reason } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    user.is_blocked = true;
    user.blocked_reason = reason;
    await user.save();

    // Log blocking action
    await BlockedUser.create({
      user_id: user._id,
      reason,
      blocked_by: req.admin._id
    });

    res.json({
      success: true,
      message: 'User blocked successfully',
      user
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Unblock user
router.post('/:id/unblock', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    user.is_blocked = false;
    user.blocked_reason = null;
    await user.save();

    res.json({
      success: true,
      message: 'User unblocked successfully',
      user
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get user orders
router.get('/:id/orders', async (req, res) => {
  try {
    const orders = await Order.find({ user_id: req.params.id })
      .sort({ created_at: -1 });

    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const items = await OrderItem.find({ order_id: order._id })
          .populate('product_id', 'name image');
        return { ...order.toObject(), items };
      })
    );

    res.json({
      success: true,
      orders: ordersWithItems
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get user cart
router.get('/:id/cart', async (req, res) => {
  try {
    const cartItems = await Cart.find({ user_id: req.params.id })
      .populate('product_id');

    res.json({
      success: true,
      cart: cartItems
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get user wishlist
router.get('/:id/wishlist', async (req, res) => {
  try {
    const wishlistItems = await Wishlist.find({ user_id: req.params.id })
      .populate('product_id');

    res.json({
      success: true,
      wishlist: wishlistItems
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update user
router.put('/:id', async (req, res) => {
  try {
    const { name, phone, address } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name, phone, address },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Upload avatar
router.post('/:id/avatar', avatarUpload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    user.avatar = avatarUrl;
    await user.save();

    res.json({
      success: true,
      avatar: avatarUrl,
      message: 'Avatar uploaded successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

