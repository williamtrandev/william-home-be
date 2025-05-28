const express = require('express');
const House = require('../models/House');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Create a new house
router.post('/', auth, async (req, res) => {
	try {
		const { name, description } = req.body;

		// Create house with owner using the static method
		const house = await House.createWithOwner(
			{ name, description },
			req.user._id
		);

		res.status(201).json(house);
	} catch (error) {
		console.log(error);
		res.status(500).json({ error: 'Failed to create house' });
	}
});

// Get user's houses
router.get('/my-houses', auth, async (req, res) => {
	try {
		const houses = await House.find({
			'members.user': req.user._id
		}).populate('members.user', 'name email picture');

		res.json(houses);
	} catch (error) {
		res.status(500).json({ error: 'Failed to fetch houses' });
	}
});

// Get house details
router.get('/:id', auth, async (req, res) => {
	try {
		const house = await House.findById(req.params.id)
			.populate('members.user', 'name email picture')
			.populate('expenses');

		if (!house) {
			return res.status(404).json({ error: 'House not found' });
		}

		// Check if user is a member
		if (!house.isMember(req.user._id)) {
			return res.status(403).json({ error: 'Not authorized to access this house' });
		}

		res.json(house);
	} catch (error) {
		res.status(500).json({ error: 'Failed to fetch house details' });
	}
});

// List house members (OWNER only)
router.get('/:houseId/members', auth, async (req, res) => {
	try {
		const house = await House.findById(req.params.houseId)
			.populate('members.user', 'name email picture');

		if (!house) {
			return res.status(404).json({
				error: {
					en: 'House not found',
					vi: 'Không tìm thấy nhà'
				}
			});
		}

		// Check if user is the owner
		const member = house.members.find(m => m.user._id.toString() === req.user._id.toString());
		if (!member || member.role !== 'OWNER') {
			return res.status(403).json({
				error: {
					en: 'Only house owner can view member list',
					vi: 'Chỉ chủ nhà mới có thể xem danh sách thành viên'
				}
			});
		}

		// Format member data
		const members = house.members.map(member => ({
			id: member.user._id,
			name: member.user.name,
			email: member.user.email,
			picture: member.user.picture,
			role: member.role,
			joinedAt: member.joinedAt
		}));

		res.json({
			houseId: house._id,
			houseName: house.name,
			members
		});
	} catch (error) {
		console.error('List members error:', error);
		res.status(500).json({
			error: {
				en: 'Failed to list house members',
				vi: 'Không thể lấy danh sách thành viên'
			}
		});
	}
});

module.exports = router; 