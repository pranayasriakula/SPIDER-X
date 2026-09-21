require('dotenv').config();

const express = require('express');
const cors = require('cors');
const healthRoutes = require('./src/routes/healthRoutes');
const authRoutes = require('./src/routes/authRoutes');
const userRoutes = require('./src/routes/userRoutes');
const reportRoutes = require('./src/routes/reportRoutes');
const alertRoutes = require('./src/routes/alertRoutes');
const actionRoutes = require('./src/routes/actionRoutes');
const robotRoutes = require('./src/routes/robotRoutes');
const observationRoutes = require('./src/routes/observationRoutes');
const notificationRoutes = require('./src/routes/notificationRoutes');
const rescueCenterRoutes = require('./src/routes/rescueCenterRoutes');
const resourceRoutes = require('./src/routes/resourceRoutes');
const notFound = require('./src/middleware/notFound');
const errorHandler = require('./src/middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// Allow a local frontend to call this API during development.
app.use(cors());

// Parse JSON request bodies.
app.use(express.json());

// API routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/actions', actionRoutes);
app.use('/api/robots', robotRoutes);
app.use('/api/observations', observationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/rescue-centers', rescueCenterRoutes);
app.use('/api/resources', resourceRoutes);

// Middleware must be registered after routes.
app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Spider-X backend is running on http://localhost:${PORT}`);
});
