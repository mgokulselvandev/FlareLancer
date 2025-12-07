import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useWallet } from "../hooks/useWallet";
import WalletConnect from "./WalletConnect";
import { ethers } from "ethers";
import blockchainService from "../services/blockchain.service";
import ipfsService from "../services/ipfs.service";

function FreelancerJobDetailPage() {
  const navigate = useNavigate();
  const { jobId } = useParams();
  const { account, provider, signer, isConnected, connectWallet } = useWallet();
  const [loading, setLoading] = useState(false);
  const [jobData, setJobData] = useState(null);
  const [jobTokenAddress, setJobTokenAddress] = useState(null);
  const [checkpoints, setCheckpoints] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadingCheckpoint, setUploadingCheckpoint] = useState(null);
  const [uploadProgress, setUploadProgress] = useState("");

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
      setSelectedFile(null);
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
      
      // Get approved application for current user
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
        const myApprovedApp = applications.find(
          app => app.isApproved && app.freelancerAddress.toLowerCase() === account.toLowerCase()
        );
        
        if (!myApprovedApp) {
          alert("You are not assigned to this job");
          navigate("/freelancer");
          return;
        }
        
        // Get JobToken address
        const jobToken = await contract.getJobToken(jobId);
        if (jobToken && jobToken !== ethers.ZeroAddress) {
          setJobTokenAddress(jobToken);
        }
        
        setJobData({
          ...job,
          finalPrice: ethers.formatEther(myApprovedApp.proposedPrice),
          estimatedDelivery: myApprovedApp.estimatedDelivery,
          cancellationTimeDays: myApprovedApp.cancellationTimeDays.toString(),
        });
      } else {
        setJobData(job);
      }
    } catch (error) {
      console.error("Error loading job:", error);
      alert(`Error: ${error.message}`);
      navigate("/freelancer");
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

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type (images and videos only)
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        alert('Please select an image or video file');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleSubmitCheckpoint = async (checkpointIndex) => {
    if (!selectedFile) {
      alert('Please select a file to upload');
      return;
    }
    
    if (!jobTokenAddress) {
      alert('Job token not initialized');
      return;
    }
    
    // Check if IPFS is configured
    if (!ipfsService.isConfigured()) {
      const proceed = confirm(
        'IPFS is not configured. Files will be stored as mock CIDs for testing.\n\n' +
        'To upload real files, add Pinata API keys to frontend/.env\n' +
        'See SETUP_PINATA.md for instructions.\n\n' +
        'Continue with mock upload?'
      );
      if (!proceed) return;
    }
    
    try {
      setUploadingCheckpoint(checkpointIndex);
      setUploadProgress('Uploading file to IPFS...');
      
      // Upload original file to IPFS
      const originalCID = await ipfsService.uploadFile(selectedFile);
      console.log('Original file uploaded:', originalCID);
      
      setUploadProgress('Creating watermarked preview...');
      
      // Upload watermarked version for client preview
      const watermarkText = `PREVIEW - Checkpoint ${checkpointIndex + 1}`;
      const watermarkedCID = await ipfsService.uploadWatermarkedFile(selectedFile, watermarkText);
      console.log('Watermarked file uploaded:', watermarkedCID);
      
      setUploadProgress('Submitting checkpoint to blockchain...');
      
      // Submit checkpoint with original CID (watermarked CID is for preview only)
      // Store both CIDs in format: "original:watermarked"
      const combinedCID = `${originalCID}:${watermarkedCID}`;
      const txHash = await blockchainService.submitCheckpoint(
        jobTokenAddress,
        checkpointIndex,
        combinedCID
      );
      
      console.log('Checkpoint submitted:', txHash);
      
      if (ipfsService.isConfigured()) {
        alert('Checkpoint submitted successfully! Waiting for client approval.');
      } else {
        alert('Checkpoint submitted with mock CID (testing mode).\n\nConfigure Pinata to upload real files.');
      }
      
      // Reset form
      setSelectedFile(null);
      setUploadProgress('');
      
      // Reload checkpoints
      await loadCheckpoints();
    } catch (error) {
      console.error('Error submitting checkpoint:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setUploadingCheckpoint(null);
      setUploadProgress('');
    }
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
    <div className="min-h-screen bg-base-200">
      <div className="navbar bg-base-100 shadow-lg">
        <div className="flex-1">
          <button onClick={() => navigate("/freelancer")} className="btn btn-ghost text-xl">
            ← Back to Dashboard
          </button>
        </div>
        <div className="flex-none">
          <WalletConnect />
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-3xl mb-4">{jobData.title}</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="font-semibold text-lg mb-2">Job Details</h3>
                <div className="space-y-2">
                  <div>
                    <span className="font-semibold">Type:</span> {jobData.jobType}
                  </div>
                  <div>
                    <span className="font-semibold">Deadline:</span>{" "}
                    {new Date(jobData.deadline * 1000).toLocaleDateString()}
                  </div>
                  <div>
                    <span className="font-semibold">Created:</span>{" "}
                    {new Date(jobData.createdAt * 1000).toLocaleDateString()}
                  </div>
                  <div>
                    <span className="font-semibold">Status:</span>{" "}
                    <div className="badge badge-success">Approved</div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-2">Your Contract</h3>
                <div className="space-y-2">
                  <div>
                    <span className="font-semibold">Client:</span>{" "}
                    {jobData.clientAddress.slice(0, 10)}...{jobData.clientAddress.slice(-8)}
                  </div>
                  <div>
                    <span className="font-semibold">Agreed Price:</span> ${parseFloat(jobData.finalPrice).toLocaleString()}
                  </div>
                  <div>
                    <span className="font-semibold">Estimated Delivery:</span> {jobData.estimatedDelivery}
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="font-semibold text-lg mb-2">Description</h3>
              <p className="text-base-content/70">{jobData.description}</p>
            </div>

            {/* Checkpoints Section */}
            {jobTokenAddress && (
              <div className="mt-8">
                <h3 className="font-semibold text-2xl mb-4">Project Checkpoints</h3>
                <p className="text-sm text-base-content/70 mb-6">
                  Submit your work at each checkpoint. The client will review and approve before payment is released.
                </p>
                
                <div className="space-y-6">
                  {[0, 1, 2].map((index) => {
                    const checkpoint = checkpoints[index] || {};
                    const percentage = getCheckpointPaymentPercentage(index);
                    const amount = getCheckpointPaymentAmount(index);
                    const isCompleted = checkpoint.isCompleted;
                    const isApproved = checkpoint.isApproved;
                    const canSubmit = index === 0 || (checkpoints[index - 1]?.isApproved);
                    
                    return (
                      <div key={index} className="card bg-base-200 shadow-md">
                        <div className="card-body">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold text-lg mb-2">
                                Checkpoint {index + 1}
                                {isApproved && (
                                  <span className="ml-2 badge badge-success">Approved</span>
                                )}
                                {isCompleted && !isApproved && (
                                  <span className="ml-2 badge badge-warning">Pending Approval</span>
                                )}
                                {!isCompleted && !canSubmit && (
                                  <span className="ml-2 badge badge-ghost">Locked</span>
                                )}
                              </h4>
                              <p className="text-sm text-base-content/70 mb-2">
                                Payment: ${amount.toFixed(2)} ({percentage}% of total)
                              </p>
                              
                              {isCompleted && checkpoint.ipfsCID && (
                                <div className="mt-2">
                                  <p className="text-sm font-semibold">Submitted:</p>
                                  <p className="text-xs text-base-content/60">
                                    {new Date(checkpoint.submissionDate * 1000).toLocaleString()}
                                  </p>
                                </div>
                              )}
                              
                              {isApproved && checkpoint.approvalDate && (
                                <div className="mt-2">
                                  <p className="text-sm font-semibold text-success">Approved:</p>
                                  <p className="text-xs text-base-content/60">
                                    {new Date(checkpoint.approvalDate * 1000).toLocaleString()}
                                  </p>
                                  <p className="text-sm text-success mt-1">
                                    ✓ Payment released: ${amount.toFixed(2)}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {!isCompleted && canSubmit && (
                            <div className="mt-4">
                              <div className="form-control">
                                <label className="label">
                                  <span className="label-text font-semibold">Upload your work</span>
                                  <span className="label-text-alt">Image or Video</span>
                                </label>
                                <input
                                  type="file"
                                  accept="image/*,video/*"
                                  onChange={handleFileSelect}
                                  className="file-input file-input-bordered w-full"
                                  disabled={uploadingCheckpoint === index}
                                />
                              </div>
                              
                              {selectedFile && (
                                <div className="mt-2 text-sm text-base-content/70">
                                  Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                                </div>
                              )}
                              
                              {uploadProgress && uploadingCheckpoint === index && (
                                <div className="mt-2">
                                  <progress className="progress progress-primary w-full"></progress>
                                  <p className="text-sm text-center mt-1">{uploadProgress}</p>
                                </div>
                              )}
                              
                              <button
                                className="btn btn-primary mt-4"
                                onClick={() => handleSubmitCheckpoint(index)}
                                disabled={!selectedFile || uploadingCheckpoint === index}
                              >
                                {uploadingCheckpoint === index ? 'Uploading...' : 'Submit for Approval'}
                              </button>
                            </div>
                          )}
                          
                          {!canSubmit && !isCompleted && (
                            <div className="alert alert-warning mt-4">
                              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                              <span>Complete previous checkpoint first</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {!jobTokenAddress && (
              <div className="alert alert-info mt-6">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span>Waiting for client to initialize payment escrow...</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default FreelancerJobDetailPage;
