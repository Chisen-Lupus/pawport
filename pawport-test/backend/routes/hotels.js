const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Hotel } = require('../database/init');
const { authenticate } = require('../middleware/auth');

// GET /api/hotels - Search hotels
router.get('/', async (req, res) => {
  try {
    const { search, city } = req.query;
    const where = {};

    if (search) {
      where.name = { [Op.like]: `%${search}%` };
    }
    if (city) {
      where.city = { [Op.like]: `%${city}%` };
    }

    const hotels = await Hotel.findAll({
      where,
      limit: 50,
      order: [['name', 'ASC']],
    });

    res.json({ hotels });
  } catch (error) {
    console.error('List hotels error:', error);
    res.status(500).json({ error: 'Failed to fetch hotels' });
  }
});

// POST /api/hotels - Create hotel
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, address, city, country, latitude, longitude, website, phone } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Hotel name is required' });
    }

    const hotel = await Hotel.create({
      name, address, city, country, latitude, longitude, website, phone,
    });

    res.status(201).json({ hotel });
  } catch (error) {
    console.error('Create hotel error:', error);
    res.status(500).json({ error: 'Failed to create hotel' });
  }
});

// GET /api/hotels/:id
router.get('/:id', async (req, res) => {
  try {
    const hotel = await Hotel.findByPk(req.params.id);
    if (!hotel) {
      return res.status(404).json({ error: 'Hotel not found' });
    }
    res.json({ hotel });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch hotel' });
  }
});

module.exports = router;
