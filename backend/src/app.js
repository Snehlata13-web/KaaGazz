const express = require('express');
const cors = require('cors');
const CacheService = require('./services/cache.service');
const { authLimiter, apiLimiter, writeLimiter } = require('./middleware/ratelimit.middleware');
const { identify } = require('./middleware/auth.middleware');
const authRoutes = require('./routes/auth.routes');
const pickupRoutes = require('./routes/pickup.routes');
const institutionRoutes = require('./routes/institution.routes');
const ngoRoutes = require('./routes/ngo.routes');
const recyclerRoutes = require('./routes/recycler.routes');
const adminRoutes = require('./routes/admin.routes');
const operationsRoutes = require('./routes/operations.routes');

const app = express();

/**
 * Request path is CloudFront -> API Gateway -> Lambda, and each hop appends its
 * caller to X-Forwarded-For, so the header arrives as:
 *   <client>, <cloudfront>, <api-gateway>
 * Trusting 2 hops makes req.ip resolve to the real client in that setup, and
 * still resolves correctly when API Gateway is called directly (Express falls
 * back to the left-most entry once the hop count is exhausted).
 *
 * This is not spoofable: a client that injects its own X-Forwarded-For only
 * pushes a value further left, while CloudFront and API Gateway append the
 * true addresses on the right. Getting this right is what makes the rate
 * limiter key on an actual client rather than on an AWS edge address.
 */
app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS) || 2);

/**
 * CORS origin allowlist. Defaults to permissive so an existing deployment does
 * not break on upgrade, but set CORS_ALLOWED_ORIGINS in any real environment.
 */
const allowedOrigins = String(process.env.CORS_ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

if (!allowedOrigins.length) {
  console.warn('[cors] CORS_ALLOWED_ORIGINS is not set; allowing every origin. Set it before production.');
}

app.use(cors({
  origin: allowedOrigins.length
    // Requests with no Origin header (server-to-server, curl, health checks)
    // are allowed through; CORS only governs browser-initiated calls.
    ? (origin, callback) => callback(null, !origin || allowedOrigins.includes(origin))
    : true,
  credentials: false,
  // Echoing the allowlist decision per-origin means responses differ by Origin,
  // so Vary: Origin is required or a CDN could serve one tenant's CORS headers
  // to another. The cors package sets it for us when origin is a function.
  maxAge: 600,
}));

// Bounded body size. Without this a single large payload can push the function
// to its memory ceiling, and the JSON parser would happily buffer it first.
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '100kb' }));
app.use(express.urlencoded({ extended: true, limit: process.env.JSON_BODY_LIMIT || '100kb' }));

/**
 * CDN cache directives.
 *
 * Every /api route is authenticated and tenant-specific, so it is marked
 * no-store and CloudFront passes it straight through. The expensive work those
 * routes do is cached at the origin instead (see cache.service.js), which is
 * the correct layer for per-tenant data: the edge would otherwise need the
 * bearer token in its cache key, which couples cache correctness to token
 * lifetime for no real gain.
 *
 * /health is genuinely public and therefore the one thing worth caching at the
 * edge, which also keeps health probes off the Lambda entirely.
 */
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

app.get('/health', (req, res) => {
  res.set('Cache-Control', 'public, max-age=10');
  res.status(200).json({
    success: true,
    message: 'EcoPaper Connect API is running',
    cache: CacheService.status(),
  });
});

// Credential endpoints get the strict limiter; everything else gets the
// general one, with writes additionally capped. identify() runs first so the
// general limiters can bucket per authenticated account instead of per IP.
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/auth/reset-password', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api', identify, apiLimiter);
app.use('/api', (req, res, next) => (
  ['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method) ? writeLimiter(req, res, next) : next()
));

app.use('/api/auth', authRoutes);
app.use('/api/pickups', pickupRoutes);
app.use('/api/institution', institutionRoutes);
app.use('/api/ngo', ngoRoutes);
app.use('/api/recycler', recyclerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/operations', operationsRoutes);

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  console.error(`${req.method} ${req.originalUrl}`, error);
  const awsResourceMissing = error.name === 'ResourceNotFoundException';
  const statusCode = error.statusCode || (awsResourceMissing ? 503 : 500);
  res.status(statusCode).json({
    success: false,
    error: awsResourceMissing
      ? 'AWS resources are not provisioned. Deploy the SAM stack before using this endpoint.'
      : statusCode === 500 ? 'Internal server error' : error.message,
  });
});

app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

module.exports = app;
