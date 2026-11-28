// utils/projectFields.js
// S1-04: extended project fields. Validation + normalization (server side)

const STAGES = [
  'Idea', 'Research', 'Prototype', 'MVP',
  'Early Revenue', 'Scaling', 'Established Business',
];

const FUNDING_OPTIONS = [
  'Not seeking', 'Under $10k', '$10k to $50k',
  '$50k to $250k', '$250k to $1M', 'Over $1M',
];

const LIMITS = {
  problem_statement: 500,
  description: 3000,
  maxTags: 10,
  tagLength: 40,
  url: 500,
  teamMin: 1,
  teamMax: 500,
};

// Unicode-safe length (MySQL VARCHAR bhi characters gintta hai)
const chars = (s) => Array.from(s).length;
const isBlank = (v) =>
  v === undefined || v === null || (typeof v === 'string' && v.trim() === '');

// Purani "Growth" value ko "Scaling" bana deta hai
function normalizeStage(v) {
  if (isBlank(v)) return null;
  const s = String(v).trim();
  if (s.toLowerCase() === 'growth') return 'Scaling';
  return STAGES.find((x) => x.toLowerCase() === s.toLowerCase()) || s;
}

function normalizeFunding(v) {
  if (isBlank(v)) return null;
  const s = String(v).trim();
  return FUNDING_OPTIONS.find((o) => o.toLowerCase() === s.toLowerCase()) || s;
}

function cleanText(v, max, label, key, errors) {
  if (isBlank(v)) return null;
  if (typeof v !== 'string') {
    errors[key] = `${label} must be text.`;
    return null;
  }
  const s = v.trim();
  if (chars(s) > max) {
    errors[key] = `${label} must be ${max} characters or fewer.`;
    return null;
  }
  return s;
}

// Tags: array ya comma-separated string. Max 10, har tag max 40 chars. Duplicate hat jate hain
function cleanList(v, label, key, errors) {
  if (isBlank(v)) return null;
  let arr;
  if (Array.isArray(v)) {
    arr = v;
  } else if (typeof v === 'string') {
    const t = v.trim();
    arr = null;
    if (t.startsWith('[')) {
      try { const parsed = JSON.parse(t); if (Array.isArray(parsed)) arr = parsed; } catch (_) {}
    }
    if (!arr) arr = t.split(',');
  } else {
    errors[key] = `${label} must be a list of tags.`;
    return null;
  }

  const seen = new Set();
  const out = [];
  for (const item of arr) {
    const t = String(item ?? '').trim();
    if (!t) continue;
    if (chars(t) > LIMITS.tagLength) {
      errors[key] = `Each ${label.toLowerCase()} tag must be ${LIMITS.tagLength} characters or fewer.`;
      return null;
    }
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  if (out.length > LIMITS.maxTags) {
    errors[key] = `${label}: maximum ${LIMITS.maxTags} tags allowed.`;
    return null;
  }
  return out.length ? JSON.stringify(out) : null;
}

// Sirf http:// ya https:// URL
function cleanUrl(v, label, key, errors) {
  if (isBlank(v)) return null;
  const s = String(v).trim();
  if (chars(s) > LIMITS.url) {
    errors[key] = `${label} must be ${LIMITS.url} characters or fewer.`;
    return null;
  }
  let ok = /^https?:\/\/[^\s]+$/i.test(s);
  if (ok) {
    try {
      const u = new URL(s);
      ok = ['http:', 'https:'].includes(u.protocol) && !!u.hostname;
    } catch (_) { ok = false; }
  }
  if (!ok) {
    errors[key] = `${label} must be a valid http or https URL.`;
    return null;
  }
  return s;
}

function cleanTeamSize(v, errors) {
  if (isBlank(v)) return null;
  const n = typeof v === 'number' ? v : (/^\d+$/.test(String(v).trim()) ? Number(String(v).trim()) : NaN);
  if (!Number.isInteger(n) || n < LIMITS.teamMin || n > LIMITS.teamMax) {
    errors.team_size = `Team size must be a whole number from ${LIMITS.teamMin} to ${LIMITS.teamMax}.`;
    return null;
  }
  return n;
}

/**
 * partial=false: create (sab fields process hote hain, missing = null)
 * partial=true : update (sirf wahi fields jo body mein bheji gayi hon)
 * current: update par purani DB row, taake purani legacy stage/funding value na toote
 */
function validateProjectFields(body = {}, { partial = false, current = {} } = {}) {
  const errors = {};
  const values = {};
  const wants = (k) => !partial || body[k] !== undefined;

  if (wants('description')) {
    values.description = cleanText(body.description, LIMITS.description, 'Detailed description', 'description', errors);
  }
  if (wants('problem_statement')) {
    values.problem_statement = cleanText(body.problem_statement, LIMITS.problem_statement, 'Problem statement', 'problem_statement', errors);
  }
  if (wants('tech_stack')) {
    values.tech_stack = cleanList(body.tech_stack, 'Technology stack', 'tech_stack', errors);
  }
  if (wants('required_skills')) {
    values.required_skills = cleanList(body.required_skills, 'Required skills', 'required_skills', errors);
  }
  if (wants('website')) {
    values.website = cleanUrl(body.website, 'Website', 'website', errors);
  }
  if (wants('pitch_url')) {
    values.pitch_url = cleanUrl(body.pitch_url, 'Pitch deck or demo video link', 'pitch_url', errors);
  }
  if (wants('team_size')) {
    values.team_size = cleanTeamSize(body.team_size, errors);
  }
  if (wants('stage')) {
    const stage = normalizeStage(body.stage);
    if (stage && !STAGES.includes(stage) && stage !== current.stage) {
      errors.stage = `Stage must be one of: ${STAGES.join(', ')}.`;
    } else {
      values.stage = stage;
    }
  }
  if (wants('funding_requirement')) {
    const f = normalizeFunding(body.funding_requirement);
    if (f && !FUNDING_OPTIONS.includes(f) && f !== current.funding_requirement) {
      errors.funding_requirement = `Funding requirement must be one of: ${FUNDING_OPTIONS.join(', ')}.`;
    } else {
      values.funding_requirement = f;
    }
  }

  return { errors, values, ok: Object.keys(errors).length === 0 };
}

// DB ki JSON string ko array bana kar frontend ko bhejna
function parseJsonList(v) {
  if (Array.isArray(v)) return v;
  if (!v) return [];
  try { const a = JSON.parse(v); return Array.isArray(a) ? a : []; } catch (_) { return []; }
}

function serializeProject(row) {
  if (!row) return row;
  return {
    ...row,
    tech_stack: parseJsonList(row.tech_stack),
    required_skills: parseJsonList(row.required_skills),
  };
}

module.exports = {
  STAGES, FUNDING_OPTIONS, LIMITS,
  normalizeStage, normalizeFunding,
  validateProjectFields, serializeProject, parseJsonList,
};