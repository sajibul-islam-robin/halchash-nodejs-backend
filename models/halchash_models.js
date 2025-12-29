import mongoose from 'mongoose';
const { Schema } = mongoose;

// Admin Schema
const adminSchema = new Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  full_name: { type: String, required: true },
  role: { type: String, enum: ['super_admin', 'admin', 'staff'], default: 'admin' },
  is_active: { type: Boolean, default: true }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

export const Admin = mongoose.model('Admin', adminSchema);

// User Schema
const userSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String },
  address: { type: String },
  avatar: { type: String },
  is_blocked: { type: Boolean, default: false },
  blocked_reason: { type: String }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

export const User = mongoose.model('User', userSchema);

// Category Schema
const categorySchema = new Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  icon: { type: String },
  image: { type: String },
  description: { type: String },
  color: { type: String },
  is_active: { type: Boolean, default: true },
  parent_id: { type: Schema.Types.ObjectId, ref: 'Category', default: null } // For subcategories
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

export const Category = mongoose.model('Category', categorySchema);

// Product Schema
const productSchema = new Schema({
  category_id: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
  subcategory_id: { type: Schema.Types.ObjectId, ref: 'Category' },
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  description: { type: String },
  price: { type: Number, required: true },
  buying_price: { type: Number, default: 0.00 },
  discount_price: { type: Number },
  discount: { type: Number, default: 0 },
  image: { type: String },
  images: {
    type: [String],
    validate: {
      validator: function (v) {
        return v.length >= 0 && v.length <= 4;
      },
      message: 'Product must have 0 to 4 images'
    }
  },
  features: [String],
  rating: { type: Number, default: 0.00 },
  reviews_count: { type: Number, default: 0 },
  in_stock: { type: Boolean, default: true },
  stock_quantity: { type: Number, default: 0 },
  low_stock_threshold: { type: Number, default: 10 },
  badge: { type: String },
  is_active: { type: Boolean, default: true },
  hero_order: { type: Number },
  brand: { type: String },
  supplier: { type: String }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

export const Product = mongoose.model('Product', productSchema);

// Product Variant Schema
const productVariantSchema = new Schema({
  product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  size_name: { type: String, required: true },
  size_type: { type: String, default: 'standard' },
  color: { type: String },
  stock_quantity: { type: Number, default: 0 },
  price: { type: Number },
  sku: { type: String },
  is_active: { type: Boolean, default: true }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

export const ProductVariant = mongoose.model('ProductVariant', productVariantSchema);

// Coupon Schema
const couponSchema = new Schema({
  code: { type: String, required: true, unique: true },
  discount_percentage: { type: Number, required: true, min: 0, max: 100 },
  discount_amount: { type: Number },
  description: { type: String },
  expiry_date: { type: Date },
  min_purchase_amount: { type: Number, default: 0 },
  max_discount_amount: { type: Number },
  usage_limit: { type: Number },
  used_count: { type: Number, default: 0 },
  is_active: { type: Boolean, default: true },
  created_by: { type: Schema.Types.ObjectId, ref: 'Admin', required: true }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

export const Coupon = mongoose.model('Coupon', couponSchema);

// Order Schema
const orderSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User' },
  order_number: { type: String, required: true, unique: true },
  total_amount: { type: Number, required: true },
  shipping_cost: { type: Number, default: 60.00 },
  delivery_area: {
    type: String,
    enum: ['inside_dhaka', 'outside_dhaka'],
    default: 'outside_dhaka'
  },
  status: {
    type: String,
    enum: ['pending', 'shipping', 'cancelled', 'delivered'],
    default: 'pending'
  },
  payment_status: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  payment_method: { type: String },
  shipping_name: { type: String, required: true },
  shipping_email: { type: String, required: true },
  shipping_phone: { type: String, required: true },
  shipping_address: { type: String, required: true },
  coupon_id: { type: Schema.Types.ObjectId, ref: 'Coupon' },
  discount_amount: { type: Number, default: 0.00 },
  refund_reason: { type: String },
  refund_amount: { type: Number }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

export const Order = mongoose.model('Order', orderSchema);

// Order Item Schema
const orderItemSchema = new Schema({
  order_id: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
  product_id: { type: Schema.Types.ObjectId, ref: 'Product' },
  variant_id: { type: Schema.Types.ObjectId, ref: 'ProductVariant' },
  product_name: { type: String, required: true },
  product_price: { type: Number, required: true },
  buying_price: { type: Number, default: 0.00 },
  quantity: { type: Number, required: true },
  subtotal: { type: Number, required: true },
  created_at: { type: Date, default: Date.now }
});

export const OrderItem = mongoose.model('OrderItem', orderItemSchema);

// Cart Schema
const cartSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User' },
  product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  variant_id: { type: Schema.Types.ObjectId, ref: 'ProductVariant' },
  quantity: { type: Number, default: 1 },
  session_id: { type: String }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

export const Cart = mongoose.model('Cart', cartSchema);

// Review Schema
const reviewSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  order_id: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String },
  is_approved: { type: Boolean, default: false },
  admin_response: { type: String }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

export const Review = mongoose.model('Review', reviewSchema);

// Wishlist Schema
const wishlistSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

export const Wishlist = mongoose.model('Wishlist', wishlistSchema);

// Blocked User Schema
const blockedUserSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  reason: { type: String },
  blocked_by: { type: Schema.Types.ObjectId, ref: 'Admin', required: true },
  blocked_at: { type: Date, default: Date.now }
});

export const BlockedUser = mongoose.model('BlockedUser', blockedUserSchema);

// Coupon Usage Schema
const couponUsageSchema = new Schema({
  coupon_id: { type: Schema.Types.ObjectId, ref: 'Coupon', required: true },
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  order_id: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
  discount_amount: { type: Number, required: true },
  used_at: { type: Date, default: Date.now }
});

export const CouponUsage = mongoose.model('CouponUsage', couponUsageSchema);

// Activity Log Schema
const activityLogSchema = new Schema({
  admin_id: { type: Schema.Types.ObjectId, ref: 'Admin', required: true },
  action: { type: String, required: true },
  details: { type: Schema.Types.Mixed },
  ip_address: { type: String },
  user_agent: { type: String }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

export const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

// Banner/Hero Section Schema
const bannerSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String },
  image: { type: String, required: true },
  link: { type: String },
  order: { type: Number, default: 0 },
  is_active: { type: Boolean, default: true },
  created_by: { type: Schema.Types.ObjectId, ref: 'Admin' }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

export const Banner = mongoose.model('Banner', bannerSchema);

// Feedback Schema
const feedbackSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User' },
  name: { type: String },
  email: { type: String },
  subject: { type: String },
  message: { type: String, required: true },
  type: { type: String, enum: ['suggestion', 'complaint', 'other'], default: 'other' },
  status: { type: String, enum: ['new', 'read', 'resolved'], default: 'new' },
  admin_response: { type: String }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

export const Feedback = mongoose.model('Feedback', feedbackSchema);

