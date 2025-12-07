const { create } = require('ipfs-http-client');
const config = require('../config/config');

class IPFSService {
  constructor() {
    this.ipfs = create({ url: config.ipfsApiUrl });
  }

  /**
   * Upload file to IPFS
   * @param {Buffer} fileBuffer - File buffer to upload
   * @param {string} fileName - Name of the file
   * @returns {Promise<string>} IPFS CID
   */
  async uploadFile(fileBuffer, fileName) {
    try {
      const result = await this.ipfs.add({
        path: fileName,
        content: fileBuffer,
      });
      return result.cid.toString();
    } catch (error) {
      console.error('IPFS upload error:', error);
      throw new Error('Failed to upload file to IPFS');
    }
  }

  /**
   * Retrieve file from IPFS
   * @param {string} cid - IPFS CID
   * @returns {Promise<Buffer>} File buffer
   */
  async getFile(cid) {
    try {
      const chunks = [];
      for await (const chunk of this.ipfs.cat(cid)) {
        chunks.push(chunk);
      }
      return Buffer.concat(chunks);
    } catch (error) {
      console.error('IPFS retrieval error:', error);
      throw new Error('Failed to retrieve file from IPFS');
    }
  }

  /**
   * Get IPFS gateway URL
   * @param {string} cid - IPFS CID
   * @returns {string} Gateway URL
   */
  getGatewayUrl(cid) {
    return `${config.ipfsGatewayUrl}${cid}`;
  }
}

module.exports = new IPFSService();

