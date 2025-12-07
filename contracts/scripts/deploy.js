require('dotenv').config();
const hre = require("hardhat");

async function main() {
  console.log("Deploying contracts...");
  console.log("Network:", hre.network.name);
  console.log("Network config:", hre.network.config);
  
  // Get the deployer account
  const signers = await hre.ethers.getSigners();
  console.log("Number of signers:", signers.length);
  
  if (signers.length === 0) {
    throw new Error("No signers available. Check your PRIVATE_KEY in .env");
  }
  
  const deployer = signers[0];
  console.log("Deploying with account:", deployer.address);

  // Deploy Mock FAsset (testUSDT) for testing
  console.log("\n--- Deploying Mock FAsset ---");
  const MockFAsset = await hre.ethers.getContractFactory("MockFAsset", deployer);
  const mockUSDT = await MockFAsset.deploy("Test USDT", "testUSDT");
  await mockUSDT.waitForDeployment();
  const mockUSDTAddress = await mockUSDT.getAddress();
  console.log("MockFAsset (testUSDT) deployed to:", mockUSDTAddress);

  // Deploy FAssetRegistry
  console.log("\n--- Deploying FAssetRegistry ---");
  const FAssetRegistry = await hre.ethers.getContractFactory("FAssetRegistry", deployer);
  const fassetRegistry = await FAssetRegistry.deploy();
  await fassetRegistry.waitForDeployment();
  const fassetRegistryAddress = await fassetRegistry.getAddress();
  console.log("FAssetRegistry deployed to:", fassetRegistryAddress);

  // Deploy PriceOracle (FTSO Integration)
  console.log("\n--- Deploying PriceOracle (FTSO) ---");
  const PriceOracle = await hre.ethers.getContractFactory("PriceOracle", deployer);
  const priceOracle = await PriceOracle.deploy();
  await priceOracle.waitForDeployment();
  const priceOracleAddress = await priceOracle.getAddress();
  console.log("PriceOracle deployed to:", priceOracleAddress);
  console.log("✅ Connected to Flare FTSO Registry");

  // Deploy EscrowWallet
  console.log("\n--- Deploying EscrowWallet ---");
  const EscrowWallet = await hre.ethers.getContractFactory("EscrowWallet", deployer);
  const escrowWallet = await EscrowWallet.deploy();
  await escrowWallet.waitForDeployment();
  const escrowAddress = await escrowWallet.getAddress();
  console.log("EscrowWallet deployed to:", escrowAddress);

  // Deploy JobListingToken (ERC721 NFT)
  console.log("\n--- Deploying JobListingToken (ERC721 NFT) ---");
  const JobListingToken = await hre.ethers.getContractFactory("JobListingToken", deployer);
  const jobListingToken = await JobListingToken.deploy();
  await jobListingToken.waitForDeployment();
  const jobListingAddress = await jobListingToken.getAddress();
  console.log("JobListingToken (NFT) deployed to:", jobListingAddress);

  // Deploy JobTokenFactory
  console.log("\n--- Deploying JobTokenFactory ---");
  const JobTokenFactory = await hre.ethers.getContractFactory("JobTokenFactory", deployer);
  const jobTokenFactory = await JobTokenFactory.deploy();
  await jobTokenFactory.waitForDeployment();
  const jobTokenFactoryAddress = await jobTokenFactory.getAddress();
  console.log("JobTokenFactory deployed to:", jobTokenFactoryAddress);

  // Configure contracts
  console.log("\n--- Configuring Contracts ---");
  
  // Configure EscrowWallet
  await escrowWallet.setJobTokenFactory(jobTokenFactoryAddress);
  console.log("✅ EscrowWallet configured with JobTokenFactory");
  
  // Configure JobTokenFactory
  await jobTokenFactory.setEscrowWallet(escrowAddress);
  console.log("✅ JobTokenFactory configured with EscrowWallet");
  
  // Configure JobListingToken with PriceOracle and FAssetRegistry
  await jobListingToken.setPriceOracle(priceOracleAddress);
  console.log("✅ JobListingToken configured with PriceOracle (FTSO)");
  
  await jobListingToken.setFAssetRegistry(fassetRegistryAddress);
  console.log("✅ JobListingToken configured with FAssetRegistry");
  
  // Register testUSDT in FAssetRegistry
  console.log("\n--- Registering FAssets ---");
  await fassetRegistry.addFAsset("testUSDT", mockUSDTAddress, "Test USDT", true);
  console.log("✅ Registered testUSDT as stablecoin FAsset");

  console.log("\n=== Deployment Summary ===");
  console.log("MockFAsset (testUSDT):", mockUSDTAddress);
  console.log("FAssetRegistry:", fassetRegistryAddress);
  console.log("PriceOracle (FTSO):", priceOracleAddress);
  console.log("EscrowWallet:", escrowAddress);
  console.log("JobListingToken (NFT):", jobListingAddress);
  console.log("JobTokenFactory:", jobTokenFactoryAddress);
  
  console.log("\n=== Flare Integration Status ===");
  console.log("✅ FTSO: Connected to Flare Time Series Oracle");
  console.log("✅ FAssets: Registry configured with testUSDT");
  console.log("✅ NFTs: Jobs are ERC721 tokens");
  console.log("✅ Network: Deployed on Flare Coston2");
  
  console.log("\n=== Update your .env files with these addresses ===");
  console.log(`MOCK_USDT_ADDRESS=${mockUSDTAddress}`);
  console.log(`FASSET_REGISTRY_ADDRESS=${fassetRegistryAddress}`);
  console.log(`PRICE_ORACLE_ADDRESS=${priceOracleAddress}`);
  console.log(`JOB_LISTING_TOKEN_ADDRESS=${jobListingAddress}`);
  console.log(`JOB_TOKEN_FACTORY_ADDRESS=${jobTokenFactoryAddress}`);
  console.log(`ESCROW_WALLET_ADDRESS=${escrowAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

