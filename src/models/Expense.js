const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
	house: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'House',
		required: true
	},
	createdBy: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User',
		required: true
	},
	purpose: {
		type: String,
		required: true
	},
	amount: {
		type: Number,
		required: true
	},
	isSettled: {
		type: Boolean,
		default: false
	},
	settledAt: Date
}, { timestamps: true });

module.exports = mongoose.model('Expense', expenseSchema); 