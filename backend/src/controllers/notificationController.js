const asyncHandler = require('../utils/asyncHandler');
const { getMany, getById, updateById } = require('../services/dataService');
const { validateUuid } = require('../utils/validation');
const listNotifications = asyncHandler(async (req, res) => { res.json({ success: true, data: await getMany('notifications', { user_id: req.user.id }) }); });
const markRead = asyncHandler(async (req, res) => { validateUuid(req.params.id, 'notification id'); const notification = await getById('notifications', 'notification_id', req.params.id, 'NOTIFICATION_NOT_FOUND'); if (notification.user_id !== req.user.id) { const ApiError = require('../utils/apiError'); throw new ApiError(403, 'FORBIDDEN', 'You are not authorized to update this notification'); } res.json({ success: true, data: await updateById('notifications', 'notification_id', req.params.id, { is_read: true }, 'NOTIFICATION_NOT_FOUND') }); });
module.exports = { listNotifications, markRead };
