const ipfsService = require('../services/ipfs.service');
const watermarkService = require('../services/watermark.service');

class IPFSController {
  /**
   * Upload file to IPFS
   */
  async uploadFile(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const cid = await ipfsService.uploadFile(
        req.file.buffer,
        req.file.originalname
      );

      res.json({
        success: true,
        cid,
        url: ipfsService.getGatewayUrl(cid),
      });
    } catch (error) {
      console.error('Upload file error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Upload file with watermark
   */
  async uploadWithWatermark(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const result = await watermarkService.uploadWithWatermark(
        req.file.buffer,
        req.file.originalname
      );

      res.json({
        success: true,
        originalCID: result.originalCID,
        watermarkedCID: result.watermarkedCID,
        originalUrl: result.originalUrl,
        watermarkedUrl: result.watermarkedUrl,
      });
    } catch (error) {
      console.error('Upload with watermark error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get file from IPFS
   */
  async getFile(req, res) {
    try {
      const { cid } = req.params;

      const fileBuffer = await ipfsService.getFile(cid);

      res.setHeader('Content-Type', 'application/octet-stream');
      res.send(fileBuffer);
    } catch (error) {
      console.error('Get file error:', error);
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new IPFSController();

