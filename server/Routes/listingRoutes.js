import express from "express";
import multer from "multer";
import {
	addCredential,
	addListing,
	deleteUserListing,
	getAllPublicListing,
	getAllUserListing,
	getAllUserOrders,
	markFeatured,
	toggleStatus,
	updateListing,
	withdrawAmount,
} from "../Controllers/listingController.js";
import { protect } from "../Middlewares/authMiddleware.js";

const listingRouter = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

listingRouter.post("/", upload.array("images", 5), protect, addListing);
listingRouter.put("/", upload.array("images", 5), protect, updateListing);

listingRouter.get("/public", getAllPublicListing);
listingRouter.get("/user", protect, getAllUserListing);

listingRouter.put("/:id/status", protect, toggleStatus);
listingRouter.delete("/:listingid", protect, deleteUserListing);

listingRouter.post("/add-credential", protect, addCredential);
listingRouter.put("/featured/:id", protect, markFeatured);

listingRouter.get("/user-orders", protect, getAllUserOrders);

listingRouter.post("/withdraw", protect, withdrawAmount);

export default listingRouter;
