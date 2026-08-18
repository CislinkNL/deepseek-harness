import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { apply } from '../src/index.ts'
import type { PromptContentPart } from '@deepseek-ai/dsh-host-apiproxy'

const IMAGE: PromptContentPart = { type: 'image', mediaType: 'image/png', data: 'AQ==', name: 'shot.png' }
const TEXT: PromptContentPart = { type: 'text', text: '看看这个' }

function mount(projectContext?: string): Context {
  const ctx = new Context()
  apply(ctx, projectContext === undefined ? {} : { projectContext })
  return ctx
}

describe('vision-attachment image admission', () => {
  it('converts image parts to text through the vision service', async () => {
    const ctx = mount('收银系统 POS')
    ctx.provide('vision', {
      analyzeImage: async (input: { name?: string }) => ({ text: `described ${input.name ?? 'image'}` }),
    } as never)
    const admission = ctx.get('imageAdmission')
    if (admission === undefined) throw new Error('imageAdmission not provided')
    await expect(admission.rewriteImageParts([IMAGE, TEXT], 'model')).resolves.toEqual([
      { type: 'text', text: '[attached image: shot.png]\n\n收银系统 POS\n\ndescribed shot.png' },
      TEXT,
    ])
    await ctx.fiber.dispose()
  })

  it('leaves image parts untouched when no vision service is mounted', async () => {
    const ctx = mount()
    const admission = ctx.get('imageAdmission')
    if (admission === undefined) throw new Error('imageAdmission not provided')
    await expect(admission.rewriteImageParts([IMAGE], 'model')).resolves.toEqual([IMAGE])
    await ctx.fiber.dispose()
  })
})
