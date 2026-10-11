const express = require('express');
const AdminController = require('../controllers/admin.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/requests', authenticate, authorize('ADMIN'), AdminController.listRequests);
router.get('/approvals', authenticate, authorize('ADMIN'), AdminController.listApprovals);
router.get('/schedules', authenticate, authorize('ADMIN'), AdminController.listSchedules);
router.get('/partners', authenticate, authorize('ADMIN'), AdminController.listPartners);
router.get('/summary', authenticate, authorize('ADMIN'), AdminController.getSummary);
router.get('/impact', authenticate, authorize('ADMIN'), AdminController.getImpact);
router.post('/approvals/:role/:id/:action', authenticate, authorize('ADMIN'), AdminController.updateApproval);

module.exports = router;