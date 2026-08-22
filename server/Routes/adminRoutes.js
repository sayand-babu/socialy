import express from "express";
import {
  getAdminDashboard,
  getUnverifiedCredentials,
  verifyCredential,
  rejectListingCredential,
  flagListingFraud,
  getPendingCredentialChanges,
  changeCredential,
  getAllAdminListings,
  updateAdminListingStatus,
  getAllAdminTransactions,
  getAllAdminWithdrawals,
  approveWithdrawal,
  getAllAdminDisputes,
  resolveDispute,
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
adminRouter.post("/credentials/reject", requireAdmin, rejectListingCredential);
adminRouter.post("/credentials/flag", requireAdmin, flagListingFraud);

adminRouter.get("/credentials/change", requireAdmin, getPendingCredentialChanges);
adminRouter.post("/credentials/change", requireAdmin, changeCredential);

adminRouter.get("/listings", requireAdmin, getAllAdminListings);
adminRouter.put("/listings/:id/status", requireAdmin, updateAdminListingStatus);

adminRouter.get("/transactions", requireAdmin, getAllAdminTransactions);

adminRouter.get("/withdrawals", requireAdmin, getAllAdminWithdrawals);
adminRouter.put("/withdrawals/:id/approve", requireAdmin, approveWithdrawal);

adminRouter.get("/disputes", requireAdmin, getAllAdminDisputes);
adminRouter.post("/disputes/:id/resolve", requireAdmin, resolveDispute);

export default adminRouter;
