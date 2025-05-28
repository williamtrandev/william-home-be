const mongoose = require('mongoose');
const crypto = require('crypto');

const houseInvitationSchema = new mongoose.Schema({
	house: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'House',
		required: true
	},
	invitedUser: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User',
		required: true
	},
	invitedBy: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User',
		required: true
	},
	token: {
		type: String,
		required: true,
		unique: true,
		default: () => crypto.randomBytes(32).toString('hex')
	},
	status: {
		type: String,
		enum: ['pending', 'accepted', 'rejected'],
		default: 'pending'
	},
	expiresAt: {
		type: Date,
		default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
	}
}, { timestamps: true });

// Add index for faster token lookups
houseInvitationSchema.index({ token: 1 });
houseInvitationSchema.index({ status: 1 });
houseInvitationSchema.index({ expiresAt: 1 });

// Add method to check if invitation is expired
houseInvitationSchema.methods.isExpired = function () {
	return this.expiresAt < new Date();
};

// Add method to check if invitation is pending
houseInvitationSchema.methods.isPending = function () {
	return this.status === 'pending' && !this.isExpired();
};

// Check if model exists before creating
const HouseInvitation = mongoose.models.HouseInvitation || mongoose.model('HouseInvitation', houseInvitationSchema);

module.exports = HouseInvitation;
