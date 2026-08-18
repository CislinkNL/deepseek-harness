import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import type { TeamTaskId as TeamTaskIdType } from '@deepseek-ai/dsh-team-tasks'
import JsonTeamTaskStore from '@deepseek-ai/dsh-team-tasks-json'

let dir: string
let path: string
let ctx: Context
let store: JsonTeamTaskStore

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'dsh-team-tasks-'))
  path = join(dir, 'board.json')
  ctx = new Context()
  await ctx.plugin(JsonTeamTaskStore, { path })
  store = ctx.teamTasks as JsonTeamTaskStore
})

afterEach(async () => {
  await ctx.fiber.dispose()
  await rm(dir, { recursive: true, force: true })
})

describe('JsonTeamTaskStore', () => {
  it('creates a task with todo status and medium priority defaults', async () => {
    const task = await store.create({ title: '  checkout hangs  ' })
    expect(task.title).toBe('checkout hangs')
    expect(task.status).toBe('todo')
    expect(task.priority).toBe('medium')
    await expect(store.list()).resolves.toEqual([task])
  })

  it('rejects an empty title and unknown enum values', async () => {
    await expect(store.create({ title: '   ' })).rejects.toThrow(expect.objectContaining({ code: 'EMPTY_TITLE' }))
    await expect(store.create({ title: 'x', priority: 'urgent' as never }))
      .rejects.toThrow(expect.objectContaining({ code: 'INVALID_FIELD' }))
  })

  it('moves tasks along legal transitions and refuses illegal ones', async () => {
    const task = await store.create({ title: 'bug' })
    const doing = await store.update(task.id, { status: 'doing' })
    expect(doing.status).toBe('doing')
    const done = await store.update(task.id, { status: 'done' })
    expect(done.status).toBe('done')
    await expect(store.update(task.id, { status: 'todo' }))
      .rejects.toThrow(expect.objectContaining({ code: 'ILLEGAL_TRANSITION' }))
    const reopened = await store.update(task.id, { status: 'doing' })
    expect(reopened.status).toBe('doing')
  })

  it('fails NOT_FOUND on updating an absent task and removes idempotently', async () => {
    await expect(store.update('missing' as TeamTaskIdType, { status: 'doing' }))
      .rejects.toThrow(expect.objectContaining({ code: 'NOT_FOUND' }))
    await expect(store.remove('missing' as TeamTaskIdType)).resolves.toBeUndefined()
  })

  it('persists across store instances and preserves unknown extra fields', async () => {
    const task = await store.create({ title: 'durable', notes: 'hand-off' })
    await ctx.fiber.dispose()
    const raw = JSON.parse(await readFile(path, 'utf8')) as { tasks: Array<Record<string, unknown>> }
    raw.tasks[0]!['futureField'] = 'kept'
    await writeFile(path, JSON.stringify(raw, null, 2) + '\n')

    const second = new Context()
    await second.plugin(JsonTeamTaskStore, { path })
    const reloaded = await second.teamTasks.list()
    expect(reloaded).toHaveLength(1)
    expect(reloaded[0]?.title).toBe('durable')
    await second.teamTasks.update(task.id, { assignee: 'worker' })
    const rewritten = JSON.parse(await readFile(path, 'utf8')) as { tasks: Array<Record<string, unknown>> }
    expect(rewritten.tasks[0]?.['futureField']).toBe('kept')
    expect(rewritten.tasks[0]?.['assignee']).toBe('worker')
    await second.fiber.dispose()
  })

  it('reports CORRUPT on an unreadable document', async () => {
    await writeFile(path, '{ not json')
    await expect(store.list()).rejects.toThrow(expect.objectContaining({ code: 'CORRUPT' }))
  })

  it('sorts the board by newest mutation first', async () => {
    const first = await store.create({ title: 'first' })
    await store.update(first.id, { notes: 'touched' })
    await store.create({ title: 'second' })
    const [head] = await store.list()
    expect(head?.title).toBe('second')
  })

  it('rejects an empty configured path at construction', async () => {
    const bad = new Context()
    await expect(bad.plugin(JsonTeamTaskStore, { path: '  ' }))
      .rejects.toThrow(expect.objectContaining({ code: 'INVALID_CONFIG' }))
    await bad.fiber.dispose()
  })
})
