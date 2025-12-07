require('dotenv').config();
const { ethers } = require('hardhat');

async function main() {
  const txHash = '0xafce6a16d183271548cc6edb612d1ec5976f08151d9adddd2268e4add49be765';
  
  const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
  
  console.log('Checking transaction:', txHash);
  
  const tx = await provider.getTransaction(txHash);
  console.log('\nTransaction:', tx);
  
  const receipt = await provider.getTransactionReceipt(txHash);
  console.log('\nReceipt:', receipt);
  
  if (receipt && receipt.status === 1) {
    console.log('\n✅ Transaction succeeded!');
  } else if (receipt && receipt.status === 0) {
    console.log('\n❌ Transaction failed!');
  } else {
    console.log('\n⏳ Transaction pending or not found');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
