import clerkClient from "../config/clerk.js";

const resolveAuth = async (req) => {
  try {
    if (typeof req.auth === "function") {
      return await req.auth();
    }
    return req.auth || {};
  } catch {
    return {};
  }
};

export const protect = async (req, res, next) => {
  try {
    const authData = await resolveAuth(req);
    const userId = authData?.userId;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    req.userId = userId;
    req.authData = authData;

    const has = authData?.has;
    const hasPremiumPlan = has ? await has({ plan: "premium" }) : false;
    req.plan = hasPremiumPlan ? "premium" : "free";

    return next();
  } catch (error) {
    console.log(error);
    res.status(401).json({
      message: error.code || error.message || "Unauthorized",
    });
  }
};

export const requireAdmin = async (req, res, next) => {
  try {
    const authData = await resolveAuth(req);
    const userId = authData?.userId;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const sessionClaims = authData?.sessionClaims;
    let role = sessionClaims?.metadata?.role || sessionClaims?.publicMetadata?.role;

    // Fallback: Query Clerk user record directly
    if (!role) {
      const clerkUser = await clerkClient.users.getUser(userId);
      role = clerkUser?.publicMetadata?.role;
    }

    if (role !== "admin") {
      return res.status(403).json({
        message: "Forbidden: Admin privileges required to access this resource",
      });
    }

    req.isAdmin = true;
    return next();
  } catch (error) {
    console.error("Require admin check failed:", error);
    return res.status(403).json({
      message: error.message || "Forbidden: Admin privileges required",
    });
  }
};
