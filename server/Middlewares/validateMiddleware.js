import { ZodError } from "zod";

/**
 * Express middleware to validate req.body against a Zod schema.
 * @param {import("zod").ZodSchema} schema - Zod schema to validate against
 */
export const validateBody = (schema) => (req, res, next) => {
  try {
    const parsed = schema.parse(req.body);
    req.body = parsed;
    return next();
  } catch (error) {
    if (error instanceof ZodError) {
      const issues = error.issues || error.errors || [];
      const formattedErrors = issues.map((err) => ({
        field: (err.path || []).join("."),
        message: err.message,
      }));

      return res.status(400).json({
        message: formattedErrors[0]?.message || "Validation failed",
        errors: formattedErrors,
      });
    }
    return res.status(400).json({ message: "Invalid request payload" });
  }
};

/**
 * Express middleware to validate JSON embedded in a multipart form field (e.g. req.body.accountDetails).
 * @param {import("zod").ZodSchema} schema - Zod schema to validate against
 * @param {string} [fieldName="accountDetails"] - The multipart form field containing JSON
 */
export const validateMultipartJson = (schema, fieldName = "accountDetails") => (req, res, next) => {
  try {
    let target = req.body?.[fieldName] || req.body;
    if (!target || (typeof target === "object" && Object.keys(target).length === 0)) {
      return res.status(400).json({ message: `Missing required field: ${fieldName}` });
    }

    if (typeof target === "string") {
      try {
        target = JSON.parse(target);
      } catch {
        return res.status(400).json({ message: `Invalid JSON format in ${fieldName}` });
      }
    }

    const validated = schema.parse(target);
    req.validatedData = validated;
    return next();
  } catch (error) {
    if (error instanceof ZodError) {
      const issues = error.issues || error.errors || [];
      const formattedErrors = issues.map((err) => ({
        field: (err.path || []).join("."),
        message: err.message,
      }));

      return res.status(400).json({
        message: formattedErrors[0]?.message || "Validation failed",
        errors: formattedErrors,
      });
    }
    return res.status(400).json({ message: "Invalid form payload" });
  }
};
