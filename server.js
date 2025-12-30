import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import cookieParser from 'cookie-parser';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import routes
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import productRoutes from './routes/products.js';
import categoryRoutes from './routes/categories.js';
import orderRoutes from './routes/orders.js';
import userRoutes from './routes/users.js';
import reviewRoutes from './routes/reviews.js';
import couponRoutes from './routes/coupons.js';
import analyticsRoutes from './routes/analytics.js';
import activityLogRoutes from './routes/activityLogs.js';
import wishlistRoutes from './routes/wishlist.js';
import heroRoutes from './routes/hero.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads', 'products');
const uploadsDir_categories = path.join(__dirname, 'uploads', 'categories');
const uploadsDir_avatars = path.join(__dirname, 'uploads', 'avatars');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(uploadsDir_categories)) {
  fs.mkdirSync(uploadsDir_categories, { recursive: true });
}
if (!fs.existsSync(uploadsDir_avatars)) {
  fs.mkdirSync(uploadsDir_avatars, { recursive: true });
}

// Middleware - CORS configuration
// Normalize origin by removing trailing slash for comparison
const normalizeOrigin = (origin) => {
  if (!origin) return null;
  return origin.replace(/\/$/, '');
};

// Get allowed origins (normalized for comparison)
const getAllowedOrigins = () => {
  const origins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://halchash.com',
    'https://www.halchash.com'
  ];
  
  // Add FRONTEND_URL from env if provided (normalized)
  if (process.env.FRONTEND_URL) {
    const envOrigin = normalizeOrigin(process.env.FRONTEND_URL);
    if (!origins.includes(envOrigin)) {
      origins.push(envOrigin);
    }
  }
  
  return origins.map(normalizeOrigin);
};

const allowedOrigins = getAllowedOrigins();

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const normalizedOrigin = normalizeOrigin(origin);
    
    // Check if normalized origin is in allowed list
    if (allowedOrigins.includes(normalizedOrigin)) {
      // Return the exact origin that was requested (not normalized)
      callback(null, origin);
    } else {
      console.error(`CORS blocked origin: ${origin} (normalized: ${normalizedOrigin})`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/halchash')
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/activity-logs', activityLogRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/hero', heroRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

