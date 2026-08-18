/**
 * team-tasks domain over the real gateway: the composed `teamTasks` service
 * answers list/create/update/remove directly (session-independent), an absent
 * service reports the deployment gap, and store rejections ride the
 * `team-task-error` wire code.
 */

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import AgentRegistry from '@deepseek-ai/dsh-agent'
import LlmRuntime from '@deepseek-ai/dsh-llm'
import SessionStore from '@deepseek-ai/dsh-session'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import UserQuestionService from '@deepseek-ai/dsh-user-questions'
import JsonTeamTaskStore from '@deepseek-ai/dsh-team-tasks-json'
import type { RpcRequest } from '@deepseek-ai/dsh-host-apiproxy/api/rpc'
import { RpcId } from '@deepseek-ai/dsh-host-apiproxy/api/rpc'
import { createApiProxy } from '../src/api-proxy.ts'

let nextRpc = 1
function request<P>(payload: P): RpcRequest<P> {
  return { rpcId: RpcId(`team-tasks-${String(nextRpc++)}`), payload }
}

let dir: string
let ctx: Context

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'dsh-team-tasks-gw-'))
  ctx = new Context()
  await ctx.plugin(SessionStore)
  await ctx.plugin(SystemPrompt, { persona: '' })
  await ctx.plugin(LlmRuntime)
  await ctx.plugin(UserQuestionService)
  await ctx.plugin(AgentRegistry)
  await ctx.plugin(JsonTeamTaskStore, { path: join(dir, 'board.json') })
})

afterEach(async () => {
  await ctx.fiber.dispose()
  await rm(dir, { recursive: true, force: true })
})

function gateway(): ReturnType<typeof createApiProxy> {
  return createApiProxy(ctx, {
    defaultModelSelection: () => ({ provider: 'unused', model: 'unused' }),
    cwd: '/tmp',
  })
}

describe('team-tasks domain over the gateway', () => {
  it('creates, lists, updates, and removes tasks', async () => {
    const api = gateway()
    const created = await api.teamTasks.create(request({ title: 'bug: checkout hangs', priority: 'high' }))
    if (!created.result.ok) throw new Error('create failed')
    expect(created.result.value.task.title).toBe('bug: checkout hangs')
    expect(created.result.value.task.status).toBe('todo')

    const listed = await api.teamTasks.list(request({}))
    if (!listed.result.ok) throw new Error('list failed')
    expect(listed.result.value.tasks).toHaveLength(1)

    const moved = await api.teamTasks.update(request({
      id: created.result.value.task.id,
      patch: { status: 'doing', assignee: 'worker' },
    }))
    if (!moved.result.ok) throw new Error('update failed')
    expect(moved.result.value.task.status).toBe('doing')
    expect(moved.result.value.task.assignee).toBe('worker')

    const removed = await api.teamTasks.remove(request({ id: created.result.value.task.id }))
    if (!removed.result.ok) throw new Error('remove failed')
    expect(removed.result.value.removed).toBe(true)
    const empty = await api.teamTasks.list(request({}))
    if (!empty.result.ok) throw new Error('list failed')
    expect(empty.result.value.tasks).toHaveLength(0)
  })

  it('reports team-task-error for an illegal transition', async () => {
    const api = gateway()
    const created = await api.teamTasks.create(request({ title: 'done task' }))
    if (!created.result.ok) throw new Error('create failed')
    const id = created.result.value.task.id
    await api.teamTasks.update(request({ id, patch: { status: 'done' } }))
    const illegal = await api.teamTasks.update(request({ id, patch: { status: 'todo' } }))
    expect(illegal.result).toMatchObject({
      ok: false,
      error: { code: 'team-task-error', details: { reason: 'ILLEGAL_TRANSITION' } },
    })
  })

  it('reports the deployment gap when no team-tasks service is composed', async () => {
    await ctx.fiber.dispose()
    ctx = new Context()
    await ctx.plugin(SessionStore)
    await ctx.plugin(SystemPrompt, { persona: '' })
    await ctx.plugin(LlmRuntime)
    await ctx.plugin(UserQuestionService)
    await ctx.plugin(AgentRegistry)
    const api = gateway()
    const result = await api.teamTasks.list(request({}))
    expect(result.result).toMatchObject({
      ok: false,
      error: { code: 'team-task-error', details: { reason: 'UNAVAILABLE' } },
    })
  })
})
