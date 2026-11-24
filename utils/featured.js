const MAX_FEATURED_SLOTS = 6;

// Har public read query mein use hoga. Featured expiry date ke din tak rehta hai,
// us ke agle din se nahi. Is liye cron job ki zaroorat nahi.
const IS_FEATURED_SQL = `(p.is_featured = 1 AND (p.featured_until IS NULL OR p.featured_until >= CURDATE()))`;

module.exports = { MAX_FEATURED_SLOTS, IS_FEATURED_SQL };