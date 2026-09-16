/**
 * AIProvider — the single contract the AI Service depends on (ADR-04).
 * Swapping Groq for Gemini, or for a self-hosted model, means adding a file here.
 * Nothing in the business layer changes.
 *
 * @typedef {Object} AIProvider
 * @property {string}   name              stable identifier written into audit + provenance
 * @property {() => boolean} isConfigured  true when the provider has credentials
 * @property {(req: CompletionRequest) => Promise<CompletionResult>} complete
 *
 * @typedef {Object} CompletionRequest
 * @property {string} system     system prompt
 * @property {string} user       redacted user content
 * @property {boolean} [json]    request a strict JSON object response
 * @property {number} [maxTokens]
 * @property {number} [temperature]
 * @property {AbortSignal} [signal]
 *
 * @typedef {Object} CompletionResult
 * @property {string} text
 * @property {string} provider
 * @property {string} model
 * @property {{prompt: number, completion: number}} [usage]
 */

export const PROVIDER_CONTRACT = ['name', 'isConfigured', 'complete']

/** Throws unless the object satisfies the contract — guards against a half-written driver. */
export function assertProvider(p) {
  for (const key of PROVIDER_CONTRACT) {
    if (!(key in p)) throw new Error(`AIProvider "${p?.name ?? '?'}" is missing "${key}"`)
  }
  return p
}
