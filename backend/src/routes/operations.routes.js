const express = require('express');
const OperationsController = require('../controllers/operations.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/dispatches/:dispatchId/sorted', authenticate, authorize('RECYCLER'), OperationsController.completeSorting);

module.exports = router;