const mongoose = require('mongoose');

const houseSchema = new mongoose.Schema({
	name: {
		type: String,
		required: true
	},
	owner: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User',
		required: true
	},
	members: [{
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User'
	}],
	expenses: [{
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Expense'
	}],
	settledTransactions: [{
		from: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		},
		to: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		},
		amount: Number,
		settledAt: {
			type: Date,
			default: Date.now
		}
	}]
}, { timestamps: true });

module.exports = mongoose.model('House', houseSchema); 