const User = require('../models/User');

/**
 * GET /users — admin only
 */
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json({ users });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users.', error: error.message });
  }
};

/**
 * PATCH /users/:id/role — admin only
 */
const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    const validRoles = ['admin', 'manager', 'sales'];

    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({ message: `Role must be one of: ${validRoles.join(', ')}` });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.json({ message: 'User role updated successfully.', user });
  } catch (error) {
    res.status(500).json({ message: 'Error updating user role.', error: error.message });
  }
};

/**
 * GET /users/me — get current user profile
 */
const getMe = async (req, res) => {
  res.json({ user: req.user });
};

module.exports = { getAllUsers, updateUserRole, getMe };
