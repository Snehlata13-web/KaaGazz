const DbService = require('../services/db.service');

const getSummary = async (req, res, next) => {
  try {
    const data = await DbService.getRecyclerSummary(req.user.sub);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const getQueue = async (req, res, next) => {
  try {
    const data = await DbService.getRecyclerQueue(req.user.sub);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const getHistory = async (req, res, next) => {
  try {
    const data = await DbService.getRecyclerHistory(req.user.sub);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const listDispatches = async (req, res, next) => {
  try {
    const items = await DbService.listDispatchesByRecycler(req.user.sub);
    res.json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
};

const updateDispatchStatus = async (req, res, next) => {
  try {
    const data = await DbService.updateDispatchStatus({
      dispatchId: req.params.dispatchId,
      recyclerId: req.user.sub,
      status: String(req.body.status || '').toUpperCase(),
    });
    res.json({ success: true, message: `Dispatch marked ${data.status.toLowerCase()}`, data });
  } catch (error) {
    next(error);
  }
};

module.exports = { getSummary, getQueue, getHistory, listDispatches, updateDispatchStatus };
