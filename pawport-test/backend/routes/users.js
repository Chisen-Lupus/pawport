const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const appConfig = require('../../config/app.config');
const { User, Con, UserCon, Hotel, UserConHotel } = require('../database/init');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { shouldIncludeTestData } = require('../utils/testData');

function compareVisitsByConDate(a, b) {
  const aTime = new Date(a.Con?.start_date || 0).getTime();
  const bTime = new Date(b.Con?.start_date || 0).getTime();
  if (aTime !== bTime) return aTime - bTime;
  return (a.visit_order || 0) - (b.visit_order || 0);
}

function visibleUserWhere(req) {
  const where = { show_on_homepage: true };
  if (!shouldIncludeTestData(req, appConfig.features.showTestUsers)) {
    where.is_test = false;
  }
  return where;
}

function visibleConWhere(req) {
  if (shouldIncludeTestData(req, appConfig.features.showTestCons)) {
    return {};
  }
  return { is_test: false };
}

function visibleHotelWhere(req) {
  if (shouldIncludeTestData(req, true)) {
    return {};
  }
  return { is_test: false };
}

// GET /api/users - List visible users (for homepage)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const where = visibleUserWhere(req);

    const users = await User.findAll({
      where,
      attributes: ['id', 'username', 'display_name', 'avatar_url', 'theme_color', 'show_con_history'],
      include: [{
        model: UserCon,
        include: [{
          model: Con,
          attributes: ['id', 'name', 'latitude', 'longitude', 'start_date', 'end_date', 'city'],
          where: visibleConWhere(req),
          required: false,
        }],
        attributes: ['id', 'con_id', 'comment', 'rating', 'visit_order'],
      }],
    });

    users.forEach(user => {
      if (user.UserCons) {
        user.UserCons.sort(compareVisitsByConDate);
      }
    });

    res.json({ users });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /api/users/:id - Get user profile with con history
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const user = await User.findOne({
      where: {
        id: req.params.id,
        ...visibleUserWhere(req),
      },
      attributes: { exclude: ['password_hash', 'google_id', 'wechat_id', 'qq_id'] },
      include: [{
        model: UserCon,
        include: [
          {
            model: Con,
            attributes: [
              'id', 'name', 'name_en', 'start_date', 'end_date', 'venue', 'address',
              'city', 'country', 'latitude', 'longitude', 'avatar_url', 'theme_color',
            ],
            where: visibleConWhere(req),
            required: false,
          },
          {
            model: Hotel,
            through: { attributes: ['check_in', 'check_out', 'notes'] },
            attributes: ['id', 'name', 'address', 'city', 'country', 'latitude', 'longitude'],
            where: visibleHotelWhere(req),
            required: false,
          },
        ],
        attributes: ['id', 'con_id', 'comment', 'rating', 'visit_order', 'extra_fields'],
      }],
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check privacy settings
    const isOwner = req.userId === user.id;
    const response = {
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      avatar_url: user.avatar_url,
      theme_color: user.theme_color,
      bio: user.bio,
    };

    if (user.show_con_history || isOwner) {
      response.cons = user.UserCons
        ? [...user.UserCons].filter(uc => uc.Con).sort(compareVisitsByConDate)
        : [];
    }

    if (!user.show_hotel_info && !isOwner) {
      // Remove hotel info
      if (response.cons) {
        response.cons = response.cons.map(uc => {
          const ucJson = uc.toJSON ? uc.toJSON() : uc;
          delete ucJson.Hotels;
          return ucJson;
        });
      }
    }

    res.json({ user: response });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// GET /api/users/:id/trajectory - Get user's con trajectory for map
router.get('/:id/trajectory', async (req, res) => {
  try {
    const user = await User.findOne({
      where: {
        id: req.params.id,
        ...visibleUserWhere(req),
      },
      attributes: ['id', 'username', 'theme_color', 'show_on_homepage', 'show_con_history'],
    });

    if (!user || !user.show_on_homepage || !user.show_con_history) {
      return res.status(404).json({ error: 'Not available' });
    }

    const userCons = await UserCon.findAll({
      where: { user_id: req.params.id },
      include: [{
        model: Con,
        attributes: ['id', 'name', 'latitude', 'longitude', 'start_date'],
        where: visibleConWhere(req),
      }],
    });

    const trajectory = userCons
      .filter(uc => uc.Con && uc.Con.latitude && uc.Con.longitude)
      .sort(compareVisitsByConDate)
      .map(uc => ({
        conId: uc.Con.id,
        name: uc.Con.name,
        lat: parseFloat(uc.Con.latitude),
        lng: parseFloat(uc.Con.longitude),
        date: uc.Con.start_date,
        order: uc.visit_order,
      }));

    res.json({
      userId: user.id,
      username: user.username,
      themeColor: user.theme_color,
      trajectory,
    });
  } catch (error) {
    console.error('Trajectory error:', error);
    res.status(500).json({ error: 'Failed to fetch trajectory' });
  }
});

module.exports = router;
