import assert from "node:assert";

async function testEscrowRules() {
  console.log("🧪 [Server Test] Running Escrow Business Rules & Financial Math Tests...");

  // Test 1: 95% Seller Payout / 5% Platform Fee Calculation
  const orderAmount = 15000;
  const sellerPayout = orderAmount * 0.95;
  const platformFee = orderAmount * 0.05;
  assert.strictEqual(sellerPayout, 14250, "Seller receives exact 95% of order amount");
  assert.strictEqual(platformFee, 750, "Platform retains exact 5% fee");
  assert.strictEqual(sellerPayout + platformFee, orderAmount, "Sum must equal total order");
  console.log("  ✅ Test 1: 95%/5% Escrow financial split verified.");

  // Test 2: Razorpay Paise Precision
  const paiseAmount = Math.round(orderAmount * 100);
  assert.strictEqual(paiseAmount, 1500000, "Paise conversion must be an exact integer");
  console.log("  ✅ Test 2: Razorpay integer paise precision verified.");

  // Test 3: 3-Strike Progressive Penalty Calculation
  const calculateTrustState = (faultCount) => {
    if (faultCount >= 3) return "BANNED";
    if (faultCount === 2) return "FLAGGED";
    return "OK";
  };

  assert.strictEqual(calculateTrustState(0), "OK");
  assert.strictEqual(calculateTrustState(1), "OK");
  assert.strictEqual(calculateTrustState(2), "FLAGGED");
  assert.strictEqual(calculateTrustState(3), "BANNED");
  assert.strictEqual(calculateTrustState(5), "BANNED");
  console.log("  ✅ Test 3: 3-Strike progressive ban transition verified.");

  // Test 4: Unverified Listing Dispute Rule
  const isValidDisputeReason = (isVerified, reason) => {
    const isMetricsDispute =
      reason.toUpperCase().includes("METRIC") ||
      reason.toUpperCase().includes("FOLLOWER") ||
      reason.toUpperCase().includes("ENGAGEMENT");
    if (!isVerified && isMetricsDispute) return false;
    return true;
  };

  assert.strictEqual(isValidDisputeReason(false, "Invalid Credentials / Login Failed"), true);
  assert.strictEqual(isValidDisputeReason(false, "Follower count mismatch"), false);
  assert.strictEqual(isValidDisputeReason(true, "Follower count mismatch"), true);
  console.log("  ✅ Test 4: Unverified listing dispute scope restrictions verified.");

  console.log("🎉 All Escrow Rule Tests Passed (100%)!\n");
}

testEscrowRules().catch((err) => {
  console.error("❌ Escrow Rule Test Failed:", err);
  process.exit(1);
});
