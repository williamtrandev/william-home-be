const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
	user: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User',
		required: true
	},
	role: {
		type: String,
		enum: ['OWNER', 'ADMIN', 'MEMBER'],
		default: 'MEMBER'
	},
	joinedAt: {
		type: Date,
		default: Date.now
	}
});

const houseSchema = new mongoose.Schema({
	name: {
		type: String,
		required: true
	},
	description: {
		type: String
	},
	createdBy: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User',
		required: true
	},
	members: [memberSchema],
	createdAt: {
		type: Date,
		default: Date.now
	},
	updatedAt: {
		type: Date,
		default: Date.now
	}
}, { timestamps: true });

// Update the updatedAt timestamp before saving
houseSchema.pre('save', function (next) {
	this.updatedAt = Date.now();
	next();
});

// Add index for faster member lookups
houseSchema.index({ 'members.user': 1 });

// Add method to check if user is member
houseSchema.methods.isMember = function (userId) {
	return this.members.some(member => member.user.toString() === userId.toString());
};

// Add method to get user role
houseSchema.methods.getUserRole = function (userId) {
	const member = this.members.find(member => member.user.toString() === userId.toString());
	return member ? member.role : null;
};

// Add method to add member
houseSchema.methods.addMember = async function (userId, role = 'MEMBER') {
	if (!this.isMember(userId)) {
		this.members.push({
			user: userId,
			role,
			joinedAt: new Date()
		});
		await this.save();
	}
};

// Add method to update member role
houseSchema.methods.updateMemberRole = async function (userId, newRole) {
	const member = this.members.find(member => member.user.toString() === userId.toString());
	if (member) {
		member.role = newRole;
		await this.save();
	}
};

// Add method to remove member
houseSchema.methods.removeMember = async function (userId) {
	this.members = this.members.filter(member => member.user.toString() !== userId.toString());
	await this.save();
};

// Static method to create a new house with owner
houseSchema.statics.createWithOwner = async function (houseData, ownerId) {
	const house = new this({
		...houseData,
		createdBy: ownerId,
		members: [{
			user: ownerId,
			role: 'OWNER',
			joinedAt: new Date()
		}]
	});
	return await house.save();
};

const House = mongoose.model('House', houseSchema);

module.exports = House; 