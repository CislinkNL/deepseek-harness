/**
 * File attachment admission over the real gateway: each file part is written
 * under the session cwd's `.dsh-uploads/` and replaced by a workspace-path
 * text part, for every model route; limits and invalid names fail loud.
 */

import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import AgentRegistry from '@deepseek-ai/dsh-agent'
import type { Agent } from '@deepseek-ai/dsh-agent'
import LlmRuntime, { LlmAdapter } from '@deepseek-ai/dsh-llm'
import type { LlmModelInfo, LlmResolvedModelInfo } from '@deepseek-ai/dsh-llm'
import SessionStore from '@deepseek-ai/dsh-session'
import type { SessionId } from '@deepseek-ai/dsh-session'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import UserQuestionService from '@deepseek-ai/dsh-user-questions'
import type { RpcRequest } from '@deepseek-ai/dsh-host-apiproxy/api/rpc'
import { RpcId } from '@deepseek-ai/dsh-host-apiproxy/api/rpc'
import { createApiProxy } from '../src/api-proxy.ts'

let nextRpc = 1
function request<P>(payload: P): RpcRequest<P> {
  return { rpcId: RpcId(`file-admission-${String(nextRpc++)}`), payload }
}

/** A route-only adapter so the gateway's model resolution succeeds; no streaming happens. */
class RouteAdapter extends LlmAdapter {
  override listModels(): Promise<readonly LlmModelInfo[]> {
    return Promise.resolve([])
  }

  override resolveModel(provider: string, model: string): Promise<LlmResolvedModelInfo> {
    return Promise.resolve({ provider, id: model, name: model })
  }

  override async *stream(): AsyncIterable<never> {}
}

let dir: string
let ctx: Context
let agent: Agent
let sessionId: SessionId

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'dsh-file-admission-'))
  ctx = new Context()
  await ctx.plugin(SessionStore)
  await ctx.plugin(SystemPrompt, { persona: '' })
  await ctx.plugin(LlmRuntime)
  await ctx.plugin(UserQuestionService)
  await ctx.plugin(AgentRegistry)
  ctx.llm.registerAdapter(['unused'], new RouteAdapter())
  const session = ctx.sessions.create()
  agent = {
    id: session.id,
    session,
    status: 'idle',
    ctx,
    inbox: { nextTurn: [], nextStep: [] },
  } as unknown as Agent
  ctx.agents.register(agent)
  sessionId = session.id
})

afterEach(async () => {
  await ctx.fiber.dispose()
  await rm(dir, { recursive: true, force: true })
})

function gateway(maxFileBytes?: number, maxFilesPerMessage?: number): ReturnType<typeof createApiProxy> {
  return createApiProxy(ctx, {
    defaultModelSelection: () => ({ provider: 'unused', model: 'unused' }),
    cwd: dir,
    ...maxFileBytes === undefined ? {} : { maxFileBytes },
    ...maxFilesPerMessage === undefined ? {} : { maxFilesPerMessage },
  })
}

const FILE_PART = { type: 'file' as const, name: 'notes.txt', data: 'aGVsbG8=', size: 5 }
const TEXT_PART = { type: 'text' as const, text: 'see the file' }

describe('file admission over the gateway', () => {
  it('writes the file into the workspace and admits a path text part', async () => {
    const followup = vi.fn()
    Object.assign(agent, { followup })
    const api = gateway()
    const result = await api.sessions.prompt(request({
      sessionId,
      mode: 'queue' as const,
      content: [FILE_PART, TEXT_PART],
    }))
    expect(result.result.ok).toBe(true)
    const content = (followup.mock.calls[0]?.[0] as { content: Array<{ type: string; text?: string }> }).content
    expect(content).toHaveLength(2)
    expect(content[0]?.type).toBe('text')
    expect(content[0]?.text).toContain('📎 附件「notes.txt」(文件)已保存到')
    expect(content[0]?.text).toContain('.dsh-uploads')
    expect(content[1]).toEqual(TEXT_PART)
    const stored = await readdir(join(dir, '.dsh-uploads'))
    expect(stored).toHaveLength(1)
    const bytes = await readFile(join(dir, '.dsh-uploads', stored[0]!))
    expect(new TextDecoder().decode(bytes)).toBe('hello')
  })

  it('refuses a file over the byte limit', async () => {
    const api = gateway(4)
    const result = await api.sessions.prompt(request({
      sessionId,
      mode: 'queue' as const,
      content: [FILE_PART],
    }))
    expect(result.result).toMatchObject({
      ok: false,
      error: { code: 'attachment-error', details: { reason: 'FILE_TOO_LARGE' } },
    })
  })

  it('refuses more files than the message limit', async () => {
    const api = gateway(undefined, 1)
    const result = await api.sessions.prompt(request({
      sessionId,
      mode: 'queue' as const,
      content: [FILE_PART, { ...FILE_PART, name: 'second.txt' }],
    }))
    expect(result.result).toMatchObject({
      ok: false,
      error: { code: 'attachment-error', details: { reason: 'TOO_MANY_FILES' } },
    })
  })

  it('rejects a path-traversal name', async () => {
    const followup = vi.fn()
    Object.assign(agent, { followup })
    const api = gateway()
    const result = await api.sessions.prompt(request({
      sessionId,
      mode: 'queue' as const,
      content: [{ ...FILE_PART, name: '../../etc/passwd' }],
    }))
    expect(result.result.ok).toBe(true)
    const content = (followup.mock.calls[0]?.[0] as { content: Array<{ text?: string }> }).content
    // The leaf is stored, never the traversal path.
    expect(content[0]?.text).toContain('.dsh-uploads')
    expect(content[0]?.text).not.toContain('..')
  })
})
