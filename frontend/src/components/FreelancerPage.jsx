import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "../hooks/useWallet";
import WalletConnect from "./WalletConnect";
import blockchainService from "../services/blockchain.service";
import { ethers } from "ethers";

function FreelancerPage() {
  const navigate = useNavigate();
  const { account, provider, signer, isConnected, connectWallet } = useWallet();
  const [currentJobsModalOpen, setCurrentJobsModalOpen] = useState(false);
  const [findJobsModalOpen, setFindJobsModalOpen] = useState(false);
  const [proposalModalOpen, setProposalModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedJob, setSelectedJob] = useState(null);
  const [loading, setLoading] = useState(false);

  const [availableJobs, setAvailableJobs] = useState([]);
  const [activeJobs, setActiveJobs] = useState([]);

  const [proposalData, setProposalData] = useState({
    price: "",
    cancellationTime: "",
    estimatedDelivery: "",
    portfolioLink: "",
  });

  // FTSO price conversion for proposals
  const [proposalTokenAmount, setProposalTokenAmount] = useState({
    tokens: "",
    assetPrice: "",
    loading: false,
  });

  useEffect(() => {
    if (provider && signer) {
      blockchainService.setProvider(provider, signer);
      loadAvailableJobs();
      loadActiveJobs();
    }
  }, [provider, signer, account]);

  const loadAvailableJobs = async () => {
    setLoading(true);
    try {
      // Fetch all jobs from backend API
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${API_URL}/job-listings/all`);
      const result = await response.json();

      if (result.success && result.jobs) {
        console.log('Loaded jobs from API:', result.jobs);

        const JOB_LISTING_TOKEN_ADDRESS = import.meta.env.VITE_JOB_LISTING_TOKEN_ADDRESS;

        // Filter jobs and check for approved applications
        const availableJobs = [];

        for (const job of result.jobs) {
          // Skip jobs past deadline
          if (!job.deadline || job.deadline * 1000 <= Date.now()) {
            continue;
          }

          // Check if job has any approved applications
          let hasApprovedApplication = false;

          if (JOB_LISTING_TOKEN_ADDRESS) {
            try {
              const contract = new ethers.Contract(
                JOB_LISTING_TOKEN_ADDRESS,
                ["function getJobApplications(uint256 _jobId) external view returns (tuple(address freelancerAddress, uint256 proposedPrice, uint256 cancellationTimeDays, string estimatedDelivery, string portfolioLink, uint256 appliedAt, bool isApproved)[])"],
                new ethers.BrowserProvider(window.ethereum)
              );

              const applications = await contract.getJobApplications(job.jobId);

              // Check if any application is approved
              for (const app of applications) {
                if (app.isApproved) {
                  hasApprovedApplication = true;
                  break;
                }
              }
            } catch (error) {
              console.error(`Error checking applications for job ${job.jobId}:`, error);
            }
          }

          // Only show jobs without approved applications
          if (!hasApprovedApplication) {
            availableJobs.push({
              id: job.id || job.jobId,
              jobId: job.id || job.jobId,
              contractAddress: job.contractAddress,
              title: job.title,
              description: job.description,
              type: job.jobType,
              deadline: new Date(job.deadline * 1000).toISOString().split('T')[0],
              priceRange: {
                min: parseFloat(job.minPrice),
                max: parseFloat(job.maxPrice),
              },
              clientAddress: job.clientAddress,
            });
          }
        }

        console.log('Available jobs (excluding approved):', availableJobs);
        setAvailableJobs(availableJobs);
      } else {
        console.log('No jobs found');
        setAvailableJobs([]);
      }
    } catch (error) {
      console.error("Error loading available jobs:", error);
      setAvailableJobs([]);
    } finally {
      setLoading(false);
    }
  };

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

      // Get jobs where current user has an approved application
      const activeJobs = [];
      const JOB_LISTING_TOKEN_ADDRESS = import.meta.env.VITE_JOB_LISTING_TOKEN_ADDRESS;

      for (const job of result.jobs) {
        if (!JOB_LISTING_TOKEN_ADDRESS) continue;

        try {
          const contract = new ethers.Contract(
            JOB_LISTING_TOKEN_ADDRESS,
            ["function getJobApplications(uint256 _jobId) external view returns (tuple(address freelancerAddress, uint256 proposedPrice, uint256 cancellationTimeDays, string estimatedDelivery, string portfolioLink, uint256 appliedAt, bool isApproved)[])"],
            new ethers.BrowserProvider(window.ethereum)
          );

          const applications = await contract.getJobApplications(job.jobId);

          // Find approved applications for current user
          for (let i = 0; i < applications.length; i++) {
            const app = applications[i];
            if (app.isApproved && app.freelancerAddress.toLowerCase() === account.toLowerCase()) {
              activeJobs.push({
                jobId: job.jobId,
                jobTitle: job.title,
                jobType: job.jobType,
                clientAddress: job.clientAddress,
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

      console.log('Active jobs for freelancer:', activeJobs);
      setActiveJobs(activeJobs);
    } catch (error) {
      console.error("Error loading active jobs:", error);
      setActiveJobs([]);
    }
  };

  const filteredJobs = availableJobs.filter(
    (job) =>
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleJobClick = (job) => {
    setSelectedJob(job);
    setProposalModalOpen(true);
  };

  const handleProposalInputChange = async (e) => {
    const { name, value } = e.target;
    setProposalData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Update token conversion when price changes
    if (name === 'price' && value && selectedJob) {
      await updateProposalTokenAmount(value, selectedJob);
    }
  };

  // Update proposal token amount using FTSO
  const updateProposalTokenAmount = async (priceUSD, job) => {
    if (!provider || !priceUSD || !job) {
      return;
    }

    try {
      setProposalTokenAmount(prev => ({ ...prev, loading: true }));

      // Get job's payment FAsset
      const JOB_LISTING_TOKEN_ADDRESS = import.meta.env.VITE_JOB_LISTING_TOKEN_ADDRESS;
      const jobListingContract = new ethers.Contract(
        JOB_LISTING_TOKEN_ADDRESS,
        ["function getJob(uint256 _jobId) external view returns (tuple(uint256 jobId, string title, string description, string jobType, uint256 deadline, uint256 minPrice, uint256 maxPrice, address clientAddress, uint256 createdAt, bool isActive, string paymentFAsset, string metadataURI))"],
        provider
      );
      const jobDetails = await jobListingContract.getJob(job.jobId);
      const paymentFAsset = jobDetails.paymentFAsset;

      // Get asset price from FTSO
      const priceInfo = await blockchainService.getAssetPrice(paymentFAsset);

      // Convert USD to tokens
      const tokens = await blockchainService.convertUSDToToken(priceUSD, paymentFAsset);

      setProposalTokenAmount({
        tokens: ethers.formatEther(tokens),
        assetPrice: priceInfo.priceFormatted,
        paymentFAsset: paymentFAsset,
        loading: false,
      });
    } catch (error) {
      console.error('Error updating proposal token amount:', error);
      setProposalTokenAmount(prev => ({ ...prev, loading: false }));
    }
  };

  const parseCancellationTime = (timeString) => {
    const lower = timeString.toLowerCase();
    if (lower.includes("hour")) {
      return Math.ceil(parseInt(timeString) / 24);
    } else if (lower.includes("day")) {
      return parseInt(timeString);
    } else if (lower.includes("week")) {
      return parseInt(timeString) * 7;
    }
    return parseInt(timeString) || 1;
  };

  const handleProposalSubmit = async (e) => {
    e.preventDefault();

    if (!isConnected || !signer) {
      alert("Please connect your wallet first");
      return;
    }

    if (!selectedJob) return;

    try {
      setLoading(true);
      const cancellationTimeDays = parseCancellationTime(proposalData.cancellationTime);

      // Apply for job directly on blockchain
      const JOB_LISTING_TOKEN_ADDRESS = import.meta.env.VITE_JOB_LISTING_TOKEN_ADDRESS;
      const txHash = await blockchainService.applyForJob(
        JOB_LISTING_TOKEN_ADDRESS,
        selectedJob.id || selectedJob.jobId,
        {
          proposedPrice: proposalData.price,
          cancellationTimeDays,
          estimatedDelivery: proposalData.estimatedDelivery,
          portfolioLink: proposalData.portfolioLink || "",
        }
      );

      alert(`Proposal submitted! Transaction: ${txHash}`);

      setProposalModalOpen(false);
      setProposalData({
        price: "",
        cancellationTime: "",
        estimatedDelivery: "",
        portfolioLink: "",
      });
      setSelectedJob(null);

      await loadAvailableJobs();
    } catch (error) {
      console.error("Error submitting proposal:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <div className="card bg-base-100 shadow-xl max-w-md">
          <div className="card-body text-center">
            <h2 className="card-title justify-center text-2xl mb-4">Connect Your Wallet</h2>
            <p className="mb-4">Please connect your wallet to access the freelancer dashboard.</p>
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
            <h1 className="text-4xl font-bold font-display text-slate-900 mb-2">Freelancer Dashboard</h1>
            <p className="text-slate-500 text-lg max-w-2xl">Find exciting projects, submit proposals, and build your decentralized career.</p>
          </div>
        </div>

        {/* Action Cards Grid */}
        <div className="grid md:grid-cols-2 gap-8 mb-16 max-w-4xl mx-auto">
          {/* Active Jobs Card */}
          <div
            onClick={() => {
              setCurrentJobsModalOpen(true);
              loadActiveJobs();
            }}
            className="group relative p-10 bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-emerald-100/50 transition-all cursor-pointer overflow-hidden animate-slide-up"
            style={{ animationDelay: '0ms' }}
          >
            <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-50 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110" />
            <div className="relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-8 text-3xl group-hover:scale-110 transition-transform">
                🚀
              </div>
              <h3 className="text-2xl font-bold font-display text-slate-900 mb-3">Current Jobs</h3>
              <p className="text-slate-500 mb-8 max-w-xs">View your ongoing projects and track detailed milestones.</p>
              <button disabled={loading} className="btn btn-primary btn-outline border-slate-200 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 rounded-full px-8 group-hover:px-10 transition-all">
                View Active →
              </button>
            </div>
          </div>

          {/* Find Jobs Card */}
          <div
            onClick={() => {
              setFindJobsModalOpen(true);
              loadAvailableJobs();
            }}
            className="group relative p-10 bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-emerald-100/50 transition-all cursor-pointer overflow-hidden animate-slide-up"
            style={{ animationDelay: '100ms' }}
          >
            <div className="absolute top-0 right-0 w-40 h-40 bg-teal-50 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110" />
            <div className="relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-teal-100 text-teal-600 flex items-center justify-center mb-8 text-3xl group-hover:scale-110 transition-transform">
                🔎
              </div>
              <h3 className="text-2xl font-bold font-display text-slate-900 mb-3">Find New Jobs</h3>
              <p className="text-slate-500 mb-8 max-w-xs">Browse the marketplace and submit winning proposals.</p>
              <button disabled={loading} className="btn btn-primary rounded-full px-8 group-hover:px-10 transition-all">
                Browse Jobs →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Current Jobs Modal */}
      <dialog
        className={`modal backdrop-blur-sm ${currentJobsModalOpen ? "modal-open" : ""}`}
        open={currentJobsModalOpen}
      >
        <div className="modal-box max-w-3xl max-h-[90vh] bg-white rounded-3xl shadow-2xl p-0 overflow-hidden">
          <div className="p-8 border-b border-slate-100 bg-slate-50/50">
            <h3 className="font-bold font-display text-2xl text-slate-900">Current Jobs</h3>
            <p className="text-slate-500 mt-1">Jobs you are currently working on.</p>
          </div>

          <div className="p-8 bg-slate-50/30 min-h-[300px]">
            {activeJobs.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
                <div className="text-4xl mb-4">📭</div>
                <p className="text-slate-500 font-medium">No active jobs at the moment.</p>
              </div>
            ) : (
              <div className="space-y-4 overflow-y-auto max-h-[60vh] pr-2">
                {activeJobs.map((job, idx) => (
                  <div
                    key={`${job.jobId}-${idx}`}
                    className="group bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all cursor-pointer p-5"
                    onClick={() => {
                      setCurrentJobsModalOpen(false);
                      navigate(`/freelancer/job/${job.jobId}`);
                    }}
                  >
                    <div className="flex items-start gap-4">
                      <div className="avatar">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-xs font-bold shadow-lg shadow-indigo-200">
                          {job.clientAddress.slice(0, 2)}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <h4 className="font-bold text-lg text-slate-900 group-hover:text-emerald-700 transition-colors">{job.jobTitle}</h4>
                          <span className="badge badge-success badge-sm bg-emerald-100 text-emerald-800 border-none font-medium">Active</span>
                        </div>
                        <p className="text-xs text-slate-400 font-mono mb-3">
                          Client: {job.clientAddress.slice(0, 8)}...{job.clientAddress.slice(-6)}
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
              onClick={() => setCurrentJobsModalOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop bg-slate-900/20 backdrop-blur-sm">
          <button onClick={() => setCurrentJobsModalOpen(false)}>close</button>
        </form>
      </dialog>

      {/* Find New Jobs Modal */}
      <dialog
        className={`modal backdrop-blur-sm ${findJobsModalOpen ? "modal-open" : ""}`}
        open={findJobsModalOpen}
      >
        <div className="modal-box max-w-4xl max-h-[90vh] bg-white rounded-3xl shadow-2xl p-0 overflow-hidden">
          <div className="p-8 border-b border-slate-100 bg-slate-50/50">
            <h3 className="font-bold font-display text-2xl text-slate-900 mb-6">Find New Jobs</h3>

            <div className="form-control">
              <input
                type="text"
                placeholder="Search jobs by title, description, or type..."
                className="input input-bordered w-full rounded-full bg-white shadow-sm border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="p-8 bg-slate-50/30 min-h-[400px]">
            {filteredJobs.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
                <div className="text-4xl mb-4">🔍</div>
                <p className="text-base-content/70">
                  {searchQuery ? "No jobs found matching your search." : "No jobs available at the moment."}
                </p>
              </div>
            ) : (
              <div className="space-y-4 overflow-y-auto max-h-[60vh] pr-2">
                {filteredJobs.map((job) => (
                  <div
                    key={job.id}
                    className="group bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all cursor-pointer p-6"
                    onClick={() => handleJobClick(job)}
                  >
                    <div className="flex items-start justify-between gap-6">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-bold text-lg text-slate-900">{job.title}</h4>
                          <div className="badge badge-sm badge-outline text-slate-500">{job.type}</div>
                        </div>
                        <p className="text-sm text-slate-500 mb-4 line-clamp-2">{job.description}</p>

                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1 text-slate-700 font-medium">
                            <span className="text-emerald-600 font-bold">${job.priceRange.min.toLocaleString()} - ${job.priceRange.max.toLocaleString()}</span>
                          </div>
                          <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                          <div className="text-slate-500">
                            Deadline: {new Date(job.deadline).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="text-emerald-500 group-hover:translate-x-1 transition-transform">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
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
              onClick={() => {
                setFindJobsModalOpen(false);
                setSearchQuery("");
              }}
            >
              Close
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop bg-slate-900/20 backdrop-blur-sm">
          <button
            onClick={() => {
              setFindJobsModalOpen(false);
              setSearchQuery("");
            }}
          >
            close
          </button>
        </form>
      </dialog>

      {/* Proposal Submission Modal */}
      <dialog
        className={`modal ${proposalModalOpen ? "modal-open" : ""}`}
        open={proposalModalOpen}
      >
        <div className="modal-box max-w-3xl">
          <h3 className="font-bold text-2xl mb-6 text-base-content">Submit Proposal</h3>

          {selectedJob && (
            <div className="mb-6 p-4 bg-base-200 rounded-lg">
              <h4 className="font-semibold text-lg mb-2">{selectedJob.title}</h4>
              <p className="text-sm text-base-content/70 mb-2">{selectedJob.description}</p>
              <div className="flex flex-wrap gap-2">
                <div className="badge badge-outline">{selectedJob.type}</div>
                <div className="badge badge-outline">
                  Deadline: {new Date(selectedJob.deadline).toLocaleDateString()}
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleProposalSubmit} className="space-y-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Proposed Price (USD)</span>
                {selectedJob && (
                  <span className="label-text-alt">
                    Range: ${selectedJob.priceRange.min.toLocaleString()} - ${selectedJob.priceRange.max.toLocaleString()}
                  </span>
                )}
              </label>
              <input
                type="number"
                name="price"
                value={proposalData.price}
                onChange={handleProposalInputChange}
                placeholder="Enter your proposed price"
                className="input input-bordered w-full"
                min="0"
                step="0.01"
                required
              />
              {proposalTokenAmount.tokens && proposalTokenAmount.paymentFAsset && (
                <label className="label">
                  <span className="label-text-alt text-success">
                    {proposalTokenAmount.loading ? (
                      "Calculating via FTSO..."
                    ) : (
                      <>
                        ≈ {parseFloat(proposalTokenAmount.tokens).toFixed(6)} {proposalTokenAmount.paymentFAsset}
                        {proposalTokenAmount.paymentFAsset !== 'testUSDT' && proposalTokenAmount.paymentFAsset !== 'testUSDC' && (
                          <>
                            <span className="ml-2 badge badge-info badge-sm">FTSO Live Price</span>
                            <span className="ml-2">({proposalTokenAmount.paymentFAsset} @ ${proposalTokenAmount.assetPrice})</span>
                          </>
                        )}
                      </>
                    )}
                  </span>
                </label>
              )}
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Cancellation Enabled After</span>
                <span className="label-text-alt">Time after which cancellation is allowed</span>
              </label>
              <select
                name="cancellationTime"
                value={proposalData.cancellationTime}
                onChange={handleProposalInputChange}
                className="select select-bordered w-full"
                required
              >
                <option value="">Select cancellation time</option>
                <option value="24 hours">24 hours</option>
                <option value="48 hours">48 hours</option>
                <option value="72 hours">72 hours</option>
                <option value="1 week">1 week</option>
                <option value="2 weeks">2 weeks</option>
              </select>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Estimated Delivery Time</span>
              </label>
              <input
                type="text"
                name="estimatedDelivery"
                value={proposalData.estimatedDelivery}
                onChange={handleProposalInputChange}
                placeholder="e.g., 2 weeks, 1 month, etc."
                className="input input-bordered w-full"
                required
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Portfolio Link</span>
                <span className="label-text-alt">Optional</span>
              </label>
              <input
                type="url"
                name="portfolioLink"
                value={proposalData.portfolioLink}
                onChange={handleProposalInputChange}
                placeholder="https://your-portfolio.com"
                className="input input-bordered w-full"
              />
            </div>

            <div className="modal-action mt-6">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setProposalModalOpen(false);
                  setProposalData({
                    price: "",
                    cancellationTime: "",
                    estimatedDelivery: "",
                    portfolioLink: "",
                  });
                  setSelectedJob(null);
                }}
                disabled={loading}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? "Submitting..." : "Submit Proposal"}
              </button>
            </div>
          </form>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button
            onClick={() => {
              setProposalModalOpen(false);
              setProposalData({
                price: "",
                cancellationTime: "",
                estimatedDelivery: "",
                portfolioLink: "",
              });
              setSelectedJob(null);
            }}
          >
            close
          </button>
        </form>
      </dialog>
    </div>
  );
}

export default FreelancerPage;
