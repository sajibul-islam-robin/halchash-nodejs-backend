import express from 'express';
import bcrypt from 'bcryptjs';
import { Admin } from '../models/halchash_models.js';
import { authenticateAdmin, authorizeRole } from '../middleware/auth.js';
import { logActivity } from '../middleware/activityLog.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateAdmin);
router.use(logActivity);

// Get all admins
router.get('/', authorizeRole('super_admin'), async (req, res) => {
  try {
    const admins = await Admin.find().select('-password').sort({ created_at: -1 });
    res.json({ success: true, admins });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create admin
router.post('/', authorizeRole('super_admin'), async (req, res) => {
  try {
    const { username, email, password, full_name, role } = req.body;

    if (!username || !email || !password || !full_name) {
      return res.status(400).json({
        success: false,
        error: 'All fields are required'
      });
    }

    const existingAdmin = await Admin.findOne({ $or: [{ email }, { username }] });
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        error: 'Admin with this email or username already exists'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = new Admin({
      username,
      email,
      password: hashedPassword,
      full_name,
      role: role || 'admin'
    });

    await admin.save();
    const adminData = admin.toObject();
    delete adminData.password;

    res.status(201).json({
      success: true,
      admin: adminData
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update admin
router.put('/:id', authorizeRole('super_admin'), async (req, res) => {
  try {
    const { username, email, full_name, role, is_active, password } = req.body;
    const admin = await Admin.findById(req.params.id);

    if (!admin) {
      return res.status(404).json({
        success: false,
        error: 'Admin not found'
      });
    }

    // If email is provided and different, ensure uniqueness
    if (email && email !== admin.email) {
      const existingByEmail = await Admin.findOne({ email: email });
      if (existingByEmail) {
        return res.status(400).json({ success: false, error: 'Email already in use by another admin' });
      }
      admin.email = email;
    }

    // If username is provided and different, ensure uniqueness
    if (username && username !== admin.username) {
      const existingByUsername = await Admin.findOne({ username: username });
      if (existingByUsername) {
        return res.status(400).json({ success: false, error: 'Username already in use by another admin' });
      }
      admin.username = username;
    }

    if (full_name) admin.full_name = full_name;
    if (role) admin.role = role;
    if (typeof is_active === 'boolean') admin.is_active = is_active;
    if (password) {
      const hashed = await bcrypt.hash(password, 10);
      admin.password = hashed;
    }

    await admin.save();
    const adminData = admin.toObject();
    delete adminData.password;

    res.json({
      success: true,
      admin: adminData
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete admin
router.delete('/:id', authorizeRole('super_admin'), async (req, res) => {
  try {
    if (req.params.id === req.admin._id.toString()) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete your own account'
      });
    }

    const admin = await Admin.findByIdAndDelete(req.params.id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        error: 'Admin not found'
      });
    }

    res.json({
      success: true,
      message: 'Admin deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

