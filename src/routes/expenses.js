const express = require('express');
const Expense = require('../models/Expense');
const House = require('../models/House');
const auth = require('../middleware/auth');

const router = express.Router();

// Create new expense
router.post('/', auth, async (req, res) => {
	try {
		const { houseId, purpose, amount } = req.body;

		const house = await House.findById(houseId);
		if (!house) {
			return res.status(404).json({ error: 'House not found' });
		}

		// Check if user is a member
		if (!house.members.includes(req.user._id) && house.owner.toString() !== req.user._id.toString()) {
			return res.status(403).json({ error: 'Not authorized to add expenses to this house' });
		}

		const expense = await Expense.create({
			house: houseId,
			createdBy: req.user._id,
			purpose,
			amount
		});

		house.expenses.push(expense._id);
		await house.save();

		res.status(201).json(expense);
	} catch (error) {
		res.status(500).json({ error: 'Failed to create expense' });
	}
});

// Get house expenses
router.get('/house/:houseId', auth, async (req, res) => {
	try {
		const house = await House.findById(req.params.houseId);
		if (!house) {
			return res.status(404).json({ error: 'House not found' });
		}

		// Check if user is a member
		if (!house.members.includes(req.user._id) && house.owner.toString() !== req.user._id.toString()) {
			return res.status(403).json({ error: 'Not authorized to view expenses' });
		}

		const expenses = await Expense.find({ house: req.params.houseId })
			.populate('createdBy', 'name email picture')
			.sort({ createdAt: -1 });

		res.json(expenses);
	} catch (error) {
		res.status(500).json({ error: 'Failed to fetch expenses' });
	}
});

// Update expense
router.put('/:id', auth, async (req, res) => {
	try {
		const expense = await Expense.findById(req.params.id);
		if (!expense) {
			return res.status(404).json({ error: 'Expense not found' });
		}

		// Check if user is the creator
		if (expense.createdBy.toString() !== req.user._id.toString()) {
			return res.status(403).json({ error: 'Not authorized to update this expense' });
		}

		const updatedExpense = await Expense.findByIdAndUpdate(
			req.params.id,
			{ $set: req.body },
			{ new: true }
		);

		res.json(updatedExpense);
	} catch (error) {
		res.status(500).json({ error: 'Failed to update expense' });
	}
});

// Settle expenses
router.post('/house/:houseId/settle', auth, async (req, res) => {
	try {
		const house = await House.findById(req.params.houseId)
			.populate('members', '_id')
			.populate({
				path: 'expenses',
				match: { isSettled: false },
				populate: { path: 'createdBy', select: '_id' }
			});

		if (!house) {
			return res.status(404).json({ error: 'House not found' });
		}

		// Check if user is a member
		if (!house.members.includes(req.user._id) && house.owner.toString() !== req.user._id.toString()) {
			return res.status(403).json({ error: 'Not authorized to settle expenses' });
		}

		// Calculate expenses per person
		const expensesPerPerson = {};
		house.members.forEach(member => {
			expensesPerPerson[member._id] = 0;
		});

		house.expenses.forEach(expense => {
			expensesPerPerson[expense.createdBy._id] += expense.amount;
		});

		// Calculate total and average
		const total = Object.values(expensesPerPerson).reduce((a, b) => a + b, 0);
		const average = total / house.members.length;

		// Calculate balances
		const balances = {};
		Object.keys(expensesPerPerson).forEach(personId => {
			balances[personId] = expensesPerPerson[personId] - average;
		});

		// Find positive and negative balances
		const positive = [];
		const negative = [];
		Object.entries(balances).forEach(([personId, balance]) => {
			if (balance > 0) {
				positive.push({ person: personId, balance });
			} else if (balance < 0) {
				negative.push({ person: personId, balance: -balance });
			}
		});

		// Calculate transactions
		const transactions = [];
		while (positive.length > 0 && negative.length > 0) {
			const pos = positive[0];
			const neg = negative[0];
			const amount = Math.min(pos.balance, neg.balance);

			transactions.push({
				from: neg.person,
				to: pos.person,
				amount: Math.round(amount)
			});

			pos.balance -= amount;
			neg.balance -= amount;

			if (pos.balance === 0) positive.shift();
			if (neg.balance === 0) negative.shift();
		}

		// Update expenses as settled
		await Expense.updateMany(
			{ house: house._id, isSettled: false },
			{
				$set: {
					isSettled: true,
					settledAt: new Date()
				}
			}
		);

		// Save transactions to house
		house.settledTransactions.push(...transactions);
		await house.save();

		res.json({
			message: 'Expenses settled successfully',
			transactions
		});
	} catch (error) {
		res.status(500).json({ error: 'Failed to settle expenses' });
	}
});

module.exports = router; 