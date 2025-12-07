// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./EscrowWallet.sol";

interface IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
}

/**
 * @title JobToken
 * @dev FAsset token representing an active job with escrow and checkpoint system
 */
contract JobToken {
    struct Checkpoint {
        bool isCompleted;
        bool isApproved;
        string ipfsCID;
        uint256 submissionDate;
        uint256 approvalDate;
    }

    // Job details
    address public clientAddress;
    address public freelancerAddress;
    uint256 public finalPrice;
    uint256 public approvalDate;
    uint256 public estimatedDeliveryTimestamp; // Calculated from estimatedDelivery string
    uint256 public cancellationTimeDays; // Days after estimated delivery when cancellation allowed
    address payable public escrowWallet;
    address public paymentToken; // Token address (0x0 for native FLR)

    // Checkpoints (3 total)
    Checkpoint[3] public checkpoints;
    uint256[3] public checkpointPayments; // Payment percentages: 10%, 35%, 55%
    uint256 public totalReleased;

    // Status
    bool public isCancelled;
    uint256 public cancellationDate;

    // Events
    event JobInitialized(
        address indexed clientAddress,
        address indexed freelancerAddress,
        uint256 finalPrice
    );
    event FundsDeposited(address indexed clientAddress, uint256 amount);
    event CheckpointSubmitted(uint256 indexed checkpointIndex, string ipfsCID);
    event CheckpointApproved(uint256 indexed checkpointIndex, uint256 paymentReleased);
    event CheckpointRejected(uint256 indexed checkpointIndex);
    event JobCancelled(address indexed cancelledBy, uint256 refundAmount);

    modifier onlyClient() {
        require(msg.sender == clientAddress, "Only client can call this");
        _;
    }

    modifier onlyFreelancer() {
        require(msg.sender == freelancerAddress, "Only freelancer can call this");
        _;
    }

    modifier notCancelled() {
        require(!isCancelled, "Job is cancelled");
        _;
    }

    constructor() {
        // Set checkpoint payment percentages: 10%, 35%, 55%
        checkpointPayments[0] = 10;
        checkpointPayments[1] = 35;
        checkpointPayments[2] = 55;
    }

    /**
     * @dev Initialize job when client accepts proposal
     */
    function initializeJob(
        address _clientAddress,
        address _freelancerAddress,
        uint256 _finalPrice,
        uint256 _estimatedDeliveryTimestamp,
        uint256 _cancellationTimeDays,
        address payable _escrowWallet,
        address _paymentToken
    ) external {
        require(_clientAddress != address(0), "Invalid client address");
        require(_freelancerAddress != address(0), "Invalid freelancer address");
        require(_finalPrice > 0, "Price must be greater than 0");
        require(_estimatedDeliveryTimestamp > block.timestamp, "Invalid delivery date");
        require(_cancellationTimeDays > 0, "Cancellation time must be positive");

        clientAddress = _clientAddress;
        freelancerAddress = _freelancerAddress;
        finalPrice = _finalPrice;
        approvalDate = block.timestamp;
        estimatedDeliveryTimestamp = _estimatedDeliveryTimestamp;
        cancellationTimeDays = _cancellationTimeDays;
        escrowWallet = _escrowWallet;
        paymentToken = _paymentToken;

        emit JobInitialized(_clientAddress, _freelancerAddress, _finalPrice);
    }

    /**
     * @dev Client deposits funds to escrow
     */
    function depositToEscrow() external payable onlyClient notCancelled {
        if (paymentToken == address(0)) {
            // Native FLR payment
            require(msg.value == finalPrice, "Amount must equal final price");
            EscrowWallet(escrowWallet).deposit{value: msg.value}(paymentToken, msg.value);
        } else {
            // ERC20 FAsset payment
            require(msg.value == 0, "Do not send FLR with ERC20 payment");
            
            // Transfer tokens from client to this contract
            IERC20 token = IERC20(paymentToken);
            require(
                token.transferFrom(msg.sender, address(this), finalPrice),
                "Token transfer failed"
            );
            
            // Approve escrow to spend tokens
            require(
                token.approve(address(escrowWallet), finalPrice),
                "Token approval failed"
            );
            
            // Deposit to escrow
            EscrowWallet(escrowWallet).deposit(paymentToken, finalPrice);
        }
        
        emit FundsDeposited(clientAddress, finalPrice);
    }

    /**
     * @dev Freelancer submits checkpoint with IPFS CID
     */
    function submitCheckpoint(uint256 _checkpointIndex, string memory _ipfsCID) 
        external 
        onlyFreelancer 
        notCancelled 
    {
        require(_checkpointIndex < 3, "Invalid checkpoint index");
        require(!checkpoints[_checkpointIndex].isCompleted, "Checkpoint already completed");
        require(bytes(_ipfsCID).length > 0, "IPFS CID required");

        // Can only submit next checkpoint in sequence
        if (_checkpointIndex > 0) {
            require(
                checkpoints[_checkpointIndex - 1].isApproved,
                "Previous checkpoint must be approved"
            );
        }

        checkpoints[_checkpointIndex].isCompleted = true;
        checkpoints[_checkpointIndex].ipfsCID = _ipfsCID;
        checkpoints[_checkpointIndex].submissionDate = block.timestamp;

        emit CheckpointSubmitted(_checkpointIndex, _ipfsCID);
    }

    /**
     * @dev Client approves checkpoint and releases payment
     */
    function approveCheckpoint(uint256 _checkpointIndex) external onlyClient notCancelled {
        require(_checkpointIndex < 3, "Invalid checkpoint index");
        require(checkpoints[_checkpointIndex].isCompleted, "Checkpoint not submitted");
        require(!checkpoints[_checkpointIndex].isApproved, "Checkpoint already approved");

        checkpoints[_checkpointIndex].isApproved = true;
        checkpoints[_checkpointIndex].approvalDate = block.timestamp;

        // Calculate and release payment
        uint256 paymentAmount = (finalPrice * checkpointPayments[_checkpointIndex]) / 100;
        totalReleased += paymentAmount;

        EscrowWallet(escrowWallet).release(paymentToken, freelancerAddress, paymentAmount);

        emit CheckpointApproved(_checkpointIndex, paymentAmount);
    }

    /**
     * @dev Client rejects checkpoint (freelancer can resubmit)
     */
    function rejectCheckpoint(uint256 _checkpointIndex) external onlyClient notCancelled {
        require(_checkpointIndex < 3, "Invalid checkpoint index");
        require(checkpoints[_checkpointIndex].isCompleted, "Checkpoint not submitted");
        require(!checkpoints[_checkpointIndex].isApproved, "Checkpoint already approved");

        // Reset checkpoint to allow resubmission
        checkpoints[_checkpointIndex].isCompleted = false;
        checkpoints[_checkpointIndex].ipfsCID = "";
        checkpoints[_checkpointIndex].submissionDate = 0;

        emit CheckpointRejected(_checkpointIndex);
    }

    /**
     * @dev Client cancels job if past estimated delivery time
     */
    function cancelJob() external onlyClient notCancelled {
        require(
            block.timestamp > estimatedDeliveryTimestamp + (cancellationTimeDays * 1 days),
            "Cancellation not allowed yet"
        );

        isCancelled = true;
        cancellationDate = block.timestamp;

        // Refund remaining balance to client
        uint256 remainingAmount = finalPrice - totalReleased;
        if (remainingAmount > 0) {
            EscrowWallet(escrowWallet).refund(paymentToken, clientAddress, remainingAmount);
        }

        emit JobCancelled(clientAddress, remainingAmount);
    }

    /**
     * @dev Get checkpoint details
     */
    function getCheckpoint(uint256 _checkpointIndex) external view returns (Checkpoint memory) {
        require(_checkpointIndex < 3, "Invalid checkpoint index");
        return checkpoints[_checkpointIndex];
    }

    /**
     * @dev Get job status
     */
    function getJobStatus() external view returns (
        bool _isCancelled,
        uint256 _totalReleased,
        uint256 _remainingBalance
    ) {
        _isCancelled = isCancelled;
        _totalReleased = totalReleased;
        _remainingBalance = finalPrice - totalReleased;
    }

    /**
     * @dev Check if cancellation is allowed
     */
    function canCancel() external view returns (bool) {
        if (isCancelled) return false;
        return block.timestamp > estimatedDeliveryTimestamp + (cancellationTimeDays * 1 days);
    }
}

