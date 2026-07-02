const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const appConfig = require('../../config/app.config');
const { Con, User, UserCon, Hotel, UserConHotel } = require('../database/init');
const { authenticate, optionalAuth, requireAdmin } = require('../middleware/auth');

const conAvatarDir = path.join(__dirname, '..', 'uploads', 'avatars', 'cons');
fs.mkdirSync(conAvatarDir, { recursive: true });

const conAvatarUpload = multer({
  storage: multer.diskStorage({
    destination: conAvatarDir,
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.png';
      cb(null, `${req.params.id}-${Date.now()}${ext}`);
    },
  }),
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image uploads are allowed'));
    }
    cb(null, true);
  },
});

function visibleUserWhere() {
  const where = { show_on_homepage: true };
  if (!appConfig.features.showTestUsers) {
    where.is_test = false;
  }
  return where;
}

function visibleHotelUserWhere() {
  return {
    ...visibleUserWhere(),
    show_hotel_info: true,
  };
}

function normalizeHotelKeyPart(value) {
  return String(value || '').trim().toLowerCase();
}

// GET /api/cons - List all cons
router.get('/', optionalAuth, async (req, res) => {
  try {
    const where = { status: 'approved' };
    
    if (!appConfig.features.showTestCons) {
      where.is_test = false;
    }

    const { upcoming, current, past, city, country, search, series } = req.query;
    const now = new Date().toISOString().split('T')[0];

    if (upcoming === 'true') {
      where.start_date = { [Op.gt]: now };
    } else if (current === 'true') {
      where.start_date = { [Op.lte]: now };
      where.end_date = { [Op.gte]: now };
    } else if (past === 'true') {
      where.end_date = { [Op.lt]: now };
    }

    if (city) where.city = { [Op.like]: `%${city}%` };
    if (country) where.country = { [Op.like]: `%${country}%` };
    if (series) where.series_key = series;
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { name_en: { [Op.like]: `%${search}%` } },
        { name_local: { [Op.like]: `%${search}%` } },
        { series_name: { [Op.like]: `%${search}%` } },
        { venue: { [Op.like]: `%${search}%` } },
        { city: { [Op.like]: `%${search}%` } },
        { address: { [Op.like]: `%${search}%` } },
      ];
    }

    const cons = await Con.findAll({
      where,
      order: [['start_date', 'DESC']],
      include: [{
        model: User,
        attributes: ['id', 'username', 'display_name', 'avatar_url', 'theme_color'],
        through: { attributes: [] },
        where: visibleUserWhere(),
        required: false,
      }],
    });

    res.json({ cons });
  } catch (error) {
    console.error('List cons error:', error);
    res.status(500).json({ error: 'Failed to fetch cons' });
  }
});

// GET /api/cons/map - Get cons for map display
router.get('/map', async (req, res) => {
  try {
    const where = { status: 'approved' };
    if (!appConfig.features.showTestCons) {
      where.is_test = false;
    }

    const cons = await Con.findAll({
      where,
      attributes: [
        'id', 'name', 'name_en', 'name_local', 'series_key', 'series_name',
        'start_date', 'end_date', 'venue', 'address', 'latitude', 'longitude',
        'city', 'country', 'avatar_url', 'poster_url', 'theme', 'theme_color', 'website',
      ],
      include: [{
        model: User,
        attributes: ['id', 'username', 'display_name', 'avatar_url', 'theme_color'],
        through: { attributes: [] },
        where: visibleUserWhere(),
        required: false,
      }],
    });

    const now = new Date();
    const oneDayMs = 24 * 60 * 60 * 1000;

    const mapped = cons.map(con => {
      const start = new Date(con.start_date);
      const end = new Date(con.end_date);
      const isActive = now >= new Date(start - oneDayMs) && now <= new Date(end.getTime() + oneDayMs);
      const isPast = end < now;
      
      return {
        ...con.toJSON(),
        isActive,
        isPast,
      };
    });

    res.json({ cons: mapped });
  } catch (error) {
    console.error('Map cons error:', error);
    res.status(500).json({ error: 'Failed to fetch map data' });
  }
});

// GET /api/cons/series/:seriesKey - List editions of one convention series
router.get('/series/:seriesKey', async (req, res) => {
  try {
    const where = {
      status: 'approved',
      series_key: req.params.seriesKey,
    };

    if (!appConfig.features.showTestCons) {
      where.is_test = false;
    }

    const cons = await Con.findAll({
      where,
      order: [['start_date', 'DESC']],
    });

    res.json({ seriesKey: req.params.seriesKey, cons });
  } catch (error) {
    console.error('Series cons error:', error);
    res.status(500).json({ error: 'Failed to fetch series' });
  }
});

// GET /api/cons/:id/hotel-stats - Public hotel distribution for one con
router.get('/:id/hotel-stats', async (req, res) => {
  try {
    const con = await Con.findByPk(req.params.id, {
      attributes: ['id', 'name'],
    });

    if (!con) {
      return res.status(404).json({ error: 'Con not found' });
    }

    const userCons = await UserCon.findAll({
      where: { con_id: req.params.id },
      include: [
        {
          model: User,
          attributes: ['id'],
          where: visibleHotelUserWhere(),
          required: true,
        },
        {
          model: Hotel,
          attributes: ['id', 'name', 'address', 'city', 'country'],
          through: { attributes: [] },
          required: true,
        },
      ],
    });

    const grouped = new Map();
    userCons.forEach(userCon => {
      (userCon.Hotels || []).forEach(hotel => {
        const hotelJson = hotel.toJSON ? hotel.toJSON() : hotel;
        const key = [
          normalizeHotelKeyPart(hotelJson.name),
          normalizeHotelKeyPart(hotelJson.address),
          normalizeHotelKeyPart(hotelJson.city),
        ].join('|');

        if (!grouped.has(key)) {
          grouped.set(key, {
            name: hotelJson.name,
            address: hotelJson.address,
            city: hotelJson.city,
            country: hotelJson.country,
            count: 0,
          });
        }

        grouped.get(key).count += 1;
      });
    });

    const total = [...grouped.values()].reduce((sum, hotel) => sum + hotel.count, 0);
    const palette = ['#6C63FF', '#22C55E', '#F97316', '#0EA5E9', '#EF4444', '#14B8A6', '#A855F7', '#EAB308'];
    const hotels = [...grouped.values()]
      .sort((a, b) => b.count - a.count || String(a.name || '').localeCompare(String(b.name || '')))
      .map((hotel, index) => ({
        ...hotel,
        percent: total ? Math.round((hotel.count / total) * 100) : 0,
        color: palette[index % palette.length],
      }));

    res.json({ conId: con.id, total, hotels });
  } catch (error) {
    console.error('Hotel stats error:', error);
    res.status(500).json({ error: 'Failed to fetch hotel stats' });
  }
});

// GET /api/cons/:id - Get single con with attendees
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const con = await Con.findByPk(req.params.id, {
      include: [{
        model: User,
        attributes: ['id', 'username', 'display_name', 'avatar_url', 'theme_color'],
        through: { attributes: ['comment', 'rating'] },
        where: visibleUserWhere(),
        required: false,
      }],
    });

    if (!con) {
      return res.status(404).json({ error: 'Con not found' });
    }

    res.json({ con });
  } catch (error) {
    console.error('Get con error:', error);
    res.status(500).json({ error: 'Failed to fetch con' });
  }
});

// POST /api/cons - Submit new con
router.post('/', authenticate, [
  body('name').trim().isLength({ min: 1, max: 200 }),
  body('start_date').isDate(),
  body('end_date').isDate(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const conData = {
      name: req.body.name,
      name_en: req.body.name_en,
      name_local: req.body.name_local,
      series_key: req.body.series_key,
      series_name: req.body.series_name,
      edition_label: req.body.edition_label,
      start_date: req.body.start_date,
      end_date: req.body.end_date,
      venue: req.body.venue,
      city: req.body.city,
      country: req.body.country,
      address: req.body.address,
      latitude: req.body.latitude,
      longitude: req.body.longitude,
      poster_url: req.body.poster_url,
      avatar_url: req.body.avatar_url,
      theme: req.body.theme,
      theme_color: req.body.theme_color,
      website: req.body.website,
      description: req.body.description,
      extra_fields: req.body.extra_fields || {},
      submitted_by: req.userId,
      status: req.user.role === 'admin' ? 'approved' : 'pending',
    };

    const con = await Con.create(conData);
    res.status(201).json({ con });
  } catch (error) {
    console.error('Create con error:', error);
    res.status(500).json({ error: 'Failed to create con' });
  }
});

// POST /api/cons/:id/avatar - Upload a convention avatar/poster thumbnail
router.post('/:id/avatar', authenticate, conAvatarUpload.single('avatar'), async (req, res) => {
  try {
    const con = await Con.findByPk(req.params.id);
    if (!con) {
      return res.status(404).json({ error: 'Con not found' });
    }

    if (req.user.role !== 'admin' && con.submitted_by !== req.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Avatar file is required' });
    }

    await con.update({ avatar_url: `/uploads/avatars/cons/${req.file.filename}` });
    res.json({ message: 'Con avatar uploaded', con });
  } catch (error) {
    console.error('Con avatar upload error:', error);
    res.status(500).json({ error: 'Con avatar upload failed' });
  }
});

// POST /api/cons/:id/attend - Mark attendance
router.post('/:id/attend', authenticate, async (req, res) => {
  try {
    const con = await Con.findByPk(req.params.id);
    if (!con) {
      return res.status(404).json({ error: 'Con not found' });
    }

    // Get current max visit_order for this user
    const maxOrder = await UserCon.max('visit_order', { where: { user_id: req.userId } });
    
    const [userCon, created] = await UserCon.findOrCreate({
      where: { user_id: req.userId, con_id: req.params.id },
      defaults: {
        comment: req.body.comment,
        rating: req.body.rating,
        visit_order: (maxOrder || 0) + 1,
        extra_fields: req.body.extra_fields || {},
      },
    });

    if (!created) {
      // Update existing
      await userCon.update({
        comment: req.body.comment !== undefined ? req.body.comment : userCon.comment,
        rating: req.body.rating !== undefined ? req.body.rating : userCon.rating,
        extra_fields: req.body.extra_fields || userCon.extra_fields,
      });
    }

    // Handle hotels
    if (req.body.hotels && Array.isArray(req.body.hotels)) {
      // Remove existing hotel links
      await UserConHotel.destroy({ where: { user_con_id: userCon.id } });
      
      for (const hotelData of req.body.hotels) {
        let hotel;
        if (hotelData.hotel_id) {
          hotel = await Hotel.findByPk(hotelData.hotel_id);
        }

        if (!hotel && hotelData.name) {
          hotel = await Hotel.create({
            name: hotelData.name,
            address: hotelData.address,
            city: hotelData.city || con.city,
            country: hotelData.country || con.country,
            latitude: hotelData.latitude,
            longitude: hotelData.longitude,
            website: hotelData.website,
            phone: hotelData.phone,
            extra_fields: hotelData.extra_fields || {},
          });
        }
        
        if (hotel) {
          await UserConHotel.create({
            user_con_id: userCon.id,
            hotel_id: hotel.id,
            check_in: hotelData.check_in,
            check_out: hotelData.check_out,
            notes: hotelData.notes,
          });
        }
      }
    }

    res.json({ userCon, created });
  } catch (error) {
    console.error('Attend error:', error);
    res.status(500).json({ error: 'Failed to mark attendance' });
  }
});

// DELETE /api/cons/:id/attend - Remove attendance
router.delete('/:id/attend', authenticate, async (req, res) => {
  try {
    const userCon = await UserCon.findOne({
      where: { user_id: req.userId, con_id: req.params.id },
    });

    if (!userCon) {
      return res.status(404).json({ error: 'Attendance not found' });
    }

    // Remove hotel links
    await UserConHotel.destroy({ where: { user_con_id: userCon.id } });
    await userCon.destroy();

    res.json({ message: 'Attendance removed' });
  } catch (error) {
    console.error('Remove attendance error:', error);
    res.status(500).json({ error: 'Failed to remove attendance' });
  }
});

// GET /api/cons/:id/attendees - Get attendees for a con (for homepage popup)
router.get('/:id/attendees', async (req, res) => {
  try {
    const userCons = await UserCon.findAll({
      where: { con_id: req.params.id },
      include: [{
        model: User,
        attributes: ['id', 'username', 'display_name', 'avatar_url', 'theme_color', 'show_on_homepage'],
        where: visibleUserWhere(),
      }],
    });

    const attendees = userCons.map(uc => ({
      id: uc.User.id,
      username: uc.User.username,
      display_name: uc.User.display_name,
      avatar_url: uc.User.avatar_url,
      theme_color: uc.User.theme_color,
      comment: uc.comment,
      rating: uc.rating,
    }));

    res.json({ attendees, total: attendees.length });
  } catch (error) {
    console.error('Attendees error:', error);
    res.status(500).json({ error: 'Failed to fetch attendees' });
  }
});

// PUT /api/cons/:id - Update con (admin or submitter)
router.put('/:id', authenticate, async (req, res) => {
  try {
    const con = await Con.findByPk(req.params.id);
    if (!con) {
      return res.status(404).json({ error: 'Con not found' });
    }

    if (req.user.role !== 'admin' && con.submitted_by !== req.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const allowedFields = [
      'name', 'name_en', 'name_local', 'series_key', 'series_name', 'edition_label',
      'start_date', 'end_date', 'venue', 'city', 'country',
      'address', 'latitude', 'longitude', 'poster_url', 'avatar_url', 'theme',
      'theme_color', 'website', 'description', 'extra_fields',
    ];

    if (req.user.role === 'admin') {
      allowedFields.push('status');
    }

    const updates = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    await con.update(updates);
    res.json({ con });
  } catch (error) {
    console.error('Update con error:', error);
    res.status(500).json({ error: 'Failed to update con' });
  }
});

module.exports = router;
