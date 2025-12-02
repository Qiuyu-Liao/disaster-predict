// backend/routes/profile.js
const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/profile/me
router.get('/me', auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, email, name, phone, lat, lng, 
              location_enabled, email_notify
       FROM users WHERE id = ?`,
      [req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Profile get error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/profile/me
router.put('/me', auth, async (req, res) => {
  try {
    const {
      name,
      phone,
      lat,
      lng,
      location_enabled,
      email_notify
    } = req.body;

    await pool.query(
      `UPDATE users
       SET name = ?, phone = ?, lat = ?, lng = ?, 
           location_enabled = ?, email_notify = ?
       WHERE id = ?`,
      [
        name || null,
        phone || null,
        lat !== undefined ? lat : null,
        lng !== undefined ? lng : null,
        location_enabled ? 1 : 0,
        email_notify ? 1 : 0,
        req.user.id
      ]
    );

    res.json({ message: 'Profile updated' });
  } catch (err) {
    console.error('Profile update error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
