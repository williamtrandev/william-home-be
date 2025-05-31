const express = require('express');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');

const router = express.Router();

// Register new FCM token
router.post('/token', auth, async (req, res) => {
	try {
		const { fcmToken, deviceInfo } = req.body;

		if (!fcmToken) {
			return res.status(400).json({ error: 'FCM token is required' });
		}

		// Try to update existing token or create new one
		const notification = await Notification.findOneAndUpdate(
			{ user: req.user._id, fcmToken },
			{
				deviceInfo,
				isActive: true,
				updatedAt: new Date()
			},
			{
				upsert: true,
				new: true,
				setDefaultsOnInsert: true
			}
		);

		res.status(201).json(notification);
	} catch (error) {
		console.log(error);
		if (error.code === 11000) {
			return res.status(400).json({ error: 'Token already registered for this user' });
		}
		res.status(500).json({ error: 'Failed to register FCM token' });
	}
});

// Get all active tokens for current user
router.get('/tokens', auth, async (req, res) => {
	try {
		const tokens = await Notification.find({
			user: req.user._id,
			isActive: true
		}).select('fcmToken deviceInfo createdAt');

		res.json(tokens);
	} catch (error) {
		console.log(error);
		res.status(500).json({ error: 'Failed to fetch FCM tokens' });
	}
});

// Deactivate a specific token
router.delete('/token/:token', auth, async (req, res) => {
	try {
		const notification = await Notification.findOneAndUpdate(
			{
				user: req.user._id,
				fcmToken: req.params.token
			},
			{ isActive: false },
			{ new: true }
		);

		if (!notification) {
			return res.status(404).json({ error: 'FCM token not found' });
		}

		res.json({ message: 'FCM token deactivated successfully' });
	} catch (error) {
		console.log(error);
		res.status(500).json({ error: 'Failed to deactivate FCM token' });
	}
});

// Deactivate all tokens for current user
router.delete('/tokens', auth, async (req, res) => {
	try {
		await Notification.updateMany(
			{ user: req.user._id },
			{ isActive: false }
		);

		res.json({ message: 'All FCM tokens deactivated successfully' });
	} catch (error) {
		console.log(error);
		res.status(500).json({ error: 'Failed to deactivate FCM tokens' });
	}
});

module.exports = router;