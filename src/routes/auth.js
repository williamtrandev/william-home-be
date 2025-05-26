const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const House = require('../models/House');
const nodemailer = require('nodemailer');
const { OAuth2Client } = require('google-auth-library');

const router = express.Router();

// Log environment variables for debugging
console.log('Google OAuth Config:', {
	clientID: process.env.GOOGLE_CLIENT_ID,
	clientSecret: process.env.GOOGLE_CLIENT_SECRET ? '***' : 'not set',
	callbackURL: process.env.GOOGLE_CALLBACK_URL
});

// Initialize Google OAuth2 client
const oauth2Client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Configure Google Strategy
passport.use(new GoogleStrategy({
	clientID: process.env.GOOGLE_CLIENT_ID,
	clientSecret: process.env.GOOGLE_CLIENT_SECRET,
	callbackURL: process.env.GOOGLE_CALLBACK_URL,
	proxy: true // Add this to handle proxy issues
},
	async (accessToken, refreshToken, profile, done) => {
		try {
			console.log('Google profile:', profile);

			let user = await User.findOne({ googleId: profile.id });

			if (!user) {
				user = await User.findOne({ email: profile.emails[0].value });
				if (user) {
					user.googleId = profile.id;
					await user.save();
				} else {
					user = await User.create({
						googleId: profile.id,
						email: profile.emails[0].value,
						name: profile.displayName,
						picture: profile.photos[0].value
					});
				}
			}

			return done(null, user);
		} catch (error) {
			console.error('Strategy error:', error);
			return done(error, null);
		}
	}
));

// Configure email transporter
const transporter = nodemailer.createTransport({
	service: 'gmail',
	auth: {
		user: process.env.EMAIL_USER,
		pass: process.env.EMAIL_PASS
	}
});

// Login with Google
router.post('/login/google', async (req, res) => {
	try {
		const { accessToken } = req.body;

		if (!accessToken) {
			return res.status(400).json({ error: 'Google access token is required' });
		}

		// Verify the access token with Google
		const ticket = await oauth2Client.verifyIdToken({
			idToken: accessToken,
			audience: process.env.GOOGLE_CLIENT_ID
		});

		const payload = ticket.getPayload();
		const { sub: googleId, email, name, picture } = payload;

		// Find or create user
		let user = await User.findOne({ googleId });
		if (!user) {
			user = await User.findOne({ email });
			if (user) {
				user.googleId = googleId;
				await user.save();
			} else {
				user = await User.create({
					googleId,
					email,
					name,
					picture
				});
			}
		}

		// Generate system token
		const token = jwt.sign(
			{
				id: user._id,
				email: user.email,
				name: user.name
			},
			process.env.JWT_SECRET,
			{ expiresIn: '1h' }
		);

		// Return system token
		res.json({ token });

	} catch (error) {
		console.error('Google login error:', error);
		res.status(401).json({ error: 'Invalid Google access token' });
	}
});

// Get current user
router.get('/me', async (req, res) => {
	try {
		const token = req.header('Authorization')?.replace('Bearer ', '');
		if (!token) {
			return res.status(401).json({ error: 'Authentication required' });
		}

		const decoded = jwt.verify(token, process.env.JWT_SECRET);
		const user = await User.findById(decoded.id);

		if (!user) {
			return res.status(401).json({ error: 'User not found' });
		}

		res.json({
			id: user._id,
			name: user.name,
			email: user.email,
			picture: user.picture
		});
	} catch (error) {
		res.status(401).json({ error: 'Invalid authentication token' });
	}
});

// Invite user to house
router.post('/invite', async (req, res) => {
	try {
		const { email, houseId } = req.body;
		const house = await House.findById(houseId);

		if (!house) {
			return res.status(404).json({ error: 'House not found' });
		}

		let user = await User.findOne({ email });
		if (!user) {
			user = await User.create({ email, name: email.split('@')[0] });
		}

		if (!user.pendingInvites.includes(houseId)) {
			user.pendingInvites.push(houseId);
			await user.save();
		}

		// Create invite link
		const inviteLink = `${process.env.FRONTEND_URL}/auth/google?houseId=${houseId}`;

		// Send invitation email
		await transporter.sendMail({
			from: process.env.EMAIL_USER,
			to: email,
			subject: 'Invitation to join William Home',
			html: `
        <h1>You've been invited to join ${house.name}</h1>
        <p>Click the link below to join:</p>
        <a href="${inviteLink}">Join House</a>
      `
		});

		res.json({
			message: 'Invitation sent successfully',
			inviteLink
		});
	} catch (error) {
		res.status(500).json({ error: 'Failed to send invitation' });
	}
});

module.exports = router; 