const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({ message: 'Token is not valid' });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: 'User account is deactivated' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Access denied. No user found.' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `Access denied. Required role: ${roles.join(' or ')}` 
      });
    }

    next();
  };
};

const checkCompanyAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Access denied. No user found.' });
  }

  // Admin can access any company
  if (req.user.role === 'admin') {
    return next();
  }

  // Check if user belongs to the company being accessed
  const companyId = req.params.companyId || req.body.company || req.query.company;
  
  if (companyId && req.user.company.toString() !== companyId.toString()) {
    return res.status(403).json({ 
      message: 'Access denied. You can only access your own company data.' 
    });
  }

  next();
};

module.exports = {
  auth,
  authorize,
  checkCompanyAccess
};
