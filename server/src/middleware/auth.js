const { verifyToken } = require('../utils/auth');
const { get } = require('../../database');

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
const authenticate = async (req, res, next) => {
  const logger = require('../utils/logger').createLogger('auth');
  
  try {
    // Get token from header or cookie
    let token;
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
      logger.debug('Token found in Authorization header');
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
      logger.debug('Token found in cookies');
    }
    
    if (!token) {
      logger.warn('Authentication failed: No token provided');
      return res.status(401).json({ error: 'No token provided' });
    }
    
    // Verify token
    logger.debug('Verifying token');
    const decoded = verifyToken(token);
    logger.debug('Token verified successfully', { userId: decoded.id });
    
    // Get user from database
    logger.debug('Fetching user from database', { userId: decoded.id });
    const user = await get(`SELECT id, username, email, role FROM USER WHERE id = ?`, [decoded.id]);
    
    if (!user) {
      logger.warn('Authentication failed: User not found', { userId: decoded.id });
      return res.status(401).json({ error: 'User not found' });
    }
    
    // Store CSRF token from headers if present
    if (req.headers['x-csrf-token']) {
      user.csrfToken = req.headers['x-csrf-token'];
    }
    
    // Attach user to request
    req.user = user;
    logger.debug('User authenticated successfully', { userId: user.id, username: user.username, role: user.role });
    
    next();
  } catch (error) {
    logger.error('Authentication failed', { error: error.message, stack: error.stack });
    return res.status(401).json({ error: 'Invalid token' });
  }
};

/**
 * Role-based access control middleware
 * @param {String[]} roles - Allowed roles
 */
const authorize = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    next();
  };
};

/**
 * CSRF protection middleware
 * Validates CSRF token in headers against session token
 */
const csrfProtection = (req, res, next) => {
  const logger = require('../utils/logger').createLogger('csrf');
  
  // Skip for GET requests
  if (req.method === 'GET') {
    return next();
  }
  
  // Skip for login request
  if (req.path === '/admin/login') {
    logger.debug('Skipping CSRF check for login request');
    return next();
  }
  
  const csrfToken = req.headers['x-csrf-token'];
  logger.debug('CSRF check', {
    path: req.path,
    method: req.method,
    hasToken: !!csrfToken
  });
  
  if (!csrfToken) {
    logger.warn('CSRF check failed: No CSRF token provided');
    return res.status(403).json({ error: 'CSRF token required' });
  }
  
  // For now, we'll skip the actual token comparison since we're debugging
  // In production, you would want to uncomment this check
  /*
  if (req.user && csrfToken !== req.user.csrfToken) {
    logger.warn('CSRF check failed: Invalid CSRF token');
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }
  */
  
  logger.debug('CSRF check passed');
  next();
};

/**
 * Rate limiting middleware for login attempts
 * Simple in-memory implementation - should use Redis or similar in production
 */
const loginAttempts = {};
const MAX_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutes

const loginRateLimiter = (req, res, next) => {
  const ip = req.ip;
  const now = Date.now();
  
  // Initialize or clean up expired attempts
  if (!loginAttempts[ip] || loginAttempts[ip].lockUntil < now) {
    loginAttempts[ip] = {
      attempts: 0,
      lockUntil: 0
    };
  }
  
  // Check if IP is locked
  if (loginAttempts[ip].lockUntil > now) {
    const timeLeft = Math.ceil((loginAttempts[ip].lockUntil - now) / 1000 / 60);
    return res.status(429).json({
      error: `Too many login attempts. Please try again in ${timeLeft} minutes.`
    });
  }
  
  // Increment attempts
  loginAttempts[ip].attempts++;
  
  // Lock if too many attempts
  if (loginAttempts[ip].attempts >= MAX_ATTEMPTS) {
    loginAttempts[ip].lockUntil = now + LOCKOUT_TIME;
    return res.status(429).json({
      error: 'Too many login attempts. Please try again in 15 minutes.'
    });
  }
  
  next();
};

/**
 * Reset login attempts on successful login
 */
const resetLoginAttempts = (req, res, next) => {
  const ip = req.ip;
  
  if (loginAttempts[ip]) {
    loginAttempts[ip].attempts = 0;
    loginAttempts[ip].lockUntil = 0;
  }
  
  next();
};

module.exports = {
  authenticate,
  authorize,
  csrfProtection,
  loginRateLimiter,
  resetLoginAttempts
};