const jwt = require('jsonwebtoken');
const User = require('../models/User');
const House = require('../models/House');

/**
 * Reasons we return 401:
 *  - missing token, malformed token, expired token  → AUTH_INVALID
 *  - user record deleted                            → USER_NOT_FOUND
 *  - user is no longer a member of any house        → MEMBERSHIP_REVOKED
 *
 * The frontend axios interceptor branches on `code` so it can distinguish
 * "token expired, try refresh" from "you've been removed, log out now".
 */
const unauthorized = (res, code, en, vi) =>
	res.status(401).json({
		code,
		error: { en, vi },
	});

module.exports = async (req, res, next) => {
	try {
		const token = req.header('Authorization')?.replace('Bearer ', '');

		if (!token) {
			return unauthorized(
				res,
				'AUTH_INVALID',
				'Authentication required',
				'Cần xác thực'
			);
		}

		const decoded = jwt.verify(token, process.env.JWT_SECRET);
		const user = await User.findById(decoded.id);

		if (!user) {
			return unauthorized(
				res,
				'USER_NOT_FOUND',
				'User not found',
				'Không tìm thấy người dùng'
			);
		}

		// Membership gate: if the user no longer belongs to any house, their
		// session is effectively void (they were removed). Bounce them so the
		// frontend can force a logout instead of operating on stale state.
		// Uses the existing { 'members.user': 1 } index → cheap lookup.
		const stillMember = await House.exists({ 'members.user': user._id });
		if (!stillMember) {
			return unauthorized(
				res,
				'MEMBERSHIP_REVOKED',
				'You have been removed from the house',
				'Bạn đã bị xóa khỏi nhà'
			);
		}

		req.user = user;
		next();
	} catch (error) {
		console.log(error);
		return unauthorized(
			res,
			'AUTH_INVALID',
			'Invalid authentication token',
			'Token xác thực không hợp lệ'
		);
	}
};
