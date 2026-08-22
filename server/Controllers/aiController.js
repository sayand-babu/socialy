import { GoogleGenAI } from "@google/genai";
import { SOCIALY_SYSTEM_INSTRUCTION } from "../utils/aiKnowledgeBase.js";

let genAIInstance = null;

const getGenAIClient = () => {
  if (!genAIInstance && process.env.GEMINI_API_KEY) {
    genAIInstance = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return genAIInstance;
};

/**
 * Handle AI chat inquiries regarding Socialy platform and escrow lifecycle
 */
export const chatWithAi = async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ message: "Message is required" });
    }

    const trimmedMessage = message.trim();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.json({
        reply: getFallbackAnswer(trimmedMessage),
        fallback: true,
      });
    }

    try {
      const ai = getGenAIClient();

      // Format conversation history for Gemini contents
      const formattedContents = [];

      if (Array.isArray(history) && history.length > 0) {
        history.slice(-8).forEach((item) => {
          if (item.text && item.role) {
            formattedContents.push({
              role: item.role === "user" ? "user" : "model",
              parts: [{ text: item.text }],
            });
          }
        });
      }

      // Append current user message
      formattedContents.push({
        role: "user",
        parts: [{ text: trimmedMessage }],
      });

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: formattedContents,
        config: {
          systemInstruction: SOCIALY_SYSTEM_INSTRUCTION,
          temperature: 0.7,
        },
      });

      const replyText =
        response.text ||
        response?.candidates?.[0]?.content?.parts?.[0]?.text ||
        "I'm here to help! Could you please clarify your question regarding Socialy or our escrow process?";

      return res.json({
        success: true,
        reply: replyText,
      });
    } catch (aiErr) {
      console.error("Gemini API Generation Error:", aiErr);
      // Return safe contextual fallback response instead of failing
      return res.json({
        success: true,
        reply: getFallbackAnswer(trimmedMessage),
        fallback: true,
      });
    }
  } catch (error) {
    console.error("AI Controller Error:", error);
    res.status(500).json({ message: error.code || error.message });
  }
};

/**
 * Contextual fallback responses for core Socialy questions
 */
function getFallbackAnswer(query) {
  const q = query.toLowerCase();

  if (q.includes("fee") || q.includes("commission") || q.includes("cut") || q.includes("charge")) {
    return "### 💰 Platform Fees & Payouts\n- **Platform Fee**: **5%** is deducted upon successful completion of the escrow transaction.\n- **Seller Payout**: You receive **95%** of the listing price.\n- **Buyer**: Pays the exact listed price with zero hidden buyer surcharges.";
  }

  if (q.includes("escrow") || q.includes("how it work") || q.includes("safeguard") || q.includes("protect")) {
    return "### 🛡️ How Socialy Escrow Works\n1. **Buyer Pays**: Payment is securely held in the platform Escrow Vault.\n2. **Instant Access**: The buyer immediately receives the AES-256 decrypted account credentials.\n3. **24-Hour Inspection Window**: The buyer has 24 hours to test login details and verify the account.\n4. **Payout Release**: If everything is functional, the buyer confirms release (or it auto-releases after 24h) and 95% payout is credited to the seller!";
  }

  if (q.includes("dispute") || q.includes("wrong password") || q.includes("invalid") || q.includes("scam")) {
    return "### ⚠️ What Happens If There's an Issue?\n- **Raising a Dispute**: During the 24-hour inspection window, a buyer can click **'Raise Dispute'** to freeze escrow payout.\n- **Unverified Accounts**: Only credential/access issues (*Invalid Credentials / Login Failed*) can be disputed.\n- **Seller Response (24h)**: The seller has 24 hours to provide counter-evidence.\n- **Dispute Upheld**: Buyer receives a **100% full refund** via Razorpay, and the seller receives a strike (+1 fault).";
  }

  if (q.includes("list") || q.includes("sell") || q.includes("handover")) {
    return "### 🚀 How to List & Sell on Socialy\n1. Go to **List Account** (`/manage-listing`).\n2. Enter account metrics (platform, handle, followers, engagement rate, monthly views, niche, price).\n3. Click **Submit Credentials** in *My Listings* and complete the **4-Point Handover Prep Checklist**.\n4. Once an order arrives, escrow handles the transaction and releases your earnings safely!";
  }

  return "### 🤖 Socialy AI Assistant\nSocialy is a secure marketplace for trading social media accounts with **Zero-Trust Escrow Protection**.\n\nYou can ask me:\n- *How does the 24-hour escrow inspection window work?*\n- *What are the platform fees and payout splits?*\n- *What happens if login credentials fail?*\n- *How do I list and transfer an account?*";
}

/**
 * Parse natural language queries into structured marketplace filters
 */
export const parseSearch = async (req, res) => {
  try {
    const { query } = req.body;
    if (!query || typeof query !== "string") {
      return res.json({ parsed: null });
    }

    const q = query.toLowerCase();
    const parsed = {};

    // Detect Platform
    const platforms = ["youtube", "instagram", "tiktok", "facebook", "twitter", "linkedin", "twitch", "discord"];
    for (const p of platforms) {
      if (q.includes(p) || (p === "instagram" && q.includes("insta")) || (p === "twitter" && q.includes("x/twitter"))) {
        parsed.platform = [p];
        break;
      }
    }

    // Detect Niche
    const niches = [
      "lifestyle", "fitness", "food", "travel", "tech", "technology", "gaming", "fashion",
      "beauty", "business", "education", "entertainment", "music", "art", "sports", "health", "finance"
    ];
    for (const n of niches) {
      if (q.includes(n)) {
        parsed.niche = n === "technology" ? "tech" : n;
        break;
      }
    }

    // Detect Max Price (e.g. "under 5000", "below 10k", "<500")
    const priceMatch = q.match(/(?:under|below|<|less than)\s*([₹$]?\s*(\d+(?:\.\d+)?)\s*(k|lakh|lac)?)/i);
    if (priceMatch) {
      let num = parseFloat(priceMatch[2]);
      if (priceMatch[3]?.toLowerCase() === "k") num *= 1000;
      if (priceMatch[3]?.toLowerCase().startsWith("la")) num *= 100000;
      if (!isNaN(num) && num > 0) parsed.maxPrice = num;
    }

    // Detect Min Followers (e.g. "more than 10k followers", "> 5k", "above 50k")
    const followersMatch = q.match(/(?:above|over|>|more than|min)\s*(\d+(?:\.\d+)?)\s*(k|m)?\s*(?:followers|subs)?/i);
    if (followersMatch) {
      let num = parseFloat(followersMatch[1]);
      if (followersMatch[2]?.toLowerCase() === "k") num *= 1000;
      if (followersMatch[2]?.toLowerCase() === "m") num *= 1000000;
      if (!isNaN(num) && num > 0) parsed.minFollowers = num;
    }

    // Detect Verified / Monetized tags
    if (q.includes("verif")) parsed.verified = true;
    if (q.includes("monetiz") || q.includes("earning")) parsed.monetized = true;

    return res.json({ success: true, parsed });
  } catch (err) {
    console.error("Parse Search Error:", err);
    return res.json({ parsed: null });
  }
};

/**
 * Generate AI-powered listing description using Gemini with smart fallback
 */
export const generateDescription = async (req, res) => {
  try {
    const {
      title,
      platform,
      username,
      niche,
      followers_count,
      engagement_rate,
      monthly_views,
      monetized,
      verified,
      country,
      age_range,
      customPrompt,
    } = req.body;

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.json({
        description: generateFallbackDescription({
          title,
          platform,
          username,
          niche,
          followers_count,
          engagement_rate,
          monetized,
          verified,
        }),
      });
    }

    try {
      const ai = getGenAIClient();
      const prompt = `Write a high-converting, professional, and engaging sales description for a social media account listing on Socialy.
Account Details:
- Platform: ${platform || "Social Media"}
- Username / Handle: @${username || "handle"}
- Title: ${title || "Premium Social Account"}
- Niche: ${niche || "General"}
- Follower Count: ${(followers_count || 0).toLocaleString()}
- Engagement Rate: ${engagement_rate || 0}%
- Monthly Views: ${(monthly_views || 0).toLocaleString()}
- Monetized: ${monetized ? "Yes (Active monetization)" : "No"}
- Verified: ${verified ? "Yes" : "No"}
- Primary Audience Location: ${country || "Global"}
- Audience Age Range: ${age_range || "All ages"}
${customPrompt ? `- Extra Seller Notes: ${customPrompt}` : ""}

Structure the description with:
1. Compelling Headline & Hook
2. Key Highlights & Audience Demographics
3. Monetization & Growth Opportunities
4. Safe Escrow Transfer Assurance (via Socialy Escrow)`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });

      const description =
        response.text ||
        response?.candidates?.[0]?.content?.parts?.[0]?.text ||
        generateFallbackDescription({
          title,
          platform,
          username,
          niche,
          followers_count,
          engagement_rate,
          monetized,
          verified,
        });

      return res.json({ success: true, description });
    } catch (aiErr) {
      console.error("Gemini Generate Description Error:", aiErr);
      return res.json({
        success: true,
        description: generateFallbackDescription({
          title,
          platform,
          username,
          niche,
          followers_count,
          engagement_rate,
          monetized,
          verified,
        }),
      });
    }
  } catch (error) {
    console.error("Generate Description Error:", error);
    res.status(500).json({ message: error.code || error.message });
  }
};

function generateFallbackDescription({ title, platform, username, niche, followers_count, engagement_rate, monetized, verified }) {
  return `### 🌟 Premium ${platform ? platform.toUpperCase() : "Social Media"} Asset — @${username || "account"}

**${title || "Established Account in " + niche}**

#### 📊 Account Highlights:
- **Niche / Category**: ${niche || "General"}
- **Followers / Subscribers**: ${(followers_count || 0).toLocaleString()} active audience
- **Engagement Rate**: ${engagement_rate || 0}% organic interaction
- **Monetization**: ${monetized ? "✅ Fully Monetized" : "Ready for Sponsorships & Affiliate Sales"}
- **Verification**: ${verified ? "✅ Verified Account" : "Organic Clean Standing"}

#### 🚀 Growth & Monetization Potential:
This account has a highly engaged follower base ready for immediate brand deals, affiliate marketing, or digital product launches. Perfect for creators, agencies, or investors looking for a turn-key social media presence.

#### 🛡️ Escrow Transfer Guarantee:
Transaction conducted exclusively via **Socialy Escrow** with a 24-hour buyer inspection window and zero-trust credential security.`;
}
