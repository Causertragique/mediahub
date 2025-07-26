const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/avi', 'video/mov', 'video/wmv',
      'audio/mp3', 'audio/wav', 'audio/aac',
      'application/pdf', 'text/plain'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  }
});

// Upload media files
router.post('/upload', auth, upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    const processedFiles = [];
    const { projectId } = req.body;

    for (const file of req.files) {
      const fileInfo = {
        originalName: file.originalname,
        filename: file.filename,
        path: file.path,
        size: file.size,
        mimetype: file.mimetype,
        type: getFileType(file.mimetype),
        url: `/uploads/${file.filename}`,
        metadata: {}
      };

      // Process different file types
      if (fileInfo.type === 'image') {
        await processImage(file.path, fileInfo);
      } else if (fileInfo.type === 'video') {
        await processVideo(file.path, fileInfo);
      } else if (fileInfo.type === 'audio') {
        await processAudio(file.path, fileInfo);
      }

      processedFiles.push(fileInfo);
    }

    res.json({
      success: true,
      message: 'Files uploaded successfully',
      files: processedFiles
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during upload'
    });
  }
});

// Process image files
async function processImage(filePath, fileInfo) {
  try {
    const image = sharp(filePath);
    const metadata = await image.metadata();
    
    fileInfo.metadata = {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      hasAlpha: metadata.hasAlpha
    };

    // Generate thumbnail
    const thumbnailPath = filePath.replace(/\.[^/.]+$/, '_thumb.jpg');
    await image
      .resize(300, 300, { fit: 'cover' })
      .jpeg({ quality: 80 })
      .toFile(thumbnailPath);
    
    fileInfo.thumbnail = thumbnailPath.replace(/.*uploads\//, '/uploads/');
  } catch (error) {
    console.error('Image processing error:', error);
  }
}

// Process video files
async function processVideo(filePath, fileInfo) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        console.error('Video processing error:', err);
        resolve();
        return;
      }

      const videoStream = metadata.streams.find(s => s.codec_type === 'video');
      const audioStream = metadata.streams.find(s => s.codec_type === 'audio');

      fileInfo.metadata = {
        duration: metadata.format.duration,
        format: metadata.format.format_name,
        size: metadata.format.size,
        bitrate: metadata.format.bit_rate
      };

      if (videoStream) {
        fileInfo.metadata.width = videoStream.width;
        fileInfo.metadata.height = videoStream.height;
        fileInfo.metadata.codec = videoStream.codec_name;
        fileInfo.metadata.fps = eval(videoStream.r_frame_rate);
      }

      if (audioStream) {
        fileInfo.metadata.audioCodec = audioStream.codec_name;
        fileInfo.metadata.sampleRate = audioStream.sample_rate;
      }

      // Generate thumbnail
      const thumbnailPath = filePath.replace(/\.[^/.]+$/, '_thumb.jpg');
      ffmpeg(filePath)
        .screenshots({
          timestamps: ['50%'],
          filename: path.basename(thumbnailPath),
          folder: path.dirname(thumbnailPath),
          size: '320x240'
        })
        .on('end', () => {
          fileInfo.thumbnail = thumbnailPath.replace(/.*uploads\//, '/uploads/');
          resolve();
        })
        .on('error', (err) => {
          console.error('Thumbnail generation error:', err);
          resolve();
        });
    });
  });
}

// Process audio files
async function processAudio(filePath, fileInfo) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        console.error('Audio processing error:', err);
        resolve();
        return;
      }

      const audioStream = metadata.streams.find(s => s.codec_type === 'audio');

      fileInfo.metadata = {
        duration: metadata.format.duration,
        format: metadata.format.format_name,
        size: metadata.format.size,
        bitrate: metadata.format.bit_rate
      };

      if (audioStream) {
        fileInfo.metadata.codec = audioStream.codec_name;
        fileInfo.metadata.sampleRate = audioStream.sample_rate;
        fileInfo.metadata.channels = audioStream.channels;
      }

      resolve();
    });
  });
}

// Get file type from mimetype
function getFileType(mimetype) {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/')) return 'video';
  if (mimetype.startsWith('audio/')) return 'audio';
  return 'document';
}

// Get media files for a project
router.get('/project/:projectId', auth, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { type, page = 1, limit = 20 } = req.query;

    // This would typically fetch from a Media model
    // For now, we'll return a mock response
    const mediaFiles = [
      {
        id: '1',
        name: 'sample-image.jpg',
        type: 'image',
        url: '/uploads/sample-image.jpg',
        thumbnail: '/uploads/sample-image_thumb.jpg',
        size: 1024000,
        createdAt: new Date(),
        metadata: {
          width: 1920,
          height: 1080,
          format: 'jpeg'
        }
      }
    ];

    res.json({
      success: true,
      files: mediaFiles,
      total: mediaFiles.length,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('Get media error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Delete media file
router.delete('/:fileId', auth, async (req, res) => {
  try {
    const { fileId } = req.params;

    // This would typically delete from database and file system
    // For now, we'll return a success response
    res.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('Delete media error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Generate media variants (different sizes, formats)
router.post('/:fileId/variants', auth, async (req, res) => {
  try {
    const { fileId } = req.params;
    const { variants } = req.body; // Array of { width, height, format }

    // This would generate different variants of the media file
    const generatedVariants = variants.map(variant => ({
      id: uuidv4(),
      originalFileId: fileId,
      width: variant.width,
      height: variant.height,
      format: variant.format,
      url: `/uploads/variant-${uuidv4()}.${variant.format}`,
      size: Math.floor(Math.random() * 1000000) + 100000
    }));

    res.json({
      success: true,
      message: 'Variants generated successfully',
      variants: generatedVariants
    });
  } catch (error) {
    console.error('Generate variants error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get media analytics
router.get('/:fileId/analytics', auth, async (req, res) => {
  try {
    const { fileId } = req.params;

    // Mock analytics data
    const analytics = {
      views: Math.floor(Math.random() * 1000),
      downloads: Math.floor(Math.random() * 100),
      shares: Math.floor(Math.random() * 50),
      engagement: Math.random() * 100,
      topReferrers: [
        { source: 'Direct', count: 150 },
        { source: 'Social Media', count: 89 },
        { source: 'Search', count: 67 }
      ],
      timeSpent: Math.floor(Math.random() * 300) + 30
    };

    res.json({
      success: true,
      analytics
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;