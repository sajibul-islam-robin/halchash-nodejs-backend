import express from 'express';
import { Product } from '../models/halchash_models.js';
import { authenticateAdmin } from '../middleware/auth.js';
import { logActivity } from '../middleware/activityLog.js';

const router = express.Router();

// Public: Get featured (hero) products
router.get('/', async (req, res) => {
    try {
        const products = await Product.find({ hero_order: { $exists: true, $ne: null }, is_active: true })
            .populate('category_id', 'name slug')
            .sort({ hero_order: 1, created_at: -1 });

        res.json({ success: true, products });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Admin routes
router.use(authenticateAdmin);
router.use(logActivity);

// Get all products with hero info (admin)
router.get('/admin/all', async (req, res) => {
    try {
        const products = await Product.find()
            .populate('category_id', 'name slug')
            .sort({ created_at: -1 });
        res.json({ success: true, products });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Add product to hero section (set hero_order)
router.post('/', async (req, res) => {
    try {
        const { productId, order } = req.body;
        if (!productId) return res.status(400).json({ success: false, error: 'productId is required' });

        const product = await Product.findById(productId);
        if (!product) return res.status(404).json({ success: false, error: 'Product not found' });

        product.hero_order = order !== undefined && order !== null ? parseInt(order) : 1;
        await product.save();

        res.json({ success: true, product });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update hero order for a product
router.put('/:id', async (req, res) => {
    try {
        const { order } = req.body;
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ success: false, error: 'Product not found' });

        product.hero_order = order !== undefined && order !== null ? parseInt(order) : null;
        await product.save();

        res.json({ success: true, product });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Remove product from hero section
router.delete('/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ success: false, error: 'Product not found' });

        product.hero_order = null;
        await product.save();

        res.json({ success: true, product });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
