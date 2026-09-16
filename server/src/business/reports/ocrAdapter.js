import fs from 'node:fs/promises'
import { env } from '../../config/env.js'
import { logger } from '../../shared/logger.js'
import { UpstreamError } from '../../shared/errors.js'

/**
 * OCR sits behind the same adapter discipline as the AI provider (ADR-04): the report
 * service asks for text and does not know whether it came from OCR.space, Tesseract, or
 * a plain-text upload.
 */

/** Direct digital PDF extraction — fast, offline, and requires no third-party API keys. */
function createPdfProvider() {
  return {
    name: 'pdf-parser',
    isConfigured: () => true,
    async extract({ filePath, mimeType }) {
      const isPdf = mimeType === 'application/pdf' || filePath.toLowerCase().endsWith('.pdf')
      if (!isPdf) throw new UpstreamError('Not a PDF file')

      const buffer = await fs.readFile(filePath)
      const { PDFParse } = await import('pdf-parse')
      const parser = new PDFParse({ data: buffer })
      try {
        const res = await parser.getText()
        const text = (res?.text ?? '').trim()
        const words = text.replace(/[^a-zA-Z0-9]/g, ' ').trim().split(/\s+/).filter(Boolean)
        if (text.length < 25 || words.length < 5) {
          throw new UpstreamError('PDF contains no text layer or only page numbers (scanned document)')
        }
        return { text, provider: 'pdf-parser' }
      } finally {
        await parser.destroy().catch(() => {})
      }
    },
  }
}

/** Gemini Multimodal Vision — reads scanned PDFs, flattened documents, and camera photos. */
function createGeminiVisionProvider() {
  return {
    name: 'gemini-vision',
    isConfigured: () => Boolean(env.ai.gemini.apiKey),

    async extract({ filePath, mimeType }) {
      const buffer = await fs.readFile(filePath)
      const base64 = buffer.toString('base64')
      const cfg = env.ai.gemini

      let resolvedMime = mimeType
      if (!resolvedMime || resolvedMime === 'application/octet-stream') {
        const lower = filePath.toLowerCase()
        if (lower.endsWith('.pdf')) resolvedMime = 'application/pdf'
        else if (lower.endsWith('.png')) resolvedMime = 'image/png'
        else if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) resolvedMime = 'image/jpeg'
        else resolvedMime = 'application/pdf'
      }

      const url = `${cfg.baseUrl}/${cfg.model}:generateContent?key=${encodeURIComponent(cfg.apiKey)}`
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { inlineData: { mimeType: resolvedMime, data: base64 } },
                {
                  text: 'Extract and transcribe all clinical text, lab test names, results, reference ranges, units, and patient notes from this document verbatim. Preserve the table structure and all numbers.',
                },
              ],
            },
          ],
        }),
      })

      if (!res.ok) {
        const body = await res.text().catch(() => '')
        throw new UpstreamError(`Gemini vision responded ${res.status}`, { status: res.status, body: body.slice(0, 400) })
      }

      const data = await res.json()
      const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? ''
      if (!text.trim()) throw new UpstreamError('Gemini vision returned no text from this document')
      return { text: text.trim(), provider: 'gemini-vision' }
    },
  }
}

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

const providers = [
  createPlainTextProvider(),
  createPdfProvider(),
  createGeminiVisionProvider(),
  createOcrSpaceProvider(),
]

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

export const ocrAvailable = () => true
