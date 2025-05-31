const mongoose = require('mongoose');

const settlementSchema = new mongoose.Schema({
	house: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'House',
		required: true
	},
	totalAmount: {
		type: Number,
		required: true
	},
	totalExpenses: {
		type: Number,
		required: true
	},
	avgExpense: {
		type: Number,
		required: true
	},
	avgPerPerson: {
		type: Number,
		required: true
	},
	amountPerPerson: [{
		user: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: true
		},
		amount: {
			type: Number,
			required: true
		}
	}],
	transactions: [{
		from: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: true
		},
		to: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: true
		},
		amount: {
			type: Number,
			required: true
		}
	}],
	createdBy: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User'
	}
}, {
	timestamps: true
});

module.exports = mongoose.model('Settlement', settlementSchema); 