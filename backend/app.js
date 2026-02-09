const express = require('express');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const cors = require('cors');
const logger = require('./src/middleware/logger');

dotenv.config();
const app = express();
const port = process.env.PORT || 3000;

//import 
const connectDB = require('./src/config/db');
const courseRoutes = require('./src/routes/course_routes');
const userRoutes = require('./src/routes/user_routes');
const analyticsRoutes = require('./src/routes/analytics_routes');

// MongoDB connection
connectDB();

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true                
}));
app.use(logger);

// Routes
app.use('/courses', courseRoutes);
app.use('/users', userRoutes);
app.use('/analytics', analyticsRoutes);

// Start server
app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});