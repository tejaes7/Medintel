import { env } from '../../config/env.js'
import { UpstreamError } from '../../shared/errors.js'

/**
 * Fallback provider slot. Fully implemented but dormant: isConfigured() returns false
 * until GEMINI_API_KEY is set, and the registry skips unconfigured providers.
 */
export function createGeminiProvider() {
  const cfg = env.ai.gemini

  return {
    name: 'gemini',
    isConfigured: () => Boolean(cfg.apiKey),

    async complete({ system, user, json = false, maxTokens = 900, temperature = 0.2, signal }) {
      if (!cfg.apiKey) throw new UpstreamError('Gemini API key is not configured')

      const url = `${cfg.baseUrl}/${cfg.model}:generateContent?key=${encodeURIComponent(cfg.apiKey)}`
      const res = await fetch(url, {
        method: 'POST',
        signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts: [{ text: user }] }],
          generationConfig: {
            temperature,
            maxOutputTokens: maxTokens,
            ...(json ? { responseMimeType: 'application/json' } : {}),
          },
        }),
      })

      if (!res.ok) {
        const body = await res.text().catch(() => '')
        throw new UpstreamError(`Gemini responded ${res.status}`, { status: res.status, body: body.slice(0, 400) })
      }

      const data = await res.json()
      const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? ''
      if (!text) throw new UpstreamError('Gemini returned an empty completion')

      return {
        text,
        provider: 'gemini',
        model: cfg.model,
        usage: {
          prompt: data?.usageMetadata?.promptTokenCount ?? 0,
          completion: data?.usageMetadata?.candidatesTokenCount ?? 0,
        },
      }
    },
  }
}
