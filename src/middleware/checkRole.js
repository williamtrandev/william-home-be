const House = require('../models/House');

const checkRole = (roles) => {
	return async (req, res, next) => {
		try {
			const userId = req.user.id; // From JWT token
			const houseId = req.params.houseId;

			const house = await House.findById(houseId);
			if (!house) {
				return res.status(404).json({ error: 'House not found' });
			}

			const userRole = house.getUserRole(userId);
			if (!userRole) {
				return res.status(403).json({ error: 'You are not a member of this house' });
			}

			if (!roles.includes(userRole)) {
				return res.status(403).json({ error: 'You do not have permission to perform this action' });
			}

			// Add user's role and house to request for use in route handlers
			req.userRole = userRole;
			req.house = house;
			next();
		} catch (error) {
			console.error('Role check error:', error);
			res.status(500).json({ error: 'Error checking user role' });
		}
	};
};

module.exports = checkRole; 