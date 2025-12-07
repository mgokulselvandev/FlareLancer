import { ethers } from 'ethers';
import apiService from './api.service';

const JOB_LISTING_TOKEN_ABI = [
  "function createJobListing(string memory _title, string memory _description, string memory _jobType, uint256 _deadline, uint256 _minPrice, uint256 _maxPrice, string memory _paymentFAsset, string memory _metadataURI) external returns (uint256)",
  "function applyForJob(uint256 _jobId, uint256 _proposedPrice, uint256 _cancellationTimeDays, string memory _estimatedDelivery, string memory _portfolioLink) external",
  "function approveApplication(uint256 _jobId, uint256 _applicationIndex) external",
  "function setJobToken(uint256 _jobId, address _jobTokenAddress) external",
  "function getJobToken(uint256 _jobId) external view returns (address)",
  "function getAllJobs() external view returns (tuple(uint256 jobId, string title, string description, string jobType, uint256 deadline, uint256 minPrice, uint256 maxPrice, address clientAddress, uint256 createdAt, bool isActive, string paymentFAsset, string metadataURI)[])",
  "function getActiveJobs() external view returns (tuple(uint256 jobId, string title, string description, string jobType, uint256 deadline, uint256 minPrice, uint256 maxPrice, address clientAddress, uint256 createdAt, bool isActive, string paymentFAsset, string metadataURI)[])",
  "function getJob(uint256 _jobId) external view returns (tuple(uint256 jobId, string title, string description, string jobType, uint256 deadline, uint256 minPrice, uint256 maxPrice, address clientAddress, uint256 createdAt, bool isActive, string paymentFAsset, string metadataURI))",
  "function getJobApplications(uint256 _jobId) external view returns (tuple(address freelancerAddress, uint256 proposedPrice, uint256 cancellationTimeDays, string estimatedDelivery, string portfolioLink, uint256 appliedAt, bool isApproved)[])",
  "function jobCount() external view returns (uint256)",
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "function balanceOf(address owner) external view returns (uint256)",
  "function tokenURI(uint256 tokenId) external view returns (string memory)",
  "event JobListingCreated(uint256 indexed jobId, address indexed clientAddress, string title, uint256 deadline, string paymentFAsset)",
  "event ApplicationSubmitted(uint256 indexed jobId, address indexed freelancerAddress, uint256 proposedPrice, uint256 applicationIndex)",
  "event ApplicationApproved(uint256 indexed jobId, uint256 indexed applicationIndex, address indexed freelancerAddress)",
  "event JobNFTMinted(uint256 indexed tokenId, address indexed owner, string metadataURI)"
];

const JOB_TOKEN_FACTORY_ABI = [
  "function createJobToken(uint256 _jobId, address _clientAddress, address _freelancerAddress, uint256 _finalPrice, uint256 _estimatedDeliveryTimestamp, uint256 _cancellationTimeDays, address payable _escrowWallet, address _paymentToken) external returns (address)",
  "function createJobTokenAndDeposit(uint256 _jobId, address _clientAddress, address _freelancerAddress, uint256 _finalPrice, uint256 _estimatedDeliveryTimestamp, uint256 _cancellationTimeDays, address payable _escrowWallet, address _paymentToken) external returns (address)",
  "function getJobToken(uint256 _jobId) external view returns (address)",
  "function getJobTokenCount() external view returns (uint256)",
  "function getAllJobTokens() external view returns (address[])",
  "event JobTokenCreated(uint256 indexed jobId, address indexed jobTokenAddress, address indexed clientAddress, address freelancerAddress)"
];

const JOB_TOKEN_ABI = [
  "function initializeJob(address _clientAddress, address _freelancerAddress, uint256 _finalPrice, uint256 _estimatedDeliveryTimestamp, uint256 _cancellationTimeDays, address payable _escrowWallet, address _paymentToken) external",
  "function depositToEscrow() external payable",
  "function submitCheckpoint(uint256 _checkpointIndex, string memory _ipfsCID) external",
  "function approveCheckpoint(uint256 _checkpointIndex) external",
  "function rejectCheckpoint(uint256 _checkpointIndex) external",
  "function cancelJob() external",
  "function getCheckpoint(uint256 _checkpointIndex) external view returns (tuple(bool isCompleted, bool isApproved, string ipfsCID, uint256 submissionDate, uint256 approvalDate))",
  "function getJobStatus() external view returns (bool _isCancelled, uint256 _totalReleased, uint256 _remainingBalance)",
  "function canCancel() external view returns (bool)",
  "function clientAddress() external view returns (address)",
  "function freelancerAddress() external view returns (address)",
  "function finalPrice() external view returns (uint256)",
  "function approvalDate() external view returns (uint256)",
  "event CheckpointSubmitted(uint256 indexed checkpointIndex, string ipfsCID)",
  "event CheckpointApproved(uint256 indexed checkpointIndex, uint256 paymentReleased)",
  "event CheckpointRejected(uint256 indexed checkpointIndex)",
  "event FundsDeposited(address indexed clientAddress, uint256 amount)"
];

const ESCROW_WALLET_ABI = [
  "function setJobTokenContract(address _jobTokenContract) external",
  "function deposit(address _token, uint256 _amount) external payable",
  "function release(address _token, address _to, uint256 _amount) external",
  "function refund(address _token, address _to, uint256 _amount) external",
  "function getBalance(address _token) external view returns (uint256)",
  "function jobTokenContract() external view returns (address)",
  "function owner() external view returns (address)"
];

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function symbol() external view returns (string)",
  "function decimals() external view returns (uint8)"
];

const PRICE_ORACLE_ABI = [
  "function convertUSDToToken(uint256 _usdAmount, string memory _symbol) external view returns (uint256)",
  "function getPrice(string memory _symbol) external view returns (uint256 price, uint256 decimals)"
];

class BlockchainService {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.priceOracleAddress = import.meta.env.VITE_PRICE_ORACLE_ADDRESS;
  }

  setProvider(provider, signer) {
    this.provider = provider;
    this.signer = signer;
  }

  getPriceOracleContract() {
    if (!this.provider) {
      throw new Error('Provider not set');
    }
    return new ethers.Contract(
      this.priceOracleAddress,
      PRICE_ORACLE_ABI,
      this.provider
    );
  }

  /**
   * Convert USD amount to FAsset token amount using FTSO
   */
  async convertUSDToToken(usdAmount, fassetSymbol) {
    try {
      const priceOracle = this.getPriceOracleContract();
      const usdWei = ethers.parseEther(usdAmount.toString());
      const tokenAmount = await priceOracle.convertUSDToToken(usdWei, fassetSymbol);
      return tokenAmount;
    } catch (error) {
      console.error('Error converting USD to token:', error);
      throw error;
    }
  }

  /**
   * Get current price of an asset from FTSO
   */
  async getAssetPrice(fassetSymbol) {
    try {
      const priceOracle = this.getPriceOracleContract();
      const [price, decimals] = await priceOracle.getPrice(fassetSymbol);
      return {
        price: price.toString(),
        decimals: decimals.toString(),
        priceFormatted: ethers.formatUnits(price, Number(decimals))
      };
    } catch (error) {
      console.error('Error getting asset price:', error);
      // Return default for stablecoins
      if (fassetSymbol.includes('USDT') || fassetSymbol.includes('USDC')) {
        return { price: '1', decimals: '0', priceFormatted: '1.00' };
      }
      throw error;
    }
  }

  getJobListingContract(address) {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }
    return new ethers.Contract(address, JOB_LISTING_TOKEN_ABI, this.signer);
  }

  getJobTokenContract(address) {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }
    return new ethers.Contract(address, JOB_TOKEN_ABI, this.signer);
  }

  getJobTokenFactoryContract(address) {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }
    return new ethers.Contract(address, JOB_TOKEN_FACTORY_ABI, this.signer);
  }

  async createJobListing(contractAddress, jobData) {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }
    const contract = this.getJobListingContract(contractAddress);
    
    // Convert deadline to timestamp (deadline is in YYYY-MM-DD format from date input)
    const deadlineDate = new Date(jobData.deadline + 'T23:59:59'); // End of day
    if (isNaN(deadlineDate.getTime())) {
      throw new Error('Invalid deadline date');
    }
    const deadlineTimestamp = Math.floor(deadlineDate.getTime() / 1000);
    
    // Use selected payment FAsset (default to testUSDT)
    const paymentFAsset = jobData.paymentFAsset || 'testUSDT';
    
    // Metadata URI (empty for now, can be added later)
    const metadataURI = jobData.metadataURI || '';
    
    // Store prices in USD (as entered by user)
    // The contract will store these as-is, and conversion happens at payment time
    const minPriceUSD = ethers.parseEther(jobData.minPrice.toString());
    const maxPriceUSD = ethers.parseEther(jobData.maxPrice.toString());
    
    console.log('Creating job with FTSO-enabled pricing:', {
      title: jobData.title,
      description: jobData.description,
      jobType: jobData.jobType,
      deadline: deadlineTimestamp,
      minPriceUSD: ethers.formatEther(minPriceUSD) + ' USD',
      maxPriceUSD: ethers.formatEther(maxPriceUSD) + ' USD',
      paymentFAsset: paymentFAsset,
      metadataURI: metadataURI
    });
    
    const tx = await contract.createJobListing(
      jobData.title,
      jobData.description,
      jobData.jobType,
      deadlineTimestamp,
      minPriceUSD,
      maxPriceUSD,
      paymentFAsset,
      metadataURI
    );
    
    await tx.wait();
    return tx.hash;
  }

  async applyForJob(contractAddress, jobId, applicationData) {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }
    const contract = this.getJobListingContract(contractAddress);
    
    const tx = await contract.applyForJob(
      jobId,
      ethers.parseEther(applicationData.proposedPrice.toString()),
      applicationData.cancellationTimeDays,
      applicationData.estimatedDelivery,
      applicationData.portfolioLink || ""
    );
    
    await tx.wait();
    return tx.hash;
  }

  async approveApplication(contractAddress, jobId, applicationIndex) {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }
    const contract = this.getJobListingContract(contractAddress);
    
    const tx = await contract.approveApplication(jobId, applicationIndex);
    await tx.wait();
    return tx.hash;
  }

  async setJobToken(contractAddress, jobId, jobTokenAddress) {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }
    const contract = this.getJobListingContract(contractAddress);
    
    const tx = await contract.setJobToken(jobId, jobTokenAddress);
    await tx.wait();
    return tx.hash;
  }

  async getJobToken(contractAddress, jobId) {
    const provider = this.provider || new ethers.BrowserProvider(window.ethereum);
    const contract = new ethers.Contract(contractAddress, JOB_LISTING_TOKEN_ABI, provider);
    
    return await contract.getJobToken(jobId);
  }

  async getJobListingData(contractAddress) {
    const provider = this.provider || new ethers.BrowserProvider(window.ethereum);
    const contract = new ethers.Contract(contractAddress, JOB_LISTING_TOKEN_ABI, provider);
    
    const [jobData, applications] = await Promise.all([
      contract.getJobData(),
      contract.getApplications()
    ]);
    
    return {
      jobData: {
        title: jobData.title,
        description: jobData.description,
        jobType: jobData.jobType,
        deadline: Number(jobData.deadline),
        minPrice: ethers.formatEther(jobData.minPrice),
        maxPrice: ethers.formatEther(jobData.maxPrice),
        clientAddress: jobData.clientAddress,
        createdAt: Number(jobData.createdAt),
      },
      applications: applications.map(app => ({
        freelancerAddress: app.freelancerAddress,
        proposedPrice: ethers.formatEther(app.proposedPrice),
        cancellationTimeDays: Number(app.cancellationTimeDays),
        estimatedDelivery: app.estimatedDelivery,
        portfolioLink: app.portfolioLink,
        appliedAt: Number(app.appliedAt),
      })),
    };
  }

  async createJobToken(factoryAddress, jobId, jobData) {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }
    const factory = this.getJobTokenFactoryContract(factoryAddress);
    
    // Calculate estimated delivery timestamp from string (e.g., "3 weeks")
    const estimatedDeliveryTimestamp = this.parseDeliveryTime(jobData.estimatedDelivery);
    
    console.log('Creating JobToken via factory for job:', jobId);
    const tx = await factory.createJobToken(
      jobId,
      jobData.clientAddress,
      jobData.freelancerAddress,
      ethers.parseEther(jobData.finalPrice.toString()),
      estimatedDeliveryTimestamp,
      jobData.cancellationTimeDays,
      jobData.escrowWallet,
      jobData.paymentToken || ethers.ZeroAddress
    );
    
    const receipt = await tx.wait();
    
    // Extract JobToken address from event
    const event = receipt.logs.find(log => {
      try {
        const parsed = factory.interface.parseLog(log);
        return parsed && parsed.name === 'JobTokenCreated';
      } catch {
        return false;
      }
    });
    
    if (event) {
      const parsed = factory.interface.parseLog(event);
      const jobTokenAddress = parsed.args.jobTokenAddress;
      console.log('JobToken created at:', jobTokenAddress);
      return jobTokenAddress;
    }
    
    throw new Error('Failed to get JobToken address from event');
  }

  async getJobTokenFromFactory(factoryAddress, jobId) {
    const provider = this.provider || new ethers.BrowserProvider(window.ethereum);
    const factory = new ethers.Contract(factoryAddress, JOB_TOKEN_FACTORY_ABI, provider);
    return await factory.getJobToken(jobId);
  }

  async createJobTokenAndDeposit(factoryAddress, jobId, jobData) {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }
    const factory = this.getJobTokenFactoryContract(factoryAddress);
    
    // Calculate estimated delivery timestamp
    const estimatedDeliveryTimestamp = this.parseDeliveryTime(jobData.estimatedDelivery);
    
    console.log('Creating JobToken and depositing in ONE transaction...');
    const tx = await factory.createJobTokenAndDeposit(
      jobId,
      jobData.clientAddress,
      jobData.freelancerAddress,
      ethers.parseEther(jobData.finalPrice.toString()),
      estimatedDeliveryTimestamp,
      jobData.cancellationTimeDays,
      jobData.escrowWallet,
      jobData.paymentToken || ethers.ZeroAddress
    );
    
    const receipt = await tx.wait();
    
    // Extract JobToken address from event
    const event = receipt.logs.find(log => {
      try {
        const parsed = factory.interface.parseLog(log);
        return parsed && parsed.name === 'JobTokenCreated';
      } catch {
        return false;
      }
    });
    
    if (event) {
      const parsed = factory.interface.parseLog(event);
      const jobTokenAddress = parsed.args.jobTokenAddress;
      console.log('JobToken created and funded at:', jobTokenAddress);
      return jobTokenAddress;
    }
    
    throw new Error('Failed to get JobToken address from event');
  }

  async initializeJob(contractAddress, jobData) {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }
    const contract = this.getJobTokenContract(contractAddress);
    
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
    
    await tx.wait();
    return tx.hash;
  }

  async depositToEscrow(contractAddress, usdAmount, paymentTokenAddress) {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }
    
    const contract = this.getJobTokenContract(contractAddress);
    
    if (!paymentTokenAddress || paymentTokenAddress === ethers.ZeroAddress) {
      // Native FLR payment
      const tx = await contract.depositToEscrow({
        value: ethers.parseEther(usdAmount.toString())
      });
      await tx.wait();
      return tx.hash;
    } else {
      // FAsset ERC20 payment
      const tokenAmount = ethers.parseEther(usdAmount.toString()); // For stablecoins, 1 USD = 1 token
      
      // Step 1: Approve JobToken contract to spend tokens
      const tokenContract = new ethers.Contract(paymentTokenAddress, ERC20_ABI, this.signer);
      
      console.log('Approving token spend:', tokenAmount.toString());
      const approveTx = await tokenContract.approve(contractAddress, tokenAmount);
      await approveTx.wait();
      console.log('Token approval confirmed');
      
      // Step 2: Deposit to escrow
      console.log('Depositing to escrow');
      const depositTx = await contract.depositToEscrow();
      await depositTx.wait();
      console.log('Deposit confirmed');
      
      return depositTx.hash;
    }
  }
  
  async getTokenBalance(tokenAddress, userAddress) {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }
    
    if (!tokenAddress || tokenAddress === ethers.ZeroAddress) {
      // Native FLR balance
      return await this.provider.getBalance(userAddress);
    } else {
      // ERC20 token balance
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, this.provider);
      return await tokenContract.balanceOf(userAddress);
    }
  }
  
  async getTokenSymbol(tokenAddress) {
    if (!tokenAddress || tokenAddress === ethers.ZeroAddress) {
      return 'FLR';
    }
    
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, this.provider);
    return await tokenContract.symbol();
  }

  async submitCheckpoint(contractAddress, checkpointIndex, ipfsCID) {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }
    const contract = this.getJobTokenContract(contractAddress);
    const tx = await contract.submitCheckpoint(checkpointIndex, ipfsCID);
    await tx.wait();
    return tx.hash;
  }

  async approveCheckpoint(contractAddress, checkpointIndex) {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }
    const contract = this.getJobTokenContract(contractAddress);
    const tx = await contract.approveCheckpoint(checkpointIndex);
    await tx.wait();
    return tx.hash;
  }

  async rejectCheckpoint(contractAddress, checkpointIndex) {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }
    const contract = this.getJobTokenContract(contractAddress);
    const tx = await contract.rejectCheckpoint(checkpointIndex);
    await tx.wait();
    return tx.hash;
  }

  async getJobTokenStatus(contractAddress) {
    const provider = this.provider || new ethers.BrowserProvider(window.ethereum);
    const contract = new ethers.Contract(contractAddress, JOB_TOKEN_ABI, provider);
    
    const [status, canCancel, checkpoints] = await Promise.all([
      contract.getJobStatus(),
      contract.canCancel(),
      Promise.all([0, 1, 2].map(i => contract.getCheckpoint(i)))
    ]);
    
    return {
      isCancelled: status[0],
      totalReleased: ethers.formatEther(status[1]),
      remainingBalance: ethers.formatEther(status[2]),
      canCancel,
      checkpoints: checkpoints.map((cp, idx) => ({
        index: idx,
        isCompleted: cp.isCompleted,
        isApproved: cp.isApproved,
        ipfsCID: cp.ipfsCID,
        submissionDate: Number(cp.submissionDate),
        approvalDate: Number(cp.approvalDate),
      })),
    };
  }

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
    
    return now + (30 * 24 * 60 * 60); // Default 30 days
  }
}

export default new BlockchainService();

