import { Router, type IRouter, type Request } from "express";
import multer from "multer";
import {
  isCloudinaryConfigured,
  uploadBufferToCloudinary,
} from "../lib/cloudinary";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();
type UploadedRequest = Request & {
  file?: {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
  };
};
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024,
  },
});

router.post(
  "/uploads",
  requireAuth,
  upload.single("file"),
  async (req, res): Promise<void> => {
    if (!isCloudinaryConfigured()) {
      res.status(503).json({
        error:
          "Cloudinary is not configured yet. Add CLOUDINARY_CLOUD_NAME to the backend environment.",
      });
      return;
    }

    const uploadedReq = req as UploadedRequest;

    if (!uploadedReq.file) {
      res.status(400).json({ error: "A file is required." });
      return;
    }

    const folder =
      typeof req.body.folder === "string" ? req.body.folder : undefined;
    const asset = await uploadBufferToCloudinary({
      buffer: uploadedReq.file.buffer,
      folder,
    });

    res.status(201).json({
      asset,
      originalName: uploadedReq.file.originalname,
      mimeType: uploadedReq.file.mimetype,
    });
  },
);

export default router;
