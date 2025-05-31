const express = require('express');
const Expense = require('../models/Expense');
const House = require('../models/House');
const Settlement = require('../models/Settlement');
const auth = require('../middleware/auth');
const { calculateExpenses } = require('../utils/expenseCalculator');
const { sendNotification } = require('../utils/notificationSender');

const router = express.Router();

// Create new expense
router.post('/', auth, async (req, res) => {
	try {
		const { houseId, purpose, amount } = req.body;
		const house = await House.findById(houseId).populate('members.user', '_id');
		if (!house) {
			return res.status(404).json({ error: 'House not found' });
		}

		const expense = await Expense.create({
			house: houseId,
			createdBy: req.user._id,
			purpose,
			amount
		});

		// Get all member IDs except the creator
		const memberIds = house.members
			.map(member => member.user._id)
			.filter(id => id.toString() !== req.user._id.toString());
		// Send notification to all house members
		await sendNotification(
			memberIds,
			'Chi tiêu mới',
			`${req.user.name} đã thêm chi tiêu mới: ${purpose} - ${amount.toLocaleString('vi-VN')}đ`,
			{
				type: 'NEW_EXPENSE',
				expenseId: expense._id.toString(),
				houseId: houseId.toString(),
				link: `/houses/${houseId}/expenses/${expense._id}`,
				amount: amount.toString(),
				purpose,
				createdBy: req.user.name
			}
		);

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
		const expenses = await Expense.find({ house: req.params.houseId, isSettled: false })
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
		const expense = await Expense.findById(req.params.id).populate('house', 'members');
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

		// Get all member IDs except the updater
		const memberIds = expense.house.members
			.map(member => member.user.toString())
			.filter(id => id !== req.user._id.toString());

		// Send notification to all house members
		await sendNotification(
			memberIds,
			'Chi tiêu được cập nhật',
			`${req.user.name} đã cập nhật chi tiêu: ${updatedExpense.purpose} - ${updatedExpense.amount.toLocaleString('vi-VN')}đ`,
			{
				type: 'UPDATED_EXPENSE',
				expenseId: expense._id.toString(),
				houseId: expense.house._id.toString(),
				link: `/houses/${expense.house._id}/expenses/${expense._id}`,
				amount: updatedExpense.amount.toString(),
				purpose: updatedExpense.purpose,
				updatedBy: req.user.name
			}
		);

		res.json(updatedExpense);
	} catch (error) {
		console.log(error);
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

		// Get all expenses for current month
		const currentMonthExpenses = await Expense.find({
			house: house._id,
			isSettled: false
		});

		// Get latest settlement for comparison
		const latestSettlement = await Settlement.findOne({ house: house._id })
			.sort({ createdAt: -1 });

		// Calculate current month statistics
		const totalAmount = currentMonthExpenses.reduce((sum, expense) => sum + expense.amount, 0);
		const totalExpenses = currentMonthExpenses.length;
		const avgExpense = totalExpenses > 0 ? totalAmount / totalExpenses : 0;
		const avgPerPerson = totalAmount / house.members.length;

		// Calculate growth percentages compared to latest settlement
		const calculateGrowth = (current, previous) => {
			if (previous === 0) {
				return current > 0 ? '+inf' : '0';
			}
			if (current === 0) {
				return '-100.00';
			}
			const percentage = Number(((current - previous) / previous * 100).toFixed(2));
			return percentage > 0 ? `+${percentage}` : percentage.toString();
		};

		const growthStats = {
			totalAmountGrowth: calculateGrowth(totalAmount, latestSettlement?.totalAmount || 0),
			totalExpensesGrowth: calculateGrowth(totalExpenses, latestSettlement?.totalExpenses || 0),
			avgExpenseGrowth: calculateGrowth(avgExpense, latestSettlement?.avgExpense || 0),
			avgPerPersonGrowth: calculateGrowth(avgPerPerson, latestSettlement?.avgPerPerson || 0)
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

// Calculate expenses for a house
router.post('/calculate/:houseId', auth, async (req, res) => {
	try {
		const { houseId } = req.params;

		// Get house and check if user is a member
		const house = await House.findById(houseId)
			.populate('members.user', 'name email picture');

		if (!house) {
			return res.status(404).json({
				error: {
					en: 'House not found',
					vi: 'Không tìm thấy nhà'
				}
			});
		}

		const member = house.members.find(m => m.user._id.toString() === req.user._id.toString());
		if (!member) {
			return res.status(403).json({
				error: {
					en: 'You do not have permission to access this house',
					vi: 'Bạn không có quyền truy cập vào nhà này'
				}
			});
		}

		// Get all unsettled expenses
		const expenses = await Expense.find({
			house: houseId,
			isSettled: false
		}).populate({
			path: 'createdBy',
			select: 'name email picture _id'
		});

		if (expenses.length === 0) {
			return res.status(404).json({
				error: {
					en: 'No unsettled expenses found',
					vi: 'Không tìm thấy chi tiêu chưa thanh toán'
				}
			});
		}

		// Calculate expenses
		const result = calculateExpenses(expenses, house.members);

		// Calculate statistics
		const totalAmount = result.totalExpenses;
		const totalExpenses = expenses.length;
		const avgExpense = totalAmount / totalExpenses;
		const avgPerPerson = totalAmount / house.members.length;

		// Format response
		const formattedResult = {
			totalAmount,
			totalExpenses,
			avgExpense,
			avgPerPerson,
			amountPerPerson: Object.entries(result.amountPerPerson).map(([userId, amount]) => {
				const member = house.members.find(m => m.user._id.toString() === userId);
				if (!member) return null;
				return {
					user: member.user,
					amount
				};
			}).filter(Boolean),
			transactions: result.transactions.map(t => {
				const fromMember = house.members.find(m => m.user._id.toString() === t.from);
				const toMember = house.members.find(m => m.user._id.toString() === t.to);
				if (!fromMember || !toMember) return null;
				return {
					from: fromMember.user,
					to: toMember.user,
					amount: t.amount
				};
			}).filter(Boolean)
		};

		const now = new Date();

		// Save settlement
		const settlement = await Settlement.create({
			house: houseId,
			totalAmount,
			totalExpenses,
			avgExpense,
			avgPerPerson,
			amountPerPerson: formattedResult.amountPerPerson.map(item => ({
				user: item.user._id,
				amount: item.amount
			})),
			transactions: formattedResult.transactions.map(t => ({
				from: t.from._id,
				to: t.to._id,
				amount: t.amount
			})),
			createdBy: req.user._id
		});

		// Mark all expenses as settled
		await Expense.updateMany(
			{ _id: { $in: expenses.map(e => e._id) } },
			{
				$set: {
					isSettled: true,
					settledAt: now
				}
			}
		);

		res.json({
			...formattedResult,
			settlementId: settlement._id
		});
	} catch (error) {
		console.error('Error calculating expenses:', error);
		res.status(500).json({
			error: {
				en: 'Failed to calculate expenses',
				vi: 'Tính toán chi tiêu thất bại'
			}
		});
	}
});

// Get settlement history
router.get('/settlements/:houseId', auth, async (req, res) => {
	try {
		const { houseId } = req.params;
		const page = parseInt(req.query.page) || 1;
		const limit = parseInt(req.query.limit) || 10;
		const skip = (page - 1) * limit;

		// Check if user is a member of the house
		const house = await House.findById(houseId);
		if (!house) {
			return res.status(404).json({
				error: {
					en: 'House not found',
					vi: 'Không tìm thấy nhà'
				}
			});
		}

		const member = house.members.find(m => m.user._id.toString() === req.user._id.toString());
		if (!member) {
			return res.status(403).json({
				error: {
					en: 'You do not have permission to access this house',
					vi: 'Bạn không có quyền truy cập vào nhà này'
				}
			});
		}

		// Get total count of settlements
		const totalSettlements = await Settlement.countDocuments({ house: houseId });

		// Get paginated settlements
		const settlements = await Settlement.find({ house: houseId })
			.populate('amountPerPerson.user', 'name email picture')
			.populate('transactions.from', 'name email picture')
			.populate('transactions.to', 'name email picture')
			.sort({ createdAt: -1 })
			.skip(skip)
			.limit(limit);

		res.json({
			settlements,
			pagination: {
				currentPage: page,
				totalPages: Math.ceil(totalSettlements / limit),
				totalItems: totalSettlements,
				itemsPerPage: limit
			}
		});
	} catch (error) {
		console.error('Error fetching settlements:', error);
		res.status(500).json({
			error: {
				en: 'Failed to fetch settlements',
				vi: 'Lấy lịch sử thanh toán thất bại'
			}
		});
	}
});

module.exports = router; 