const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const { getById, updateById } = require('../services/dataService');
const { validateUuid } = require('../utils/validation');
const { pick } = require('../utils/object');

const getUser = asyncHandler(async (req, res) => {
  validateUuid(req.params.id, 'user id');
  if (req.user.id !== req.params.id && req.user.profile.role !== 'ADMIN') throw new ApiError(403, 'FORBIDDEN', 'You are not authorized to view this profile');
  const profile = await getById('profiles', 'user_id', req.params.id, 'USER_NOT_FOUND');
  res.json({ success: true, data: profile });
});

const updateUser = asyncHandler(async (req, res) => {
  validateUuid(req.params.id, 'user id');
  if (req.user.id !== req.params.id && req.user.profile.role !== 'ADMIN') throw new ApiError(403, 'FORBIDDEN', 'You are not authorized to update this profile');
  // Role transitions must use the authorized, audited government approval workflow.
  const updates = pick(req.body, ['name', 'phone', 'location']);
  if (!Object.keys(updates).length) throw new ApiError(400, 'VALIDATION_ERROR', 'No allowed profile fields were supplied');
  const profile = await updateById('profiles', 'user_id', req.params.id, updates, 'USER_NOT_FOUND');
  res.json({ success: true, data: profile });
});

module.exports = { getUser, updateUser };
