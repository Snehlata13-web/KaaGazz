const express = require('express');
const InstitutionController = require('../controllers/institution.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/pickups', authenticate, authorize('INSTITUTION'), InstitutionController.listPickups);
router.get('/summary', authenticate, authorize('INSTITUTION'), InstitutionController.getSummary);

module.exports = router;
