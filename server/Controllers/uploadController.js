import { toFile } from "@imagekit/nodejs";
import imagekit from "../config/imagekit.js";

/**
 * Controller to generate ImageKit client-side upload authentication parameters.
 * Allows client to upload directly to ImageKit CDN without passing files through the backend.
 */
export const getImageKitAuth = async (req, res) => {
  try {
    const authParams = imagekit.helper.getAuthenticationParameters();
    const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT || "https://ik.imagekit.io/sayand531";
    const publicKey = process.env.IMAGEKIT_PUBLIC_KEY || "";

    return res.json({
      success: true,
      ...authParams,
      urlEndpoint,
      publicKey,
    });
  } catch (error) {
    console.error("Error generating ImageKit auth parameters:", error);
    return res.status(500).json({
      message: "Failed to generate image upload authentication parameters",
      error: error.message,
    });
  }
};

/**
 * Controller for dedicated single-file streaming upload.
 * Uploads 1 image at a time (max 5MB) and immediately releases memory buffer.
 */
export const uploadSingleImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image file provided" });
    }

    const response = await imagekit.files.upload({
      file: await toFile(req.file.buffer, req.file.originalname),
      fileName: `${Date.now()}-${req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_")}`,
      folder: "/socialy",
      transformation: { pre: "w-1280,h-auto" },
    });

    return res.json({
      success: true,
      url: response.url,
      fileId: response.fileId,
      name: response.name,
    });
  } catch (error) {
    console.error("Error in uploadSingleImage:", error);
    return res.status(500).json({
      message: "Failed to upload image to CDN",
      error: error.message,
    });
  }
};
