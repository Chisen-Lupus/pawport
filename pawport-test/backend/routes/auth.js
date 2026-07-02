const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const secretsConfig = require('../../config/secrets.config');
const { User } = require('../database/init');
const { authenticate } = require('../middleware/auth');

const userAvatarDir = path.join(__dirname, '..', 'uploads', 'avatars', 'users');
fs.mkdirSync(userAvatarDir, { recursive: true });

const userAvatarUpload = multer({
  storage: multer.diskStorage({
    destination: userAvatarDir,
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.png';
      cb(null, `${req.user.id}-${Date.now()}${ext}`);
    },
  }),
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image uploads are allowed'));
    }
    cb(null, true);
  },
});

// Generate JWT
function generateToken(userId) {
  return jwt.sign({ userId }, secretsConfig.jwt.secret, {
    expiresIn: secretsConfig.jwt.expiresIn,
  });
}

function colorFromIdentity(identity = '') {
  const palette = ['#F97316', '#0EA5E9', '#22C55E', '#A855F7', '#EF4444', '#14B8A6', '#EAB308', '#6366F1'];
  let hash = 0;
  for (let i = 0; i < identity.length; i++) {
    hash = ((hash << 5) - hash) + identity.charCodeAt(i);
    hash |= 0;
  }
  return palette[Math.abs(hash) % palette.length];
}

// POST /api/auth/register
router.post('/register', [
  body('username').trim().isLength({ min: 3, max: 50 }),
  body('email').optional().isEmail(),
  body('phone').optional().isMobilePhone(),
  body('password').isLength({ min: 6 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, phone, password, display_name } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({
      where: email ? { email } : { username },
    });
    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      email,
      phone,
      password_hash,
      display_name: display_name || username,
      theme_color: colorFromIdentity(email || phone || username),
    });

    const token = generateToken(user.id);
    res.status(201).json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        display_name: user.display_name,
        avatar_url: user.avatar_url,
        theme_color: user.theme_color,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', [
  body('login').notEmpty(), // email, phone, or username
  body('password').notEmpty(),
], async (req, res) => {
  try {
    const { login, password } = req.body;

    // Find user by email, phone, or username
    const { Op } = require('sequelize');
    const user = await User.findOne({
      where: {
        [Op.or]: [
          { email: login },
          { phone: login },
          { username: login },
        ],
      },
    });

    if (!user || !user.password_hash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    await user.update({ last_login: new Date() });

    const token = generateToken(user.id);
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        display_name: user.display_name,
        avatar_url: user.avatar_url,
        theme_color: user.theme_color,
        role: user.role,
        show_on_homepage: user.show_on_homepage,
        show_con_history: user.show_con_history,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/auth/me - Get current user
router.get('/me', authenticate, async (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      phone: req.user.phone,
      display_name: req.user.display_name,
      avatar_url: req.user.avatar_url,
      theme_color: req.user.theme_color,
      bio: req.user.bio,
      role: req.user.role,
      show_on_homepage: req.user.show_on_homepage,
      show_con_history: req.user.show_con_history,
      show_hotel_info: req.user.show_hotel_info,
      google_id: !!req.user.google_id,
      wechat_id: !!req.user.wechat_id,
      qq_id: !!req.user.qq_id,
      extra_fields: req.user.extra_fields,
    },
  });
});

// PUT /api/auth/profile - Update profile
router.put('/profile', authenticate, async (req, res) => {
  try {
    const allowedFields = [
      'display_name', 'avatar_url', 'theme_color', 'bio',
      'show_on_homepage', 'show_con_history', 'show_hotel_info',
      'extra_fields',
    ];
    
    const updates = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    await req.user.update(updates);
    res.json({ message: 'Profile updated', user: req.user });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Update failed' });
  }
});

// POST /api/auth/avatar - Upload current user's avatar
router.post('/avatar', authenticate, userAvatarUpload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Avatar file is required' });
    }

    const avatar_url = `/uploads/avatars/users/${req.file.filename}`;
    await req.user.update({ avatar_url });
    res.json({
      message: 'Avatar uploaded',
      user: {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        phone: req.user.phone,
        display_name: req.user.display_name,
        avatar_url: req.user.avatar_url,
        theme_color: req.user.theme_color,
        bio: req.user.bio,
        role: req.user.role,
        show_on_homepage: req.user.show_on_homepage,
        show_con_history: req.user.show_con_history,
        show_hotel_info: req.user.show_hotel_info,
        extra_fields: req.user.extra_fields,
      },
    });
  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({ error: 'Avatar upload failed' });
  }
});

// POST /api/auth/link-account - Link OAuth account
router.post('/link-account', authenticate, async (req, res) => {
  try {
    const { provider, provider_id } = req.body;
    const fieldMap = {
      google: 'google_id',
      wechat: 'wechat_id',
      qq: 'qq_id',
    };
    
    const field = fieldMap[provider];
    if (!field) {
      return res.status(400).json({ error: 'Invalid provider' });
    }

    // Check if already linked to another user
    const existing = await User.findOne({ where: { [field]: provider_id } });
    if (existing && existing.id !== req.user.id) {
      return res.status(409).json({ error: 'Account already linked to another user' });
    }

    await req.user.update({ [field]: provider_id });
    res.json({ message: 'Account linked successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Link failed' });
  }
});

module.exports = router;
