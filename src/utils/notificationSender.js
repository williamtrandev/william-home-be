const admin = require('../config/firebase-admin');
const Notification = require('../models/Notification');

const sendNotification = async (userIds, title, body, data = {}) => {
	try {
		// Get all active tokens for the users
		const notifications = await Notification.find({
			user: { $in: userIds },
			isActive: true
		}).populate('user', 'name');
		console.log(notifications);
		if (notifications.length === 0) return;

		const tokens = notifications.map(n => n.fcmToken);

		// Send to each token individually
		const sendPromises = tokens.map(token => {
			const message = {
				token,
				notification: {
					title,
					body
				},
				webpush: {
					notification: {
						title,
						body,
						icon: '/icons/icon-192x192.png',
						badge: '/icons/badge-72x72.png',
						tag: data.type,
						requireInteraction: true,
						// actions: [
						// 	{
						// 		action: 'view',
						// 		title: 'Xem chi tiết'
						// 	}
						// ]
					},
					fcmOptions: {
						link: data.link || '/'
					}
				},
				data: {
					...data,
					click_action: 'FLUTTER_NOTIFICATION_CLICK',
					timestamp: Date.now().toString()
				}
			};

			return admin.messaging().send(message);
		});

		const responses = await Promise.allSettled(sendPromises);
		console.log('Successfully sent notifications:', responses);

		// Handle failed tokens
		const failedTokens = [];
		responses.forEach((response, idx) => {
			if (response.status === 'rejected') {
				failedTokens.push(tokens[idx]);
			}
		});

		// Remove failed tokens
		// if (failedTokens.length > 0) {
		// 	await Notification.updateMany(
		// 		{ fcmToken: { $in: failedTokens } },
		// 		{ isActive: false }
		// 	);
		// }
	} catch (error) {
		console.error('Error sending notifications:', error);
	}
};

module.exports = { sendNotification }; 