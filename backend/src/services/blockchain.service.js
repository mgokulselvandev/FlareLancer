const { ethers } = require('ethers');
const config = require('../config/config');

class BlockchainService {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(config.flareRpcUrl);
    this.wallet = config.privateKey
      ? new ethers.Wallet(config.privateKey, this.provider)
      : null;
  }

  /**
   * Get contract instance
   * @param {string} address - Contract address
   * @param {Array} abi - Contract ABI
   * @returns {ethers.Contract}
   */
  getContract(address, abi) {
    if (this.wallet) {
      return new ethers.Contract(address, abi, this.wallet);
    }
    return new ethers.Contract(address, abi, this.provider);
  }

  /**
   * Deploy contract
   * @param {ethers.ContractFactory} contractFactory - Contract factory
   * @param {Array} constructorArgs - Constructor arguments
   * @returns {Promise<ethers.Contract>} Deployed contract
   */
  async deployContract(contractFactory, constructorArgs = []) {
    if (!this.wallet) {
      throw new Error('Private key not configured');
    }
    const contract = await contractFactory.deploy(...constructorArgs);
    await contract.waitForDeployment();
    return contract;
  }

  /**
   * Create job listing
   * @param {string} contractAddress - JobListingToken contract address
   * @param {Object} jobData - Job listing data
   * @returns {Promise<ethers.TransactionResponse>}
   */
  async createJobListing(contractAddress, jobData, abi) {
    const contract = this.getContract(contractAddress, abi);
    const tx = await contract.createJobListing(
      jobData.title,
      jobData.description,
      jobData.jobType,
      jobData.deadline,
      ethers.parseEther(jobData.minPrice.toString()),
      ethers.parseEther(jobData.maxPrice.toString())
    );
    return tx;
  }

  /**
   * Apply for job
   * @param {string} contractAddress - JobListingToken contract address
   * @param {Object} applicationData - Application data
   * @returns {Promise<ethers.TransactionResponse>}
   */
  async applyForJob(contractAddress, applicationData, abi) {
    const contract = this.getContract(contractAddress, abi);
    const tx = await contract.applyForJob(
      ethers.parseEther(applicationData.proposedPrice.toString()),
      applicationData.cancellationTimeDays,
      applicationData.estimatedDelivery,
      applicationData.portfolioLink
    );
    return tx;
  }

  /**
   * Initialize job token
   * @param {string} contractAddress - JobToken contract address
   * @param {Object} jobData - Job initialization data
   * @returns {Promise<ethers.TransactionResponse>}
   */
  async initializeJob(contractAddress, jobData, abi) {
    const contract = this.getContract(contractAddress, abi);
    
    // Calculate estimated delivery timestamp from string (e.g., "3 weeks")
    const estimatedDeliveryTimestamp = this.parseDeliveryTime(jobData.estimatedDelivery);
    
    const tx = await contract.initializeJob(
      jobData.clientAddress,
      jobData.freelancerAddress,
      ethers.parseEther(jobData.finalPrice.toString()),
      estimatedDeliveryTimestamp,
      jobData.cancellationTimeDays,
      jobData.escrowWallet,
      jobData.paymentToken || ethers.ZeroAddress
    );
    return tx;
  }

  /**
   * Submit checkpoint
   * @param {string} contractAddress - JobToken contract address
   * @param {number} checkpointIndex - Checkpoint index (0-2)
   * @param {string} ipfsCID - IPFS CID
   * @returns {Promise<ethers.TransactionResponse>}
   */
  async submitCheckpoint(contractAddress, checkpointIndex, ipfsCID, abi) {
    const contract = this.getContract(contractAddress, abi);
    const tx = await contract.submitCheckpoint(checkpointIndex, ipfsCID);
    return tx;
  }

  /**
   * Approve checkpoint
   * @param {string} contractAddress - JobToken contract address
   * @param {number} checkpointIndex - Checkpoint index
   * @returns {Promise<ethers.TransactionResponse>}
   */
  async approveCheckpoint(contractAddress, checkpointIndex, abi) {
    const contract = this.getContract(contractAddress, abi);
    const tx = await contract.approveCheckpoint(checkpointIndex);
    return tx;
  }

  /**
   * Reject checkpoint
   * @param {string} contractAddress - JobToken contract address
   * @param {number} checkpointIndex - Checkpoint index
   * @returns {Promise<ethers.TransactionResponse>}
   */
  async rejectCheckpoint(contractAddress, checkpointIndex, abi) {
    const contract = this.getContract(contractAddress, abi);
    const tx = await contract.rejectCheckpoint(checkpointIndex);
    return tx;
  }

  /**
   * Cancel job
   * @param {string} contractAddress - JobToken contract address
   * @returns {Promise<ethers.TransactionResponse>}
   */
  async cancelJob(contractAddress, abi) {
    const contract = this.getContract(contractAddress, abi);
    const tx = await contract.cancelJob();
    return tx;
  }

  /**
   * Parse delivery time string to timestamp
   * @param {string} deliveryTime - e.g., "3 weeks", "1 month"
   * @returns {number} Unix timestamp
   */
  parseDeliveryTime(deliveryTime) {
    const now = Math.floor(Date.now() / 1000);
    const lower = deliveryTime.toLowerCase();
    
    if (lower.includes('week')) {
      const weeks = parseInt(deliveryTime);
      return now + (weeks * 7 * 24 * 60 * 60);
    } else if (lower.includes('month')) {
      const months = parseInt(deliveryTime);
      return now + (months * 30 * 24 * 60 * 60);
    } else if (lower.includes('day')) {
      const days = parseInt(deliveryTime);
      return now + (days * 24 * 60 * 60);
    }
    
    // Default to 30 days if can't parse
    return now + (30 * 24 * 60 * 60);
  }

  /**
   * Get job listing data
   * @param {string} contractAddress - Contract address
   * @returns {Promise<Object>} Job listing data
   */
  async getJobListingData(contractAddress, abi) {
    const contract = this.getContract(contractAddress, abi);
    const jobData = await contract.getJobData();
    const applications = await contract.getApplications();
    
    return {
      jobData: {
        title: jobData.title,
        description: jobData.description,
        jobType: jobData.jobType,
        deadline: jobData.deadline.toString(),
        minPrice: ethers.formatEther(jobData.minPrice),
        maxPrice: ethers.formatEther(jobData.maxPrice),
        clientAddress: jobData.clientAddress,
        createdAt: jobData.createdAt.toString(),
      },
      applications: applications.map(app => ({
        freelancerAddress: app.freelancerAddress,
        proposedPrice: ethers.formatEther(app.proposedPrice),
        cancellationTimeDays: app.cancellationTimeDays.toString(),
        estimatedDelivery: app.estimatedDelivery,
        portfolioLink: app.portfolioLink,
        appliedAt: app.appliedAt.toString(),
      })),
    };
  }

  /**
   * Get job token status
   * @param {string} contractAddress - JobToken contract address
   * @returns {Promise<Object>} Job status
   */
  async getJobStatus(contractAddress, abi) {
    const contract = this.getContract(contractAddress, abi);
    const status = await contract.getJobStatus();
    const canCancel = await contract.canCancel();
    
    return {
      isCancelled: status[0],
      totalReleased: ethers.formatEther(status[1]),
      remainingBalance: ethers.formatEther(status[2]),
      canCancel,
    };
  }
}

module.exports = new BlockchainService();

