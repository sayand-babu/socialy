import clerkClient from "../config/clerk.js";

export const protect = async (req, res, next) => {
  try {
    const { userId, has } = await req.auth();

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

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
    const { userId, sessionClaims } = await req.auth();

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Check sessionClaims first
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
