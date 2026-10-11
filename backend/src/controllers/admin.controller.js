const DbService = require('../services/db.service');

const listRequests = async (req, res, next) => {
  try {
    const items = await DbService.listRequests({ status: req.query.status, city: req.query.city });
    res.json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
};

const listApprovals = async (req, res, next) => {
  try {
    const items = await DbService.listPendingApprovals();
    res.json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
};

const updateApproval = async (req, res, next) => {
  try {
    const role = String(req.params.role).toUpperCase();
    if (!['INSTITUTION', 'NGO', 'RECYCLER'].includes(role)) {
      const error = new Error('Unsupported approval role');
      error.statusCode = 400;
      throw error;
    }
    const status = req.params.action === 'approve' ? 'APPROVED' : 'REJECTED';
    const data = await DbService.updateApproval({ role, id: req.params.id, status, reason: req.body.reason });
    res.json({ success: true, message: `Registration ${status.toLowerCase()}`, data });
  } catch (error) {
    next(error);
  }
};

const listSchedules = async (req, res, next) => {
  try {
    const items = await DbService.listDispatches();
    res.json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
};

const listPartners = async (req, res, next) => {
  try {
    const items = await DbService.listApprovedPartners();
    res.json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
};

const getSummary = async (req, res, next) => {
  try {
    const data = await DbService.getAdminSummary();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const getImpact = async (req, res, next) => {
  try {
    const data = await DbService.getNetworkImpact();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

module.exports = { listRequests, listApprovals, updateApproval, listSchedules, listPartners, getSummary, getImpact };