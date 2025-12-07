const express = require('express');
const router = express.Router();
const jobController = require('../controllers/job.controller');

// Initialize job (client accepts proposal)
router.post('/initialize', jobController.initializeJob.bind(jobController));

// Submit checkpoint
router.post('/:contractAddress/checkpoint/submit', jobController.submitCheckpoint.bind(jobController));

// Approve checkpoint
router.post('/:contractAddress/checkpoint/:checkpointIndex/approve', jobController.approveCheckpoint.bind(jobController));

// Reject checkpoint
router.post('/:contractAddress/checkpoint/:checkpointIndex/reject', jobController.rejectCheckpoint.bind(jobController));

// Cancel job
router.post('/:contractAddress/cancel', jobController.cancelJob.bind(jobController));

// Get job status
router.get('/:contractAddress/status', jobController.getJobStatus.bind(jobController));

module.exports = router;

