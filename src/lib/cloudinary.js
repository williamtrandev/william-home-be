const cloudinary = require('cloudinary').v2;

// Initialise the Cloudinary SDK once on cold start. The credentials live in
// .env (see .env.example for the required keys). If they are missing the SDK
// will still be importable so unrelated tests / dev flows don't blow up — the
// upload helper below is what actually fails fast when called without creds.
cloudinary.config({
	cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
	api_key: process.env.CLOUDINARY_API_KEY,
	api_secret: process.env.CLOUDINARY_API_SECRET,
	secure: true,
});

const isConfigured = () =>
	Boolean(
		process.env.CLOUDINARY_CLOUD_NAME &&
		process.env.CLOUDINARY_API_KEY &&
		process.env.CLOUDINARY_API_SECRET
	);

/**
 * Upload a single in-memory buffer (as produced by multer's memoryStorage).
 * Returns the trimmed metadata we persist on the Expense document.
 *
 * @param {Buffer} buffer
 * @param {object} opts
 * @param {string} opts.folder       Cloudinary folder, e.g. "house_<id>/expense_<id>"
 * @param {string} [opts.mimeType]   For tagging the result; not enforced.
 * @returns {Promise<{ url: string, publicId: string, mimeType?: string, width?: number, height?: number, bytes: number }>}
 */
const uploadBuffer = (buffer, { folder, mimeType }) =>
	new Promise((resolve, reject) => {
		if (!isConfigured()) {
			return reject(new Error('Cloudinary is not configured'));
		}

		const stream = cloudinary.uploader.upload_stream(
			{
				folder,
				resource_type: 'image',
				// Cap incoming images at a reasonable size so we don't store
				// 10MB phone photos. Keeps EXIF stripped, lossless WebP-ish.
				transformation: [{ width: 2000, height: 2000, crop: 'limit' }],
			},
			(error, result) => {
				if (error || !result) {
					return reject(error || new Error('Cloudinary upload failed'));
				}
				resolve({
					url: result.secure_url,
					publicId: result.public_id,
					mimeType: mimeType || result.format ? `image/${result.format}` : undefined,
					width: result.width,
					height: result.height,
					bytes: result.bytes,
				});
			}
		);

		stream.end(buffer);
	});

const destroyAsset = async (publicId) => {
	if (!publicId || !isConfigured()) return;
	try {
		await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
	} catch (error) {
		// Best-effort: log and move on so the user-facing operation
		// (delete expense / detach receipt) still succeeds.
		console.warn('Cloudinary destroy failed for', publicId, error?.message);
	}
};

module.exports = { cloudinary, uploadBuffer, destroyAsset, isConfigured };
