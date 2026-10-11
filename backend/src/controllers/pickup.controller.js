const crypto = require('crypto');
const QueueService = require('../services/queue.service');

const createPickupRequest = async (req, res, next) => {
  try {
    const requestId = `PICKUP_${crypto.randomUUID()}`;
    // The institution is always taken from the verified token, never from the request body.
    const result = await QueueService.enqueuePickupRequest({
      ...req.body,
      requestId,
      institutionId: req.user.sub,
    });
    res.status(202).json({
      success: true,
      message: 'Pickup request accepted for processing',
      data: { requestId, ...result },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { createPickupRequest };
