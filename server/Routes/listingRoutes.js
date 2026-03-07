import express from "express";

const listingRouter = express.Router();

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

listingRouter.post("/purchase-account/:listingId", protect, purchaseAccount);

export default listingRouter;
