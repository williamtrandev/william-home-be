const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
	email: {
		type: String,
		required: true,
		unique: true
	},
	googleId: {
		type: String,
		unique: true,
		sparse: true
	},
	name: {
		type: String,
		required: true
	},
	picture: String,
	houses: [{
		type: mongoose.Schema.Types.ObjectId,
		ref: 'House'
	}],
	pendingInvites: [{
		type: mongoose.Schema.Types.ObjectId,
		ref: 'House'
	}]
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema); 