import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "../hooks/useWallet";
import WalletConnect from "./WalletConnect";
import blockchainService from "../services/blockchain.service";
import apiService from "../services/api.service";
import { ethers } from "ethers";

const JOB_LISTING_TOKEN_ADDRESS = import.meta.env.VITE_JOB_LISTING_TOKEN_ADDRESS;
const JOB_TOKEN_FACTORY_ADDRESS = import.meta.env.VITE_JOB_TOKEN_FACTORY_ADDRESS;
const ESCROW_WALLET_ADDRESS = import.meta.env.VITE_ESCROW_WALLET_ADDRESS;
const MOCK_USDT_ADDRESS = import.meta.env.VITE_MOCK_USDT_ADDRESS;

function ClientPage() {
  const navigate = useNavigate();
  const { account, provider, signer, isConnected, connectWallet } = useWallet();
  const [createJobModalOpen, setCreateJobModalOpen] = useState(false);
  const [trackJobsModalOpen, setTrackJobsModalOpen] = useState(false);
  const [approveJobsModalOpen, setApproveJobsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Real data from blockchain
  const [jobListings, setJobListings] = useState([]);
  const [activeJobs, setActiveJobs] = useState([]);
  const [jobsWithApplications, setJobsWithApplications] = useState([]);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    jobType: "",
    deadline: "",
    priceMin: "",
    priceMax: "",
    paymentFAsset: "testUSDT",
  });

  // FTSO price conversion state
  const [tokenConversion, setTokenConversion] = useState({
    minTokens: "",
    maxTokens: "",
    assetPrice: "",
    loading: false,
  });

  const jobTypes = [
    "Video Editing",
    "Photo Editing",
    "Digital Art/Illustration",
    "Web Design",
    "UI/UX Design",
    "Home/Interior Design",
    "Logo Design",
    "Graphic Design",
    "3D Modeling/Rendering",
    "Animation",
    "Social Media Content Creation",
  ];

  // Initialize blockchain service when wallet connects
  useEffect(() => {
    if (provider && signer) {
      blockchainService.setProvider(provider, signer);
      loadJobListings();
      loadActiveJobs();
      loadJobsWithApplications();
    }
  }, [provider, signer, account]);

  // Load job listings from blockchain
  const loadJobListings = async () => {
    if (!provider || !account) return;

    setLoading(true);
    try {
      // In a real implementation, you would track deployed contract addresses
      // For now, we'll use a registry or fetch from events
      // This is a placeholder - you'll need to implement contract address tracking
      const contractAddresses = JSON.parse(localStorage.getItem('jobListingAddresses') || '[]');

      const listings = await Promise.all(
        contractAddresses.map(async (address) => {
          try {
            const data = await blockchainService.getJobListingData(address);
            if (data.jobData.clientAddress.toLowerCase() === account.toLowerCase()) {
              return { address, ...data };
            }
          } catch (error) {
            console.error(`Error loading job ${address}:`, error);
          }
          return null;
        })
      );

      setJobListings(listings.filter(Boolean));
    } catch (error) {
      console.error("Error loading job listings:", error);
    } finally {
      setLoading(false);
    }
  };

  // Load active jobs (approved applications)
  const loadActiveJobs = async () => {
    if (!account) return;

    try {
      // Fetch all jobs from backend API
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${API_URL}/job-listings/all`);
      const result = await response.json();

      if (!result.success || !result.jobs) {
        setActiveJobs([]);
        return;
      }

      // Get jobs created by current user that have approved applications
      const activeJobs = [];

      for (const job of result.jobs) {
        if (job.clientAddress.toLowerCase() !== account.toLowerCase()) {
          continue;
        }

        // Fetch all applications including approved ones
        if (!JOB_LISTING_TOKEN_ADDRESS) continue;

        try {
          const contract = new ethers.Contract(
            JOB_LISTING_TOKEN_ADDRESS,
            ["function getJobApplications(uint256 _jobId) external view returns (tuple(address freelancerAddress, uint256 proposedPrice, uint256 cancellationTimeDays, string estimatedDelivery, string portfolioLink, uint256 appliedAt, bool isApproved)[])"],
            new ethers.BrowserProvider(window.ethereum)
          );

          const applications = await contract.getJobApplications(job.jobId);

          // Find approved applications
          for (let i = 0; i < applications.length; i++) {
            const app = applications[i];
            if (app.isApproved) {
              activeJobs.push({
                jobId: job.jobId,
                jobTitle: job.title,
                jobType: job.jobType,
                freelancerAddress: app.freelancerAddress,
                finalPrice: ethers.formatEther(app.proposedPrice),
                estimatedDelivery: app.estimatedDelivery,
                cancellationTimeDays: app.cancellationTimeDays.toString(),
                deadline: new Date(job.deadline * 1000).toISOString().split('T')[0],
              });
            }
          }
        } catch (error) {
          console.error(`Error loading applications for job ${job.jobId}:`, error);
        }
      }

      console.log('Active jobs (approved applications):', activeJobs);
      setActiveJobs(activeJobs);
    } catch (error) {
      console.error("Error loading active jobs:", error);
      setActiveJobs([]);
    }
  };

  // Load jobs with applications
  const loadJobsWithApplications = async () => {
    if (!account) return;

    try {
      // Fetch all jobs from backend API
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${API_URL}/job-listings/all`);
      const result = await response.json();

      if (!result.success || !result.jobs) {
        setJobsWithApplications([]);
        return;
      }

      console.log('Current account:', account);
      console.log('All jobs from API:', result.jobs.length);

      // Filter jobs created by current user that have applications
      const jobsWithApps = result.jobs
        .filter(job => {
          const isMyJob = job.clientAddress.toLowerCase() === account.toLowerCase();
          const hasApps = job.applications && job.applications.length > 0;
          console.log(`Job ${job.jobId}: isMyJob=${isMyJob}, hasApps=${hasApps}, apps=${job.applications?.length || 0}`);
          return isMyJob && hasApps;
        })
        .map((job) => ({
          jobId: job.jobId,
          contractAddress: job.contractAddress,
          jobTitle: job.title,
          jobType: job.jobType,
          deadline: new Date(job.deadline * 1000).toISOString().split('T')[0],
          applications: job.applications.map((app, idx) => ({
            applicationId: idx,
            freelancerAddress: app.freelancerAddress,
            proposedPrice: parseFloat(app.proposedPrice),
            cancellationTimeDays: app.cancellationTimeDays,
            checkpointAmount: parseFloat(app.proposedPrice) / 3,
            numberOfCheckpoints: 3,
            estimatedDelivery: app.estimatedDelivery,
            portfolioLink: app.portfolioLink,
          })),
        }));

      console.log('Jobs with applications:', jobsWithApps);
      setJobsWithApplications(jobsWithApps);
    } catch (error) {
      console.error("Error loading jobs with applications:", error);
      setJobsWithApplications([]);
    }
  };


  const handleInputChange = async (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Update token conversion when price or FAsset changes
    if (name === 'priceMin' || name === 'priceMax' || name === 'paymentFAsset') {
      await updateTokenConversion({
        ...formData,
        [name]: value,
      });
    }
  };

  // Update token conversion using FTSO
  const updateTokenConversion = async (data) => {
    if (!provider || !data.priceMin || !data.priceMax || !data.paymentFAsset) {
      return;
    }

    try {
      setTokenConversion(prev => ({ ...prev, loading: true }));

      // Get asset price from FTSO
      const priceInfo = await blockchainService.getAssetPrice(data.paymentFAsset);

      // Convert USD to tokens
      const minTokens = await blockchainService.convertUSDToToken(
        data.priceMin,
        data.paymentFAsset
      );
      const maxTokens = await blockchainService.convertUSDToToken(
        data.priceMax,
        data.paymentFAsset
      );

      setTokenConversion({
        minTokens: ethers.formatEther(minTokens),
        maxTokens: ethers.formatEther(maxTokens),
        assetPrice: priceInfo.priceFormatted,
        loading: false,
      });
    } catch (error) {
      console.error('Error updating token conversion:', error);
      setTokenConversion(prev => ({ ...prev, loading: false }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isConnected || !signer) {
      alert("Please connect your wallet first");
      return;
    }

    try {
      setLoading(true);
      if (!JOB_LISTING_TOKEN_ADDRESS) {
        throw new Error("JobListingToken contract address not configured");
      }

      // Validate deadline
      if (!formData.deadline) {
        throw new Error("Please select a deadline date");
      }

      const deadlineDate = new Date(formData.deadline);
      if (isNaN(deadlineDate.getTime())) {
        throw new Error("Invalid deadline date");
      }

      if (deadlineDate < new Date()) {
        throw new Error("Deadline must be in the future");
      }

      // Create job listing directly on blockchain
      console.log('Creating job with data:', {
        title: formData.title,
        description: formData.description,
        jobType: formData.jobType,
        deadline: formData.deadline,
        minPrice: formData.priceMin,
        maxPrice: formData.priceMax,
      });

      const txHash = await blockchainService.createJobListing(JOB_LISTING_TOKEN_ADDRESS, {
        title: formData.title,
        description: formData.description,
        jobType: formData.jobType,
        deadline: formData.deadline,
        minPrice: formData.priceMin,
        maxPrice: formData.priceMax,
      });

      // Store contract address for this job
      // Note: In production with factory pattern, each job would have unique address
      const addresses = JSON.parse(localStorage.getItem('jobListingAddresses') || '[]');
      if (!addresses.includes(JOB_LISTING_TOKEN_ADDRESS)) {
        addresses.push(JOB_LISTING_TOKEN_ADDRESS);
        localStorage.setItem('jobListingAddresses', JSON.stringify(addresses));
      }

      alert(`Job listing created! Transaction: ${txHash}`);

      setCreateJobModalOpen(false);
      setFormData({
        title: "",
        description: "",
        jobType: "",
        deadline: "",
        priceMin: "",
        priceMax: "",
        paymentFAsset: "testUSDT",
      });
      setTokenConversion({
        minTokens: "",
        maxTokens: "",
        assetPrice: "",
        loading: false,
      });

      await loadJobListings();
    } catch (error) {
      console.error("Error creating job listing:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const [approvalStep, setApprovalStep] = useState(0);
  const [approvalTotalSteps, setApprovalTotalSteps] = useState(4);

  const handleApproveApplication = async (jobId, applicationIndex) => {
    if (!isConnected) {
      alert("Please connect your wallet first");
      return;
    }

    try {
      setLoading(true);
      setApprovalStep(1); // Start with Step 1

      const job = jobsWithApplications.find(j => j.jobId === jobId);
      if (!job) {
        throw new Error("Job not found");
      }

      const application = job.applications[applicationIndex];
      if (!application) {
        throw new Error("Application not found");
      }

      if (!JOB_LISTING_TOKEN_ADDRESS) {
        throw new Error("JobListingToken contract address not configured");
      }

      if (!JOB_TOKEN_FACTORY_ADDRESS || !ESCROW_WALLET_ADDRESS) {
        throw new Error("JobTokenFactory or EscrowWallet contract address not configured");
      }

      console.log('Approving application:', { jobId, applicationIndex, contractAddress: JOB_LISTING_TOKEN_ADDRESS });

      // Get job details to find payment FAsset
      const jobListingContract = new ethers.Contract(
        JOB_LISTING_TOKEN_ADDRESS,
        ["function getJob(uint256 _jobId) external view returns (tuple(uint256 jobId, string title, string description, string jobType, uint256 deadline, uint256 minPrice, uint256 maxPrice, address clientAddress, uint256 createdAt, bool isActive, string paymentFAsset, string metadataURI))"],
        provider
      );
      const jobDetails = await jobListingContract.getJob(jobId);
      const paymentFAsset = jobDetails.paymentFAsset;

      console.log('Job payment FAsset:', paymentFAsset);

      // Get FAsset token address from registry
      let paymentToken;
      if (paymentFAsset === 'testUSDT' || paymentFAsset === 'testUSDC') {
        paymentToken = MOCK_USDT_ADDRESS;
      } else {
        // For other FAssets, use zero address for now (would need registry lookup)
        paymentToken = MOCK_USDT_ADDRESS; // Fallback to testUSDT
        console.warn(`FAsset ${paymentFAsset} not yet supported, using testUSDT`);
      }

      // Convert USD price to token amount using FTSO
      console.log('Converting USD to tokens via FTSO...');
      const usdAmount = application.proposedPrice;
      const tokenAmount = await blockchainService.convertUSDToToken(usdAmount, paymentFAsset);
      console.log(`${usdAmount} USD = ${ethers.formatEther(tokenAmount)} ${paymentFAsset}`);

      // Step 1: Approve ERC20 token
      if (paymentToken && paymentToken !== ethers.ZeroAddress) {
        console.log('Step 1: Approving token spend...');
        const tokenContract = new ethers.Contract(paymentToken, [
          "function approve(address spender, uint256 amount) external returns (bool)"
        ], signer);

        const approveTx = await tokenContract.approve(JOB_TOKEN_FACTORY_ADDRESS, tokenAmount);
        await approveTx.wait();
        console.log('Token approval confirmed');
      }
      setApprovalStep(2); // Move to Step 2

      // Step 2: Create JobToken and deposit funds
      console.log('Step 2: Creating JobToken and depositing funds...');
      const jobTokenAddress = await blockchainService.createJobTokenAndDeposit(
        JOB_TOKEN_FACTORY_ADDRESS,
        jobId,
        {
          clientAddress: account,
          freelancerAddress: application.freelancerAddress,
          finalPrice: application.proposedPrice,
          estimatedDelivery: application.estimatedDelivery,
          cancellationTimeDays: application.cancellationTimeDays,
          escrowWallet: ESCROW_WALLET_ADDRESS,
          paymentToken: paymentToken,
        }
      );
      console.log('JobToken created and funded at:', jobTokenAddress);
      setApprovalStep(3); // Move to Step 3

      // Step 3: Approve application
      console.log('Step 3: Approving application...');
      await blockchainService.approveApplication(JOB_LISTING_TOKEN_ADDRESS, jobId, applicationIndex);
      console.log('Application approved');
      setApprovalStep(4); // Move to Step 4

      // Step 4: Set JobToken address
      console.log('Step 4: Setting JobToken address...');
      await blockchainService.setJobToken(JOB_LISTING_TOKEN_ADDRESS, jobId, jobTokenAddress);
      console.log('JobToken address set');

      console.log('All steps completed! Total transactions: 4');

      // Store job token address mapping
      const jobTokenMapping = JSON.parse(localStorage.getItem('jobTokenMapping') || '{}');
      jobTokenMapping[jobId] = jobTokenAddress;
      localStorage.setItem('jobTokenMapping', JSON.stringify(jobTokenMapping));

      // alert("Application approved and funds deposited to escrow successfully!");
      // Don't alert here, rely on visual indication or small delay

      // Reload all job lists
      await Promise.all([
        loadActiveJobs(),
        loadJobListings(),
        loadJobsWithApplications()
      ]);

      setApproveJobsModalOpen(false); // Close modal on success

    } catch (error) {
      console.error("Error approving application:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
      setApprovalStep(0); // Reset steps
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <div className="card bg-base-100 shadow-xl max-w-md">
          <div className="card-body text-center">
            <h2 className="card-title justify-center text-2xl mb-4">Connect Your Wallet</h2>
            <p className="mb-4">Please connect your wallet to access the client dashboard.</p>
            <button onClick={connectWallet} className="btn btn-primary">
              Connect Wallet
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Sticky Navbar */}
      <div className="navbar sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 lg:px-12 transition-all">
        <div className="flex-1">
          <button
            onClick={() => navigate("/")}
            className="btn btn-ghost text-xl font-display font-bold tracking-tight text-slate-800 hover:bg-slate-100/50"
          >
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-lg mr-2">F</span>
            Flarelance
          </button>
        </div>
        <div className="flex-none">
          <WalletConnect />
        </div>
      </div>

      <div className="container mx-auto px-6 lg:px-12 py-12 max-w-7xl">
        {/* Dashboard Feader */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6 animate-fade-in">
          <div>
            <h1 className="text-4xl font-bold font-display text-slate-900 mb-2">Client Dashboard</h1>
            <p className="text-slate-500 text-lg max-w-2xl">Create jobs, manage applications, and oversee your contracts securely with the power of blockchain.</p>
          </div>
        </div>

        {/* Action Cards Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {/* Create Job Card */}
          <div
            onClick={() => setCreateJobModalOpen(true)}
            className="group relative p-8 bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-emerald-100/50 transition-all cursor-pointer overflow-hidden animate-slide-up"
            style={{ animationDelay: '0ms' }}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-6 text-2xl group-hover:scale-110 transition-transform">
                ✍️
              </div>
              <h3 className="text-xl font-bold font-display text-slate-900 mb-2">Create New Job</h3>
              <p className="text-slate-500 mb-6 text-sm">Post a new job listing to the decentralized marketplace.</p>
              <button disabled={loading} className="btn btn-primary rounded-full px-6 group-hover:px-8 transition-all">
                {loading ? "Loading..." : "Create Job →"}
              </button>
            </div>
          </div>

          {/* Track Jobs Card */}
          <div
            onClick={() => {
              setTrackJobsModalOpen(true);
              loadActiveJobs();
            }}
            className="group relative p-8 bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-emerald-100/50 transition-all cursor-pointer overflow-hidden animate-slide-up"
            style={{ animationDelay: '100ms' }}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-6 text-2xl group-hover:scale-110 transition-transform">
                🔍
              </div>
              <h3 className="text-xl font-bold font-display text-slate-900 mb-2">Track Active Jobs</h3>
              <p className="text-slate-500 mb-6 text-sm">Monitor progress and milestones for your ongoing contracts.</p>
              <button disabled={loading} className="btn btn-neutral btn-outline border-slate-200 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 rounded-full px-6 group-hover:px-8 transition-all">
                View Active →
              </button>
            </div>
          </div>

          {/* Approve Jobs Card */}
          <div
            onClick={() => {
              setApproveJobsModalOpen(true);
              loadJobsWithApplications();
            }}
            className="group relative p-8 bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-emerald-100/50 transition-all cursor-pointer overflow-hidden animate-slide-up"
            style={{ animationDelay: '200ms' }}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mb-6 text-2xl group-hover:scale-110 transition-transform">
                ✅
              </div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-xl font-bold font-display text-slate-900">Review Applications</h3>
                {jobsWithApplications.length > 0 && (
                  <span className="badge badge-error badge-sm animate-pulse">New</span>
                )}
              </div>
              <p className="text-slate-500 mb-6 text-sm">Review and approve proposals from freelancers.</p>
              <button disabled={loading} className="btn btn-neutral btn-outline border-slate-200 hover:border-amber-200 hover:bg-amber-50 hover:text-amber-600 rounded-full px-6 group-hover:px-8 transition-all">
                Review →
              </button>
            </div>
          </div>
        </div>

        {/* Stats / Info Section could go here */}
      </div>

      {/* Create New Job Modal */}
      <dialog
        className={`modal ${createJobModalOpen ? "modal-open" : ""}`}
        open={createJobModalOpen}
      >
        <div className="modal-box max-w-2xl">
          <h3 className="font-bold text-2xl mb-6 text-base-content">Create New Job</h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Title</span>
                <span className="label-text-alt">Short title for the job</span>
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Enter job title"
                className="input input-bordered w-full"
                required
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Description</span>
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Describe the job requirements in detail"
                className="textarea textarea-bordered h-32"
                required
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Type of Job</span>
              </label>
              <select
                name="jobType"
                value={formData.jobType}
                onChange={handleInputChange}
                className="select select-bordered w-full"
                required
              >
                <option value="">Select job type</option>
                {jobTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Deadline</span>
              </label>
              <input
                type="date"
                name="deadline"
                value={formData.deadline}
                onChange={handleInputChange}
                min={new Date().toISOString().split('T')[0]}
                className="input input-bordered w-full"
                required
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Payment FAsset</span>
                <span className="label-text-alt">Choose which FAsset to accept</span>
              </label>
              <select
                name="paymentFAsset"
                value={formData.paymentFAsset}
                onChange={handleInputChange}
                className="select select-bordered w-full"
                required
              >
                <option value="testUSDT">testUSDT (Test USD Stablecoin)</option>
                <option value="testUSDC">testUSDC (Test USD Coin)</option>
                <option value="FLR">FLR (Flare Token)</option>
                <option value="XRP">XRP (Ripple)</option>
                <option value="BTC">BTC (Bitcoin)</option>
                <option value="ETH">ETH (Ethereum)</option>
              </select>
              {tokenConversion.assetPrice && formData.paymentFAsset !== 'testUSDT' && formData.paymentFAsset !== 'testUSDC' && (
                <label className="label">
                  <span className="label-text-alt text-info">
                    Current {formData.paymentFAsset} price: ${tokenConversion.assetPrice} USD (via FTSO)
                  </span>
                </label>
              )}
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Expected Price Range (USD)</span>
              </label>
              <div className="flex gap-4">
                <div className="flex-1">
                  <input
                    type="number"
                    name="priceMin"
                    value={formData.priceMin}
                    onChange={handleInputChange}
                    placeholder="Min (USD)"
                    className="input input-bordered w-full"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <div className="flex items-center">
                  <span className="text-base-content">to</span>
                </div>
                <div className="flex-1">
                  <input
                    type="number"
                    name="priceMax"
                    value={formData.priceMax}
                    onChange={handleInputChange}
                    placeholder="Max (USD)"
                    className="input input-bordered w-full"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
              </div>
              {tokenConversion.minTokens && tokenConversion.maxTokens && (
                <label className="label">
                  <span className="label-text-alt text-success">
                    {tokenConversion.loading ? (
                      "Calculating via FTSO..."
                    ) : (
                      <>
                        ≈ {parseFloat(tokenConversion.minTokens).toFixed(6)} to {parseFloat(tokenConversion.maxTokens).toFixed(6)} {formData.paymentFAsset}
                        {formData.paymentFAsset !== 'testUSDT' && formData.paymentFAsset !== 'testUSDC' && (
                          <span className="ml-2 badge badge-info badge-sm">FTSO Live Price</span>
                        )}
                      </>
                    )}
                  </span>
                </label>
              )}
            </div>

            <div className="modal-action mt-6">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setCreateJobModalOpen(false)}
                disabled={loading}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? "Creating..." : "Create Job"}
              </button>
            </div>
          </form>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button onClick={() => setCreateJobModalOpen(false)}>close</button>
        </form>
      </dialog>

      {/* Track Current Jobs Modal */}
      <dialog
        className={`modal backdrop-blur-sm ${trackJobsModalOpen ? "modal-open" : ""}`}
        open={trackJobsModalOpen}
      >
        <div className="modal-box max-w-3xl max-h-[90vh] bg-white rounded-3xl shadow-2xl p-0 overflow-hidden">
          <div className="p-8 border-b border-slate-100 bg-slate-50/50">
            <h3 className="font-bold font-display text-2xl text-slate-900">Track Current Jobs</h3>
            <p className="text-slate-500 mt-1">View status of your ongoing contracts.</p>
          </div>

          <div className="p-8 bg-slate-50/30 min-h-[300px]">
            {activeJobs.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
                <div className="text-4xl mb-4">📭</div>
                <p className="text-slate-500 font-medium">No active jobs at the moment.</p>
              </div>
            ) : (
              <div className="space-y-4 overflow-y-auto max-h-[50vh] pr-2">
                {activeJobs.map((job, idx) => (
                  <div
                    key={`${job.jobId}-${idx}`}
                    className="group bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all cursor-pointer p-5"
                    onClick={() => {
                      setTrackJobsModalOpen(false);
                      navigate(`/client/job/${job.jobId}`);
                    }}
                  >
                    <div className="flex items-start gap-4">
                      <div className="avatar">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-xs font-bold shadow-lg shadow-indigo-200">
                          {job.freelancerAddress.slice(0, 2)}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <h4 className="font-bold text-lg text-slate-900 group-hover:text-emerald-700 transition-colors">{job.jobTitle}</h4>
                          <span className="badge badge-success badge-sm bg-emerald-100 text-emerald-800 border-none font-medium">Active</span>
                        </div>
                        <p className="text-xs text-slate-400 font-mono mb-3">
                          Freelancer: {job.freelancerAddress.slice(0, 8)}...{job.freelancerAddress.slice(-6)}
                        </p>

                        <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm mt-3 p-3 bg-slate-50 rounded-xl">
                          <div className="flex flex-col">
                            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Price</span>
                            <span className="font-bold text-slate-700">${parseFloat(job.finalPrice).toLocaleString()}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Type</span>
                            <span className="text-slate-700">{job.jobType}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Delivery</span>
                            <span className="text-slate-700">{job.estimatedDelivery}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Deadline</span>
                            <span className="text-slate-700">{job.deadline}</span>
                          </div>
                        </div>

                        <div className="mt-4 flex items-center text-xs font-semibold text-emerald-600 group-hover:translate-x-1 transition-transform">
                          View Details →
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-6 border-t border-slate-100 bg-white flex justify-end">
            <button
              className="btn btn-ghost hover:bg-slate-100 rounded-full"
              onClick={() => setTrackJobsModalOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop bg-slate-900/20 backdrop-blur-sm">
          <button onClick={() => setTrackJobsModalOpen(false)}>close</button>
        </form>
      </dialog>

      {/* Approve Jobs Modal */}
      <dialog
        className={`modal ${approveJobsModalOpen ? "modal-open" : ""}`}
        open={approveJobsModalOpen}
      >
        <div className="modal-box max-w-5xl max-h-[90vh]">
          <h3 className="font-bold text-2xl mb-6 text-base-content">Approve Jobs</h3>

          {jobsWithApplications.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-base-content/70">No jobs pending approval.</p>
            </div>
          ) : (
            <div className="space-y-6 overflow-y-auto max-h-[70vh] pr-2">
              {jobsWithApplications.map((job) => (
                <div key={job.jobId} className="card bg-base-100 shadow-lg">
                  <div className="card-body">
                    <div className="mb-4 pb-4 border-b border-base-300">
                      <h4 className="text-xl font-bold mb-2">{job.jobTitle}</h4>
                      <div className="flex flex-wrap gap-2">
                        <div className="badge badge-outline">{job.jobType}</div>
                        <div className="badge badge-outline">
                          Deadline: {new Date(job.deadline).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h5 className="font-semibold text-lg mb-3">
                        Applications ({job.applications.length})
                      </h5>
                      {job.applications.map((application, idx) => (
                        <div key={idx} className="card bg-base-200 shadow-md">
                          <div className="card-body p-4">
                            <div className="flex flex-col lg:flex-row gap-4">
                              <div className="flex items-start gap-4 flex-shrink-0">
                                <div className="avatar">
                                  <div className="w-16 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
                                    <div className="w-full h-full bg-primary text-primary-content flex items-center justify-center text-xs">
                                      {application.freelancerAddress.slice(0, 6)}
                                    </div>
                                  </div>
                                </div>
                                <div>
                                  <h6 className="font-bold text-lg">
                                    {application.freelancerAddress.slice(0, 10)}...{application.freelancerAddress.slice(-8)}
                                  </h6>
                                </div>
                              </div>

                              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <div>
                                    <span className="text-sm font-semibold">Proposed Price:</span>
                                    <p className="text-lg font-bold text-primary">
                                      ${application.proposedPrice.toLocaleString()}
                                    </p>
                                  </div>
                                  <div>
                                    <span className="text-sm font-semibold">Cancellation Enabled After:</span>
                                    <p className="text-sm">{application.cancellationTimeDays} days</p>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <div>
                                    <span className="text-sm font-semibold">Checkpoint Payment:</span>
                                    <p className="text-sm">
                                      ${application.checkpointAmount.toLocaleString()} per checkpoint
                                    </p>
                                  </div>
                                  <div>
                                    <span className="text-sm font-semibold">Estimated Delivery:</span>
                                    <p className="text-sm">{application.estimatedDelivery}</p>
                                  </div>
                                </div>

                                {application.portfolioLink && (
                                  <div>
                                    <span className="text-sm font-semibold">Portfolio:</span>
                                    <a
                                      href={application.portfolioLink}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-sm text-primary hover:underline block"
                                    >
                                      View Portfolio →
                                    </a>
                                  </div>
                                )}
                              </div>

                              <div className="flex flex-col gap-2 lg:flex-shrink-0">
                                <button
                                  className="btn btn-success btn-sm"
                                  onClick={() => handleApproveApplication(job.jobId, idx)}
                                  disabled={loading}
                                >
                                  Approve
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="modal-action mt-6">
            <button
              className="btn btn-ghost"
              onClick={() => setApproveJobsModalOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button onClick={() => setApproveJobsModalOpen(false)}>close</button>
        </form>
      </dialog>
      {/* Transaction Progress Modal */}
      <dialog className={`modal backdrop-blur-sm ${approvalStep > 0 ? "modal-open" : ""}`}>
        <div className="modal-box bg-white rounded-3xl p-8 shadow-2xl max-w-sm">
          <div className="flex flex-col items-center text-center">
            <div className="loading loading-spinner text-emerald-500 loading-lg mb-6"></div>
            <h3 className="font-bold text-xl text-slate-900 mb-2">Processing Payment</h3>
            <p className="text-slate-500 mb-8 max-w-xs">Please confirm the transactions in your wallet to secure the contract.</p>

            <div className="w-full space-y-4">
              <div className={`flex items-center gap-3 transition-opacity ${approvalStep >= 1 ? 'opacity-100' : 'opacity-40'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${approvalStep > 1 ? 'bg-emerald-100 text-emerald-600' : approvalStep === 1 ? 'bg-emerald-500 text-white animate-pulse' : 'bg-slate-100 text-slate-400'}`}>
                  {approvalStep > 1 ? '✓' : '1'}
                </div>
                <div className="text-left">
                  <p className="font-bold text-slate-800 text-sm">Approve Tokens</p>
                  <p className="text-xs text-slate-500">Allow spending USDT</p>
                </div>
              </div>

              <div className={`flex items-center gap-3 transition-opacity ${approvalStep >= 2 ? 'opacity-100' : 'opacity-40'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${approvalStep > 2 ? 'bg-emerald-100 text-emerald-600' : approvalStep === 2 ? 'bg-emerald-500 text-white animate-pulse' : 'bg-slate-100 text-slate-400'}`}>
                  {approvalStep > 2 ? '✓' : '2'}
                </div>
                <div className="text-left">
                  <p className="font-bold text-slate-800 text-sm">Create & Fund</p>
                  <p className="text-xs text-slate-500">Setup Escrow Vault</p>
                </div>
              </div>

              <div className={`flex items-center gap-3 transition-opacity ${approvalStep >= 3 ? 'opacity-100' : 'opacity-40'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${approvalStep > 3 ? 'bg-emerald-100 text-emerald-600' : approvalStep === 3 ? 'bg-emerald-500 text-white animate-pulse' : 'bg-slate-100 text-slate-400'}`}>
                  {approvalStep > 3 ? '✓' : '3'}
                </div>
                <div className="text-left">
                  <p className="font-bold text-slate-800 text-sm">Accept Application</p>
                  <p className="text-xs text-slate-500">Confirm Freelancer</p>
                </div>
              </div>

              <div className={`flex items-center gap-3 transition-opacity ${approvalStep >= 4 ? 'opacity-100' : 'opacity-40'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${approvalStep > 4 ? 'bg-emerald-100 text-emerald-600' : approvalStep === 4 ? 'bg-emerald-500 text-white animate-pulse' : 'bg-slate-100 text-slate-400'}`}>
                  {approvalStep >= 4 ? '✓' : '4'}
                </div>
                <div className="text-left">
                  <p className="font-bold text-slate-800 text-sm">Activate Contract</p>
                  <p className="text-xs text-slate-500">Link Vault to Job</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </dialog>
    </div>
  );
}

export default ClientPage;
