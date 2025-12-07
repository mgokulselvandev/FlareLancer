const blockchainService = require('../services/blockchain.service');
const { loadABI } = require('../utils/abiLoader');
const config = require('../config/config');

class JobController {
  /**
   * Initialize job (client accepts proposal)
   */
  async initializeJob(req, res) {
    try {
      const {
        contractAddress,
        clientAddress,
        freelancerAddress,
        finalPrice,
        estimatedDelivery,
        cancellationTimeDays,
        escrowWallet,
        paymentToken,
      } = req.body;

      const tx = await blockchainService.initializeJob(
        contractAddress,
        {
          clientAddress,
          freelancerAddress,
          finalPrice,
          estimatedDelivery,
          cancellationTimeDays,
          escrowWallet,
          paymentToken,
        },
        loadABI('JobToken')
      );

      res.json({
        success: true,
        transactionHash: tx.hash,
        message: 'Job initialized successfully',
      });
    } catch (error) {
      console.error('Initialize job error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Submit checkpoint
   */
  async submitCheckpoint(req, res) {
    try {
      const { contractAddress } = req.params;
      const { checkpointIndex, ipfsCID } = req.body;

      if (checkpointIndex < 0 || checkpointIndex > 2) {
        return res.status(400).json({ error: 'Invalid checkpoint index (0-2)' });
      }

      const tx = await blockchainService.submitCheckpoint(
        contractAddress,
        checkpointIndex,
        ipfsCID,
        loadABI('JobToken')
      );

      res.json({
        success: true,
        transactionHash: tx.hash,
        message: 'Checkpoint submitted successfully',
      });
    } catch (error) {
      console.error('Submit checkpoint error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Approve checkpoint
   */
  async approveCheckpoint(req, res) {
    try {
      const { contractAddress, checkpointIndex } = req.params;

      if (checkpointIndex < 0 || checkpointIndex > 2) {
        return res.status(400).json({ error: 'Invalid checkpoint index (0-2)' });
      }

      const tx = await blockchainService.approveCheckpoint(
        contractAddress,
        parseInt(checkpointIndex),
        loadABI('JobToken')
      );

      res.json({
        success: true,
        transactionHash: tx.hash,
        message: 'Checkpoint approved successfully',
      });
    } catch (error) {
      console.error('Approve checkpoint error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Reject checkpoint
   */
  async rejectCheckpoint(req, res) {
    try {
      const { contractAddress, checkpointIndex } = req.params;

      if (checkpointIndex < 0 || checkpointIndex > 2) {
        return res.status(400).json({ error: 'Invalid checkpoint index (0-2)' });
      }

      const tx = await blockchainService.rejectCheckpoint(
        contractAddress,
        parseInt(checkpointIndex),
        loadABI('JobToken')
      );

      res.json({
        success: true,
        transactionHash: tx.hash,
        message: 'Checkpoint rejected',
      });
    } catch (error) {
      console.error('Reject checkpoint error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Cancel job
   */
  async cancelJob(req, res) {
    try {
      // This endpoint is informational - actual cancellation happens on frontend
      const { contractAddress } = req.params;

      res.json({
        success: true,
        contractAddress: contractAddress,
        message: 'Use this contract address to cancel job on frontend',
      });
    } catch (error) {
      console.error('Cancel job error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get job status
   */
  async getJobStatus(req, res) {
    try {
      const { contractAddress } = req.params;

      const status = await blockchainService.getJobStatus(contractAddress, JobTokenABI.abi);

      res.json({
        success: true,
        status,
      });
    } catch (error) {
      console.error('Get job status error:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new JobController();

