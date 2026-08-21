import { generateText } from "../config/gemini.js";

/**
 * Common regex patterns for off-platform contact and payment evasion
 */
const PHONE_REGEX = /(\+?91[\s-]?)?[6789]\d{9}|\b\d{5}[\s-]\d{5}\b|\b\d{3}[\s-]\d{3}[\s-]\d{4}\b/g;
const WORD_NUMBER_REGEX = /\b(zero|one|two|three|four|five|six|seven|eight|nine)\s+(zero|one|two|three|four|five|six|seven|eight|nine)\s+(zero|one|two|three|four|five|six|seven|eight|nine)/i;
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
const UPI_REGEX = /\b[a-zA-Z0-9.\-_]{2,40}@(okaxis|okhdfcbank|okicici|oksbi|paytm|ybl|ibl|upi|axl|apl|barodampay|postbank|idfcbank|waaxis|kotak|allbank)\b/gi;
const GENERIC_UPI_REGEX = /\b[a-zA-Z0-9.\-_]{3,30}@(upi|paytm)\b/gi;
const IFSC_REGEX = /\b[A-Z]{4}0[A-Z0-9]{6}\b/g;
const URL_REGEX = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|\b(bit\.ly|tinyurl\.com|t\.me|wa\.me|discord\.gg|cutt\.ly|rb\.gy)\/[^\s]+/i;

/**
 * Prohibited off-platform payment & evasion keywords (Immediate Block)
 */
const PAYMENT_KEYWORDS = [
  "gpay",
  "google pay",
  "googlepay",
  "phonepe",
  "phone pe",
  "paytm",
  "paypal",
  "crypto",
  "usdt",
  "bitcoin",
  "btc",
  "ethereum",
  "eth",
  "binance",
  "wire transfer",
  "bank transfer",
  "direct transfer",
  "direct payment",
  "pay direct",
  "pay outside",
  "pay offline",
  "bypass escrow",
  "skip escrow",
  "without escrow",
  "avoid escrow",
  "avoid fee",
  "skip fee",
  "without fee",
  "cash on delivery",
  "pay me on",
  "send to my",
];

/**
 * Prohibited off-platform social redirects & contact harvesting (Immediate Block)
 */
const OFF_PLATFORM_KEYWORDS = [
  "dm me on",
  "text me on",
  "message me on",
  "call me on",
  "talk on insta",
  "talk on instagram",
  "talk on whatsapp",
  "talk on telegram",
  "reach me at",
  "contact me at",
  "connect on whatsapp",
  "connect on telegram",
  "connect on insta",
  "whatsapp me",
  "telegram me",
  "dm on insta",
  "dm on ig",
  "dm on telegram",
  "dm on whatsapp",
  "send your number",
  "share your number",
  "your whatsapp",
  "your phone number",
  "your mobile number",
  "your contact number",
];

/**
 * High-pressure / Coercive scam tactics (Immediate Block)
 */
const PRESSURE_KEYWORDS = [
  "pay now or i sell",
  "sell to someone else",
  "pay immediately or",
  "send money now or",
  "deal cancels in 5 min",
  "hurry up and pay outside",
];

/**
 * Phishing & Impersonation keywords (Immediate Block)
 */
const PHISHING_KEYWORDS = [
  "socialy admin",
  "socialy support",
  "socialy team",
  "socialy official",
  "send your otp",
  "share your otp",
  "give me otp",
  "send password",
  "share password",
  "give password",
];

/**
 * Profanity & Abusive Language Blocklist (Immediate Block)
 */
const PROFANITY_KEYWORDS = [
  "fuck",
  "f**k",
  "bitch",
  "asshole",
  "bastard",
  "idiot",
  "scammer",
  "fraudster",
  "madarchod",
  "behenchod",
  "chutiya",
  "bhosdike",
  "lauda",
  "lodu",
  "gandu",
  "harami",
];

/**
 * Mask sensitive values like phone numbers or emails for safe display
 */
export const maskSensitiveData = (text) => {
  if (!text) return "";
  let masked = text;
  masked = masked.replace(PHONE_REGEX, (match) => match.slice(0, 2) + "******" + match.slice(-2));
  masked = masked.replace(EMAIL_REGEX, (match) => {
    const parts = match.split("@");
    return parts[0].slice(0, 2) + "***@" + parts[1];
  });
  masked = masked.replace(UPI_REGEX, (match) => match.slice(0, 3) + "***@upi");
  return masked;
};

/**
 * Layer 1: Fast Rule-Based / Regex Threat Evaluation
 * @param {string} text - Message text to inspect
 * @returns {{ isClean: boolean, action: 'ALLOW' | 'BLOCK' | 'SUSPICIOUS', reason?: string, flag?: string }}
 */
export const evaluateRules = (text) => {
  if (!text || typeof text !== "string") {
    return { isClean: true, action: "ALLOW" };
  }

  // Normalize text for matching (lowercase, remove excess whitespace and common evasion quotes/punctuation)
  const normalized = text
    .toLowerCase()
    .replace(/["'“”‘’]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // 1. Check for Profanity / Abusive language
  for (const profanity of PROFANITY_KEYWORDS) {
    if (normalized.includes(profanity)) {
      return {
        isClean: false,
        action: "BLOCK",
        flag: "ABUSIVE_LANGUAGE",
        reason: "Your message was blocked because it contains abusive or prohibited language.",
      };
    }
  }

  // 2. Check for Payment / Escrow Bypass Keywords
  for (const paymentWord of PAYMENT_KEYWORDS) {
    if (normalized.includes(paymentWord)) {
      return {
        isClean: false,
        action: "BLOCK",
        flag: "OFF_PLATFORM_PAYMENT",
        reason: `Your message was blocked because it mentions off-platform payment ("${paymentWord}"). All transactions must be completed securely via Socialy Escrow.`,
      };
    }
  }

  // 3. Check for External URLs / Link sharing
  if (URL_REGEX.test(text)) {
    return {
      isClean: false,
      action: "BLOCK",
      flag: "EXTERNAL_LINK_BLOCKED",
      reason: "Sharing external links or short URLs is blocked to protect users from malicious sites and scams.",
    };
  }

  // 4. Check for Off-Platform Contact Redirects
  for (const redirectPhrase of OFF_PLATFORM_KEYWORDS) {
    if (normalized.includes(redirectPhrase)) {
      return {
        isClean: false,
        action: "BLOCK",
        flag: "OFF_PLATFORM_REDIRECT",
        reason: `Your message was blocked because it attempts to take communications off-platform ("${redirectPhrase}"). Please keep all discussions on Socialy to maintain escrow protection.`,
      };
    }
  }

  // 5. Check for Social Media Handles with '@' and off-platform terms
  if (/@\w+/.test(text) && (normalized.includes("insta") || normalized.includes("ig") || normalized.includes("telegram") || normalized.includes("dm"))) {
    return {
      isClean: false,
      action: "BLOCK",
      flag: "SOCIAL_HANDLE_SHARED",
      reason: "Sharing personal social media handles for off-platform communication is not permitted.",
    };
  }

  // 6. Check for High-Pressure / Coercion Tactics
  for (const pressurePhrase of PRESSURE_KEYWORDS) {
    if (normalized.includes(pressurePhrase)) {
      return {
        isClean: false,
        action: "BLOCK",
        flag: "PRESSURE_COERCION",
        reason: "Your message was blocked because aggressive pressure tactics violate community safety guidelines.",
      };
    }
  }

  // 7. Check for Phishing / Impersonation
  for (const phish of PHISHING_KEYWORDS) {
    if (normalized.includes(phish)) {
      return {
        isClean: false,
        action: "BLOCK",
        flag: "PHISHING_IMPERSONATION",
        reason: "Sharing passwords, OTPs, or impersonating Socialy support is strictly forbidden.",
      };
    }
  }

  // 8. Check for UPI IDs or Bank IFSC
  if (UPI_REGEX.test(text) || GENERIC_UPI_REGEX.test(text)) {
    return {
      isClean: false,
      action: "BLOCK",
      flag: "PAYMENT_HANDLE_SHARED",
      reason: "Sharing personal UPI IDs in chat is prohibited for your safety. Transactions must be completed via Socialy Escrow.",
    };
  }

  if (IFSC_REGEX.test(text)) {
    return {
      isClean: false,
      action: "BLOCK",
      flag: "BANK_DETAILS_SHARED",
      reason: "Sharing bank account details or IFSC codes in chat is strictly restricted. Use the secure escrow checkout.",
    };
  }

  // 9. Check for Direct Phone Numbers
  if (PHONE_REGEX.test(text) || WORD_NUMBER_REGEX.test(text)) {
    return {
      isClean: false,
      action: "BLOCK",
      flag: "PHONE_NUMBER_SHARED",
      reason: "Sharing phone numbers is blocked to prevent off-platform scams and protect your warranty.",
    };
  }

  // 10. Check for Emails
  if (EMAIL_REGEX.test(text)) {
    return {
      isClean: false,
      action: "BLOCK",
      flag: "EMAIL_SHARED",
      reason: "Sharing personal emails is not permitted in direct chat. Keep all deal communications on Socialy.",
    };
  }

  return { isClean: true, action: "ALLOW" };
};

/**
 * Layer 2: Contextual AI Scam Classification (Gemini)
 * Used as an additional layer for subtle evasions.
 * @param {string} text - Message text
 * @returns {Promise<{ action: 'ALLOW' | 'BLOCK', reason?: string }>}
 */
export const evaluateWithAI = async (text) => {
  try {
    const prompt = `You are a strict security and anti-fraud classifier for Socialy, an escrow marketplace for social media accounts.
Analyze the following user chat message between a buyer and seller.
Determine if the user is trying to:
1. Bypass platform escrow or platform fee
2. Pay or trade off-platform (GPay, PhonePe, cash, wire, crypto, external payment)
3. Solicit personal contact info (WhatsApp, phone, email, Telegram, external social accounts)
4. Impersonate admin, harvest credentials, or phish OTP/passwords
5. Coerce, threaten, harass, or pressure the user into an unverified deal

Message to analyze:
"""${text}"""

Respond ONLY with valid JSON in this exact structure:
{
  "isSafe": true | false,
  "action": "ALLOW" | "BLOCK",
  "riskLevel": "LOW" | "MEDIUM" | "HIGH",
  "reason": "Short 1-sentence user-friendly explanation if blocked, otherwise empty"
}`;

    const rawResponse = await generateText(prompt, { temperature: 0.1, maxOutputTokens: 200 });
    if (!rawResponse) {
      return { action: "ALLOW" };
    }

    const cleaned = rawResponse.replace(/```json/gi, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    if (parsed.action === "BLOCK" || parsed.isSafe === false) {
      return {
        action: "BLOCK",
        reason: parsed.reason || "This message violates Socialy Escrow safety policies.",
      };
    }

    return { action: "ALLOW" };
  } catch (error) {
    console.warn("⚠️ [ScamShield AI fallback warning]:", error.message);
    return { action: "ALLOW" };
  }
};

/**
 * Master Shield Inspector
 * @param {string} text - User message
 * @returns {Promise<{ allowed: boolean, reason?: string, flag?: string }>}
 */
export const inspectMessage = async (text) => {
  // Layer 1: Rule-Based & Regex inspection (<1ms)
  const ruleResult = evaluateRules(text);

  if (ruleResult.action === "BLOCK") {
    return {
      allowed: false,
      reason: ruleResult.reason,
      flag: ruleResult.flag,
    };
  }

  // Layer 2: AI Check only if marked as suspicious by fuzzy rule match
  if (ruleResult.action === "SUSPICIOUS") {
    const aiResult = await evaluateWithAI(text);
    if (aiResult.action === "BLOCK") {
      return {
        allowed: false,
        reason: aiResult.reason,
        flag: "AI_DETECTED_RISK",
      };
    }
  }

  return { allowed: true };
};

export default {
  evaluateRules,
  evaluateWithAI,
  inspectMessage,
  maskSensitiveData,
};
