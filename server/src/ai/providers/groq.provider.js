import { env } from '../../config/env.js'
import { UpstreamError } from '../../shared/errors.js'

/** Primary provider. Groq free tier, OpenAI-compatible chat completions endpoint. */
export function createGroqProvider() {
  const cfg = env.ai.groq

  return {
    name: 'groq',
    isConfigured: () => Boolean(cfg.apiKey),

    async complete({ system, user, json = false, maxTokens = 900, temperature = 0.2, signal }) {
      if (!cfg.apiKey) throw new UpstreamError('Groq API key is not configured')

      const res = await fetch(cfg.baseUrl, {
        method: 'POST',
        signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.apiKey}` },
        body: JSON.stringify({
          model: cfg.model,
          temperature,
          max_tokens: maxTokens,
          ...(json ? { response_format: { type: 'json_object' } } : {}),
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
        }),
      })

      if (!res.ok) {
        const body = await res.text().catch(() => '')
        throw new UpstreamError(`Groq responded ${res.status}`, { status: res.status, body: body.slice(0, 400) })
      }

      const data = await res.json()
      const text = data?.choices?.[0]?.message?.content
      if (!text) throw new UpstreamError('Groq returned an empty completion')

      return {
        text,
        provider: 'groq',
        model: cfg.model,
        usage: {
          prompt: data?.usage?.prompt_tokens ?? 0,
          completion: data?.usage?.completion_tokens ?? 0,
        },
      }
    },
  }
}
