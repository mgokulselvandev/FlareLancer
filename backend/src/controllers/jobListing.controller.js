const blockchainService = require('../services/blockchain.service');
const { loadABI } = require('../utils/abiLoader');
const { ethers } = require('ethers');
const config = require('../config/config');

class JobListingController {
  /**
   * Create new job listing
   * Note: In production, this should deploy a new JobListingToken contract for each job
   * For now, we use a single contract address and track jobs by events
   */
  async createJobListing(req, res) {
    try {
      // This endpoint is informational - actual creation happens on frontend
      // Frontend signs and submits transaction directly to blockchain
      const contractAddress = config.jobListingTokenAddress;

      if (!contractAddress) {
        return res.status(400).json({ error: 'Contract address not configured' });
      }

      res.json({
        success: true,
        contractAddress: contractAddress,
        message: 'Use this contract address to create job listing on frontend',
      });
    } catch (error) {
      console.error('Create job listing error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get job listing data
   */
  async getJobListing(req, res) {
    try {
      const { contractAddress } = req.params;
      const provider = new ethers.JsonRpcProvider(config.flareRpcUrl);
      
      const data = await blockchainService.getJobListingData(
        contractAddress,
        loadABI('JobListingToken')
      );

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      console.error('Get job listing error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Apply for job
   */
  async applyForJob(req, res) {
    try {
      // This endpoint is informational - actual application happens on frontend
      // Frontend signs and submits transaction directly to blockchain
      const { contractAddress } = req.params;

      res.json({
        success: true,
        contractAddress: contractAddress,
        message: 'Use this contract address to apply for job on frontend',
      });
    } catch (error) {
      console.error('Apply for job error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get all applications for a job
   */
  async getApplications(req, res) {
    try {
      const { contractAddress } = req.params;
      const provider = new ethers.JsonRpcProvider(config.flareRpcUrl);
      
      const data = await blockchainService.getJobListingData(
        contractAddress,
        loadABI('JobListingToken')
      );

      res.json({
        success: true,
        applications: data.applications,
      });
    } catch (error) {
      console.error('Get applications error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get all job listings from the registry contract
   */
  async getAllJobListings(req, res) {
    try {
      const contractAddress = config.jobListingTokenAddress;
      
      if (!contractAddress) {
        return res.status(400).json({ error: 'Contract address not configured' });
      }
      
      console.log('Fetching all jobs from registry:', contractAddress);
      
      const provider = new ethers.JsonRpcProvider(config.flareRpcUrl);
      const contract = new ethers.Contract(contractAddress, loadABI('JobListingToken'), provider);
      
      // Get all active jobs from the contract
      const allJobs = await contract.getActiveJobs();
      
      console.log(`Found ${allJobs.length} active jobs`);
      
      // Format the jobs for the response
      const jobs = await Promise.all(
        allJobs.map(async (job) => {
          try {
            // Get applications for this job
            const applications = await contract.getJobApplications(job.jobId);
            
            return {
              id: job.jobId.toString(),
              jobId: job.jobId.toString(),
              contractAddress: contractAddress,
              title: job.title,
              description: job.description,
              jobType: job.jobType,
              deadline: job.deadline.toString(),
              minPrice: ethers.formatEther(job.minPrice),
              maxPrice: ethers.formatEther(job.maxPrice),
              clientAddress: job.clientAddress,
              createdAt: job.createdAt.toString(),
              isActive: job.isActive,
              applications: applications
                .filter(app => !app.isApproved) // Only show unapproved applications
                .map(app => ({
                  freelancerAddress: app.freelancerAddress,
                  proposedPrice: ethers.formatEther(app.proposedPrice),
                  cancellationTimeDays: app.cancellationTimeDays.toString(),
                  estimatedDelivery: app.estimatedDelivery,
                  portfolioLink: app.portfolioLink,
                  appliedAt: app.appliedAt.toString(),
                  isApproved: app.isApproved
                }))
            };
          } catch (error) {
            console.error(`Error loading job ${job.jobId}:`, error);
            return null;
          }
        })
      );

      res.json({
        success: true,
        jobs: jobs.filter(Boolean),
      });
    } catch (error) {
      console.error('Get all job listings error:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new JobListingController();
