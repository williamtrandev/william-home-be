const mongoose = require('mongoose');

// Keep this list short on purpose: the household only tracks a few real
// buckets. OTHER is the catch-all default (also lets legacy documents that
// were written with retired categories continue to validate on read).
const EXPENSE_CATEGORIES = [
	'FOOD',
	'GROCERIES',
	'RENT',
	'OTHER',
];

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
	// Fixed-enum category. New field defaults to OTHER so existing documents
	// without it read back consistently — no migration needed.
	category: {
		type: String,
		enum: EXPENSE_CATEGORIES,
		default: 'OTHER',
		index: true,
	},
	// Receipt images stored on Cloudinary. Only metadata lives here — the
	// binary stays at `url`. `publicId` is required for deletes.
	attachments: {
		type: [{
			url: { type: String, required: true },
			publicId: { type: String, required: true },
			mimeType: String,
			width: Number,
			height: Number,
			bytes: Number,
			uploadedAt: { type: Date, default: Date.now },
		}],
		default: [],
	},
	isSettled: {
		type: Boolean,
		default: false
	},
	settledAt: Date
}, { timestamps: true });

const Expense = mongoose.model('Expense', expenseSchema);

module.exports = Expense;
module.exports.EXPENSE_CATEGORIES = EXPENSE_CATEGORIES;
