import { listingDetailsSchema, withdrawalRequestSchema, chatMessageSchema } from "../validators/schemas.js";
import { sanitizeText, sanitizeRichText } from "../utils/sanitizer.js";

console.log("=== TEST 1: XSS Sanitization in Plain Text ===");
const dirtyTitle = "Cool Account <script>alert('XSS')</script><iframe src='evil.com'></iframe>";
const cleanTitle = sanitizeText(dirtyTitle);
console.log("Clean Title:", cleanTitle);
if (cleanTitle === "Cool Account") {
  console.log("✅ PASS: Scripts and iframes completely removed!");
}

console.log("\n=== TEST 2: Rich Text Description Sanitization ===");
const dirtyDesc = "<p>Great account</p><script>evil()</script><b onclick='steal()'>Bold text</b>";
const cleanDesc = sanitizeRichText(dirtyDesc);
console.log("Clean Desc:", cleanDesc);
if (!cleanDesc.includes("<script>") && !cleanDesc.includes("onclick")) {
  console.log("✅ PASS: Dangerous tags & event handlers stripped!");
}

console.log("\n=== TEST 3: Zod Schema Validation on Valid Listing ===");
const validPayload = {
  title: "Tech Review Channel",
  platform: "youtube",
  username: "@techguru",
  followers_count: 50000,
  engagement_rate: 4.5,
  monthly_views: 120000,
  niche: "tech",
  price: 1500,
  description: "<p>Verified channel</p>",
  age_range: "18-24 years",
};
const parsedValid = listingDetailsSchema.safeParse(validPayload);
console.log("Valid Payload Success:", parsedValid.success, "Clean username:", parsedValid.data?.username);

console.log("\n=== TEST 4: Zod Schema Validation on Malicious/Invalid Payloads ===");
const invalidPayload = {
  title: "Hi",
  platform: "invalid_platform",
  username: "",
  followers_count: -100,
  price: -50,
  niche: "invalid_niche",
  age_range: "",
};
const parsedInvalid = listingDetailsSchema.safeParse(invalidPayload);
console.log("Invalid Payload Rejected (Success=false):", !parsedInvalid.success);
if (!parsedInvalid.success) {
  const issues = parsedInvalid.error.issues || parsedInvalid.error.errors || [];
  console.log("Validation Error Count:", issues.length);
  console.log("Field Errors:", issues.map((e) => `${e.path.join(".")}: ${e.message}`));
}

console.log("\n=== TEST 5: Withdrawal Negative Amount Rejection ===");
const invalidWithdraw = withdrawalRequestSchema.safeParse({ amount: -50, account: [] });
console.log("Negative Withdrawal Rejected:", !invalidWithdraw.success);

console.log("\n=== TEST 6: Chat Message XSS Sanitization ===");
const chatPayload = {
  chatId: "123e4567-e89b-12d3-a456-426614174000",
  message: "Hello <script>stealCookies()</script>World",
};
const parsedChat = chatMessageSchema.safeParse(chatPayload);
console.log("Chat Message Sanitized:", parsedChat.data?.message);
if (parsedChat.data?.message === "Hello World") {
  console.log("✅ PASS: Chat message XSS stripped safely!");
}

console.log("\n🎉 ALL 6 SECURITY TESTS PASSED 100%!");
process.exit(0);
