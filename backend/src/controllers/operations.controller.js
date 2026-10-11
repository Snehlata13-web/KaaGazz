const crypto = require('crypto');
const QueueService = require('../services/queue.service');

const completeSorting = async (req, res, next) => {
  try {
    const result = await QueueService.enqueueSortingCompleted({
      ...req.body,
      dispatchId: req.params.dispatchId,
      operationId: `SORT_${crypto.randomUUID()}`,
    });
    res.status(202).json({
      success: true,
      message: 'Sorting result accepted for NGO matching',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { completeSorting };