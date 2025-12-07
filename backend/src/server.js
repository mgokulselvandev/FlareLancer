const express = require('express');
const cors = require('cors');
const config = require('./config/config');

const jobListingRoutes = require('./routes/jobListing.routes');
const jobRoutes = require('./routes/job.routes');
const ipfsRoutes = require('./routes/ipfs.routes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/job-listings', jobListingRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/ipfs', ipfsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;

