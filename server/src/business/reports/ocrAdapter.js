import fs from 'node:fs/promises'
import { env } from '../../config/env.js'
import { logger } from '../../shared/logger.js'
import { UpstreamError } from '../../shared/errors.js'

/**
 * OCR sits behind the same adapter discipline as the AI provider (ADR-04): the report
 * service asks for text and does not know whether it came from OCR.space, Tesseract, or
 * a plain-text upload.
 */

function createOcrSpaceProvider() {
  return {
    name: 'ocr.space',
    isConfigured: () => Boolean(env.ocr.apiKey),

    async extract({ filePath, mimeType }) {
      const buffer = await fs.readFile(filePath)
      const form = new FormData()
      form.append('file', new Blob([buffer], { type: mimeType }), 'report')
      form.append('language', 'eng')
      form.append('isTable', 'true')
      form.append('OCREngine', '2')
      form.append('scale', 'true')

      const res = await fetch(env.ocr.baseUrl, {
        method: 'POST',
        headers: { apikey: env.ocr.apiKey },
        body: form,
      })

      if (!res.ok) throw new UpstreamError(`OCR.space responded ${res.status}`)

      const data = await res.json()
      if (data.IsErroredOnProcessing) {
        throw new UpstreamError(
          Array.isArray(data.ErrorMessage) ? data.ErrorMessage.join('; ') : String(data.ErrorMessage ?? 'OCR failed')
        )
      }

      const text = (data.ParsedResults ?? []).map((r) => r.ParsedText ?? '').join('\n').trim()
      if (!text) throw new UpstreamError('OCR returned no text')
      return { text, provider: 'ocr.space' }
    },
  }
}

/** Plain-text and text-like uploads need no OCR service at all. */
function createPlainTextProvider() {
  return {
    name: 'plaintext',
    isConfigured: () => true,
    async extract({ filePath, mimeType }) {
      if (!mimeType?.startsWith('text/')) throw new UpstreamError('Not a plain-text upload')
      const text = (await fs.readFile(filePath, 'utf8')).trim()
      if (!text) throw new UpstreamError('File is empty')
      return { text, provider: 'plaintext' }
    },
  }
}

const providers = [createPlainTextProvider(), createOcrSpaceProvider()]

/**
 * @returns {Promise<{text: string, provider: string}>}
 * @throws when no provider can extract text
 */
export async function extractText({ filePath, mimeType }) {
  const attempted = []
  for (const provider of providers) {
    if (!provider.isConfigured()) {
      attempted.push({ provider: provider.name, skipped: 'not-configured' })
      continue
    }
    try {
      return await provider.extract({ filePath, mimeType })
    } catch (err) {
      attempted.push({ provider: provider.name, error: err.message })
      logger.debug('ocr provider failed', { provider: provider.name, err: err.message })
    }
  }
  throw new UpstreamError('No OCR provider could extract text from this file', { attempted })
}

export const ocrAvailable = () => providers.some((p) => p.isConfigured() && p.name !== 'plaintext')
