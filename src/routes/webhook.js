const express = require('express');
const { sendTelegramMessage } = require('../utils/telegramSender');

const router = express.Router();

// Escape HTML so arbitrary payload values can't break Telegram HTML parse_mode.
const escapeHtml = (value) =>
	String(value)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');

// GET webhook: whatever the sender puts in the query string, we receive and
// forward to Telegram. Always responds 200 so the sender does not retry.
router.get('/', async (req, res) => {
	const payload = req.query || {};
	const receivedAt = new Date().toISOString();

	const lines = Object.entries(payload).map(
		([key, value]) => `<b>${escapeHtml(key)}</b>: ${escapeHtml(value)}`
	);

	const message = [
		'📩 <b>Webhook received</b>',
		`🕒 ${receivedAt}`,
		lines.length ? '' : '<i>(empty payload)</i>',
		...lines
	]
		.filter((line) => line !== '')
		.join('\n');

	await sendTelegramMessage(message);

	res.status(200).json({ received: true, payload, receivedAt });
});

module.exports = router;
