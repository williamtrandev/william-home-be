const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const House = require('../models/House');
const HouseInvitation = require('../models/HouseInvitation');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const { OAuth2Client } = require('google-auth-library');
const auth = require('../middleware/auth');
const router = express.Router();
const { getInviteEmailTemplate } = require('../templates/emailTemplates');

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
						name: profile.displayName
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

// Generate tokens
const generateTokens = (user) => {
	const accessToken = jwt.sign(
		{
			id: user._id,
			email: user.email,
			name: user.name
		},
		process.env.JWT_SECRET,
		{ expiresIn: '1d' }
	);

	const refreshToken = jwt.sign(
		{
			id: user._id
		},
		process.env.JWT_REFRESH_SECRET,
		{ expiresIn: '7d' }
	);

	return { accessToken, refreshToken };
};

// Login with Google
router.post('/login/google', async (req, res) => {
	try {
		const { accessToken, houseId } = req.body;

		if (!accessToken) {
			return res.status(400).json({
				error: {
					en: 'Google access token is required',
					vi: 'Yêu cầu token Google'
				}
			});
		}

		if (!houseId) {
			return res.status(400).json({
				error: {
					en: 'House ID is required',
					vi: 'Yêu cầu ID nhà'
				}
			});
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
					name
				});
			}
		}

		if (user.isNewUser) {
			user.name = name;
			user.isNewUser = false;
			await user.save();
		}

		// Check if user has access to the house
		const house = await House.findById(houseId);
		if (!house) {
			return res.status(404).json({
				error: {
					en: 'House not found',
					vi: 'Không tìm thấy nhà'
				}
			});
		}

		const member = house.members.find(m => m.user.toString() === user._id.toString());
		if (!member) {
			return res.status(403).json({
				error: {
					en: 'You do not have permission to access this house',
					vi: 'Bạn không có quyền truy cập vào nhà này'
				}
			});
		}

		// Get user's houses with roles
		const houses = await House.find({ 'members.user': user._id })
			.select('name description members')
			.lean();

		// Format houses data
		const userHouses = houses.map(house => {
			const member = house.members.find(m => m.user.toString() === user._id.toString());
			return {
				id: house._id,
				name: house.name,
				description: house.description,
				role: member.role,
				joinedAt: member.joinedAt
			};
		});

		// Generate tokens
		const { accessToken: token, refreshToken } = generateTokens(user);

		// Return tokens and user information with houses and roles
		res.json({
			accessToken: token,
			refreshToken,
			user: {
				id: user._id,
				email: user.email,
				name: user.name,
				picture: user.picture,
				houses: userHouses,
				currentHouseRole: member.role
			}
		});

	} catch (error) {
		console.error('Google login error:', error);
		res.status(401).json({
			error: {
				en: 'Invalid Google access token',
				vi: 'Token Google không hợp lệ'
			}
		});
	}
});

// Refresh token
router.post('/refresh-token', async (req, res) => {
	try {
		const { refreshToken } = req.body;

		if (!refreshToken) {
			return res.status(400).json({ error: 'Refresh token is required' });
		}

		// Verify refresh token
		const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

		// Get user
		const user = await User.findById(decoded.id);
		if (!user) {
			return res.status(404).json({ error: 'User not found' });
		}

		// Generate new tokens
		const tokens = generateTokens(user);

		res.json(tokens);
	} catch (error) {
		console.error('Refresh token error:', error);
		res.status(401).json({ error: 'Invalid refresh token' });
	}
});

// Get current user
router.get('/me', auth, async (req, res) => {
	try {
		const user = req.user;
		res.json({
			id: user._id,
			name: user.name,
			email: user.email,
			picture: user.picture
		});
	} catch (error) {
		console.log(error);
		res.status(401).json({
			error: {
				en: 'Invalid authentication token',
				vi: 'Token xác thực không hợp lệ'
			}
		});
	}
});

// Update user profile
router.put('/profile', auth, async (req, res) => {
	try {
		const { name, picture } = req.body;
		const user = req.user;

		// Update only provided fields
		if (name) user.name = name;
		if (picture) user.picture = picture;

		await user.save();

		res.json({
			id: user._id,
			name: user.name,
			email: user.email,
			picture: user.picture
		});
	} catch (error) {
		console.error('Profile update error:', error);
		res.status(500).json({ error: 'Failed to update profile' });
	}
});

// Invite user to house
router.post('/invite', auth, async (req, res) => {
	try {
		const { email, houseId } = req.body;
		const userId = req.user._id;

		const house = await House.findById(houseId);
		if (!house) {
			return res.status(404).json({
				error: {
					en: 'House not found',
					vi: 'Không tìm thấy nhà'
				}
			});
		}

		// Check if inviter is a member
		const inviterMember = house.members.find(m => m.user.toString() === userId.toString());
		if (!inviterMember) {
			return res.status(403).json({
				error: {
					en: 'You are not a member of this house',
					vi: 'Bạn không phải là thành viên của nhà này'
				}
			});
		}

		let user = await User.findOne({ email });
		if (!user) {
			user = await User.create({ email, name: email.split('@')[0] });
		}

		// Check if user is already a member
		const existingMember = house.members.find(m => m.user.toString() === user._id.toString());
		if (existingMember) {
			return res.status(400).json({
				error: {
					en: 'User is already a member of this house',
					vi: 'Người dùng đã là thành viên của nhà này'
				}
			});
		}

		// Create new invitation
		const invitation = new HouseInvitation({
			house: houseId,
			invitedUser: user._id,
			invitedBy: userId
		});
		await invitation.save();

		const inviteLink = `${process.env.FRONTEND_URL}/join-house/${invitation.token}`;
		const emailContent = getInviteEmailTemplate(house.name, inviteLink);

		// Send invitation email asynchronously
		transporter.sendMail({
			from: `"William's Home" <${process.env.EMAIL_USER}>`,
			to: email,
			subject: `Invitation to join ${house.name} on William's Home | Lời mời tham gia ${house.name} trên William's Home`,
			html: emailContent
		}).catch(error => {
			console.error('Failed to send invitation email:', error);
		});

		res.json({
			message: {
				en: 'Invitation sent successfully',
				vi: 'Đã gửi lời mời thành công'
			}
		});
	} catch (error) {
		console.error('Invite error:', error);
		res.status(500).json({
			error: {
				en: 'Failed to send invitation',
				vi: 'Gửi lời mời thất bại'
			}
		});
	}
});

// Accept house invitation via token
router.post('/join/:token', async (req, res) => {
	try {
		const invitation = await HouseInvitation.findOne({
			token: req.params.token,
			status: 'pending'
		});

		if (!invitation) {
			return res.status(404).json({
				error: {
					en: 'Invitation not found or already processed',
					vi: 'Không tìm thấy lời mời hoặc đã được xử lý'
				}
			});
		}

		if (invitation.expiresAt < new Date()) {
			return res.status(400).json({
				error: {
					en: 'Invitation has expired',
					vi: 'Lời mời đã hết hạn'
				}
			});
		}

		const session = await mongoose.startSession();
		session.startTransaction();

		try {
			// Update invitation status
			invitation.status = 'accepted';
			await invitation.save({ session });

			// Add user to house members
			const house = await House.findById(invitation.house);
			const existingMember = house.members.find(m => m.user.toString() === invitation.invitedUser.toString());

			if (!existingMember) {
				house.members.push({
					user: invitation.invitedUser,
					role: 'MEMBER',
					joinedAt: new Date()
				});
				await house.save({ session });
			}

			await session.commitTransaction();
			res.json({
				message: {
					en: 'Successfully joined house',
					vi: 'Đã tham gia nhà thành công'
				}
			});
		} catch (error) {
			await session.abortTransaction();
			throw error;
		} finally {
			session.endSession();
		}
	} catch (error) {
		console.error('Error accepting invitation:', error);
		res.status(500).json({
			error: {
				en: 'Failed to accept invitation',
				vi: 'Chấp nhận lời mời thất bại'
			}
		});
	}
});

// Reject house invitation via token
router.post('/reject/:token', async (req, res) => {
	try {
		const invitation = await HouseInvitation.findOne({
			token: req.params.token,
			status: 'pending'
		});

		if (!invitation) {
			return res.status(404).json({
				error: {
					en: 'Invitation not found or already processed',
					vi: 'Không tìm thấy lời mời hoặc đã được xử lý'
				}
			});
		}

		invitation.status = 'rejected';
		await invitation.save();

		res.json({
			message: {
				en: 'Invitation rejected successfully',
				vi: 'Đã từ chối lời mời thành công'
			}
		});
	} catch (error) {
		console.error('Error rejecting invitation:', error);
		res.status(500).json({
			error: {
				en: 'Failed to reject invitation',
				vi: 'Từ chối lời mời thất bại'
			}
		});
	}
});

module.exports = router; 