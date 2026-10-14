const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const { database } = require('../services/dataService');
const { validateUuid, validateEnum } = require('../utils/validation');

const statuses = ['PENDING', 'APPROVED', 'REJECTED', 'REVOKED'];

const text = (body, field, max) => {
	const value = body?.[field];

	if (
		typeof value !== 'string' ||
		!value.trim() ||
		value.trim().length > max ||
		value.includes('\u0000')
	) {
		throw new ApiError(
			400,
			'VALIDATION_ERROR',
			`${field} must be a nonempty string of at most ${max} characters`
		);
	}

	return value.trim();
};

const check = (error) => {
	if (!error) return;

	if (error.code === '23505')
		throw new ApiError(409, 'ACTIVE_APPLICATION_EXISTS', 'An active application already exists');

	if (error.code === '42501')
		throw new ApiError(403, 'FORBIDDEN', 'This operation is not permitted');

	if (error.code === 'P0002')
		throw new ApiError(404, 'APPLICATION_NOT_FOUND', 'Application not found');

	if (error.code === 'P0001')
		throw new ApiError(409, 'INVALID_APPLICATION_STATE', 'Application or applicant is not eligible for this operation');

	if (['23514', '22023'].includes(error.code))
		throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid application data');

	throw new ApiError(500, 'DATABASE_ERROR', 'Government application operation failed');
};

const submit = asyncHandler(async (req, res) => {
	const values = {};

	for (const [field, max] of Object.entries({
		department: 200,
		designation: 200,
		official_email: 254,
		employee_id: 100
	})) {
		values[`p_${field}`] = text(req.body, field, max);
	}

	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.p_official_email)) {
		throw new ApiError(400, 'VALIDATION_ERROR', 'official_email must be a valid email address');
	}

	values.p_official_email = values.p_official_email.toLowerCase();

	const { data, error } = await database().rpc(
		'submit_government_application',
		{ ...values, p_user_id: req.user.id }
	);

	check(error);
	res.status(201).json({ success: true, data });
});

const ownHistory = asyncHandler(async (req, res) => {
	const { data, error } = await database()
		.from('government_applications')
		.select('*')
		.eq('user_id', req.user.id)
		.order('created_at', { ascending: false });

	check(error);
	res.json({ success: true, data });
});

const ownStatus = asyncHandler(async (req, res) => {
	const { data, error } = await database()
		.from('government_applications')
		.select('*')
		.eq('user_id', req.user.id)
		.order('created_at', { ascending: false })
		.limit(1)
		.maybeSingle();

	check(error);
	res.json({ success: true, data });
});

const list = asyncHandler(async (req, res) => {
	validateEnum(req.query.status, statuses, 'status');

	const integer = (value, fallback, max) => {
		if (value === undefined) return fallback;

		if (
			typeof value !== 'string' ||
			!/^\d+$/.test(value) ||
			!Number.isSafeInteger(Number(value)) ||
			Number(value) > max
		) {
			throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid pagination');
		}

		return Number(value);
	};

	const limit = integer(req.query.limit, 50, 100);
	const offset = integer(req.query.offset, 0, 1000000);

	if (!limit) {
		throw new ApiError(400, 'VALIDATION_ERROR', 'limit must be positive');
	}

	let query = database().from('government_applications').select('*');

	if (req.query.status) {
		query = query.eq('status', req.query.status);
	}

	const { data, error } = await query
		.order('created_at', { ascending: false })
		.order('application_id', { ascending: false })
		.range(offset, offset + limit - 1);

	check(error);
	res.json({ success: true, data });
});
const getById = asyncHandler(async (req, res) => {
    validateUuid(req.params.id, 'application id');

    const { data, error } = await database()
        .from('government_applications')
        .select('*')
        .eq('application_id', req.params.id)
        .maybeSingle();

    check(error);

    if (!data) {
        throw new ApiError(
            404,
            'APPLICATION_NOT_FOUND',
            'Application not found'
        );
    }

    res.json({ success: true, data });
});

const decide = (action) => asyncHandler(async (req, res) => {
	validateUuid(req.params.id, 'application id');

	const params = {
		p_application_id: req.params.id,
		p_admin_id: req.user.id
	};

	if (action !== 'approve') {
		params.p_reason = text(req.body, 'reason', 2000);
	}

	const { error } = await database().rpc(
		`${action}_government_application`,
		params
	);

	check(error);

	res.json({
		success: true,
		data: {
			application_id: req.params.id,
			status: {
				approve: 'APPROVED',
				reject: 'REJECTED',
				revoke: 'REVOKED'
			}[action]
		}
	});
});

const audit = asyncHandler(async (req, res) => {
	validateUuid(req.params.id, 'application id');

	const { data: application, error: applicationError } = await database()
		.from('government_applications')
		.select('application_id')
		.eq('application_id', req.params.id)
		.maybeSingle();

	check(applicationError);

	if (!application) {
		throw new ApiError(404, 'APPLICATION_NOT_FOUND', 'Application not found');
	}

	const { data, error } = await database()
		.from('government_approval_audit')
		.select('*')
		.eq('application_id', req.params.id)
		.order('created_at', { ascending: true });

	check(error);
	res.json({ success: true, data });
});

module.exports = {
	submit,
	ownHistory,
	ownStatus,
	list,
	getById,
	approve: decide('approve'),
	reject: decide('reject'),
	revoke: decide('revoke'),
	audit
};
