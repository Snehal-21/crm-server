const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { register, login, logout } = require('../controllers/authController');
const { authenticate } = require('../middlewares/auth');
const { validateRegister } = require('../middlewares/validate');

// Rate limit login: 10 attempts per 15 minutes
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Too many login attempts. Please try again in 15 minutes.' }
});

router.post('/register', validateRegister, register);
router.post('/login', loginLimiter, login);
router.post('/logout', authenticate, logout);

module.exports = router;
