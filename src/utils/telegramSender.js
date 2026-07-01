const TELEGRAM_API = 'https://api.telegram.org';

/**
 * Send a plain-text message to a Telegram chat via the Bot API.
 * Requires TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in the environment.
 * Returns true on success; never throws (logs and returns false on failure).
 */
const sendTelegramMessage = async (text) => {
	const token = process.env.TELEGRAM_BOT_TOKEN;
	const chatId = process.env.TELEGRAM_CHAT_ID;

	if (!token || !chatId) {
		console.error('Telegram not configured: missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID');
		return false;
	}

	try {
		const response = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				chat_id: chatId,
				text,
				parse_mode: 'HTML'
			})
		});

		if (!response.ok) {
			const body = await response.text();
			console.error(`Telegram send failed: ${response.status} ${body}`);
			return false;
		}

		return true;
	} catch (err) {
		console.error('Telegram send error:', err.message);
		return false;
	}
};

module.exports = { sendTelegramMessage };
