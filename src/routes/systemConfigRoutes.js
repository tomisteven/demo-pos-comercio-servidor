const express = require('express');
const router = express.Router();
const { getConfig, getPublicConfig, updateConfig } = require('../controllers/systemConfigController');
const { protect, admin } = require('../middlewares/auth');

// Público (catálogo): nombre de tienda y textos informativos
router.get('/public', getPublicConfig);

router.route('/')
  .get(protect, getConfig)
  .put(protect, admin, updateConfig);

module.exports = router;
