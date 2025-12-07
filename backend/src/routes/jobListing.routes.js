const express = require('express');
const router = express.Router();
const jobListingController = require('../controllers/jobListing.controller');

// Create new job listing
router.post('/create', jobListingController.createJobListing.bind(jobListingController));

// Get all job listings (MUST be before /:contractAddress route)
router.post('/all', jobListingController.getAllJobListings.bind(jobListingController));
router.get('/all', jobListingController.getAllJobListings.bind(jobListingController));

// Get job listing data
router.get('/:contractAddress', jobListingController.getJobListing.bind(jobListingController));

// Apply for job
router.post('/:contractAddress/apply', jobListingController.applyForJob.bind(jobListingController));

// Get all applications
router.get('/:contractAddress/applications', jobListingController.getApplications.bind(jobListingController));

module.exports = router;

