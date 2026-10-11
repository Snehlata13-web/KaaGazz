const AuthService = require('../services/auth.service');

const authenticate = (req, res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  try {
    req.user = AuthService.verifyToken(token);
    next();
  } catch (error) {
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, error: 'You do not have permission for this resource' });
  }
  next();
};

/**
 * Non-enforcing variant of authenticate: populates req.user when a valid token
 * is present and otherwise does nothing.
 *
 * This exists so the rate limiter can bucket per account rather than per IP.
 * Keying on IP alone throttles an entire school or NGO office behind one NAT
 * address as if it were a single user. Keying on the raw token instead would be
 * a bypass, since an attacker could mint arbitrary strings to get a fresh
 * bucket each time - so the signature is verified here and only a genuine
 * `sub` is trusted. Routes still call authenticate() to actually enforce auth;
 * this only decides which counter the request belongs to.
 */
const identify = (req, res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme === 'Bearer' && token) {
    try {
      req.user = AuthService.verifyToken(token);
    } catch {
      // An invalid token simply falls through to IP-based limiting; rejecting
      // it here would change 401 handling for routes that are public.
    }
  }
  next();
};

module.exports = { authenticate, authorize, identify };
