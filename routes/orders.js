import express from 'express';
import { Order, OrderItem, Product, User, Coupon } from '../models/halchash_models.js';
import { authenticateAdmin, authenticateUser } from '../middleware/auth.js';
import { logActivity } from '../middleware/activityLog.js';

const router = express.Router();

// Public (user) route - create order
router.post('/create', authenticateUser, async (req, res) => {
  try {
    const { customer, items, totals, delivery_area } = req.body;

    if (!customer || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Customer info and at least one item are required',
      });
    }

    const userId = req.user?._id || null;

    let computedSubtotal = 0;
    const orderItemsData = [];

    for (const item of items) {
      const productId = item.id || item.product_id;
      if (!productId) continue;

      const product = await Product.findById(productId);
      if (!product) continue;

      const quantity = item.quantity || 1;
      const unitPrice =
        product.discount_price !== undefined && product.discount_price !== null
          ? product.discount_price
          : product.price;

      const lineSubtotal = unitPrice * quantity;
      computedSubtotal += lineSubtotal;

      orderItemsData.push({
        product,
        quantity,
        unitPrice,
        subtotal: lineSubtotal,
      });
    }

    if (orderItemsData.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid products found for this order',
      });
    }

    // Calculate shipping cost based on delivery area
    let shippingCost = 60; // Default: inside Dhaka = 60 tk
    if (delivery_area === 'outside_dhaka') {
      shippingCost = 120;
    } else if (delivery_area === 'inside_dhaka') {
      shippingCost = 60;
    }

    const totalAmount = computedSubtotal + shippingCost;

    const orderNumber = `HAL-${Date.now()}-${Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0')}`;

    const order = new Order({
      user_id: userId,
      order_number: orderNumber,
      total_amount: totalAmount,
      shipping_cost: shippingCost,
      delivery_area: delivery_area || 'outside_dhaka',
      status: 'pending',
      payment_status: 'pending',
      shipping_name: customer.name,
      shipping_email: customer.email,
      shipping_phone: customer.phone,
      shipping_address: customer.address,
    });

    await order.save();

    const orderItemsDocs = [];
    for (const item of orderItemsData) {
      const orderItem = new OrderItem({
        order_id: order._id,
        product_id: item.product._id,
        product_name: item.product.name,
        product_price: item.unitPrice,
        quantity: item.quantity,
        subtotal: item.subtotal,
      });
      await orderItem.save();
      orderItemsDocs.push(orderItem);
    }

    res.status(201).json({
      success: true,
      order: {
        ...order.toObject(),
        items: orderItemsDocs,
      },
    });
  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// User route - get current user's orders
router.get('/my', authenticateUser, async (req, res) => {
  try {
    const { status } = req.query;
    const query = { user_id: req.user._id };

    if (status && status !== 'all') {
      query.status = status;
    }

    const orders = await Order.find(query).sort({ created_at: -1 });

    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const items = await OrderItem.find({ order_id: order._id });

        const itemsCount = items.reduce((sum, item) => sum + (item.quantity || 0), 0);

        return {
          id: order._id,
          order_number: order.order_number,
          total_amount: order.total_amount,
          status: order.status,
          created_at: order.created_at,
          items_count: itemsCount,
          items: items.map((item) => ({
            id: item._id,
            product_name: item.product_name,
            quantity: item.quantity,
            subtotal: item.subtotal,
          })),
        };
      })
    );

    res.json({
      success: true,
      orders: ordersWithItems,
    });
  } catch (error) {
    console.error('Fetch my orders error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin routes (must come after public routes)
router.get('/admin/all', authenticateAdmin, logActivity, async (req, res) => {
  try {
    const { page = 1, limit = 50, status, payment_status, search } = req.query;
    const query = {};

    if (status) query.status = status;
    if (payment_status) query.payment_status = payment_status;
    if (search) {
      query.$or = [
        { order_number: { $regex: search, $options: 'i' } },
        { shipping_name: { $regex: search, $options: 'i' } },
        { shipping_email: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const orders = await Order.find(query)
      .populate('user_id', 'name email')
      .populate('coupon_id', 'code')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(query);

    // Get order items for each order
    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const items = await OrderItem.find({ order_id: order._id })
          .populate('product_id', 'name image');
        return { ...order.toObject(), items };
      })
    );

    res.json({
      success: true,
      orders: ordersWithItems,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Admin fetch orders error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single order (admin)
router.get('/admin/:id', authenticateAdmin, logActivity, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user_id', 'name email phone')
      .populate('coupon_id', 'code discount_percentage');

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    const items = await OrderItem.find({ order_id: order._id })
      .populate('product_id', 'name image');

    res.json({
      success: true,
      order: { ...order.toObject(), items }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update order status (admin)
router.put('/admin/:id/status', authenticateAdmin, logActivity, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'shipping', 'cancelled', 'delivered'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status'
      });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('user_id', 'name email');

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    res.json({
      success: true,
      order
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update payment status
router.put('/:id/payment-status', async (req, res) => {
  try {
    const { payment_status } = req.body;
    const validStatuses = ['pending', 'paid', 'failed', 'refunded'];

    if (!validStatuses.includes(payment_status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payment status'
      });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { payment_status },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    res.json({
      success: true,
      order
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Process refund
router.post('/:id/refund', async (req, res) => {
  try {
    const { refund_amount, refund_reason } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    order.status = 'refunded';
    order.payment_status = 'refunded';
    order.refund_amount = refund_amount || order.total_amount;
    order.refund_reason = refund_reason;

    await order.save();

    res.json({
      success: true,
      order
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Generate invoice number (for PDF generation later)
router.get('/:id/invoice', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user_id', 'name email phone address')
      .populate('coupon_id', 'code');

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    const items = await OrderItem.find({ order_id: order._id })
      .populate('product_id', 'name');

    res.json({
      success: true,
      invoice: {
        order_number: order.order_number,
        order_date: order.created_at,
        customer: order.user_id,
        shipping: {
          name: order.shipping_name,
          email: order.shipping_email,
          phone: order.shipping_phone,
          address: order.shipping_address
        },
        items,
        subtotal: order.total_amount - order.shipping_cost + order.discount_amount,
        shipping_cost: order.shipping_cost,
        discount_amount: order.discount_amount,
        total_amount: order.total_amount,
        coupon: order.coupon_id
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

