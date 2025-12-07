// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IFtsoRegistry {
    function getCurrentPriceWithDecimals(string memory _symbol) 
        external 
        view 
        returns (uint256 _price, uint256 _timestamp, uint256 _decimals);
}

/**
 * @title PriceOracle
 * @dev Wrapper for Flare FTSO price feeds to convert USD to FAsset amounts
 */
contract PriceOracle {
    IFtsoRegistry public ftsoRegistry;
    
    // Flare Coston2 FTSO Registry address
    address constant FTSO_REGISTRY_COSTON2 = 0x1000000000000000000000000000000000000003;
    
    constructor() {
        ftsoRegistry = IFtsoRegistry(FTSO_REGISTRY_COSTON2);
    }
    
    /**
     * @dev Convert USD amount to FAsset token amount
     * @param _usdAmount Amount in USD (with 18 decimals, e.g., 100 USD = 100 * 10^18)
     * @param _symbol FAsset symbol (e.g., "testUSDT", "testUSDC", "FLR", "XRP", "BTC")
     * @return tokenAmount Amount of tokens needed
     */
    function convertUSDToToken(uint256 _usdAmount, string memory _symbol) 
        public 
        view 
        returns (uint256 tokenAmount) 
    {
        // For stablecoins, 1 USD = 1 token (1:1 conversion)
        if (isStablecoin(_symbol)) {
            return _usdAmount;
        }
        
        // For other assets, get price from FTSO
        (uint256 price, , uint256 decimals) = ftsoRegistry.getCurrentPriceWithDecimals(_symbol);
        require(price > 0, "Invalid price from oracle");
        
        // Calculate token amount: usdAmount / (price / 10^decimals)
        // tokenAmount = (usdAmount * 10^decimals) / price
        tokenAmount = (_usdAmount * (10 ** decimals)) / price;
        
        return tokenAmount;
    }
    
    /**
     * @dev Convert FAsset token amount to USD
     * @param _tokenAmount Amount of tokens
     * @param _symbol FAsset symbol
     * @return usdAmount Amount in USD (18 decimals)
     */
    function convertTokenToUSD(uint256 _tokenAmount, string memory _symbol)
        public
        view
        returns (uint256 usdAmount)
    {
        // For stablecoins, 1 token = 1 USD
        if (isStablecoin(_symbol)) {
            return _tokenAmount;
        }
        
        // For other assets, get price from FTSO
        (uint256 price, , uint256 decimals) = ftsoRegistry.getCurrentPriceWithDecimals(_symbol);
        require(price > 0, "Invalid price from oracle");
        
        // Calculate USD amount: tokenAmount * (price / 10^decimals)
        usdAmount = (_tokenAmount * price) / (10 ** decimals);
        
        return usdAmount;
    }
    
    /**
     * @dev Check if a symbol is a stablecoin
     */
    function isStablecoin(string memory _symbol) public pure returns (bool) {
        return (
            keccak256(bytes(_symbol)) == keccak256(bytes("testUSDT")) ||
            keccak256(bytes(_symbol)) == keccak256(bytes("testUSDC")) ||
            keccak256(bytes(_symbol)) == keccak256(bytes("fUSDT")) ||
            keccak256(bytes(_symbol)) == keccak256(bytes("fUSDC")) ||
            keccak256(bytes(_symbol)) == keccak256(bytes("USDT")) ||
            keccak256(bytes(_symbol)) == keccak256(bytes("USDC"))
        );
    }
    
    /**
     * @dev Get current price of an asset in USD
     * @param _symbol Asset symbol
     * @return price Price in USD (with decimals)
     * @return decimals Number of decimals
     */
    function getPrice(string memory _symbol) 
        external 
        view 
        returns (uint256 price, uint256 decimals) 
    {
        uint256 timestamp;
        (price, timestamp, decimals) = ftsoRegistry.getCurrentPriceWithDecimals(_symbol);
        require(price > 0, "Invalid price");
        require(block.timestamp - timestamp < 5 minutes, "Price too old");
        
        return (price, decimals);
    }
}
