const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class ApiService {
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Request failed');
      }
      
      return data;
    } catch (error) {
      console.error('API request error:', error);
      throw error;
    }
  }

  // Job Listing APIs
  async createJobListing(jobData) {
    return this.request('/job-listings/create', {
      method: 'POST',
      body: JSON.stringify(jobData),
    });
  }

  async getJobListing(contractAddress) {
    return this.request(`/job-listings/${contractAddress}`);
  }

  async applyForJob(contractAddress, applicationData) {
    return this.request(`/job-listings/${contractAddress}/apply`, {
      method: 'POST',
      body: JSON.stringify(applicationData),
    });
  }

  async getApplications(contractAddress) {
    return this.request(`/job-listings/${contractAddress}/applications`);
  }

  async getAllJobListings(addresses) {
    return this.request('/job-listings/all', {
      method: 'POST',
      body: JSON.stringify({ addresses }),
    });
  }

  // Job APIs
  async initializeJob(jobData) {
    return this.request('/jobs/initialize', {
      method: 'POST',
      body: JSON.stringify(jobData),
    });
  }

  async submitCheckpoint(contractAddress, checkpointIndex, ipfsCID) {
    return this.request(`/jobs/${contractAddress}/checkpoint/submit`, {
      method: 'POST',
      body: JSON.stringify({ checkpointIndex, ipfsCID }),
    });
  }

  async approveCheckpoint(contractAddress, checkpointIndex) {
    return this.request(`/jobs/${contractAddress}/checkpoint/${checkpointIndex}/approve`, {
      method: 'POST',
    });
  }

  async rejectCheckpoint(contractAddress, checkpointIndex) {
    return this.request(`/jobs/${contractAddress}/checkpoint/${checkpointIndex}/reject`, {
      method: 'POST',
    });
  }

  async cancelJob(contractAddress) {
    return this.request(`/jobs/${contractAddress}/cancel`, {
      method: 'POST',
    });
  }

  async getJobStatus(contractAddress) {
    return this.request(`/jobs/${contractAddress}/status`);
  }

  // IPFS APIs
  async uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/ipfs/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Upload failed');
    }

    return response.json();
  }

  async uploadWithWatermark(file) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/ipfs/upload-watermarked`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Upload failed');
    }

    return response.json();
  }

  getFileUrl(cid) {
    return `${API_BASE_URL}/ipfs/${cid}`;
  }
}

export default new ApiService();

