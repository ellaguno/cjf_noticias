const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { get, run } = require('../../database');

// Secret key for JWT signing - should be in environment variables in production
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * Generate a JWT token for a user
 * @param {Object} user - User object
 * @returns {String} JWT token
 */
const generateToken = (user) => {
  const payload = {
    id: user.id,
    username: user.username,
    role: user.role
  };
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

/**
 * Verify a JWT token
 * @param {String} token - JWT token
 * @returns {Object} Decoded token payload
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid token');
  }
};

/**
 * Hash a password
 * @param {String} password - Plain text password
 * @returns {String} Hashed password
 */
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

/**
 * Compare a password with a hash
 * @param {String} password - Plain text password
 * @param {String} hash - Hashed password
 * @returns {Boolean} True if password matches hash
 */
const comparePassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

/**
 * Authenticate a user
 * @param {String} username - Username
 * @param {String} password - Password
 * @returns {Object} User object and token
 */
const authenticateUser = async (username, password) => {
  // Get user from database
  const user = await get(`SELECT * FROM USER WHERE username = ?`, [username]);
  
  if (!user) {
    throw new Error('User not found');
  }
  
  // Compare password
  const isMatch = await comparePassword(password, user.password);
  
  if (!isMatch) {
    throw new Error('Invalid credentials');
  }
  
  // Generate token
  const token = generateToken(user);
  
  return {
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    },
    token
  };
};

/**
 * Create a new user
 * @param {Object} userData - User data
 * @returns {Object} Created user
 */
const createUser = async (userData) => {
  const { username, password, email, role = 'editor' } = userData;
  
  // Check if username already exists
  const existingUser = await get(`SELECT * FROM USER WHERE username = ?`, [username]);
  
  if (existingUser) {
    throw new Error('Username already exists');
  }
  
  // Hash password
  const hashedPassword = await hashPassword(password);
  
  // Insert user
  const result = await run(
    `INSERT INTO USER (username, password, email, role) VALUES (?, ?, ?, ?)`,
    [username, hashedPassword, email, role]
  );
  
  return {
    id: result.lastID,
    username,
    email,
    role
  };
};

module.exports = {
  generateToken,
  verifyToken,
  hashPassword,
  comparePassword,
  authenticateUser,
  createUser
};