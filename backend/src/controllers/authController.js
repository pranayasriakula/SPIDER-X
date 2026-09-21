const { supabase, supabaseAdmin } = require('../config/supabase');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');
const { requireFields } = require('../utils/validation');
const { pick } = require('../utils/object');

const ensureAuthClient = () => {
  if (!supabase || !supabaseAdmin) throw new ApiError(503, 'SUPABASE_NOT_CONFIGURED', 'Supabase authentication is not configured');
};

const register = asyncHandler(async (req, res) => {
  ensureAuthClient();
  requireFields(req.body, ['email', 'password']);
  const { email, password } = req.body;
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw new ApiError(400, 'REGISTRATION_FAILED', error.message);
  if (!data.user) throw new ApiError(400, 'REGISTRATION_FAILED', 'Supabase did not create a user');
  const profileUpdates = pick(req.body, ['name', 'phone', 'location']);
  if (Object.keys(profileUpdates).length) {
    const { error: profileError } = await supabaseAdmin.from('profiles').update(profileUpdates).eq('user_id', data.user.id);
    if (profileError) throw new ApiError(500, 'PROFILE_UPDATE_FAILED', profileError.message);
  }
  res.status(201).json({ success: true, data: { user: data.user, session: data.session } });
});

const login = asyncHandler(async (req, res) => {
  ensureAuthClient();
  requireFields(req.body, ['email', 'password']);
  const { data, error } = await supabase.auth.signInWithPassword({ email: req.body.email, password: req.body.password });
  if (error) throw new ApiError(401, 'LOGIN_FAILED', error.message);
  res.json({ success: true, data });
});

const logout = asyncHandler(async (req, res) => {
  ensureAuthClient();
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) throw new ApiError(401, 'AUTHENTICATION_REQUIRED', 'A Bearer access token is required');
  const { error } = await supabaseAdmin.auth.admin.signOut(token);
  if (error) throw new ApiError(400, 'LOGOUT_FAILED', error.message);
  res.json({ success: true, data: { message: 'Logged out successfully' } });
});

const me = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { user: req.user, profile: req.user.profile } });
});

module.exports = { register, login, logout, me };
