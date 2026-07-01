const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/william-home')
	.then(() => console.log('Connected to MongoDB'))
	.catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/health', require('./routes/health'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/houses', require('./routes/houses'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/settlements', require('./routes/settlements'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/webhook', require('./routes/webhook'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`);
});