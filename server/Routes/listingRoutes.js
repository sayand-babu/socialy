import express from "express";
import multer from "multer";
import {
	addCredential,
	addListing,
	confirmEscrowRelease,
	confirmHandover,
	raiseEscrowDispute,
	submitSellerDisputeResponse,
	appealDispute,
	deleteUserListing,
	getAllPublicListing,
	getAllUserListing,
	getAllUserOrders,
	getListingById,
	markFeatured,
	toggleStatus,
	updateListing,
	withdrawAmount,
} from "../Controllers/listingController.js";
import { protect } from "../Middlewares/authMiddleware.js";
import { disputeRateLimiter } from "../Middlewares/securityMiddleware.js";
import { validateBody, validateMultipartJson } from "../Middlewares/validateMiddleware.js";
import {
	listingDetailsSchema,
	credentialSubmissionSchema,
	withdrawalRequestSchema,
} from "../validators/schemas.js";

const listingRouter = express.Router();
const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max per image
});

listingRouter.post(
	"/",
	upload.array("images", 5),
	protect,
	validateMultipartJson(listingDetailsSchema),
	addListing
);

listingRouter.put(
	"/",
	upload.array("images", 5),
	protect,
	validateMultipartJson(listingDetailsSchema),
	updateListing
);

listingRouter.get("/public", getAllPublicListing);
listingRouter.get("/user", protect, getAllUserListing);
listingRouter.get("/user-orders", protect, getAllUserOrders);
listingRouter.get("/:id", getListingById);

// Escrow lifecycle actions (buyer & seller)
listingRouter.post("/transactions/:id/confirm", protect, confirmEscrowRelease);
listingRouter.post("/transactions/:id/dispute", protect, disputeRateLimiter, raiseEscrowDispute);
listingRouter.post("/transactions/:id/seller-response", protect, disputeRateLimiter, submitSellerDisputeResponse);
listingRouter.post("/transactions/:id/appeal", protect, disputeRateLimiter, appealDispute);
listingRouter.post("/:id/confirm-handover", protect, confirmHandover);
listingRouter.put("/:id/status", protect, toggleStatus);
listingRouter.delete("/:id", protect, deleteUserListing);

listingRouter.post(
	"/add-credential",
	protect,
	validateBody(credentialSubmissionSchema),
	addCredential
);

listingRouter.put("/featured/:id", protect, markFeatured);

listingRouter.post(
	"/withdraw",
	protect,
	validateBody(withdrawalRequestSchema),
	withdrawAmount
);

export default listingRouter;
