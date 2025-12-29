import jwt from 'jsonwebtoken';
import { Admin, User } from '../models/halchash_models.js';

// Helper to read JWT from headers/cookies
const getTokenFromRequest = (req) => {
  return (
    req.headers.authorization?.split(' ')[1] ||
    req.cookies?.auth_token ||
    req.headers['x-auth-token']
  );
};

export const authenticateAdmin = async (req, res, next) => {
  try {
    const token = getTokenFromRequest(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token provided. Access denied.',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const admin = await Admin.findById(decoded.id).select('-password');

    if (!admin) {
      return res.status(401).json({
        success: false,
        error: 'Admin not found. Access denied.',
      });
    }

    req.admin = admin;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Invalid token. Access denied.',
    });
    console.error('Authentication error:', error);
  }
};

// Authenticate normal user (customer)
export const authenticateUser = async (req, res, next) => {
  try {
    const token = getTokenFromRequest(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token provided. Access denied.',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found. Access denied.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Invalid token. Access denied.',
    });
  }
};

export const authorizeRole = (...roles) => {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    if (!roles.includes(req.admin.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
      });
    }

    next();
  };
};

