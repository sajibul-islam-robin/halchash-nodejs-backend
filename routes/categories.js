import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { Category, Product } from '../models/halchash_models.js';
import { authenticateAdmin } from '../middleware/auth.js';
import { logActivity } from '../middleware/activityLog.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads/categories'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'category-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
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

// Public route - Get all categories
router.get('/', async (req, res) => {
  try {
    const categories = await Category.find({ is_active: true })
      .sort({ created_at: -1 });
    res.json({ success: true, categories });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Public route - Get category with subcategories
router.get('/:id', async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    const subcategories = await Category.find({ parent_id: category._id, is_active: true });
    res.json({
      success: true,
      category: { ...category.toObject(), subcategories }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin routes
router.use(authenticateAdmin);
router.use(logActivity);

// Get all categories (admin)
router.get('/admin/all', async (req, res) => {
  try {
    const categories = await Category.find()
      .sort({ created_at: -1 });

    // Get subcategories for each category
    const categoriesWithSubs = await Promise.all(
      categories.map(async (cat) => {
        const subcategories = await Category.find({ parent_id: cat._id });
        return { ...cat.toObject(), subcategories };
      })
    );

    res.json({ success: true, categories: categoriesWithSubs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create category
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { name, icon, description, color, parent_id } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Category name is required'
      });
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const image = req.file ? `/uploads/categories/${req.file.filename}` : '';

    const category = new Category({
      name,
      slug,
      icon,
      image,
      description,
      color,
      parent_id: parent_id || null
    });

    await category.save();
    res.status(201).json({ success: true, category });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'Category with this name already exists'
      });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update category
router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    const { name, icon, description, color, parent_id, is_active } = req.body;

    if (name) {
      category.name = name;
      category.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }
    if (icon !== undefined) category.icon = icon;
    if (description !== undefined) category.description = description;
    if (color !== undefined) category.color = color;
    if (parent_id !== undefined) category.parent_id = parent_id || null;
    if (typeof is_active === 'boolean') category.is_active = is_active;
    if (req.file) {
      category.image = `/uploads/categories/${req.file.filename}`;
    }

    await category.save();
    res.json({ success: true, category });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete category
router.delete('/:id', async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    // Check if category has products
    const productCount = await Product.countDocuments({ category_id: category._id });
    if (productCount > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete category. ${productCount} product(s) are using this category.`
      });
    }

    // Check if category has subcategories
    const subcategoryCount = await Category.countDocuments({ parent_id: category._id });
    if (subcategoryCount > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete category. It has ${subcategoryCount} subcategory(ies).`
      });
    }

    await Category.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Category deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

