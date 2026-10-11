const AuthService = require('../services/auth.service');
const DbService = require('../services/db.service');

const registerInstitution = async (req, res, next) => {
  try {
    const result = await AuthService.register('institution', req.body);
    res.status(201).json({ success: true, message: 'Institution registered successfully', data: result });
  } catch (error) {
    next(error);
  }
};

const registerNgo = async (req, res, next) => {
  try {
    const result = await AuthService.register('ngo', req.body);
    res.status(201).json({ success: true, message: 'NGO registered successfully', data: result });
  } catch (error) {
    next(error);
  }
};

const registerRecycler = async (req, res, next) => {
  try {
    const result = await AuthService.register('recycler', req.body);
    res.status(201).json({ success: true, message: 'Recycler registered successfully', data: result });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const result = await AuthService.login(req.body.email, req.body.password);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const result = await AuthService.requestPasswordReset(req.body.email);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const result = await AuthService.resetPassword(req.body.token, req.body.password);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

const getProfile = async (req, res, next) => {
  try {
    const account = await DbService.getAccountById(req.user.role, req.user.sub);
    if (!account) {
      // The platform admin is not always persisted, so fall back to the token claims.
      if (req.user.role === 'ADMIN') {
        return res.json({ success: true, data: { role: 'ADMIN', email: req.user.email, name: 'KaaGazz Operations' } });
      }
      const error = new Error('Account not found');
      error.statusCode = 404;
      throw error;
    }
    res.json({ success: true, data: account });
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const account = await DbService.updateAccountProfile(req.user.role, req.user.sub, req.body || {});
    res.json({ success: true, message: 'Profile updated', data: account });
  } catch (error) {
    next(error);
  }
};

module.exports = { registerInstitution, registerNgo, registerRecycler, login, forgotPassword, resetPassword, getProfile, updateProfile };