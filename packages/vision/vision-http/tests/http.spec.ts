import { createServer } from 'node:http'
import type { IncomingMessage, Server, ServerResponse } from 'node:http'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import {
  analyzeImageHttp,
  buildVisionBody,
  encodeImageDataUrl,
  HttpVisionService,
  parseVisionResponse,
} from '@deepseek-ai/dsh-vision-http'
import type { VisionHttpRequest } from '@deepseek-ai/dsh-vision-http'

const REQUEST: VisionHttpRequest = {
  baseURL: 'https://vision.example',
  apiKey: 'test-key',
  model: 'glm-4v-flash',
  maxTokens: 1024,
  timeoutMs: 5000,
  dataUrl: 'data:image/png;base64,AAAA',
  instruction: 'describe it',
}

function okResponse(text: string, status = 200): Response {
  return new Response(JSON.stringify({ choices: [{ message: { content: text } }] }), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('client helpers', () => {
  it('encodes a base64 data URL', () => {
    expect(encodeImageDataUrl('image/png', new Uint8Array([0x89, 0x50]))).toBe('data:image/png;base64,iVA=')
  })

  it('builds an OpenAI-compatible body with image and text content', () => {
    const body = JSON.parse(buildVisionBody('glm-4v-flash', 1024, 'data:image/png;base64,AAAA', 'describe it')) as {
      model: string
      max_tokens: number
      messages: Array<{ role: string; content: Array<Record<string, unknown>> }>
    }
    expect(body).toEqual({
      model: 'glm-4v-flash',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: 'data:image/png;base64,AAAA' } },
          { type: 'text', text: 'describe it' },
        ],
      }],
    })
  })

  it('parses the provider text and trims it', () => {
    expect(parseVisionResponse({ choices: [{ message: { content: '  hi  ' } }] })).toBe('hi')
  })

  it('throws EMPTY_RESPONSE on a missing or empty description', () => {
    expect(() => parseVisionResponse({})).toThrow(expect.objectContaining({ code: 'EMPTY_RESPONSE' }))
    expect(() => parseVisionResponse({ choices: [{ message: { content: '' } }] })).toThrow(expect.objectContaining({ code: 'EMPTY_RESPONSE' }))
  })
})

describe('analyzeImageHttp', () => {
  it('returns the provider description', async () => {
    const text = await analyzeImageHttp(REQUEST, undefined, async () => okResponse('a login form'))
    expect(text).toBe('a login form')
  })

  it('maps a non-2xx response to PROVIDER_ERROR', async () => {
    await expect(analyzeImageHttp(REQUEST, undefined, async () => okResponse('nope', 401)))
      .rejects.toThrow(expect.objectContaining({ code: 'PROVIDER_ERROR' }))
  })

  it('maps a transport rejection to TRANSPORT', async () => {
    await expect(analyzeImageHttp(REQUEST, undefined, async () => { throw new TypeError('fetch failed') }))
      .rejects.toThrow(expect.objectContaining({ code: 'TRANSPORT' }))
  })

  it('maps unreadable JSON to INVALID_RESPONSE', async () => {
    await expect(analyzeImageHttp(REQUEST, undefined, async () => new Response('not-json', { status: 200 })))
      .rejects.toThrow(expect.objectContaining({ code: 'INVALID_RESPONSE' }))
  })

  it('passes redirect: error so a credentialed request never follows a redirect', async () => {
    const seen: RequestInit[] = []
    await analyzeImageHttp(REQUEST, undefined, async (_url, init) => {
      seen.push(init ?? {})
      return okResponse('ok')
    })
    expect(seen[0]?.redirect).toBe('error')
  })

  it('never contacts the redirect target when the endpoint answers 3xx', async () => {
    let redirected = 0
    const target = await listen((_req, res) => {
      redirected += 1
      res.writeHead(200).end('reached')
    })
    const endpoint = await listen((_req, res) => {
      res.writeHead(302, { location: target.url }).end()
    })
    await expect(analyzeImageHttp({ ...REQUEST, baseURL: endpoint.url }))
      .rejects.toThrow(expect.objectContaining({ code: 'TRANSPORT' }))
    expect(redirected).toBe(0)
    endpoint.close()
    target.close()
  })
})

describe('HttpVisionService', () => {
  it('describes an image with a literal API key', async () => {
    vi.stubGlobal('fetch', async () => okResponse('a receipt total'))
    const ctx = new Context()
    await ctx.plugin(HttpVisionService, { apiKey: 'literal' })
    await expect(ctx.vision.analyzeImage({ data: new Uint8Array([1]), mediaType: 'image/png' }))
      .resolves.toEqual({ text: 'a receipt total' })
  })

  it('rejects an empty image', async () => {
    const ctx = new Context()
    await ctx.plugin(HttpVisionService, { apiKey: 'literal' })
    await expect(ctx.vision.analyzeImage({ data: new Uint8Array(0), mediaType: 'image/png' }))
      .rejects.toThrow(expect.objectContaining({ code: 'INVALID_IMAGE' }))
  })

  it('rejects an oversized image before any request', async () => {
    const fetch = vi.fn(async () => okResponse('x'))
    vi.stubGlobal('fetch', fetch)
    const ctx = new Context()
    await ctx.plugin(HttpVisionService, { apiKey: 'literal', maxImageBytes: 4 })
    await expect(ctx.vision.analyzeImage({ data: new Uint8Array(5), mediaType: 'image/png' }))
      .rejects.toThrow(expect.objectContaining({ code: 'IMAGE_TOO_LARGE' }))
    expect(fetch).not.toHaveBeenCalled()
  })

  it('fails with NO_API_KEY when no credential resolves', async () => {
    const ctx = new Context()
    await ctx.plugin(HttpVisionService, { apiKeyEnv: 'VISION_UNSET_KEY_XYZ' })
    await expect(ctx.vision.analyzeImage({ data: new Uint8Array([1]), mediaType: 'image/png' }))
      .rejects.toThrow(expect.objectContaining({ code: 'NO_API_KEY' }))
  })

  it('bounds the description to maxResponseChars', async () => {
    vi.stubGlobal('fetch', async () => okResponse('1234567890'))
    const ctx = new Context()
    await ctx.plugin(HttpVisionService, { apiKey: 'literal', maxResponseChars: 4 })
    await expect(ctx.vision.analyzeImage({ data: new Uint8Array([1]), mediaType: 'image/png' }))
      .resolves.toEqual({ text: '1234' })
  })
})

/** Start an HTTP server on an ephemeral port and return it with its base URL. */
async function listen(handler: (req: IncomingMessage, res: ServerResponse) => void): Promise<Server & { url: string }> {
  const server = createServer(handler)
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (address === null || typeof address === 'string') throw new Error('no port')
  return Object.assign(server, { url: `http://127.0.0.1:${address.port}` })
}
