// Web e2e (host-only, keyless): image admission on a text-only route converts
// the upload to a text description through the `imageAdmission` extension
// point instead of refusing. Boots the shipped web composition through the
// Loader (launchWebScaffold) and drives the real gateway, so the assertion
// pins the durable model-visible text — not a mocked gateway.

import { expect, it } from 'vitest'
import { LlmAdapter } from '@deepseek-ai/dsh-llm'
import type {
  GenerateOptions, LlmModelInfo, LlmProviderInfo, LlmResolvedModelInfo, StreamChunk,
} from '@deepseek-ai/dsh-llm'
import { SessionId } from '@deepseek-ai/dsh-session'
import type { PromptContentPart } from '@deepseek-ai/dsh-host-apiproxy'
import { launchWebScaffold, type WebScaffold } from './scaffold.ts'

/** A text-only route whose single model declares `['text']` and settles a turn with no output. */
class TextOnlyAdapter extends LlmAdapter {
  override providerInfo(provider: string): LlmProviderInfo {
    return { id: provider, name: 'Text Only' }
  }

  override listModels(provider: string): Promise<readonly LlmModelInfo[]> {
    return Promise.resolve([{ provider, id: 'model', name: 'Text Model' }])
  }

  override resolveModel(provider: string, model: string): Promise<LlmResolvedModelInfo> {
    return Promise.resolve({ provider, id: model, name: model, inputModalities: ['text'] })
  }

  override async *stream(_options: GenerateOptions): AsyncIterable<StreamChunk> {
    yield { type: 'finish', reason: { kind: 'stop' } }
  }
}

const IMAGE_PART = {
  type: 'image' as const,
  mediaType: 'image/png' as const,
  data: 'AQ==',
  name: 'shot.png',
}

it('converts an image to a text description on a text-only route through the real gateway', async () => {
  const scaffold: WebScaffold = await launchWebScaffold()
  try {
    const ctx = scaffold.ctx
    ctx.llm.registerAdapter(['text-only'], new TextOnlyAdapter())
    // Stand-in for the external consumer plugin: provide the `imageAdmission`
    // service that converts each image part to text for the text-only route.
    ctx.provide('imageAdmission', {
      rewriteImageParts: async (parts: readonly PromptContentPart[]) => parts.map(part => part.type === 'image'
        ? { type: 'text' as const, text: `[attached image: ${part.name ?? 'image'}]\n\na dialog (${part.name ?? 'image'})` }
        : part),
    } as never)

    const sessionId = SessionId('vision-admission')
    const created = await ctx.apiProxy.sessions.create({
      rpcId: 'vision-admission-create' as never,
      payload: { sessionId, cwd: scaffold.workspaceCwd },
    })
    if (!created.result.ok) throw new Error(`session.create failed: ${created.result.error.message}`)
    // Pin the session's route to the text-only adapter the same way a prior
    // turn leaves its header behind, so selectionFor reads it on the prompt.
    ctx.sessions.get(sessionId)?.append('request/header', {
      header: { config: { provider: 'text-only', model: 'model' } },
      reason: 'initial',
    })

    const prompted = await ctx.apiProxy.sessions.prompt({
      rpcId: 'vision-admission-prompt' as never,
      payload: { sessionId, mode: 'queue' as const, content: [IMAGE_PART] },
    })
    expect(prompted.result.ok).toBe(true)

    await scaffold.whenTurnSettled(10_000)
    const messages = ctx.sessions.get(sessionId)?.deriveMessages() ?? []
    expect(messages).toContainEqual(expect.objectContaining({
      role: 'user',
      content: [{ type: 'text', text: '[attached image: shot.png]\n\na dialog (shot.png)' }],
    }))
    // No image block may enter the durable log on a text-only route.
    expect(messages.flatMap(message => message.content)).not.toContainEqual(
      expect.objectContaining({ type: 'image' }),
    )
  } finally {
    await scaffold.close()
  }
})
