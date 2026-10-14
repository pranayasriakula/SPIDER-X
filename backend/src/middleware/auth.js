const { supabaseAdmin } = require('../config/supabase');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');

const requireSupabase = (req, res, next) => {
  if (!supabaseAdmin) return next(new ApiError(503, 'SUPABASE_NOT_CONFIGURED', 'Supabase server configuration is unavailable'));
  next();
};

const authenticate = asyncHandler(async (req, res, next) => {
  if (!supabaseAdmin) throw new ApiError(503, 'SUPABASE_NOT_CONFIGURED', 'Supabase server configuration is unavailable');
  const authorization = req.headers.authorization || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : null;
  if (!token) throw new ApiError(401, 'AUTHENTICATION_REQUIRED', 'A Bearer access token is required');

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) throw new ApiError(401, 'INVALID_TOKEN', 'The access token is invalid or expired');
  const { data: profile, error: profileError } = await supabaseAdmin.from('profiles').select('*').eq('user_id', data.user.id).single();
  if (profileError || !profile) throw new ApiError(403, 'PROFILE_NOT_FOUND', 'No application profile exists for this user');
  req.user = { ...data.user, profile };
  req.accessToken = token;
  next();
});

const authorize = (...roles) => (req, res, next) => {
  if (!req.user) return next(new ApiError(401, 'AUTHENTICATION_REQUIRED', 'Authentication is required'));
  if (!roles.includes(req.user.profile.role)) return next(new ApiError(403, 'FORBIDDEN', 'You are not authorized to perform this action'));
  next();
};

module.exports = { requireSupabase, authenticate, authorize };
