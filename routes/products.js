import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { Product, ProductVariant, Category } from '../models/halchash_models.js';
import { authenticateAdmin } from '../middleware/auth.js';
import { logActivity } from '../middleware/activityLog.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads/products'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'product-' + uniqueSuffix + path.extname(file.originalname));
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

// Public route - Get all products (for frontend)
router.get('/', async (req, res) => {
  try {
    const { category, search, page = 1, limit = 20, featured } = req.query;
    const query = { is_active: true };

    if (category) query.category_id = category;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    if (featured === 'true') {
      query.hero_order = { $exists: true, $ne: null };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const products = await Product.find(query)
      .populate('category_id', 'name slug')
      .sort({ hero_order: 1, created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Product.countDocuments(query);

    res.json({
      success: true,
      products,
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

// Public route - Get single product
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('category_id', 'name slug')
      .populate('subcategory_id', 'name slug');

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    const variants = await ProductVariant.find({ product_id: product._id, is_active: true });

    res.json({
      success: true,
      product: { ...product.toObject(), variants }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin routes
router.use(authenticateAdmin);
router.use(logActivity);

// Get all products (admin)
router.get('/admin/all', async (req, res) => {
  try {
    const { page = 1, limit = 50, search, category } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    if (category) query.category_id = category;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const products = await Product.find(query)
      .populate('category_id', 'name')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Product.countDocuments(query);

    res.json({
      success: true,
      products,
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

// Create product
router.post('/', upload.array('images', 4), async (req, res) => {
  try {
    const {
      category_id,
      subcategory_id,
      name,
      description,
      price,
      buying_price,
      discount_price,
      discount,
      features,
      stock_quantity,
      low_stock_threshold,
      badge,
      hero_order,
      brand,
      supplier
    } = req.body;

    if (!category_id || !name || !price) {
      return res.status(400).json({
        success: false,
        error: 'Category, name, and price are required'
      });
    }

    // Check image limit
    if (req.files && req.files.length > 4) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 4 images allowed per product'
      });
    }

    // Generate slug
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const images = req.files ? req.files.map(file => `/uploads/products/${file.filename}`) : [];
    const image = images[0] || '';

    const product = new Product({
      category_id,
      subcategory_id: subcategory_id || null,
      name,
      slug,
      description,
      price: parseFloat(price),
      buying_price: buying_price ? parseFloat(buying_price) : 0,
      discount_price: discount_price ? parseFloat(discount_price) : null,
      discount: discount ? parseFloat(discount) : 0,
      image,
      images,
      features: features ? (Array.isArray(features) ? features : JSON.parse(features)) : [],
      stock_quantity: parseInt(stock_quantity) || 0,
      low_stock_threshold: parseInt(low_stock_threshold) || 10,
      in_stock: parseInt(stock_quantity) > 0,
      badge,
      hero_order: hero_order ? parseInt(hero_order) : null,
      brand,
      supplier
    });

    await product.save();
    await product.populate('category_id', 'name');

    res.status(201).json({
      success: true,
      product
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update product
router.put('/:id', upload.array('images', 4), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    // Check image limit
    if (req.files && req.files.length > 4) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 4 images allowed per product'
      });
    }

    const {
      category_id,
      subcategory_id,
      name,
      description,
      price,
      buying_price,
      discount_price,
      discount,
      features,
      stock_quantity,
      low_stock_threshold,
      badge,
      hero_order,
      is_active,
      brand,
      supplier
    } = req.body;

    if (name) {
      product.name = name;
      product.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }
    if (category_id) product.category_id = category_id;
    if (subcategory_id !== undefined) product.subcategory_id = subcategory_id || null;
    if (description !== undefined) product.description = description;
    if (price !== undefined) product.price = parseFloat(price);
    if (buying_price !== undefined) product.buying_price = parseFloat(buying_price);
    if (discount_price !== undefined) product.discount_price = discount_price ? parseFloat(discount_price) : null;
    if (discount !== undefined) product.discount = parseFloat(discount);
    if (features !== undefined) {
      product.features = Array.isArray(features) ? features : JSON.parse(features);
    }
    if (stock_quantity !== undefined) {
      product.stock_quantity = parseInt(stock_quantity);
      product.in_stock = parseInt(stock_quantity) > 0;
    }
    if (low_stock_threshold !== undefined) product.low_stock_threshold = parseInt(low_stock_threshold);
    if (badge !== undefined) product.badge = badge;
    if (hero_order !== undefined) product.hero_order = hero_order ? parseInt(hero_order) : null;
    if (typeof is_active === 'boolean') product.is_active = is_active;
    if (brand !== undefined) product.brand = brand;
    if (supplier !== undefined) product.supplier = supplier;

    if (req.files && req.files.length > 0) {
      const images = req.files.map(file => `/uploads/products/${file.filename}`);
      product.images = images;
      product.image = images[0];
    }

    await product.save();
    await product.populate('category_id', 'name');

    res.json({
      success: true,
      product
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete product
router.delete('/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    // Delete variants
    await ProductVariant.deleteMany({ product_id: req.params.id });

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Product Variants Routes
router.post('/:id/variants', async (req, res) => {
  try {
    const { size_name, size_type, color, stock_quantity, price, sku } = req.body;

    const variant = new ProductVariant({
      product_id: req.params.id,
      size_name,
      size_type: size_type || 'standard',
      color,
      stock_quantity: parseInt(stock_quantity) || 0,
      price: price ? parseFloat(price) : null,
      sku
    });

    await variant.save();
    res.status(201).json({ success: true, variant });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/variants/:variantId', async (req, res) => {
  try {
    const variant = await ProductVariant.findByIdAndUpdate(
      req.params.variantId,
      req.body,
      { new: true }
    );
    if (!variant) {
      return res.status(404).json({ success: false, error: 'Variant not found' });
    }
    res.json({ success: true, variant });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/variants/:variantId', async (req, res) => {
  try {
    await ProductVariant.findByIdAndDelete(req.params.variantId);
    res.json({ success: true, message: 'Variant deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

