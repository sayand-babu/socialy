import sanitizeHtml from "sanitize-html";

/**
 * Strips all HTML tags and dangerous characters from plain text fields (e.g. title, username, niche).
 * @param {string} input - Raw text string
 * @returns {string} Clean, tag-free text
 */
export const sanitizeText = (input) => {
  if (typeof input !== "string") return "";
  return sanitizeHtml(input, {
    allowedTags: [],
    allowedAttributes: {},
    disallowedTagsMode: "discard",
  }).trim();
};

/**
 * Sanitizes rich text descriptions, allowing only safe formatting tags while
 * completely stripping scripts, iframes, styles, and dangerous event handlers.
 * @param {string} input - Raw HTML or markdown text
 * @returns {string} Sanitized safe HTML
 */
export const sanitizeRichText = (input) => {
  if (typeof input !== "string") return "";
  return sanitizeHtml(input, {
    allowedTags: [
      "b",
      "i",
      "em",
      "strong",
      "a",
      "p",
      "br",
      "ul",
      "ol",
      "li",
      "h3",
      "h4",
      "h5",
      "span",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", {
        target: "_blank",
        rel: "noopener noreferrer nofollow",
      }),
    },
    disallowedTagsMode: "discard",
  }).trim();
};
