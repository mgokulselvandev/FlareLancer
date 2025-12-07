const sharp = require('sharp');
const IPFSService = require('./ipfs.service');

class WatermarkService {
  /**
   * Apply watermark to image
   * @param {Buffer} imageBuffer - Original image buffer
   * @param {string} watermarkText - Text to use as watermark
   * @returns {Promise<Buffer>} Watermarked image buffer
   */
  async applyWatermark(imageBuffer, watermarkText = 'PREVIEW') {
    try {
      const metadata = await sharp(imageBuffer).metadata();
      const width = metadata.width;
      const height = metadata.height;

      // Create watermark SVG
      const svgWatermark = `
        <svg width="${width}" height="${height}">
          <text
            x="50%"
            y="50%"
            font-size="${Math.min(width, height) / 10}"
            fill="rgba(255, 0, 0, 0.5)"
            text-anchor="middle"
            dominant-baseline="middle"
            font-weight="bold"
            transform="rotate(-45 ${width / 2} ${height / 2})"
          >
            ${watermarkText}
          </text>
        </svg>
      `;

      const watermarkedImage = await sharp(imageBuffer)
        .composite([
          {
            input: Buffer.from(svgWatermark),
            top: 0,
            left: 0,
          },
        ])
        .toBuffer();

      return watermarkedImage;
    } catch (error) {
      console.error('Watermark error:', error);
      throw new Error('Failed to apply watermark');
    }
  }

  /**
   * Upload original and watermarked versions
   * @param {Buffer} originalBuffer - Original file buffer
   * @param {string} fileName - Original file name
   * @returns {Promise<{originalCID: string, watermarkedCID: string}>}
   */
  async uploadWithWatermark(originalBuffer, fileName) {
    try {
      // Check if it's an image
      const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName);

      let originalCID, watermarkedCID;

      if (isImage) {
        // Upload original
        originalCID = await IPFSService.uploadFile(originalBuffer, fileName);

        // Create and upload watermarked version
        const watermarkedBuffer = await this.applyWatermark(originalBuffer);
        const watermarkedFileName = `watermarked_${fileName}`;
        watermarkedCID = await IPFSService.uploadFile(watermarkedBuffer, watermarkedFileName);
      } else {
        // For non-image files, just upload original
        originalCID = await IPFSService.uploadFile(originalBuffer, fileName);
        watermarkedCID = originalCID; // Same CID for non-images
      }

      return {
        originalCID,
        watermarkedCID,
        originalUrl: IPFSService.getGatewayUrl(originalCID),
        watermarkedUrl: IPFSService.getGatewayUrl(watermarkedCID),
      };
    } catch (error) {
      console.error('Upload with watermark error:', error);
      throw error;
    }
  }
}

module.exports = new WatermarkService();

