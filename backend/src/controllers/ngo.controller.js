const crypto = require('crypto');
const QueueService = require('../services/queue.service');
const DbService = require('../services/db.service');

const createDemand = async (req, res, next) => {
  try {
    const demandId = `DEMAND_${crypto.randomUUID()}`;
    // The NGO is always taken from the verified token, never from the request body.
    const result = await QueueService.enqueueNgoDemand({ ...req.body, demandId, ngoId: req.user.sub });
    res.status(202).json({
      success: true,
      message: 'NGO demand accepted for processing',
      data: { demandId, ...result },
    });
  } catch (error) {
    next(error);
  }
};

const listDemands = async (req, res, next) => {
  try {
    const items = await DbService.listDemandsByNgo(req.user.sub);
    res.json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
};

const listAllocations = async (req, res, next) => {
  try {
    const items = await DbService.listAllocationsByNgo(req.user.sub);
    res.json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
};

const getSummary = async (req, res, next) => {
  try {
    const data = await DbService.getNgoSummary(req.user.sub);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

module.exports = { createDemand, listDemands, listAllocations, getSummary };
