import { generateText } from "../config/gemini.js";
import { sanitizeText } from "../utils/sanitizer.js";

const MAX_CUSTOM_PROMPT_LENGTH = 250;

const VALID_PLATFORMS = [
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
];

const VALID_NICHES = [
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
];

/**
 * Deterministic Regex Parser fallback for natural language marketplace queries
 */
export const fallbackParseQuery = (rawQuery) => {
  const q = rawQuery.toLowerCase();
  const result = {
    search: "",
    platform: [],
    niche: "",
    maxPrice: 100000,
    minFollowers: 0,
    monetized: false,
    verified: false,
    summary: "",
  };

  // 1. Detect Platforms
  for (const plat of VALID_PLATFORMS) {
    if (q.includes(plat)) {
      result.platform.push(plat);
    }
  }

  // 2. Detect Niches
  for (const niche of VALID_NICHES) {
    if (q.includes(niche) || (niche === "tech" && q.includes("technology"))) {
      result.niche = niche;
      break;
    }
  }

  // 3. Detect Monetization & Verification
  if (q.includes("monetized") || q.includes("monetised") || q.includes("adsense") || q.includes("monetization")) {
    result.monetized = true;
  }
  if (q.includes("verified") || q.includes("blue tick") || q.includes("badge") || q.includes("check mark")) {
    result.verified = true;
  }

  // 4. Detect Price (e.g. "under 50k", "below 20000", "< 50000", "under 1 lakh")
  const priceMatch = q.match(/(?:under|below|less than|max|budget of|within|<=?)\s*(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(k|lakh|thousand)?/i);
  if (priceMatch) {
    let val = parseFloat(priceMatch[1]);
    const unit = (priceMatch[2] || "").toLowerCase();
    if (unit === "k" || unit === "thousand") val *= 1000;
    if (unit === "lakh") val *= 100000;
    result.maxPrice = Math.min(100000, Math.max(100, Math.round(val)));
  }

  // 5. Detect Followers (e.g. "10k+ followers", "above 50k subs", "min 5000")
  const followerMatch = q.match(/(?:above|more than|min|at least|>=?)\s*(\d+(?:\.\d+)?)\s*(k|m|thousand|million)?\s*(?:followers|subs|subscribers)?/i)
    || q.match(/(\d+(?:\.\d+)?)\s*(k|m)\s*\+?\s*(?:followers|subs|subscribers)/i);

  if (followerMatch) {
    let val = parseFloat(followerMatch[1]);
    const unit = (followerMatch[2] || "").toLowerCase();
    if (unit === "k" || unit === "thousand") val *= 1000;
    if (unit === "m" || unit === "million") val *= 1000000;
    result.minFollowers = Math.round(val);
  }

  // Generate summary
  const parts = [];
  if (result.verified) parts.push("Verified");
  if (result.monetized) parts.push("Monetized");
  if (result.platform.length > 0) parts.push(result.platform.join("/"));
  if (result.niche) parts.push(`in ${result.niche}`);
  if (result.maxPrice < 100000) parts.push(`under ₹${result.maxPrice.toLocaleString()}`);
  if (result.minFollowers > 0) parts.push(`with ${result.minFollowers.toLocaleString()}+ followers`);

  result.summary = parts.length > 0 ? parts.join(" ") : `Listings matching "${rawQuery}"`;
  return result;
};

/**
 * Controller to parse natural language search queries into structured marketplace filters
 */
export const parseNaturalLanguageSearch = async (req, res) => {
  try {
    const rawQuery = req.body.query || "";
    const cleanQuery = sanitizeText(rawQuery).slice(0, 200);

    if (!cleanQuery) {
      return res.status(400).json({ message: "Search query cannot be empty" });
    }

    // Attempt Gemini AI Structured Extraction
    const prompt = `You are a search query compiler for an online social media escrow marketplace.
Convert the user's conversational search request into a precise JSON filter object.

AVAILABLE PLATFORMS: ["youtube", "instagram", "tiktok", "facebook", "twitter", "linkedin", "twitch", "discord"]
AVAILABLE NICHES: ["lifestyle", "fitness", "food", "travel", "tech", "gaming", "fashion", "beauty", "business", "education", "entertainment", "music", "art", "sports", "health", "finance", "other"]

USER QUERY: "${cleanQuery}"

JSON SCHEMA TO RETURN (Strict JSON only, no markdown):
{
  "search": "any remaining specific search keywords like brand name or topic, or empty string",
  "platform": ["matched platform or empty array"],
  "niche": "matched niche or empty string",
  "maxPrice": number (e.g. 50000 for "under 50k", or 100000 if not specified),
  "minFollowers": number (e.g. 10000 for "10k+ followers", or 0 if not specified),
  "monetized": true | false,
  "verified": true | false,
  "summary": "Concise 1-sentence friendly summary of filters applied"
}`;

    const rawAI = await generateText(prompt, { temperature: 0.1, maxOutputTokens: 300 });

    if (rawAI) {
      try {
        const cleanedJson = rawAI.replace(/```json/gi, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleanedJson);

        // Sanitize and validate fields
        const safeParsed = {
          search: sanitizeText(parsed.search || ""),
          platform: Array.isArray(parsed.platform)
            ? parsed.platform.filter((p) => VALID_PLATFORMS.includes(p.toLowerCase()))
            : [],
          niche: VALID_NICHES.includes(parsed.niche?.toLowerCase()) ? parsed.niche.toLowerCase() : "",
          maxPrice: typeof parsed.maxPrice === "number" && parsed.maxPrice > 0 ? Math.min(100000, parsed.maxPrice) : 100000,
          minFollowers: typeof parsed.minFollowers === "number" && parsed.minFollowers >= 0 ? parsed.minFollowers : 0,
          monetized: Boolean(parsed.monetized),
          verified: Boolean(parsed.verified),
          summary: sanitizeText(parsed.summary || `Filters applied for "${cleanQuery}"`),
        };

        return res.json({ success: true, parsed: safeParsed });
      } catch (jsonErr) {
        console.warn("⚠️ [AI Search JSON Parse Error]:", jsonErr.message);
      }
    }

    // Fallback to deterministic regex parser
    const fallback = fallbackParseQuery(cleanQuery);
    return res.json({ success: true, parsed: fallback });
  } catch (error) {
    console.error("Error parsing natural language search:", error);
    // Even on server error, return safe fallback
    const fallback = fallbackParseQuery(req.body?.query || "");
    return res.json({ success: true, parsed: fallback });
  }
};

/**
 * Controller to generate an AI-powered sales pitch / description for a listing
 */
export const generateListingDescription = async (req, res) => {
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

    if (!platform || !niche) {
      return res.status(400).json({
        message: "Platform and niche are required to generate an accurate description.",
      });
    }

    let sanitizedCustomPrompt = "";
    if (customPrompt && typeof customPrompt === "string") {
      sanitizedCustomPrompt = sanitizeText(customPrompt).slice(0, MAX_CUSTOM_PROMPT_LENGTH);
    }

    const followers = Number(followers_count) || 0;
    const engagement = engagement_rate ? `${Number(engagement_rate)}%` : "N/A";
    const views = monthly_views ? Number(monthly_views).toLocaleString() : "N/A";
    const cleanCountry = sanitizeText(country || "Global / India");
    const cleanAgeRange = sanitizeText(age_range || "Mixed");
    const cleanUsername = sanitizeText(username || "");
    const cleanTitle = sanitizeText(title || `${platform} ${niche} account`);

    const prompt = `You are an elite digital asset copywriter and social media broker.
Write a compelling, professional, high-converting sales listing description for an account on Socialy (an escrow marketplace).

ACCOUNT SPECIFICATIONS:
- Platform: ${platform}
- Title / Focus: ${cleanTitle}
${cleanUsername ? `- Handle/Username: @${cleanUsername}` : ""}
- Niche / Category: ${niche}
- Follower / Subscriber Count: ${followers.toLocaleString()}
- Engagement Rate: ${engagement}
- Monthly Views / Impressions: ${views}
- Monetization Status: ${monetized ? "Enabled (Eligible for direct platform revenue)" : "Standard account"}
- Verification Badge: ${verified ? "Platform Verified / Blue Tick" : "Non-verified"}
- Primary Audience Location: ${cleanCountry}
- Target Age Demographic: ${cleanAgeRange}
${sanitizedCustomPrompt ? `\nSELLER'S CUSTOM FOCUS INSTRUCTIONS:\n"${sanitizedCustomPrompt}"` : ""}

REQUIREMENTS:
1. Write in a clear, persuasive, professional tone that appeals to serious buyers and investors.
2. Structure with:
   - Catchy opening overview hook
   - Key Account Highlights (bullet points of metrics, engagement, growth)
   - Monetization & Revenue Opportunities (sponsorships, affiliate, brand deals)
   - Transfer & Security assurance statement (mentioning Socialy Escrow protection)
3. Keep the total length around 150 - 250 words. Do NOT include markdown code fences (like \`\`\`).
4. Avoid exaggerations not backed by the stats provided.`;

    const generated = await generateText(prompt, {
      temperature: 0.7,
      maxOutputTokens: 800,
    });

    if (!generated) {
      return res.status(503).json({
        message: "AI service is temporarily unavailable. Please try again in a moment.",
      });
    }

    const cleanText = generated.replace(/```markdown/gi, "").replace(/```/g, "").trim();

    return res.json({
      success: true,
      description: cleanText,
    });
  } catch (error) {
    console.error("Error in generateListingDescription:", error);
    return res.status(500).json({
      message: error.message || "Failed to generate AI description.",
    });
  }
};
