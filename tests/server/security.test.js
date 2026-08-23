import assert from "node:assert";
import { evaluateRules, maskSensitiveData } from "../../server/utils/scamShield.js";
import { sanitizeText } from "../../server/utils/sanitizer.js";

async function testSecurityUtilities() {
  console.log("🧪 [Server Test] Running Security & ScamShield Tests...");

  // Test 1: ScamShield Evaluation of Safe Message
  const cleanMessage = "Hello, is this YouTube channel still active?";
  const safeResult = evaluateRules(cleanMessage);
  assert.strictEqual(safeResult.action, "ALLOW", "Clean text should be allowed");
  console.log("  ✅ Test 1: Clean text passed ScamShield rule evaluation.");

  // Test 2: Off-Platform Contact & Direct Payment Block
  const leakMessage = "Message me on WhatsApp at +91 9876543210 or pay direct via GPay";
  const leakResult = evaluateRules(leakMessage);
  assert.strictEqual(leakResult.action, "BLOCK", "Contact sharing & direct payment must be blocked");
  console.log("  ✅ Test 2: ScamShield off-platform leak blocking verified.");

  // Test 3: Sensitive Data Masking
  const masked = maskSensitiveData("My phone is 9876543210 and my email is test@gmail.com");
  assert.ok(masked.includes("******"), "Sensitive phone digits must be masked");
  assert.ok(masked.includes("***@"), "Sensitive email username must be masked");
  console.log("  ✅ Test 3: Sensitive data masking verified.");

  // Test 4: HTML Sanitization against XSS
  const maliciousInput = '<script>alert("XSS")</script>Premium <b>Gaming</b> Account';
  const sanitized = sanitizeText(maliciousInput);
  assert.strictEqual(sanitized.includes("<script>"), false, "Script tags must be stripped");
  console.log("  ✅ Test 4: XSS tag stripping verified.");

  console.log("🎉 All Security Utility Tests Passed (100%)!\n");
}

testSecurityUtilities().catch((err) => {
  console.error("❌ Security Test Failed:", err);
  process.exit(1);
});
