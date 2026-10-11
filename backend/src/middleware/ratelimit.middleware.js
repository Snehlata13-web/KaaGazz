/**
 * Rate limiting for the credential and write endpoints.
 *
 * express-rate-limit was already a dependency but had never been wired up, so
 * /api/auth/login accepted unlimited password guesses.
 *
 * These limiters use the library's default in-process store, which means the
 * counters are per Lambda container: a limit of 10 is really "10 per warm
 * container". That is a genuine brake on credential stuffing and costs
 * nothing, but it is not an exact global ceiling. An exact ceiling needs a
 * shared counter store (ElastiCache or similar) plus a VPC, which is a
 * deliberate non-goal here. API Gateway's own throttling in template.yaml
 * provides the hard account-wide backstop in the meantime.
 */

const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');

// Shared response shape so throttled callers get the same envelope as every
// other error in the API (see the handler in src/app.js).
const tooMany = (message) => (req, res) => {
  res.status(429).json({ success: false, error: message });
};

const createLimiter = ({ windowMs, limit, message, keyGenerator }) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator,
    handler: tooMany(message),
    // Health checks and preflight must never be throttled.
    skip: (req) => req.method === 'OPTIONS' || req.path === '/health',
  });

/**
 * Credential endpoints are keyed on IP *and* submitted email so that one
 * attacker cannot lock a victim out by exhausting their quota, and so rotating
 * the email does not buy a fresh quota from the same IP.
 *
 * ipKeyGenerator is required by express-rate-limit v8 to normalise IPv6 down
 * to a /64 subnet; keying on raw req.ip would let anyone with an IPv6 range
 * sidestep the limit by changing the host portion of their address.
 */
const authLimiter = createLimiter({
  windowMs: Number(process.env.RATE_LIMIT_AUTH_WINDOW_MS) || 15 * 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_AUTH_MAX) || 10,
  message: 'Too many authentication attempts. Try again later.',
  keyGenerator: (req) => {
    const email = String((req.body && req.body.email) || '').trim().toLowerCase();
    return `${ipKeyGenerator(req.ip)}:${email}`;
  },
});

/**
 * General traffic. Authenticated callers are keyed by their verified token
 * subject (populated by the identify() middleware in src/app.js) so a whole
 * school or NGO office behind one NAT address is not throttled as a single
 * client. Anonymous callers fall back to their IP.
 */
const apiLimiter = createLimiter({
  windowMs: Number(process.env.RATE_LIMIT_API_WINDOW_MS) || 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_API_MAX) || 120,
  message: 'Too many requests. Slow down and try again shortly.',
  keyGenerator: (req) => (req.user && req.user.sub ? `user:${req.user.sub}` : ipKeyGenerator(req.ip)),
});

/**
 * Writes are the expensive, side-effecting paths - they enqueue SQS messages
 * and fan out DynamoDB transactions - so they get a tighter ceiling than reads.
 */
const writeLimiter = createLimiter({
  windowMs: Number(process.env.RATE_LIMIT_WRITE_WINDOW_MS) || 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_WRITE_MAX) || 30,
  message: 'Too many write requests. Slow down and try again shortly.',
  keyGenerator: (req) => (req.user && req.user.sub ? `user:${req.user.sub}` : ipKeyGenerator(req.ip)),
});

module.exports = { authLimiter, apiLimiter, writeLimiter };
