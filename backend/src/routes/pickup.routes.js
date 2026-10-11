const express = require('express');
const PickupController = require('../controllers/pickup.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/', authenticate, authorize('INSTITUTION'), PickupController.createPickupRequest);

module.exports = router;