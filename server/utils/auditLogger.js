/**
 * Security & Escrow Audit Trail Logger
 */

/**
 * Mask sensitive data like tokens, passwords, keys
 */
const maskSensitiveData = (obj) => {
  if (!obj || typeof obj !== "object") return obj;

  const masked = { ...obj };
  const sensitiveKeys = ["password", "token", "secret", "originalCredential", "credentials", "auth"];

  for (const key of Object.keys(masked)) {
    if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
      masked[key] = "******** [REDACTED]";
    } else if (typeof masked[key] === "object") {
      masked[key] = maskSensitiveData(masked[key]);
    }
  }

  return masked;
};

/**
 * Log a structured security or escrow audit event
 * @param {object} param0 - Event attributes
 */
export const logAuditEvent = ({
  action, // e.g. "CREDENTIAL_VIEW_BUYER", "ADMIN_VERIFY_LISTING", "DISPUTE_UPHELD_REFUND"
  userId, // ID of the user performing the action
  targetId, // Transaction ID or Listing ID
  ip, // IP address of request
  details = {}, // Additional context
  status = "SUCCESS", // "SUCCESS" | "FAILED" | "BLOCKED"
}) => {
  const timestamp = new Date().toISOString();
  const sanitizedDetails = maskSensitiveData(details);

  const logEntry = {
    timestamp,
    category: "SECURITY_AUDIT",
    action,
    userId: userId || "ANONYMOUS",
    targetId: targetId || "N/A",
    ip: ip || "UNKNOWN",
    status,
    details: sanitizedDetails,
  };

  // Structured production log
  if (process.env.NODE_ENV === "production") {
    console.log(JSON.stringify(logEntry));
  } else {
    console.log(
      `🔒 [AUDIT] [${logEntry.timestamp}] [${action}] User: ${logEntry.userId} | Target: ${logEntry.targetId} | Status: ${status}`
    );
    if (Object.keys(sanitizedDetails).length > 0) {
      console.log(`   Details:`, sanitizedDetails);
    }
  }
};
