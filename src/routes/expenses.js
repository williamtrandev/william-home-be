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

		const expense = await Expense.create({
			house: houseId,
			createdBy: req.user._id,
			purpose,
			amount
		});

		res.status(201).json(expense);
	} catch (error) {
		console.log(error);
		res.status(500).json({ error: 'Failed to create expense' });
	}
});

// Get house expenses
router.get('/house/:houseId', auth, async (req, res) => {
	try {
		const page = parseInt(req.query.page) || 1;
		const limit = parseInt(req.query.limit) || 10;
		const skip = (page - 1) * limit;

		const house = await House.findById(req.params.houseId);
		if (!house) {
			return res.status(404).json({ error: 'House not found' });
		}

		// Get total count of expenses
		const totalExpenses = await Expense.countDocuments({ house: req.params.houseId });

		// Get paginated expenses
		const expenses = await Expense.find({ house: req.params.houseId })
			.populate('createdBy', 'name email picture')
			.sort({ createdAt: -1 })
			.skip(skip)
			.limit(limit);

		res.json({
			expenses,
			pagination: {
				currentPage: page,
				totalPages: Math.ceil(totalExpenses / limit),
				totalItems: totalExpenses,
				itemsPerPage: limit
			}
		});
	} catch (error) {
		console.log(error);
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

// Delete expense
router.delete('/:id', auth, async (req, res) => {
	try {
		const expense = await Expense.findById(req.params.id);
		if (!expense) {
			return res.status(404).json({ error: 'Expense not found' });
		}


		await expense.deleteOne();

		res.json({ message: 'Expense deleted successfully' });
	} catch (error) {
		res.status(500).json({ error: 'Failed to delete expense' });
	}
});

// Settle expenses
router.post('/house/:houseId/settle', auth, async (req, res) => {
	try {
		const house = await House.findById(req.params.houseId)
			.populate('members.user', '_id');

		if (!house) {
			return res.status(404).json({ error: 'House not found' });
		}


		// Get all unsettled expenses for this house
		const expenses = await Expense.find({
			house: house._id,
			isSettled: false
		}).populate('createdBy', '_id');

		// Calculate expenses per person
		const expensesPerPerson = {};
		house.members.forEach(member => {
			expensesPerPerson[member.user._id] = 0;
		});

		expenses.forEach(expense => {
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

		res.json({
			message: 'Expenses settled successfully',
			transactions
		});
	} catch (error) {
		res.status(500).json({ error: 'Failed to settle expenses' });
	}
});

// Get monthly statistics
router.get('/house/:houseId/statistics', auth, async (req, res) => {
	try {
		const house = await House.findById(req.params.houseId);
		if (!house) {
			return res.status(404).json({ error: 'House not found' });
		}

		// Get current month's start and end dates
		const now = new Date();
		const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
		const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

		// Get previous month's start and end dates
		const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
		const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);

		// Get all expenses for current month
		const currentMonthExpenses = await Expense.find({
			house: house._id,
			createdAt: {
				$gte: startOfMonth,
				$lte: endOfMonth
			}
		});

		// Get all expenses for previous month
		const prevMonthExpenses = await Expense.find({
			house: house._id,
			createdAt: {
				$gte: startOfPrevMonth,
				$lte: endOfPrevMonth
			}
		});

		// Calculate current month statistics
		const totalAmount = currentMonthExpenses.reduce((sum, expense) => sum + expense.amount, 0);
		const totalExpenses = currentMonthExpenses.length;
		const avgExpense = totalExpenses > 0 ? totalAmount / totalExpenses : 0;
		const avgPerPerson = totalAmount / house.members.length;

		// Calculate previous month statistics
		const prevMonthTotal = prevMonthExpenses.reduce((sum, expense) => sum + expense.amount, 0);
		const prevMonthExpensesCount = prevMonthExpenses.length;
		const prevMonthAvgExpense = prevMonthExpensesCount > 0 ? prevMonthTotal / prevMonthExpensesCount : 0;
		const prevMonthAvgPerPerson = prevMonthTotal / house.members.length;

		// Calculate growth percentages
		const calculateGrowth = (current, previous) => {
			if (previous === 0) {
				return current > 0 ? '+inf' : 0;
			}
			if (current === 0) {
				return '-100.00';
			}
			const percentage = Number(((current - previous) / previous * 100).toFixed(2));
			return percentage > 0 ? `+${percentage}` : percentage.toString();
		};

		const growthStats = {
			totalAmountGrowth: calculateGrowth(totalAmount, prevMonthTotal),
			totalExpensesGrowth: calculateGrowth(totalExpenses, prevMonthExpensesCount),
			avgExpenseGrowth: calculateGrowth(avgExpense, prevMonthAvgExpense),
			avgPerPersonGrowth: calculateGrowth(avgPerPerson, prevMonthAvgPerPerson)
		};

		res.json({
			month: now.getMonth() + 1,
			year: now.getFullYear(),
			totalAmount,
			totalExpenses,
			avgExpense,
			avgPerPerson,
			memberCount: house.members.length,
			growthStats
		});
	} catch (error) {
		console.error('Statistics error:', error);
		res.status(500).json({ error: 'Failed to fetch statistics' });
	}
});

module.exports = router; 