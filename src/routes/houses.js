const express = require('express');
const House = require('../models/House');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Create a new house
router.post('/', auth, async (req, res) => {
	try {
		const house = await House.create({
			name: req.body.name,
			owner: req.user._id,
			members: [req.user._id]
		});

		await User.findByIdAndUpdate(req.user._id, {
			$push: { houses: house._id }
		});

		res.status(201).json(house);
	} catch (error) {
		res.status(500).json({ error: 'Failed to create house' });
	}
});

// Get user's houses
router.get('/my-houses', auth, async (req, res) => {
	try {
		const houses = await House.find({
			$or: [
				{ owner: req.user._id },
				{ members: req.user._id }
			]
		}).populate('members', 'name email picture');

		res.json(houses);
	} catch (error) {
		res.status(500).json({ error: 'Failed to fetch houses' });
	}
});

// Get house details
router.get('/:id', auth, async (req, res) => {
	try {
		const house = await House.findById(req.params.id)
			.populate('members', 'name email picture')
			.populate('expenses');

		if (!house) {
			return res.status(404).json({ error: 'House not found' });
		}

		// Check if user is a member
		if (!house.members.includes(req.user._id) && house.owner.toString() !== req.user._id.toString()) {
			return res.status(403).json({ error: 'Not authorized to access this house' });
		}

		res.json(house);
	} catch (error) {
		res.status(500).json({ error: 'Failed to fetch house details' });
	}
});

// Accept house invitation
router.post('/:id/accept', auth, async (req, res) => {
	try {
		const house = await House.findById(req.params.id);
		if (!house) {
			return res.status(404).json({ error: 'House not found' });
		}

		const user = await User.findById(req.user._id);
		if (!user.pendingInvites.includes(house._id)) {
			return res.status(403).json({ error: 'No pending invitation for this house' });
		}

		// Add user to house members
		house.members.push(req.user._id);
		await house.save();

		// Add house to user's houses and remove from pending invites
		user.houses.push(house._id);
		user.pendingInvites = user.pendingInvites.filter(id => id.toString() !== house._id.toString());
		await user.save();

		res.json({ message: 'Successfully joined house' });
	} catch (error) {
		res.status(500).json({ error: 'Failed to accept invitation' });
	}
});

module.exports = router; 