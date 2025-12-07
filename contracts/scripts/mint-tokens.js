require('dotenv').config();
const hre = require("hardhat");

async function main() {
  const MOCK_USDT_ADDRESS = "0xaBaD8F1e6A73bDDFE69EE0b2B2b8eae762BcC4aC";
  const AMOUNT = hre.ethers.parseEther("1000000"); // 1 million testUSDT

  const [signer] = await hre.ethers.getSigners();
  console.log("Minting tokens...");
  console.log("Token:", MOCK_USDT_ADDRESS);
  console.log("To:", signer.address);
  console.log("Amount:", hre.ethers.formatEther(AMOUNT), "testUSDT");

  const MockFAsset = await hre.ethers.getContractFactory("MockFAsset");
  const token = MockFAsset.attach(MOCK_USDT_ADDRESS);

  const tx = await token.mint(AMOUNT);
  await tx.wait();

  console.log("✅ Tokens minted!");
  console.log("Transaction:", tx.hash);

  const balance = await token.balanceOf(signer.address);
  console.log("New balance:", hre.ethers.formatEther(balance), "testUSDT");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
