import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useWallet } from "../hooks/useWallet";
import WalletConnect from "./WalletConnect";
import { ethers } from "ethers";
import blockchainService from "../services/blockchain.service";
import ipfsService from "../services/ipfs.service";

function JobDetailPage() {
  const navigate = useNavigate();
  const { jobId } = useParams();
  const { account, provider, signer, isConnected, connectWallet } = useWallet();
  const [loading, setLoading] = useState(false);
  const [jobData, setJobData] = useState(null);
  const [jobTokenAddress, setJobTokenAddress] = useState(null);
  const [checkpoints, setCheckpoints] = useState([]);
  const [previewModal, setPreviewModal] = useState({ open: false, cid: null, index: null });

  useEffect(() => {
    if (provider && signer) {
      blockchainService.setProvider(provider, signer);
    }
  }, [provider, signer]);

  useEffect(() => {
    if (account && jobId) {
      // Clear previous job data when jobId changes
      setJobData(null);
      setJobTokenAddress(null);
      setCheckpoints([]);
      loadJobData();
    }
  }, [account, jobId]);

  useEffect(() => {
    if (jobTokenAddress) {
      loadCheckpoints();
    }
  }, [jobTokenAddress]);

  const loadJobData = async () => {
    setLoading(true);
    try {
      // Fetch job from API
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${API_URL}/job-listings/all`);
      const result = await response.json();

      if (!result.success || !result.jobs) {
        throw new Error('Failed to fetch jobs');
      }

      // Find the specific job
      const job = result.jobs.find(j => j.jobId === jobId);
      if (!job) {
        throw new Error('Job not found');
      }

      // Verify this is the client's job
      if (job.clientAddress.toLowerCase() !== account.toLowerCase()) {
        alert("You are not authorized to view this job");
        navigate("/client");
        return;
      }

      // Get approved application
      const JOB_LISTING_TOKEN_ADDRESS = import.meta.env.VITE_JOB_LISTING_TOKEN_ADDRESS;
      if (JOB_LISTING_TOKEN_ADDRESS) {
        const contract = new ethers.Contract(
          JOB_LISTING_TOKEN_ADDRESS,
          [
            "function getJobApplications(uint256 _jobId) external view returns (tuple(address freelancerAddress, uint256 proposedPrice, uint256 cancellationTimeDays, string estimatedDelivery, string portfolioLink, uint256 appliedAt, bool isApproved)[])",
            "function getJobToken(uint256 _jobId) external view returns (address)"
          ],
          new ethers.BrowserProvider(window.ethereum)
        );

        const applications = await contract.getJobApplications(jobId);
        const approvedApp = applications.find(app => app.isApproved);

        if (approvedApp) {
          // Get JobToken address
          const jobToken = await contract.getJobToken(jobId);
          if (jobToken && jobToken !== ethers.ZeroAddress) {
            setJobTokenAddress(jobToken);
          }

          setJobData({
            ...job,
            freelancerAddress: approvedApp.freelancerAddress,
            finalPrice: ethers.formatEther(approvedApp.proposedPrice),
            estimatedDelivery: approvedApp.estimatedDelivery,
            cancellationTimeDays: approvedApp.cancellationTimeDays.toString(),
          });
        } else {
          setJobData(job);
        }
      } else {
        setJobData(job);
      }
    } catch (error) {
      console.error("Error loading job:", error);
      alert(`Error: ${error.message}`);
      navigate("/client");
    } finally {
      setLoading(false);
    }
  };

  const loadCheckpoints = async () => {
    if (!jobTokenAddress) return;

    try {
      const status = await blockchainService.getJobTokenStatus(jobTokenAddress);
      setCheckpoints(status.checkpoints);
    } catch (error) {
      console.error("Error loading checkpoints:", error);
    }
  };

  const handleApproveCheckpoint = async (checkpointIndex) => {
    if (!jobTokenAddress) return;

    try {
      setLoading(true);

      const txHash = await blockchainService.approveCheckpoint(jobTokenAddress, checkpointIndex);
      console.log('Checkpoint approved:', txHash);

      alert('Checkpoint approved! Payment has been released to the freelancer.');

      // Reload checkpoints
      await loadCheckpoints();
    } catch (error) {
      console.error('Error approving checkpoint:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRejectCheckpoint = async (checkpointIndex) => {
    if (!jobTokenAddress) return;

    if (!confirm('Are you sure you want to reject this checkpoint? The freelancer will need to resubmit.')) {
      return;
    }

    try {
      setLoading(true);

      const txHash = await blockchainService.rejectCheckpoint(jobTokenAddress, checkpointIndex);
      console.log('Checkpoint rejected:', txHash);

      alert('Checkpoint rejected. The freelancer can now resubmit.');

      // Reload checkpoints
      await loadCheckpoints();
    } catch (error) {
      console.error('Error rejecting checkpoint:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewFile = (checkpoint, index) => {
    // Extract watermarked CID from combined format "original:watermarked"
    const cids = checkpoint.ipfsCID.split(':');
    const watermarkedCID = cids.length > 1 ? cids[1] : cids[0];

    // Check if IPFS is configured
    if (!ipfsService.isConfigured()) {
      alert('IPFS is not configured. Please add Pinata API keys to view files.\n\nSee SETUP_PINATA.md for instructions.');
      return;
    }

    setPreviewModal({ open: true, cid: watermarkedCID, index });
  };

  const getCheckpointPaymentPercentage = (index) => {
    const percentages = [10, 35, 55];
    return percentages[index];
  };

  const getCheckpointPaymentAmount = (index) => {
    if (!jobData) return 0;
    const percentage = getCheckpointPaymentPercentage(index);
    return (parseFloat(jobData.finalPrice) * percentage) / 100;
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <div className="card bg-base-100 shadow-xl max-w-md">
          <div className="card-body text-center">
            <h2 className="card-title justify-center text-2xl mb-4">Connect Your Wallet</h2>
            <p className="mb-4">Please connect your wallet to view job details.</p>
            <button onClick={connectWallet} className="btn btn-primary">
              Connect Wallet
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading || !jobData) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Sticky Navbar */}
      <div className="navbar sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 lg:px-12 transition-all">
        <div className="flex-1">
          <button onClick={() => navigate("/client")} className="btn btn-ghost text-slate-500 hover:text-slate-800 flex gap-2">
            ← Back to Dashboard
          </button>
        </div>
        <div className="flex-none">
          <WalletConnect />
        </div>
      </div>

      <div className="container mx-auto px-6 lg:px-12 py-12 max-w-5xl animate-fade-in">
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
          {/* Header */}
          <div className="p-8 md:p-10 border-b border-slate-100 bg-slate-50/30">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold font-display text-slate-900 mb-2">{jobData.title}</h1>
                <div className="flex items-center gap-2">
                  <span className="badge badge-lg bg-emerald-100 text-emerald-800 border-none font-medium">Approved</span>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-500 font-mono text-sm">Created {new Date(jobData.createdAt * 1000).toLocaleDateString()}</span>
                </div>
              </div>
              {jobData.freelancerAddress && (
                <div className="bg-indigo-50 px-6 py-3 rounded-2xl flex items-center gap-4">
                  <div className="flex flex-col text-right">
                    <span className="text-xs text-indigo-400 font-bold uppercase tracking-wider">Freelancer</span>
                    <span className="text-indigo-900 font-mono font-medium text-sm">
                      {jobData.freelancerAddress.slice(0, 6)}...{jobData.freelancerAddress.slice(-4)}
                    </span>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                    👤
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="p-8 md:p-10 grid md:grid-cols-3 gap-12">
            {/* Main Content */}
            <div className="md:col-span-2 space-y-8">
              <div>
                <h3 className="font-bold text-lg text-slate-900 mb-3 flex items-center gap-2">
                  Project Description
                </h3>
                <p className="text-slate-600 leading-relaxed whitespace-pre-line text-lg">
                  {jobData.description}
                </p>
              </div>

              {/* Checkpoints Section */}
              {jobTokenAddress ? (
                <div className="pt-6 border-t border-slate-100">
                  <h3 className="font-bold text-2xl font-display text-slate-900 mb-2">Project Milestones</h3>
                  <p className="text-slate-500 mb-6">Review and approve deliverables to release payments.</p>

                  <div className="space-y-4">
                    {[0, 1, 2].map((index) => {
                      const checkpoint = checkpoints[index] || {};
                      const percentage = getCheckpointPaymentPercentage(index);
                      const amount = getCheckpointPaymentAmount(index);
                      const isCompleted = checkpoint.isCompleted;
                      const isApproved = checkpoint.isApproved;

                      return (
                        <div key={index} className={`card border transition-all duration-300 ${isApproved ? 'bg-emerald-50/50 border-emerald-100' : isCompleted ? 'bg-amber-50/50 border-amber-100 shadow-md transform scale-[1.01]' : 'bg-slate-50 border-slate-100'}`}>
                          <div className="card-body p-6">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-bold text-slate-900 text-lg flex items-center gap-3">
                                  Milestone {index + 1}
                                  {isApproved && <span className="badge badge-success badge-sm">Paid</span>}
                                  {isCompleted && !isApproved && <span className="badge badge-warning badge-sm animate-pulse">Needs Review</span>}
                                </h4>
                                <p className="text-slate-500 mt-1 font-medium">
                                  Payment: <span className="text-slate-900">${amount.toFixed(2)}</span> <span className="text-slate-400 text-sm">({percentage}%)</span>
                                </p>
                              </div>
                              {/* Status Indicators or Action Buttons would go nicely here if complex logic wasn't needed inside map */}
                            </div>

                            {/* Actions Area */}
                            {(isCompleted && !isApproved) && (
                              <div className="mt-4 pt-4 border-t border-amber-100/50 flex flex-wrap gap-3">
                                <button
                                  className="btn btn-sm bg-white border-amber-200 text-amber-800 hover:bg-amber-50"
                                  onClick={() => handlePreviewFile(checkpoint, index)}
                                >
                                  👁️ Preview
                                </button>
                                <div className="flex-1"></div>
                                <button
                                  className="btn btn-sm btn-error btn-outline"
                                  onClick={() => handleRejectCheckpoint(index)}
                                  disabled={loading}
                                >
                                  Reject
                                </button>
                                <button
                                  className="btn btn-sm btn-success text-white shadow-lg shadow-emerald-200"
                                  onClick={() => handleApproveCheckpoint(index)}
                                  disabled={loading}
                                >
                                  Approve & Pay
                                </button>
                              </div>
                            )}

                            {isApproved && checkpoint.approvalDate && (
                              <div className="mt-2 text-xs text-emerald-600 font-medium flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                Paid on {new Date(checkpoint.approvalDate * 1000).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="alert alert-warning mt-6 bg-amber-50 border-amber-200 text-amber-800">
                  <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>Payment escrow not initialized. Please wait for confirmation.</span>
                </div>
              )}
            </div>

            {/* Sidebar Stats */}
            <div className="space-y-6">
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <h4 className="font-bold text-slate-900 mb-4 text-sm uppercase tracking-wider">Contract Details</h4>
                <div className="space-y-4">
                  <div>
                    <span className="block text-xs text-slate-400 font-semibold uppercase">Total Value</span>
                    <span className="text-2xl font-bold text-emerald-600">${parseFloat(jobData.finalPrice).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-slate-400 font-semibold uppercase">Deadline</span>
                    <span className="text-slate-700 font-medium">{new Date(jobData.deadline * 1000).toLocaleDateString()}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-slate-400 font-semibold uppercase">Delivery</span>
                    <span className="text-slate-700 font-medium">{jobData.estimatedDelivery}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-slate-400 font-semibold uppercase">Job Type</span>
                    <span className="badge badge-outline mt-1">{jobData.jobType}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Modal - Keep existing logic but clean up if needed */}
      <dialog
        className={`modal backdrop-blur-sm ${previewModal.open ? "modal-open" : ""}`}
        open={previewModal.open}
      >
        <div className="modal-box max-w-4xl bg-white rounded-3xl shadow-2xl">
          <h3 className="font-bold text-2xl mb-4 font-display">
            Checkpoint {previewModal.index !== null ? previewModal.index + 1 : ''} Preview
          </h3>
          {/* ... Content ... */}

          {previewModal.cid && (
            <div className="flex justify-center bg-slate-100 rounded-xl p-4 min-h-[300px] items-center">
              {/* ... Image logic ... */}
              {ipfsService.getGatewayUrl(previewModal.cid) ? (
                <img
                  src={ipfsService.getGatewayUrl(previewModal.cid)}
                  alt="Preview"
                  className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-sm"
                  onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
                />
              ) : (
                <p>Loading preview...</p>
              )}
              {/* Fallback logic embedded in original code... */}
            </div>
          )}

          <div className="modal-action mt-6">
            <button
              className="btn btn-ghost rounded-full"
              onClick={() => setPreviewModal({ open: false, cid: null, index: null })}
            >
              Close Preview
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop bg-slate-900/20 backdrop-blur-sm">
          <button onClick={() => setPreviewModal({ open: false, cid: null, index: null })}>close</button>
        </form>
      </dialog>
    </div>
  );
}

export default JobDetailPage;
