const express = require('express');
const Settlement = require('../models/Settlement');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all settlements with pagination
router.get('/', auth, async (req, res) => {
	try {
		const page = parseInt(req.query.page) || 1;
		const limit = 10; // Fixed 10 items per page
		const skip = (page - 1) * limit;

		// Get total count of settlements
		const totalSettlements = await Settlement.countDocuments();

		// Get paginated settlements with only essential fields
		const settlements = await Settlement.find()
			.select('totalAmount totalExpenses createdBy createdAt')
			.populate('createdBy', 'name email picture')
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
		console.log(error);
		res.status(500).json({ error: 'Failed to fetch settlements' });
	}
});

// Get settlement details by ID
router.get('/:id', auth, async (req, res) => {
	try {
		const settlement = await Settlement.findById(req.params.id)
			.populate('transactions.from', 'name email picture')
			.populate('transactions.to', 'name email picture')
			.populate('createdBy', 'name email picture');

		if (!settlement) {
			return res.status(404).json({ error: 'Settlement not found' });
		}

		res.json(settlement);
	} catch (error) {
		console.log(error);
		res.status(500).json({ error: 'Failed to fetch settlement details' });
	}
});

module.exports = router; 