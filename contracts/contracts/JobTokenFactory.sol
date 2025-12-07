// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./JobToken.sol";

interface IEscrowWallet {
    function authorizeJobToken(address _jobToken) external;
    function deposit(address _token, uint256 _amount) external payable;
}

/**
 * @title JobTokenFactory
 * @dev Factory contract to deploy a new JobToken for each job
 */
contract JobTokenFactory {
    // Mapping from jobId to JobToken address
    mapping(uint256 => address) public jobTokens;
    
    // Array of all deployed JobToken addresses
    address[] public allJobTokens;
    
    // Escrow wallet address
    address public escrowWallet;
    address public owner;
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    /**
     * @dev Set the escrow wallet address
     */
    function setEscrowWallet(address _escrowWallet) external onlyOwner {
        require(_escrowWallet != address(0), "Invalid address");
        escrowWallet = _escrowWallet;
    }
    
    // Events
    event JobTokenCreated(
        uint256 indexed jobId,
        address indexed jobTokenAddress,
        address indexed clientAddress,
        address freelancerAddress
    );
    
    /**
     * @dev Create a new JobToken contract for a job
     * @param _jobId The job ID from JobListingToken
     * @param _clientAddress Client's address
     * @param _freelancerAddress Freelancer's address
     * @param _finalPrice Final agreed price in wei
     * @param _estimatedDeliveryTimestamp Estimated delivery timestamp
     * @param _cancellationTimeDays Days after delivery when cancellation is allowed
     * @param _escrowWallet Address of the escrow wallet
     * @param _paymentToken Address of payment token (0x0 for native FLR)
     * @return Address of the newly created JobToken
     */
    function createJobToken(
        uint256 _jobId,
        address _clientAddress,
        address _freelancerAddress,
        uint256 _finalPrice,
        uint256 _estimatedDeliveryTimestamp,
        uint256 _cancellationTimeDays,
        address payable _escrowWallet,
        address _paymentToken
    ) external returns (address) {
        require(jobTokens[_jobId] == address(0), "JobToken already exists for this job");
        require(_clientAddress != address(0), "Invalid client address");
        require(_freelancerAddress != address(0), "Invalid freelancer address");
        require(_finalPrice > 0, "Price must be greater than 0");
        
        // Deploy new JobToken contract
        JobToken newJobToken = new JobToken();
        
        // Initialize the job
        newJobToken.initializeJob(
            _clientAddress,
            _freelancerAddress,
            _finalPrice,
            _estimatedDeliveryTimestamp,
            _cancellationTimeDays,
            _escrowWallet,
            _paymentToken
        );
        
        // Store the mapping
        address jobTokenAddress = address(newJobToken);
        jobTokens[_jobId] = jobTokenAddress;
        allJobTokens.push(jobTokenAddress);
        
        // Authorize this JobToken in the EscrowWallet
        if (escrowWallet != address(0)) {
            IEscrowWallet(escrowWallet).authorizeJobToken(jobTokenAddress);
        }
        
        emit JobTokenCreated(_jobId, jobTokenAddress, _clientAddress, _freelancerAddress);
        
        return jobTokenAddress;
    }
    
    /**
     * @dev Create JobToken and deposit funds in ONE transaction
     * This reduces from 5 transactions to just 4 (approve ERC20 + this + approve application + set job token)
     * Note: Client must still call approveApplication and setJobToken separately
     */
    function createJobTokenAndDeposit(
        uint256 _jobId,
        address _clientAddress,
        address _freelancerAddress,
        uint256 _finalPrice,
        uint256 _estimatedDeliveryTimestamp,
        uint256 _cancellationTimeDays,
        address payable _escrowWallet,
        address _paymentToken
    ) external payable returns (address) {
        require(msg.sender == _clientAddress, "Only client can call this");
        require(jobTokens[_jobId] == address(0), "JobToken already exists for this job");
        require(_clientAddress != address(0), "Invalid client address");
        require(_freelancerAddress != address(0), "Invalid freelancer address");
        require(_finalPrice > 0, "Price must be greater than 0");
        
        // Step 1: Deploy new JobToken contract
        JobToken newJobToken = new JobToken();
        
        // Initialize the job
        newJobToken.initializeJob(
            _clientAddress,
            _freelancerAddress,
            _finalPrice,
            _estimatedDeliveryTimestamp,
            _cancellationTimeDays,
            _escrowWallet,
            _paymentToken
        );
        
        // Store the mapping
        address jobTokenAddress = address(newJobToken);
        jobTokens[_jobId] = jobTokenAddress;
        allJobTokens.push(jobTokenAddress);
        
        // Authorize this JobToken in the EscrowWallet
        if (escrowWallet != address(0)) {
            IEscrowWallet(escrowWallet).authorizeJobToken(jobTokenAddress);
        }
        
        emit JobTokenCreated(_jobId, jobTokenAddress, _clientAddress, _freelancerAddress);
        
        // Step 2: Transfer tokens from client to this contract, then deposit to escrow
        if (_paymentToken != address(0)) {
            // ERC20 token - transfer from client to factory first
            (bool transferSuccess, ) = _paymentToken.call(
                abi.encodeWithSignature(
                    "transferFrom(address,address,uint256)",
                    msg.sender,
                    address(this),
                    _finalPrice
                )
            );
            require(transferSuccess, "Token transfer to factory failed");
            
            // Approve escrow to spend tokens
            (bool approveSuccess, ) = _paymentToken.call(
                abi.encodeWithSignature(
                    "approve(address,uint256)",
                    _escrowWallet,
                    _finalPrice
                )
            );
            require(approveSuccess, "Token approval failed");
            
            // Call escrow's deposit function to update balances
            IEscrowWallet(_escrowWallet).deposit(_paymentToken, _finalPrice);
        } else {
            // Native FLR - deposit directly to escrow
            require(msg.value == _finalPrice, "Amount must equal final price");
            IEscrowWallet(_escrowWallet).deposit{value: msg.value}(address(0), _finalPrice);
        }
        
        return jobTokenAddress;
    }
    
    /**
     * @dev Get JobToken address for a job ID
     * @param _jobId The job ID
     * @return Address of the JobToken contract
     */
    function getJobToken(uint256 _jobId) external view returns (address) {
        return jobTokens[_jobId];
    }
    
    /**
     * @dev Get total number of JobTokens created
     * @return Total count
     */
    function getJobTokenCount() external view returns (uint256) {
        return allJobTokens.length;
    }
    
    /**
     * @dev Get all JobToken addresses
     * @return Array of all JobToken addresses
     */
    function getAllJobTokens() external view returns (address[] memory) {
        return allJobTokens;
    }
}
