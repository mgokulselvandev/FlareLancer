// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title FAssetRegistry
 * @dev Registry of supported FAssets for the freelance marketplace
 */
contract FAssetRegistry {
    struct FAssetInfo {
        address tokenAddress;
        string symbol;
        string name;
        bool isStablecoin;
        bool isActive;
    }
    
    // Mapping from symbol to FAsset info
    mapping(string => FAssetInfo) public fassets;
    
    // Array of all supported FAsset symbols
    string[] public supportedSymbols;
    
    address public owner;
    
    event FAssetAdded(string symbol, address tokenAddress, bool isStablecoin);
    event FAssetUpdated(string symbol, address tokenAddress);
    event FAssetDeactivated(string symbol);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    /**
     * @dev Add a new FAsset to the registry
     */
    function addFAsset(
        string memory _symbol,
        address _tokenAddress,
        string memory _name,
        bool _isStablecoin
    ) external onlyOwner {
        require(_tokenAddress != address(0), "Invalid address");
        require(bytes(_symbol).length > 0, "Invalid symbol");
        require(!fassets[_symbol].isActive, "FAsset already exists");
        
        fassets[_symbol] = FAssetInfo({
            tokenAddress: _tokenAddress,
            symbol: _symbol,
            name: _name,
            isStablecoin: _isStablecoin,
            isActive: true
        });
        
        supportedSymbols.push(_symbol);
        
        emit FAssetAdded(_symbol, _tokenAddress, _isStablecoin);
    }
    
    /**
     * @dev Update FAsset address (in case of migration)
     */
    function updateFAsset(string memory _symbol, address _newAddress) external onlyOwner {
        require(fassets[_symbol].isActive, "FAsset not found");
        require(_newAddress != address(0), "Invalid address");
        
        fassets[_symbol].tokenAddress = _newAddress;
        
        emit FAssetUpdated(_symbol, _newAddress);
    }
    
    /**
     * @dev Deactivate an FAsset
     */
    function deactivateFAsset(string memory _symbol) external onlyOwner {
        require(fassets[_symbol].isActive, "FAsset not found");
        
        fassets[_symbol].isActive = false;
        
        emit FAssetDeactivated(_symbol);
    }
    
    /**
     * @dev Get FAsset address by symbol
     */
    function getFAssetAddress(string memory _symbol) external view returns (address) {
        require(fassets[_symbol].isActive, "FAsset not supported");
        return fassets[_symbol].tokenAddress;
    }
    
    /**
     * @dev Check if FAsset is a stablecoin
     */
    function isStablecoin(string memory _symbol) external view returns (bool) {
        require(fassets[_symbol].isActive, "FAsset not supported");
        return fassets[_symbol].isStablecoin;
    }
    
    /**
     * @dev Get all supported FAsset symbols
     */
    function getSupportedFAssets() external view returns (string[] memory) {
        return supportedSymbols;
    }
    
    /**
     * @dev Get FAsset info
     */
    function getFAssetInfo(string memory _symbol) external view returns (
        address tokenAddress,
        string memory name,
        bool isStable,
        bool isActive
    ) {
        FAssetInfo memory info = fassets[_symbol];
        return (info.tokenAddress, info.name, info.isStablecoin, info.isActive);
    }
}
