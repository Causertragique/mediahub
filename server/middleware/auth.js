const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Check if user still exists
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Token is valid but user not found.'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated.'
      });
    }

    req.user = decoded;
    req.userProfile = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid token.'
    });
  }
};

// Optional auth middleware (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await User.findById(decoded.userId);
    
    if (user && user.isActive) {
      req.user = decoded;
      req.userProfile = user;
    }
    
    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

// Role-based authorization middleware
const requireRole = (roles) => {
  return async (req, res, next) => {
    try {
      if (!req.userProfile) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      if (!roles.includes(req.userProfile.role)) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      next();
    } catch (error) {
      console.error('Role middleware error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  };
};

// Subscription-based authorization middleware
const requireSubscription = (requiredPlan) => {
  return async (req, res, next) => {
    try {
      if (!req.userProfile) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const userPlan = req.userProfile.subscription.plan;
      const planHierarchy = {
        'free': 0,
        'pro': 1,
        'enterprise': 2
      };

      if (planHierarchy[userPlan] < planHierarchy[requiredPlan]) {
        return res.status(403).json({
          success: false,
          message: `${requiredPlan} subscription required`
        });
      }

      // Check if subscription is expired
      if (req.userProfile.subscription.expiresAt && 
          new Date() > req.userProfile.subscription.expiresAt) {
        return res.status(403).json({
          success: false,
          message: 'Subscription has expired'
        });
      }

      next();
    } catch (error) {
      console.error('Subscription middleware error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  };
};

module.exports = {
  auth,
  optionalAuth,
  requireRole,
  requireSubscription
};