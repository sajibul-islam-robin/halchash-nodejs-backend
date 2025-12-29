import express from 'express';
import { Order, OrderItem, Product, User, Review, Coupon } from '../models/halchash_models.js';
import { authenticateAdmin } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateAdmin);

// Dashboard overview
router.get('/dashboard', async (req, res) => {
  try {
    const { period = '30' } = req.query; // days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    // Sales analytics - Only count delivered orders in total_sales, excluding shipping cost
    const totalSales = await Order.aggregate([
      { $match: { created_at: { $gte: startDate }, status: 'delivered' } },
      {
        $group: {
          _id: null,
          total: {
            $sum: { $subtract: ['$total_amount', '$shipping_cost'] }
          }
        }
      }
    ]);

    // Order status counts
    const totalPlacedOrders = await Order.countDocuments({
      created_at: { $gte: startDate }
    });

    const totalPendingOrders = await Order.countDocuments({
      status: 'pending',
      created_at: { $gte: startDate }
    });

    const totalShippingOrders = await Order.countDocuments({
      status: 'shipping',
      created_at: { $gte: startDate }
    });

    const totalDeliveredOrders = await Order.countDocuments({
      status: 'delivered',
      created_at: { $gte: startDate }
    });

    const totalCancelledOrders = await Order.countDocuments({
      status: 'cancelled',
      created_at: { $gte: startDate }
    });

    // User analytics
    const totalUsers = await User.countDocuments();
    const newUsers = await User.countDocuments({
      created_at: { $gte: startDate }
    });
    const blockedUsers = await User.countDocuments({ is_blocked: true });

    // Product analytics
    const totalProducts = await Product.countDocuments();
    const lowStockProducts = await Product.countDocuments({
      stock_quantity: { $lte: 10 },
      in_stock: true
    });

    // Revenue trends (daily for last 30 days) - Only delivered orders
    const revenueTrends = await Order.aggregate([
      {
        $match: {
          created_at: { $gte: startDate },
          status: 'delivered'
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$created_at' } },
          revenue: { $sum: { $subtract: ['$total_amount', '$shipping_cost'] } },
          orders: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Top selling products
    const topProducts = await OrderItem.aggregate([
      {
        $lookup: {
          from: 'orders',
          localField: 'order_id',
          foreignField: '_id',
          as: 'order'
        }
      },
      { $unwind: '$order' },
      {
        $match: {
          'order.created_at': { $gte: startDate },
          'order.status': 'delivered'
        }
      },
      {
        $group: {
          _id: '$product_id',
          total_sold: { $sum: '$quantity' },
          revenue: { $sum: '$subtotal' }
        }
      },
      { $sort: { total_sold: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $project: {
          product_id: '$_id',
          product_name: '$product.name',
          product_image: '$product.image',
          total_sold: 1,
          revenue: 1
        }
      }
    ]);

    // Average order value
    const avgOrderValue = totalSales[0]?.total
      ? (totalSales[0].total / totalDeliveredOrders).toFixed(2)
      : 0;

    res.json({
      success: true,
      analytics: {
        sales: {
          total_sales: totalSales[0]?.total || 0,
          total_placed_orders: totalPlacedOrders,
          total_pending_orders: totalPendingOrders,
          total_shipping_orders: totalShippingOrders,
          total_delivered_orders: totalDeliveredOrders,
          total_cancelled_orders: totalCancelledOrders,
          average_order_value: parseFloat(avgOrderValue),
          revenue_trends: revenueTrends
        },
        users: {
          total_users: totalUsers,
          new_users: newUsers,
          blocked_users: blockedUsers
        },
        products: {
          total_products: totalProducts,
          low_stock_products: lowStockProducts
        },
        top_products: topProducts
      }
    });
  } catch (error) {
    console.error('Analytics dashboard error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Sales analytics
router.get('/sales', async (req, res) => {
  try {
    const { start_date, end_date, group_by = 'day' } = req.query;
    let matchQuery = { status: { $ne: 'cancelled' } };

    if (start_date && end_date) {
      matchQuery.created_at = {
        $gte: new Date(start_date),
        $lte: new Date(end_date)
      };
    }

    let dateFormat = '%Y-%m-%d';
    if (group_by === 'month') dateFormat = '%Y-%m';
    else if (group_by === 'year') dateFormat = '%Y';

    const salesData = await Order.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: '$created_at' } },
          revenue: { $sum: '$total_amount' },
          orders: { $sum: 1 },
          avg_order_value: { $avg: '$total_amount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      sales_data: salesData
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Inventory analytics
router.get('/inventory', async (req, res) => {
  try {
    const lowStockProducts = await Product.find({
      stock_quantity: { $lte: 10 },
      in_stock: true
    }).select('name stock_quantity low_stock_threshold image');

    const outOfStockProducts = await Product.find({
      stock_quantity: 0,
      in_stock: false
    }).select('name image');

    res.json({
      success: true,
      inventory: {
        low_stock: lowStockProducts,
        out_of_stock: outOfStockProducts
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

