import 'dotenv/config'

const num = (v, d) => (v === undefined || v === '' ? d : Number(v))
const str = (v, d = '') => (v === undefined || v === '' ? d : String(v))

export const env = {
  port: num(process.env.PORT, 4000),
  nodeEnv: str(process.env.NODE_ENV, 'development'),
  isProd: str(process.env.NODE_ENV, 'development') === 'production',
  corsOrigin: str(process.env.CORS_ORIGIN, 'http://localhost:5173'),

  jwt: {
    secret: str(process.env.JWT_SECRET, 'medintel-dev-secret-do-not-use-in-production'),
    accessTtl: str(process.env.JWT_ACCESS_TTL, '15m'),
    refreshTtl: str(process.env.JWT_REFRESH_TTL, '7d'),
  },

  mongoUri: str(process.env.MONGODB_URI),
  redisUrl: str(process.env.REDIS_URL),

  ai: {
    timeoutMs: num(process.env.AI_TIMEOUT_MS, 45000),
    maxRetries: num(process.env.AI_MAX_RETRIES, 2),
    breakerThreshold: num(process.env.AI_BREAKER_THRESHOLD, 3),
    breakerCooldownMs: num(process.env.AI_BREAKER_COOLDOWN_MS, 30000),
    groq: {
      apiKey: str(process.env.GROQ_API_KEY),
      model: str(process.env.GROQ_MODEL, 'openai/gpt-oss-120b'),
      baseUrl: 'https://api.groq.com/openai/v1/chat/completions',
    },
    gemini: {
      apiKey: str(process.env.GEMINI_API_KEY),
      model: str(process.env.GEMINI_MODEL, 'gemini-flash-latest'),
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
    },
  },

  ocr: { apiKey: str(process.env.OCR_SPACE_API_KEY), baseUrl: 'https://api.ocr.space/parse/image' },
}

/** Warnings surfaced at boot so a missing free-tier key is obvious, not silent. */
export function configWarnings() {
  const w = []
  if (!env.mongoUri) w.push('MONGODB_URI unset — falling back to in-memory MongoDB (data resets on restart)')
  if (!env.redisUrl) w.push('REDIS_URL unset — cache/queue using in-process driver')
  if (!env.ai.groq.apiKey) w.push('GROQ_API_KEY unset — primary AI provider disabled')
  if (!env.ai.gemini.apiKey) w.push('GEMINI_API_KEY unset — Gemini fallback dormant')
  if (!env.ocr.apiKey) w.push('OCR_SPACE_API_KEY unset — report text extraction disabled')
  if (env.isProd && env.jwt.secret.startsWith('medintel-dev-secret')) w.push('JWT_SECRET is the insecure default')
  return w
}
