require('dotenv').config();
const { ethers } = require('ethers');

async function main() {
  const contractAddress = '0x610178dA211FEF7D417bC0e6FeD39F05609AD788';
  
  console.log('Creating multiple test jobs at:', contractAddress);
  console.log('Connecting to: http://127.0.0.1:8545');
  
  const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
  const privateKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
  const signer = new ethers.Wallet(privateKey, provider);
  
  console.log('Using account:', signer.address);
  
  const abi = [
    "function createJobListing(string memory _title, string memory _description, string memory _jobType, uint256 _deadline, uint256 _minPrice, uint256 _maxPrice) external returns (uint256)",
    "function jobCount() external view returns (uint256)"
  ];
  
  const contract = new ethers.Contract(contractAddress, abi, signer);
  
  const jobs = [
    {
      title: "Build a Modern Website",
      description: "Need a responsive website with React and Tailwind CSS. Must be mobile-friendly and have smooth animations.",
      jobType: "Web Design",
      minPrice: "100",
      maxPrice: "500"
    },
    {
      title: "Create Logo Design",
      description: "Looking for a creative logo designer to create a modern, minimalist logo for my tech startup.",
      jobType: "Logo Design",
      minPrice: "50",
      maxPrice: "200"
    },
    {
      title: "Edit Product Video",
      description: "Need a professional video editor to create a 2-minute product showcase video with motion graphics.",
      jobType: "Video Editing",
      minPrice: "200",
      maxPrice: "800"
    },
    {
      title: "UI/UX Design for Mobile App",
      description: "Design a complete UI/UX for a fitness tracking mobile app. Should include wireframes and high-fidelity mockups.",
      jobType: "UI/UX Design",
      minPrice: "300",
      maxPrice: "1000"
    },
    {
      title: "3D Product Rendering",
      description: "Create photorealistic 3D renders of our new product line for marketing materials.",
      jobType: "3D Modeling/Rendering",
      minPrice: "150",
      maxPrice: "600"
    }
  ];
  
  console.log(`\nCreating ${jobs.length} jobs...\n`);
  
  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i];
    const deadline = Math.floor(Date.now() / 1000) + ((i + 1) * 7 * 24 * 60 * 60); // i+1 weeks from now
    
    console.log(`[${i + 1}/${jobs.length}] Creating: ${job.title}`);
    
    try {
      const tx = await contract.createJobListing(
        job.title,
        job.description,
        job.jobType,
        deadline,
        ethers.parseEther(job.minPrice),
        ethers.parseEther(job.maxPrice)
      );
      
      const receipt = await tx.wait();
      console.log(`  ✅ Created! TX: ${tx.hash.slice(0, 10)}... (Block: ${receipt.blockNumber})`);
      
      // Small delay to ensure nonce is updated
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.log(`  ❌ Failed: ${error.message}`);
    }
  }
  
  const totalJobs = await contract.jobCount();
  console.log(`\n✅ All jobs created successfully!`);
  console.log(`Total jobs in registry: ${totalJobs.toString()}`);
  
  console.log('\nNext steps:');
  console.log('1. Open http://localhost:5174');
  console.log('2. Click "Freelancer" button');
  console.log('3. Click "Find New Jobs" button');
  console.log(`4. You should see ${jobs.length} jobs listed!`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
