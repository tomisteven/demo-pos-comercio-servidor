const express = require('express');
const router = express.Router();
const { loginUser, getUserProfile, updateProfile, logoutUser } = require('../controllers/authController');
const { protect } = require('../middlewares/auth');

router.post('/login', loginUser);
router.post('/logout', protect, logoutUser);
router.route('/me')
  .get(protect, getUserProfile)
  .put(protect, updateProfile);

module.exports = router;
