import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import VisionService, { VisionError } from '@deepseek-ai/dsh-vision'
import type { AnalyzeImageInput, AnalyzeImageResult } from '@deepseek-ai/dsh-vision'

/** A deterministic vision provider for contract tests. */
class StubVision extends VisionService {
  analyzeImage(_input: AnalyzeImageInput): Promise<AnalyzeImageResult> {
    return Promise.resolve({ text: 'a dialog with an OK button' })
  }
}

describe('VisionService', () => {
  it('mounts a provider as ctx.vision', async () => {
    const ctx = new Context()
    await ctx.plugin(StubVision)
    expect(ctx.vision).toBeInstanceOf(StubVision)
  })

  it('delegates analyzeImage to the provider', async () => {
    const ctx = new Context()
    await ctx.plugin(StubVision)
    await expect(ctx.vision.analyzeImage({ data: new Uint8Array([1]), mediaType: 'image/png' }))
      .resolves.toEqual({ text: 'a dialog with an OK button' })
  })
})

describe('VisionError', () => {
  it('carries a stable machine-routing code', () => {
    const error = new VisionError('no key', 'NO_API_KEY')
    expect(error.name).toBe('VisionError')
    expect(error.code).toBe('NO_API_KEY')
  })
})
