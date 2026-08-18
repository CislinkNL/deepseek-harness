/**
 * OpenAI-compatible vision transport. One POST to `{baseURL}/chat/completions`
 * carrying the image as a base64 data URL and a describe instruction. The
 * credentialed request never follows redirects: a 3xx is a provider error, so
 * the API key cannot be forwarded to another origin.
 * @module @deepseek-ai/dsh-vision-http/client
 */

import type { ImageMediaType } from '@deepseek-ai/dsh-vision'
import { VisionError } from '@deepseek-ai/dsh-vision'

/** Default instruction sent when the caller supplies none. */
export const DEFAULT_INSTRUCTION = 'Describe this image in detail: all text, interface elements, colors, layout, and any anomalies. Reply with the description only.'

/** Encode image bytes as a data URL the chat-completions image block carries. */
export function encodeImageDataUrl(mediaType: ImageMediaType, data: Uint8Array): string {
  return `data:${mediaType};base64,${Buffer.from(data).toString('base64')}`
}

/** Build the chat-completions request body for one image description. */
export function buildVisionBody(model: string, maxTokens: number, dataUrl: string, instruction: string): string {
  return JSON.stringify({
    model,
    max_tokens: maxTokens,
    messages: [{
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: dataUrl } },
        { type: 'text', text: instruction },
      ],
    }],
  })
}

/** Extract the provider's text account from an OpenAI-compatible response body. */
export function parseVisionResponse(body: unknown): string {
  const text = extractContent(body)
  if (text.length === 0) {
    throw new VisionError('vision provider returned an empty description', 'EMPTY_RESPONSE')
  }
  return text
}

/** Walk the `choices[0].message.content` field, tolerating its two common shapes. */
function extractContent(body: unknown): string {
  if (typeof body !== 'object' || body === null) return ''
  const choices = (body as { choices?: unknown }).choices
  if (!Array.isArray(choices) || choices.length === 0) return ''
  const message = (choices[0] as { message?: unknown }).message
  if (typeof message !== 'object' || message === null) return ''
  const content = (message as { content?: unknown }).content
  if (typeof content === 'string') return content.trim()
  return ''
}

/** Arguments for one provider HTTP call. */
export interface VisionHttpRequest {
  baseURL: string
  apiKey: string
  model: string
  maxTokens: number
  timeoutMs: number
  dataUrl: string
  instruction: string
}

/**
 * POST one image description to the provider and return its text.
 * @param request - endpoint, credential, and sampling facts.
 * @param signal - optional caller cancellation; merged with the call timeout.
 * @param fetchImpl - injectable transport (tests prove redirect rejection).
 * @returns the non-empty provider description.
 */
export async function analyzeImageHttp(
  request: VisionHttpRequest,
  signal?: AbortSignal,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const timeout = AbortSignal.timeout(request.timeoutMs)
  const combined = signal === undefined ? timeout : AbortSignal.any([signal, timeout])
  let response: Response
  try {
    response = await fetchImpl(`${request.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'authorization': `Bearer ${request.apiKey}`,
        'content-type': 'application/json',
      },
      body: buildVisionBody(request.model, request.maxTokens, request.dataUrl, request.instruction),
      // A credential-bearing request must never follow a redirect: fail before
      // the configured endpoint can forward the key or the image elsewhere.
      redirect: 'error',
      signal: combined,
    })
  } catch (error: unknown) {
    if (signal?.aborted) throw new VisionError('vision request aborted', 'ABORTED', { cause: error })
    if (timeout.aborted) throw new VisionError(`vision request timed out after ${request.timeoutMs}ms`, 'TIMEOUT', { cause: error })
    throw new VisionError(`vision request to ${request.baseURL} failed`, 'TRANSPORT', { cause: error })
  }
  if (!response.ok) {
    throw new VisionError(`vision provider returned HTTP ${response.status}`, 'PROVIDER_ERROR', {
      cause: new Error(response.statusText),
    })
  }
  let body: unknown
  try {
    body = await response.json()
  } catch (error: unknown) {
    throw new VisionError('vision provider returned an unreadable response body', 'INVALID_RESPONSE', { cause: error })
  }
  return parseVisionResponse(body)
}
