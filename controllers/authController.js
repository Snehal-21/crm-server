const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Generate JWT token
 */
const signToken = (userId, role) => {
  return jwt.sign(
    { sub: userId, role, iat: Math.floor(Date.now() / 1000) },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

/**
 * POST /auth/register
 */
const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ message: 'Email already in use.' });
    }

    // Only allow admin to set role; default to 'sales'
    const userRole = (req.user && req.user.role === 'admin' && role) ? role : 'sales';

    const user = await User.create({ name: name.trim(), email: email.toLowerCase(), password, role: userRole });

    res.status(201).json({
      message: 'User registered successfully.',
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error during registration.', error: error.message });
  }
};

/**
 * POST /auth/login
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = signToken(user._id, user.role);

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error during login.', error: error.message });
  }
};

/**
 * POST /auth/logout
 */
const logout = async (req, res) => {
  res.json({ message: 'Logged out successfully. Please delete your token on the client.' });
};

module.exports = { register, login, logout };
