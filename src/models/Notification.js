const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
	user: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User',
		required: true
	},
	fcmToken: {
		type: String,
		required: true
	},
	deviceInfo: {
		userAgent: String,
		platform: String,
		timestamp: Number
	},
	isActive: {
		type: Boolean,
		default: true
	}
}, {
	timestamps: true
});

// Compound index to ensure unique token per user
notificationSchema.index({ user: 1, fcmToken: 1 }, { unique: true });

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification; 