const validator = require('validator');

/**
 * Validate lead fields
 */
const validateLead = (req, res, next) => {
  const { name, phone, email } = req.body;
  const errors = [];

  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) {
      errors.push('Name must be between 2 and 100 characters.');
    }
  }

  if (phone !== undefined) {
    const phoneRegex = /^[\+]?[\d\s\-\(\)]{7,20}$/;
    if (!phoneRegex.test(phone.trim())) {
      errors.push('Phone number is not in a valid format.');
    }
  }

  if (email !== undefined && email !== '') {
    if (!validator.isEmail(email)) {
      errors.push('Email is not in a valid format.');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({ message: 'Validation failed', errors });
  }

  next();
};

/**
 * Validate registration fields
 */
const validateRegister = (req, res, next) => {
  const { name, email, password } = req.body;
  const errors = [];

  if (!name || name.trim().length < 2 || name.trim().length > 100) {
    errors.push('Name must be between 2 and 100 characters.');
  }

  if (!email || !validator.isEmail(email)) {
    errors.push('A valid email is required.');
  }

  if (!password || password.length < 6) {
    errors.push('Password must be at least 6 characters.');
  }

  if (errors.length > 0) {
    return res.status(400).json({ message: 'Validation failed', errors });
  }

  next();
};

module.exports = { validateLead, validateRegister };
