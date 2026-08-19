import { z } from "zod";
import { sanitizeText, sanitizeRichText } from "../utils/sanitizer.js";

// Valid platform and niche enums matching Prisma schema
export const platformsEnum = z.enum([
  "youtube",
  "instagram",
  "tiktok",
  "facebook",
  "twitter",
  "linkedin",
  "pinterest",
  "snapchat",
  "twitch",
  "discord",
]);

export const nichesEnum = z.enum([
  "lifestyle",
  "fitness",
  "food",
  "travel",
  "tech",
  "gaming",
  "fashion",
  "beauty",
  "business",
  "education",
  "entertainment",
  "music",
  "art",
  "sports",
  "health",
  "finance",
  "other",
]);

/**
 * Schema for creating and updating listings
 */
export const listingDetailsSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(100, "Title cannot exceed 100 characters")
    .transform(sanitizeText),
  platform: z
    .string()
    .transform((val) => val.toLowerCase())
    .pipe(platformsEnum),
  username: z
    .string()
    .min(1, "Username is required")
    .max(60, "Username cannot exceed 60 characters")
    .transform((val) => sanitizeText(val.startsWith("@") ? val.slice(1) : val)),
  followers_count: z.coerce
    .number({ invalid_type_error: "Followers count must be a number" })
    .min(0, "Followers cannot be negative"),
  engagement_rate: z.coerce
    .number({ invalid_type_error: "Engagement rate must be a number" })
    .min(0, "Engagement rate cannot be negative")
    .max(1000, "Engagement rate is unusually high")
    .optional()
    .default(0),
  monthly_views: z.coerce
    .number({ invalid_type_error: "Monthly views must be a number" })
    .min(0, "Monthly views cannot be negative")
    .optional()
    .default(0),
  niche: z
    .string()
    .transform((val) => val.toLowerCase())
    .pipe(nichesEnum),
  price: z.coerce
    .number({ invalid_type_error: "Price must be a number" })
    .min(1, "Price must be at least $1")
    .max(10000000, "Price exceeds maximum threshold of $10,000,000"),
  description: z
    .string()
    .optional()
    .default("")
    .transform(sanitizeRichText),
  country: z
    .string()
    .optional()
    .default("")
    .transform(sanitizeText),
  age_range: z
    .string()
    .min(1, "Audience age range is required")
    .transform(sanitizeText),
  verified: z.coerce.boolean().optional().default(false),
  monetized: z.coerce.boolean().optional().default(false),
  id: z.string().optional(),
});

/**
 * Schema for escrow credential submission & changes
 */
export const credentialSubmissionSchema = z.object({
  listingId: z.string().uuid("Invalid listing ID format"),
  credential: z
    .array(
      z.object({
        id: z.string().optional(),
        name: z
          .string()
          .min(1, "Field name is required")
          .transform(sanitizeText),
        type: z
          .enum(["text", "password", "email", "file", "select"])
          .default("text"),
        value: z.string().min(1, "Field value cannot be empty"),
      })
    )
    .min(1, "At least one credential field is required"),
});

/**
 * Schema for withdrawal payout requests
 */
export const withdrawalRequestSchema = z.object({
  amount: z.coerce
    .number({ invalid_type_error: "Amount must be a number" })
    .min(1, "Withdrawal amount must be at least $1"),
  account: z
    .array(
      z.object({
        name: z.string().min(1).transform(sanitizeText),
        value: z.string().min(1).transform(sanitizeText),
      })
    )
    .min(1, "Bank account details are required"),
});

/**
 * Schema for chat messaging
 */
export const chatMessageSchema = z.object({
  chatId: z.string().uuid("Invalid chat ID format"),
  message: z
    .string()
    .min(1, "Message cannot be empty")
    .max(2000, "Message cannot exceed 2000 characters")
    .transform(sanitizeText),
});
