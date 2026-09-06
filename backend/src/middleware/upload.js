const multer = require('multer');

// All uploads use in-memory storage; the buffer is streamed to Vercel Blob
// by src/services/storage.js. (Disk storage does not survive on serverless.)
const memoryStorage = multer.memoryStorage();

const imageFileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed!'), false);
    }
};

// For product images (kept name `uploadDisk` for backwards compatibility).
const uploadDisk = multer({
    storage: memoryStorage,
    fileFilter: imageFileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// For audio / meeting minutes.
const uploadMemory = multer({
    storage: memoryStorage,
    limits: { fileSize: 100 * 1024 * 1024 } // 100MB
});

module.exports = {
    uploadDisk,
    uploadMemory
};
