const express = require('express');
const NgoController = require('../controllers/ngo.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/demands', authenticate, authorize('NGO'), NgoController.createDemand);
router.get('/demands', authenticate, authorize('NGO'), NgoController.listDemands);
router.get('/allocations', authenticate, authorize('NGO'), NgoController.listAllocations);
router.get('/summary', authenticate, authorize('NGO'), NgoController.getSummary);

module.exports = router;
