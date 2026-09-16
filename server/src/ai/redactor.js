/**
 * STAGE 2 — Redaction. Runs before any text crosses the provider boundary.
 * Data minimisation is enforced here in code, not by policy document.
 */
const PATTERNS = [
  { label: 'EMAIL', re: /[\w.+-]+@[\w-]+\.[\w.-]+/g },
  { label: 'PHONE', re: /(?:\+?\d{1,3}[\s-]?)?(?:\(\d{2,4}\)[\s-]?)?\d{3,5}[\s-]?\d{4,6}\b/g },
  { label: 'AADHAAR', re: /\b\d{4}\s?\d{4}\s?\d{4}\b/g },
  { label: 'MRN', re: /\b(?:MRN|UHID|PATIENT\s*ID)[:\s#-]*[A-Z0-9-]{4,}\b/gi },
  { label: 'CARD', re: /\b(?:\d{4}[\s-]?){3}\d{4}\b/g },
  { label: 'URL', re: /https?:\/\/\S+/g },
  { label: 'DOB', re: /\b(?:0?[1-9]|[12]\d|3[01])[/-](?:0?[1-9]|1[0-2])[/-](?:19|20)\d{2}\b/g },
  { label: 'POSTCODE', re: /\b\d{6}\b/g },
]

/**
 * @param {string} text
 * @returns {{ text: string, redactions: Array<{label: string, count: number}> }}
 */
export function redact(text) {
  if (!text) return { text: '', redactions: [] }
  let out = String(text)
  const redactions = []

  for (const { label, re } of PATTERNS) {
    let count = 0
    out = out.replace(re, () => {
      count += 1
      return `[${label}_REDACTED]`
    })
    if (count > 0) redactions.push({ label, count })
  }

  // Collapse whitespace so redaction never leaks structure through spacing.
  out = out.replace(/[ \t]{2,}/g, ' ').trim()
  return { text: out, redactions }
}

/** Redacts every string value in a plain object, one level deep plus arrays of strings. */
export function redactObject(obj) {
  const redactions = []
  const walk = (value) => {
    if (typeof value === 'string') {
      const r = redact(value)
      redactions.push(...r.redactions)
      return r.text
    }
    if (Array.isArray(value)) return value.map(walk)
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, walk(v)]))
    }
    return value
  }
  return { value: walk(obj), redactions }
}
