const mongoose = require('mongoose');
const { Schema } = mongoose;

// Admin Schema
const adminSchema = new Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  full_name: { type: String, required: true },
  role: { type: String, enum: ['super_admin', 'admin'], default: 'admin' }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

const Admin = mongoose.model('Admin', adminSchema);

// User Schema
const userSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String },
  address: { type: String },
  avatar: { type: String }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

const User = mongoose.model('User', userSchema);

// Category Schema
const categorySchema = new Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  icon: { type: String },
  description: { type: String },
  color: { type: String },
  is_active: { type: Boolean, default: true }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

const Category = mongoose.model('Category', categorySchema);

// Product Schema
const productSchema = new Schema({
  category_id: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  description: { type: String },
  price: { type: Number, required: true },
  buying_price: { type: Number, default: 0.00 },
  discount_price: { type: Number },
  discount: { type: Number, default: 0 },
  image: { type: String },
  images: [String], // Mapped from JSON array
  features: [String], // Mapped from JSON array
  rating: { type: Number, default: 0.00 },
  reviews_count: { type: Number, default: 0 },
  in_stock: { type: Boolean, default: true },
  stock_quantity: { type: Number, default: 0 },
  badge: { type: String },
  is_active: { type: Boolean, default: true },
  hero_order: { type: Number }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

const Product = mongoose.model('Product', productSchema);

// Product Variant Schema
const productVariantSchema = new Schema({
  product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  size_name: { type: String, required: true },
  size_type: { type: String, default: 'standard' },
  stock_quantity: { type: Number, default: 0 },
  price: { type: Number },
  sku: { type: String },
  is_active: { type: Boolean, default: true }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

const ProductVariant = mongoose.model('ProductVariant', productVariantSchema);

// Coupon Schema
const couponSchema = new Schema({
  code: { type: String, required: true, unique: true },
  discount_percentage: { type: Number, required: true, min: 0, max: 100 },
  description: { type: String },
  expiry_date: { type: Date },
  is_active: { type: Boolean, default: true },
  created_by: { type: Schema.Types.ObjectId, ref: 'Admin', required: true }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

const Coupon = mongoose.model('Coupon', couponSchema);

// Order Schema
const orderSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User' },
  order_number: { type: String, required: true, unique: true },
  total_amount: { type: Number, required: true },
  shipping_cost: { type: Number, default: 50.00 },
  status: { 
    type: String, 
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'], 
    default: 'pending' 
  },
  shipping_name: { type: String, required: true },
  shipping_email: { type: String, required: true },
  shipping_phone: { type: String, required: true },
  shipping_address: { type: String, required: true },
  coupon_id: { type: Schema.Types.ObjectId, ref: 'Coupon' },
  discount_amount: { type: Number, default: 0.00 }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

const Order = mongoose.model('Order', orderSchema);

// Order Item Schema
const orderItemSchema = new Schema({
  order_id: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
  product_id: { type: Schema.Types.ObjectId, ref: 'Product' },
  product_name: { type: String, required: true },
  product_price: { type: Number, required: true },
  buying_price: { type: Number, default: 0.00 },
  quantity: { type: Number, required: true },
  subtotal: { type: Number, required: true },
  created_at: { type: Date, default: Date.now }
});

const OrderItem = mongoose.model('OrderItem', orderItemSchema);

// Cart Schema
const cartSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User' },
  product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, default: 1 },
  session_id: { type: String }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

const Cart = mongoose.model('Cart', cartSchema);

// Review Schema
const reviewSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  order_id: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

const Review = mongoose.model('Review', reviewSchema);

// Wishlist Schema
const wishlistSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

const Wishlist = mongoose.model('Wishlist', wishlistSchema);

// Blocked User Schema
const blockedUserSchema = new Schema({
  phone: { type: String, required: true },
  reason: { type: String },
  blocked_by: { type: Schema.Types.ObjectId, ref: 'Admin', required: true },
  blocked_at: { type: Date, default: Date.now }
});

const BlockedUser = mongoose.model('BlockedUser', blockedUserSchema);

// Coupon Usage Schema
const couponUsageSchema = new Schema({
  coupon_id: { type: Schema.Types.ObjectId, ref: 'Coupon', required: true },
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  order_id: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
  discount_amount: { type: Number, required: true },
  used_at: { type: Date, default: Date.now }
});

const CouponUsage = mongoose.model('CouponUsage', couponUsageSchema);

module.exports = {
  Admin,
  User,
  Category,
  Product,
  ProductVariant,
  Coupon,
  Order,
  OrderItem,
  Cart,
  Review,
  Wishlist,
  BlockedUser,
  CouponUsage
};
