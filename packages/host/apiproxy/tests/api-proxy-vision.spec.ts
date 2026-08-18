/**
 * Image admission on a text-only route through the `imageAdmission` extension
 * point: an optional service may convert images to text, and content that
 * still carries an image keeps the host's text-only refusal. Image-capable
 * routes pass the image through untouched.
 */

import { describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import AgentRegistry from '@deepseek-ai/dsh-agent'
import type { Agent } from '@deepseek-ai/dsh-agent'
import LlmRuntime, { LlmAdapter } from '@deepseek-ai/dsh-llm'
import type { GenerateOptions, LlmModelInfo, LlmResolvedModelInfo, StreamChunk } from '@deepseek-ai/dsh-llm'
import SessionStore from '@deepseek-ai/dsh-session'
import type { SessionId } from '@deepseek-ai/dsh-session'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import UserQuestionService from '@deepseek-ai/dsh-user-questions'
import type { PromptContentPart } from '@deepseek-ai/dsh-host-apiproxy'
import type { RpcRequest } from '@deepseek-ai/dsh-host-apiproxy/api/rpc'
import { RpcId } from '@deepseek-ai/dsh-host-apiproxy/api/rpc'
import { createApiProxy } from '../src/api-proxy.ts'

let nextRpc = 1
function request<P>(payload: P): RpcRequest<P> {
  return { rpcId: RpcId(`image-admission-${String(nextRpc++)}`), payload }
}

/** A provider adapter whose single model declares exactly the given input modalities. */
class ModalityAdapter extends LlmAdapter {
  constructor(private readonly inputModalities: readonly ('text' | 'image')[]) {
    super()
  }

  override listModels(): Promise<readonly LlmModelInfo[]> {
    return Promise.resolve([{ provider: 'modality', id: 'model', name: 'Model' }])
  }

  override resolveModel(provider: string, model: string): Promise<LlmResolvedModelInfo> {
    return Promise.resolve({ provider, id: model, name: model, inputModalities: [...this.inputModalities] })
  }

  override async *stream(_options: GenerateOptions): AsyncIterable<StreamChunk> {
    // Admission tests never enter provider streaming.
  }
}

async function harness(inputModalities: readonly ('text' | 'image')[]): Promise<{
  ctx: Context
  agent: Agent
  sessionId: SessionId
}> {
  const ctx = new Context()
  await ctx.plugin(SessionStore)
  await ctx.plugin(SystemPrompt, { persona: '' })
  await ctx.plugin(LlmRuntime)
  await ctx.plugin(UserQuestionService)
  await ctx.plugin(AgentRegistry)
  ctx.llm.registerAdapter(['modality'], new ModalityAdapter(inputModalities))
  const session = ctx.sessions.create()
  const agent = {
    id: session.id,
    session,
    status: 'idle',
    ctx,
    inbox: { nextTurn: [], nextStep: [] },
  } as unknown as Agent
  ctx.agents.register(agent)
  return { ctx, agent, sessionId: session.id }
}

const IMAGE_PART = { type: 'image' as const, mediaType: 'image/png' as const, data: 'AQ==', name: 'shot.png' }

describe('prompt image admission on a text-only route', () => {
  it('admits converted text when the imageAdmission service rewrites the image', async () => {
    const { ctx, agent, sessionId } = await harness(['text'])
    ctx.provide('imageAdmission', {
      rewriteImageParts: async (parts: readonly PromptContentPart[]) => parts.map(part => part.type === 'image'
        ? { type: 'text' as const, text: `[attached image: ${part.name ?? 'image'}]\n\ndescribed` }
        : part),
    } as never)
    const followup = vi.fn()
    Object.assign(agent, { followup })
    const api = createApiProxy(ctx, {
      defaultModelSelection: () => ({ provider: 'modality', model: 'model' }),
      cwd: '/tmp',
    })

    const result = await api.sessions.prompt(request({
      sessionId,
      mode: 'queue' as const,
      content: [IMAGE_PART, { type: 'text' as const, text: 'what is this?' }],
    }))
    expect(result.result.ok).toBe(true)
    expect((followup.mock.calls[0]?.[0] as { content: unknown[] }).content).toEqual([
      { type: 'text', text: '[attached image: shot.png]\n\ndescribed' },
      { type: 'text', text: 'what is this?' },
    ])
    await ctx.fiber.dispose()
  })

  it('refuses a text-only route when no imageAdmission service is mounted', async () => {
    const { ctx, agent, sessionId } = await harness(['text'])
    const followup = vi.fn()
    Object.assign(agent, { followup })
    const api = createApiProxy(ctx, {
      defaultModelSelection: () => ({ provider: 'modality', model: 'model' }),
      cwd: '/tmp',
    })

    const result = await api.sessions.prompt(request({
      sessionId,
      mode: 'queue' as const,
      content: [IMAGE_PART],
    }))
    expect(result.result).toMatchObject({
      ok: false,
      error: { code: 'attachment-error', details: { reason: 'MODEL_DOES_NOT_SUPPORT_IMAGES' } },
    })
    expect(followup).not.toHaveBeenCalled()
    await ctx.fiber.dispose()
  })

  it('passes an image through on an image-capable route without the extension point', async () => {
    const { ctx, agent, sessionId } = await harness(['text', 'image'])
    const rewrite = vi.fn(async (parts: readonly { type: string }[]) => parts)
    ctx.provide('imageAdmission', { rewriteImageParts: rewrite } as never)
    ctx.provide('attachments', {
      imageLimits: {
        maxImageBytes: 4, maxImagesPerMessage: 2, maxMessageImageBytes: 4, maxImagePixels: 4,
        mediaTypes: ['image/png'],
      },
      validateImage: async () => {},
      saveImage: async (input: { data: Uint8Array; mediaType: 'image/png'; name?: string }) => ({
        attachmentId: 'att-1', mediaType: input.mediaType, bytes: input.data.byteLength, width: 1, height: 1,
        ...input.name === undefined ? {} : { name: input.name },
      }),
    } as never)
    const followup = vi.fn()
    Object.assign(agent, { followup })
    const api = createApiProxy(ctx, {
      defaultModelSelection: () => ({ provider: 'modality', model: 'model' }),
      cwd: '/tmp',
    })

    const result = await api.sessions.prompt(request({
      sessionId,
      mode: 'queue' as const,
      content: [IMAGE_PART],
    }))
    expect(result.result.ok).toBe(true)
    expect(rewrite).not.toHaveBeenCalled()
    expect((followup.mock.calls[0]?.[0] as { content: unknown[] }).content).toEqual([
      { type: 'image', attachment: { attachmentId: 'att-1', mediaType: 'image/png', bytes: 1, width: 1, height: 1, name: 'shot.png' } },
    ])
    await ctx.fiber.dispose()
  })
})
