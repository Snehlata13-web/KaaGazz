const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const DbService = require('./db.service');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;

const ensureSecret = () => {
  if (!JWT_SECRET) throw new Error('JWT_SECRET is not configured');
};

const validatePassword = (password) => {
  if (typeof password !== 'string' || password.length < 8) {
    const error = new Error('Password must be at least 8 characters');
    error.statusCode = 400;
    throw error;
  }
};

const register = async (role, data) => {
  validatePassword(data.password);
  const email = data.email?.trim().toLowerCase();
  if (!email) {
    const error = new Error('email is required');
    error.statusCode = 400;
    throw error;
  }
  if (await DbService.findAccountByEmail(email)) {
    const error = new Error('An account with this email already exists');
    error.statusCode = 409;
    throw error;
  }
  const passwordHash = await bcrypt.hash(data.password, 12);
  const payload = { ...data, email, passwordHash };
  delete payload.password;
  if (role === 'institution') return DbService.registerInstitution(payload);
  if (role === 'ngo') return DbService.registerNgo(payload);
  if (role === 'recycler') return DbService.registerRecycler(payload);
  throw new Error(`Unsupported registration role: ${role}`);
};

const login = async (email, password) => {
  ensureSecret();
  if (!email || !password) {
    const error = new Error('email and password are required');
    error.statusCode = 400;
    throw error;
  }
  const normalizedEmail = email.trim().toLowerCase();
  const account = await DbService.findAccountByEmail(normalizedEmail);
  if (account && account.role !== 'ADMIN' && account.approvalStatus !== 'APPROVED') {
    const error = new Error(`Account is ${String(account.approvalStatus || 'PENDING').toLowerCase()}. Wait for admin approval.`);
    error.statusCode = 403;
    throw error;
  }
  const valid = account
    ? await bcrypt.compare(password, account.passwordHash || '')
    : normalizedEmail === ADMIN_EMAIL && ADMIN_PASSWORD_HASH && await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
  if (!valid) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }
  const user = account || { role: 'ADMIN', email: normalizedEmail, name: 'KaaGazz Operations' };
  const subject = account?.institutionId || account?.ngoId || account?.recyclerId || 'ADMIN#PLATFORM';
  const token = jwt.sign({ role: user.role, email: user.email }, JWT_SECRET, {
    subject,
    expiresIn: JWT_EXPIRES_IN,
  });
  const { passwordHash, ...publicUser } = user;
  return { token, expiresIn: JWT_EXPIRES_IN, user: publicUser };
};

const verifyToken = (token) => {
  ensureSecret();
  return jwt.verify(token, JWT_SECRET);
};

const requestPasswordReset = async (email) => {
  const normalizedEmail = email?.trim().toLowerCase();
  if (!normalizedEmail) {
    const error = new Error('email is required');
    error.statusCode = 400;
    throw error;
  }
  let account = await DbService.findAccountByEmail(normalizedEmail);
  if (!account && normalizedEmail === ADMIN_EMAIL && ADMIN_PASSWORD_HASH) {
    account = await DbService.ensureAdminAccount({ email: normalizedEmail, passwordHash: ADMIN_PASSWORD_HASH });
  }
  if (!account) return { message: 'If an account exists, reset instructions have been sent.' };

  const resetToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
  const expiresAt = Math.floor(Date.now() / 1000) + 15 * 60;
  await DbService.savePasswordReset({ tokenHash, email: normalizedEmail, expiresAt });

  const result = { message: 'If an account exists, reset instructions have been sent.' };
  if (process.env.RETURN_RESET_TOKEN === 'true') result.resetToken = resetToken;
  return result;
};

const resetPassword = async (token, password) => {
  validatePassword(password);
  if (!token) {
    const error = new Error('reset token is required');
    error.statusCode = 400;
    throw error;
  }
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const reset = await DbService.findPasswordReset(tokenHash);
  if (!reset || reset.expiresAt < Math.floor(Date.now() / 1000)) {
    const error = new Error('Reset token is invalid or expired');
    error.statusCode = 400;
    throw error;
  }
  const account = await DbService.findAccountByEmail(reset.email);
  if (!account) {
    const error = new Error('Reset token is invalid or expired');
    error.statusCode = 400;
    throw error;
  }
  const passwordHash = await bcrypt.hash(password, 12);
  await DbService.updateAccountPassword(account, passwordHash, tokenHash);
  return { message: 'Password updated successfully. You can now sign in.' };
};

module.exports = { register, login, verifyToken, requestPasswordReset, resetPassword };
