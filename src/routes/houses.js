const express = require('express');
const mongoose = require('mongoose');
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

// Remove a member from a house (OWNER only)
//
// Rules:
//  - Requester must be authenticated AND an OWNER of the target house.
//  - Cannot remove themselves (a separate "leave house" flow should exist
//    for that — silently allowing self-removal here would let an OWNER
//    accidentally orphan a house).
//  - Cannot remove another OWNER (preserves co-ownership integrity).
//  - Target user must currently be a member.
router.delete('/:houseId/members/:userId', auth, async (req, res) => {
	try {
		const { houseId, userId: targetUserId } = req.params;

		if (
			!mongoose.Types.ObjectId.isValid(houseId) ||
			!mongoose.Types.ObjectId.isValid(targetUserId)
		) {
			return res.status(400).json({
				error: {
					en: 'Invalid house or user id',
					vi: 'ID nhà hoặc người dùng không hợp lệ',
				},
			});
		}

		const house = await House.findById(houseId);
		if (!house) {
			return res.status(404).json({
				error: {
					en: 'House not found',
					vi: 'Không tìm thấy nhà',
				},
			});
		}

		const requesterMember = house.members.find(
			(m) => m.user.toString() === req.user._id.toString()
		);
		if (!requesterMember || requesterMember.role !== 'OWNER') {
			return res.status(403).json({
				error: {
					en: 'Only the house owner can remove members',
					vi: 'Chỉ chủ nhà mới có thể xóa thành viên',
				},
			});
		}

		if (targetUserId === req.user._id.toString()) {
			return res.status(400).json({
				error: {
					en: 'You cannot remove yourself from the house',
					vi: 'Bạn không thể xóa chính mình khỏi nhà',
				},
			});
		}

		const targetMember = house.members.find(
			(m) => m.user.toString() === targetUserId
		);
		if (!targetMember) {
			return res.status(404).json({
				error: {
					en: 'Member not found in this house',
					vi: 'Không tìm thấy thành viên trong nhà này',
				},
			});
		}

		if (targetMember.role === 'OWNER') {
			return res.status(403).json({
				error: {
					en: 'You cannot remove another owner',
					vi: 'Không thể xóa một chủ nhà khác',
				},
			});
		}

		// Drop from House.members and keep User.houses in sync so the
		// auth-middleware membership gate fires correctly on the target user's
		// next request.
		await house.removeMember(targetUserId);
		await User.updateOne(
			{ _id: targetUserId },
			{ $pull: { houses: house._id } }
		);

		res.json({
			message: {
				en: 'Member removed successfully',
				vi: 'Đã xóa thành viên thành công',
			},
			removedUserId: targetUserId,
		});
	} catch (error) {
		console.error('Remove member error:', error);
		res.status(500).json({
			error: {
				en: 'Failed to remove member',
				vi: 'Không thể xóa thành viên',
			},
		});
	}
});

module.exports = router;
