const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

const getDatabaseStatus = () => {
	const readyState = mongoose.connection.readyState;
	if (readyState === 1) return 'connected';
	if (readyState === 2) return 'connecting';
	return 'disconnected';
};

router.get('/', (req, res) => {
	const databaseStatus = getDatabaseStatus();
	const isHealthy = databaseStatus === 'connected';

	const body = {
		status: isHealthy ? 'ok' : 'degraded',
		timestamp: new Date().toISOString(),
		database: {
			status: databaseStatus
		}
	};

	res.status(isHealthy ? 200 : 503).json(body);
});

module.exports = router;
