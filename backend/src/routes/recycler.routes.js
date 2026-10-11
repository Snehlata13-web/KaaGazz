const express = require('express');
const RecyclerController = require('../controllers/recycler.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/summary', authenticate, authorize('RECYCLER'), RecyclerController.getSummary);
router.get('/queue', authenticate, authorize('RECYCLER'), RecyclerController.getQueue);
router.get('/history', authenticate, authorize('RECYCLER'), RecyclerController.getHistory);
router.get('/dispatches', authenticate, authorize('RECYCLER'), RecyclerController.listDispatches);
router.patch('/dispatches/:dispatchId/status', authenticate, authorize('RECYCLER'), RecyclerController.updateDispatchStatus);

module.exports = router;
