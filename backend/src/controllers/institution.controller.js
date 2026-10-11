const DbService = require('../services/db.service');

const listPickups = async (req, res, next) => {
  try {
    const items = await DbService.listPickupsByInstitution(req.user.sub);
    res.json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
};

const getSummary = async (req, res, next) => {
  try {
    const data = await DbService.getInstitutionSummary(req.user.sub);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

module.exports = { listPickups, getSummary };
