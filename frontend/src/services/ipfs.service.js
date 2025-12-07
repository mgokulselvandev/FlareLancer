class IPFSService {
  constructor() {
    // Using Pinata API for IPFS uploads
    this.pinataApiKey = import.meta.env.VITE_PINATA_API_KEY;
    this.pinataSecretKey = import.meta.env.VITE_PINATA_SECRET_KEY;
    this.usePinata = !!(this.pinataApiKey && this.pinataSecretKey);
    
    if (this.usePinata) {
      console.log('Using Pinata for IPFS uploads');
    } else {
      console.warn('No IPFS credentials configured - using mock mode');
    }
  }

  /**
   * Upload file to IPFS
   * @param {File} file - File to upload
   * @returns {Promise<string>} IPFS CID
   */
  async uploadFile(file) {
    if (this.usePinata) {
      return await this.uploadToPinata(file);
    }
    
    // Fallback: Create mock CID for testing
    const mockCID = await this.createMockCID(file);
    console.log('Using mock CID for testing:', mockCID);
    return mockCID;
  }
  
  async uploadToPinata(file) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const metadata = JSON.stringify({
        name: file.name,
      });
      formData.append('pinataMetadata', metadata);
      
      const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
        method: 'POST',
        headers: {
          'pinata_api_key': this.pinataApiKey,
          'pinata_secret_api_key': this.pinataSecretKey,
        },
        body: formData
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Pinata upload error:', errorText);
        throw new Error(`Pinata upload failed: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('File uploaded to Pinata:', result.IpfsHash);
      return result.IpfsHash;
    } catch (error) {
      console.error('Pinata upload exception:', error);
      throw new Error(`Failed to upload to Pinata: ${error.message}`);
    }
  }
  
  async createMockCID(file) {
    // Create a deterministic "CID" from file properties
    const fileData = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', fileData);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return `Qm${hashHex.substring(0, 44)}`; // Mock CID format
  }

  /**
   * Upload watermarked file to IPFS
   * @param {File} file - Original file
   * @param {string} watermarkText - Text to watermark
   * @returns {Promise<string>} IPFS CID of watermarked file
   */
  async uploadWatermarkedFile(file, watermarkText) {
    // For images, create watermarked version
    if (file.type.startsWith('image/')) {
      const watermarkedBlob = await this.watermarkImage(file, watermarkText);
      const watermarkedFile = new File([watermarkedBlob], `watermarked_${file.name}`, { type: file.type });
      
      if (this.usePinata) {
        return await this.uploadToPinata(watermarkedFile);
      }
      
      // Fallback to mock
      const mockCID = await this.createMockCID(watermarkedFile);
      console.log('Using mock watermarked CID for testing:', mockCID);
      return mockCID;
    }
    
    // For videos, just upload as-is (video watermarking requires server-side processing)
    if (this.usePinata) {
      return await this.uploadToPinata(file);
    }
    
    const mockCID = await this.createMockCID(file);
    return mockCID + '_watermarked';
  }

  /**
   * Watermark an image
   * @param {File} file - Image file
   * @param {string} text - Watermark text
   * @returns {Promise<Blob>} Watermarked image blob
   */
  async watermarkImage(file, text) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;

        // Draw original image
        ctx.drawImage(img, 0, 0);

        // Add watermark
        ctx.font = `${Math.max(20, img.width / 30)}px Arial`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.lineWidth = 2;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Draw watermark in center
        const x = canvas.width / 2;
        const y = canvas.height / 2;
        ctx.strokeText(text, x, y);
        ctx.fillText(text, x, y);

        // Convert to blob
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create watermarked image'));
          }
        }, file.type);
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Check if a CID is a mock CID (for testing without IPFS)
   * @param {string} cid - IPFS CID
   * @returns {boolean} True if mock CID
   */
  isMockCID(cid) {
    // Mock CIDs are shorter than real CIDs (46 chars) or have _watermarked suffix
    return (cid.startsWith('Qm') && cid.length < 46) || cid.includes('_watermarked');
  }

  /**
   * Get IPFS gateway URL for a CID
   * @param {string} cid - IPFS CID
   * @returns {string} Gateway URL
   */
  getGatewayUrl(cid) {
    // For mock CIDs (testing), return null to indicate no real file
    if (this.isMockCID(cid)) {
      return null;
    }
    // Use Pinata gateway for faster access
    return `https://gateway.pinata.cloud/ipfs/${cid}`;
  }

  /**
   * Get Infura gateway URL for a CID (faster)
   * @param {string} cid - IPFS CID
   * @returns {string} Gateway URL
   */
  getInfuraGatewayUrl(cid) {
    // For mock CIDs (testing), return null
    if (this.isMockCID(cid)) {
      return null;
    }
    return `https://gateway.pinata.cloud/ipfs/${cid}`;
  }
  
  /**
   * Check if IPFS is properly configured (not in mock mode)
   * @returns {boolean} True if using real IPFS
   */
  isConfigured() {
    return this.usePinata;
  }
}

export default new IPFSService();
