const fs = require('fs');
const path = require('path');

/**
 * Load contract ABI from artifacts
 * Falls back to empty array if file doesn't exist (for development)
 */
function loadABI(contractName) {
  try {
    // First try loading from config directory (where we copied the ABI files)
    const configPath = path.join(__dirname, '../config', `${contractName}.json`);
    
    if (fs.existsSync(configPath)) {
      const artifact = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      return artifact.abi;
    }
    
    // Fallback: try loading from contracts artifacts
    const abiPath = path.join(
      __dirname,
      '../../../contracts/artifacts/contracts',
      `${contractName}.sol`,
      `${contractName}.json`
    );
    
    if (fs.existsSync(abiPath)) {
      const artifact = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
      return artifact.abi;
    }
    
    console.warn(`ABI not found for ${contractName}, using empty array`);
    return [];
  } catch (error) {
    console.warn(`Error loading ABI for ${contractName}:`, error.message);
    return [];
  }
}

module.exports = { loadABI };

