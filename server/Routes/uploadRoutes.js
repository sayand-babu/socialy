import express from "express";
import multer from "multer";
import { getImageKitAuth, uploadSingleImage } from "../Controllers/uploadController.js";
import { protect } from "../Middlewares/authMiddleware.js";

const uploadRouter = express.Router();

// 5MB limit for single image streaming
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Endpoint for client-side direct ImageKit signed authentication
uploadRouter.get("/auth", getImageKitAuth);

// Dedicated decoupled single-image upload endpoint
uploadRouter.post("/image", protect, upload.single("image"), uploadSingleImage);

export default uploadRouter;
