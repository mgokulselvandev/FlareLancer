const express = require('express');
const router = express.Router();
const multer = require('multer');
const ipfsController = require('../controllers/ipfs.controller');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
});

// Upload file
router.post('/upload', upload.single('file'), ipfsController.uploadFile.bind(ipfsController));

// Upload file with watermark
router.post('/upload-watermarked', upload.single('file'), ipfsController.uploadWithWatermark.bind(ipfsController));

// Get file by CID
router.get('/:cid', ipfsController.getFile.bind(ipfsController));

module.exports = router;

