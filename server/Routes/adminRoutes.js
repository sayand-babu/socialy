import express from "express";
import {
  getAdminDashboard,
  getUnverifiedCredentials,
  verifyCredential,
  getPendingCredentialChanges,
  changeCredential,
  getAllAdminListings,
  updateAdminListingStatus,
  getAllAdminTransactions,
  getAllAdminWithdrawals,
  approveWithdrawal,
} from "../Controllers/adminController.js";
import { requireAdmin } from "../Middlewares/authMiddleware.js";

const adminRouter = express.Router();

// Role check endpoint for frontend guards
adminRouter.get("/check-role", requireAdmin, (req, res) => {
  return res.json({ isAdmin: true, role: "admin" });
});

adminRouter.get("/dashboard", requireAdmin, getAdminDashboard);

adminRouter.get("/credentials/unverified", requireAdmin, getUnverifiedCredentials);
adminRouter.post("/credentials/verify", requireAdmin, verifyCredential);

adminRouter.get("/credentials/change", requireAdmin, getPendingCredentialChanges);
adminRouter.post("/credentials/change", requireAdmin, changeCredential);

adminRouter.get("/listings", requireAdmin, getAllAdminListings);
adminRouter.put("/listings/:id/status", requireAdmin, updateAdminListingStatus);

adminRouter.get("/transactions", requireAdmin, getAllAdminTransactions);

adminRouter.get("/withdrawals", requireAdmin, getAllAdminWithdrawals);
adminRouter.put("/withdrawals/:id/approve", requireAdmin, approveWithdrawal);

export default adminRouter;
