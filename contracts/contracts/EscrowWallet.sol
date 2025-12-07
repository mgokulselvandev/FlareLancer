// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title EscrowWallet
 * @dev Secure escrow wallet for holding job funds
 */
contract EscrowWallet {
    address public jobTokenFactory;
    address public owner;
    mapping(address => uint256) public balances; // token => amount
    mapping(address => bool) public authorizedJobTokens; // jobToken => authorized

    modifier onlyAuthorizedJobToken() {
        require(authorizedJobTokens[msg.sender], "Only authorized JobToken can call this");
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }

    modifier onlyFactory() {
        require(msg.sender == jobTokenFactory, "Only factory can call this");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * @dev Set the JobTokenFactory contract address
     */
    function setJobTokenFactory(address _jobTokenFactory) external onlyOwner {
        require(_jobTokenFactory != address(0), "Invalid address");
        jobTokenFactory = _jobTokenFactory;
    }

    /**
     * @dev Authorize a JobToken (called by factory when creating new JobToken)
     */
    function authorizeJobToken(address _jobToken) external onlyFactory {
        require(_jobToken != address(0), "Invalid address");
        authorizedJobTokens[_jobToken] = true;
    }

    /**
     * @dev Check if a JobToken is authorized
     */
    function isAuthorized(address _jobToken) external view returns (bool) {
        return authorizedJobTokens[_jobToken];
    }

    /**
     * @dev Deposit funds to escrow (called by client via JobToken)
     */
    function deposit(address _token, uint256 _amount) external payable {
        if (_token == address(0)) {
            // Native token (FLR)
            require(msg.value == _amount, "Amount mismatch");
            balances[address(0)] += _amount;
        } else {
            // ERC20 token (FAsset)
            require(msg.value == 0, "Do not send FLR with ERC20 deposit");
            
            // Transfer tokens from sender to this contract
            (bool success, bytes memory data) = _token.call(
                abi.encodeWithSignature(
                    "transferFrom(address,address,uint256)",
                    msg.sender,
                    address(this),
                    _amount
                )
            );
            require(success && (data.length == 0 || abi.decode(data, (bool))), "Token transfer failed");
            
            balances[_token] += _amount;
        }
    }

    /**
     * @dev Release funds to freelancer (called by JobToken)
     */
    function release(address _token, address _to, uint256 _amount) external onlyAuthorizedJobToken {
        require(balances[_token] >= _amount, "Insufficient balance");
        balances[_token] -= _amount;

        if (_token == address(0)) {
            // Native token
            (bool success, ) = payable(_to).call{value: _amount}("");
            require(success, "Transfer failed");
        } else {
            // ERC20 token
            (bool success, bytes memory data) = _token.call(
                abi.encodeWithSignature(
                    "transfer(address,uint256)",
                    _to,
                    _amount
                )
            );
            require(success && (data.length == 0 || abi.decode(data, (bool))), "Token transfer failed");
        }
    }

    /**
     * @dev Refund remaining funds to client (called by JobToken on cancellation)
     */
    function refund(address _token, address _to, uint256 _amount) external onlyAuthorizedJobToken {
        require(balances[_token] >= _amount, "Insufficient balance");
        balances[_token] -= _amount;

        if (_token == address(0)) {
            // Native token
            (bool success, ) = payable(_to).call{value: _amount}("");
            require(success, "Transfer failed");
        } else {
            // ERC20 token
            (bool success, bytes memory data) = _token.call(
                abi.encodeWithSignature(
                    "transfer(address,uint256)",
                    _to,
                    _amount
                )
            );
            require(success && (data.length == 0 || abi.decode(data, (bool))), "Token transfer failed");
        }
    }

    /**
     * @dev Get balance for a token
     */
    function getBalance(address _token) external view returns (uint256) {
        return balances[_token];
    }

    receive() external payable {
        balances[address(0)] += msg.value;
    }
}

