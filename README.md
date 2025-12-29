# Halchash E-commerce Backend

Node.js/Express backend for Halchash e-commerce platform with MongoDB Atlas.

## Setup Instructions

1. **Install Dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Configure Environment Variables**
   Create a `.env` file in the `backend` directory:
   ```env
   MONGODB_URI=your_mongodb_atlas_connection_string
   JWT_SECRET=your-secret-jwt-key-change-this-in-production
   PORT=5000
   FRONTEND_URL=http://localhost:5173
   NODE_ENV=development
   ```

3. **Create Default Admin User**
   ```bash
   node scripts/createAdmin.js [email] [password] [username] [full_name]
   ```
   Example:
   ```bash
   node scripts/createAdmin.js admin@halchash.com admin123 admin "Super Admin"
   ```

4. **Start the Server**
   ```bash
   npm start
   # or for development with auto-reload
   npm run dev
   ```

## API Endpoints

### Authentication
- `POST /api/auth/admin/login` - Admin login
- `GET /api/auth/admin/me` - Get current admin

### Products
- `GET /api/products` - Get all products (public)
- `GET /api/products/:id` - Get single product (public)
- `GET /api/products/admin/all` - Get all products (admin)
- `POST /api/products` - Create product (admin)
- `PUT /api/products/:id` - Update product (admin)
- `DELETE /api/products/:id` - Delete product (admin)

### Categories
- `GET /api/categories` - Get all categories (public)
- `GET /api/categories/admin/all` - Get all categories (admin)
- `POST /api/categories` - Create category (admin)
- `PUT /api/categories/:id` - Update category (admin)
- `DELETE /api/categories/:id` - Delete category (admin)

### Orders
- `GET /api/orders` - Get all orders (admin)
- `GET /api/orders/:id` - Get single order (admin)
- `PUT /api/orders/:id/status` - Update order status (admin)
- `PUT /api/orders/:id/payment-status` - Update payment status (admin)
- `POST /api/orders/:id/refund` - Process refund (admin)

### Users
- `GET /api/users` - Get all users (admin)
- `GET /api/users/:id` - Get single user (admin)
- `POST /api/users/:id/block` - Block user (admin)
- `POST /api/users/:id/unblock` - Unblock user (admin)

### Reviews
- `GET /api/reviews/product/:productId` - Get product reviews (public)
- `GET /api/reviews` - Get all reviews (admin)
- `POST /api/reviews/:id/approve` - Approve review (admin)
- `DELETE /api/reviews/:id` - Delete review (admin)

### Coupons
- `GET /api/coupons` - Get all coupons (admin)
- `POST /api/coupons` - Create coupon (admin)
- `PUT /api/coupons/:id` - Update coupon (admin)
- `DELETE /api/coupons/:id` - Delete coupon (admin)

### Analytics
- `GET /api/analytics/dashboard` - Get dashboard analytics (admin)
- `GET /api/analytics/sales` - Get sales analytics (admin)
- `GET /api/analytics/inventory` - Get inventory analytics (admin)

### Activity Logs
- `GET /api/activity-logs` - Get activity logs (admin)
- `GET /api/activity-logs/me` - Get current admin's logs (admin)

## Authentication

All admin routes require authentication via JWT token. Include the token in the Authorization header:
```
Authorization: Bearer <token>
```

The token is stored in cookies as `admin_token` after login.

## File Uploads

Product images are uploaded to `backend/uploads/products/` directory. Make sure this directory exists and has write permissions.

