import express from 'express';
import { ActivityLog, Admin } from '../models/halchash_models.js';
import { authenticateAdmin } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateAdmin);

// Get activity logs
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, admin_id, action } = req.query;
    const query = {};

    if (admin_id) query.admin_id = admin_id;
    if (action) query.action = { $regex: action, $options: 'i' };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const logs = await ActivityLog.find(query)
      .populate('admin_id', 'full_name username email')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await ActivityLog.countDocuments(query);

    res.json({
      success: true,
      logs,
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

// Get logs for current admin
router.get('/me', async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const logs = await ActivityLog.find({ admin_id: req.admin._id })
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await ActivityLog.countDocuments({ admin_id: req.admin._id });

    res.json({
      success: true,
      logs,
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

export default router;

