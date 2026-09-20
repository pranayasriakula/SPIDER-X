require('dotenv').config();

const express = require('express');
const cors = require('cors');
const healthRoutes = require('./src/routes/healthRoutes');
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

// Middleware must be registered after routes.
app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Spider-X backend is running on http://localhost:${PORT}`);
});
