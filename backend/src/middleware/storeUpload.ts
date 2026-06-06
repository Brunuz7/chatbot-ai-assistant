import multer from 'multer';
import { ALLOWED_MIMES, MAX_IMAGE_BYTES } from '../services/CloudinaryService.js';

export const storeImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES },
  fileFilter: (_req, file, cb) => {
    cb(null, ALLOWED_MIMES.has(file.mimetype));
  },
});
