require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3001,
  flareRpcUrl: process.env.FLARE_RPC_URL || 'https://flare-api.flare.network/ext/bc/C/rpc',
  privateKey: process.env.PRIVATE_KEY || '',
  ipfsApiUrl: process.env.IPFS_API_URL || 'http://127.0.0.1:5001',
  ipfsGatewayUrl: process.env.IPFS_GATEWAY_URL || 'https://ipfs.io/ipfs/',
  jobListingTokenAddress: process.env.JOB_LISTING_TOKEN_ADDRESS || '',
  jobTokenAddress: process.env.JOB_TOKEN_ADDRESS || '',
  escrowWalletAddress: process.env.ESCROW_WALLET_ADDRESS || '',
};

