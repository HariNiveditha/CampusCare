const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { getJwtSecret, getJwtExpiresIn } = require('../config/jwt');
const { logAudit } = require('../utils/auditLogger');

// Login
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const user = await User.findOne({ username });

    if (!user) {
      await logAudit({
        user: null,
        role: 'anonymous',
        action: 'LOGIN_FAILED',
        entityType: 'User',
        details: { attemptedUsername: username, reason: 'User not found' },
      });
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    // Compare passwords using bcrypt
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      await logAudit({
        user: user._id,
        role: user.role,
        action: 'LOGIN_FAILED',
        entityType: 'User',
        entityId: user._id,
        details: { username: user.username, reason: 'Invalid password' },
      });
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    // Generate JWT token with secure secret and expiration
    const secret = getJwtSecret();
    const expiresIn = getJwtExpiresIn();
    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      secret,
      { expiresIn }
    );

    // Audit log successful login
    await logAudit({
      user: user,
      role: user.role,
      action: 'USER_LOGIN',
      entityType: 'User',
      entityId: user._id,
      details: { username: user.username, role: user.role },
    });

    res.json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
      role: user.role,
      token,
    });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Register
exports.register = async (req, res) => {
  try {
    const { username, email, password, confirmPassword } = req.body;

    if (!username || !email || !password || !confirmPassword) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(409).json({
        message: existingUser.username === username ? 'Username already exists' : 'Email already exists',
      });
    }

    const newUser = new User({
      username: username.trim(),
      email: email.trim().toLowerCase(),
      password, // Will be hashed by pre-save middleware
      role: 'student',
    });

    await newUser.save();

    // Generate JWT token
    const secret = getJwtSecret();
    const expiresIn = getJwtExpiresIn();
    const token = jwt.sign(
      { id: newUser._id, username: newUser.username, role: newUser.role },
      secret,
      { expiresIn }
    );

    // Audit log registration
    await logAudit({
      user: newUser,
      role: newUser.role,
      action: 'USER_REGISTERED',
      entityType: 'User',
      entityId: newUser._id,
      details: { username: newUser.username, email: newUser.email, role: newUser.role },
    });

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
      },
      role: newUser.role,
      token,
    });
  } catch (error) {
    console.error('Registration error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all admin users (for complaint assignment dropdown)
exports.getAdmins = async (req, res) => {
  try {
    const admins = await User.find({ role: 'admin' }, '_id username email');
    res.json(admins);
  } catch (error) {
    console.error('Get admins error:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
