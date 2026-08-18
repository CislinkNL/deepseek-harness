import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import TeamTaskStore, {
  TeamTaskError,
  TeamTaskId,
  TEAM_TASK_TRANSITIONS,
} from '@deepseek-ai/dsh-team-tasks'
import type { CreateTeamTask, TeamTask, UpdateTeamTask } from '@deepseek-ai/dsh-team-tasks'

/** A deterministic in-memory provider for contract tests. */
class StubStore extends TeamTaskStore {
  readonly tasks: TeamTask[] = []

  override async list(): Promise<readonly TeamTask[]> {
    return [...this.tasks]
  }

  override async create(input: CreateTeamTask): Promise<TeamTask> {
    const task: TeamTask = {
      id: TeamTaskId(`stub-${String(this.tasks.length)}`),
      title: input.title,
      priority: input.priority ?? 'medium',
      status: 'todo',
      createdAt: 1,
      updatedAt: 1,
    }
    this.tasks.push(task)
    return task
  }

  override async update(id: TeamTask['id'], patch: UpdateTeamTask): Promise<TeamTask> {
    const current = this.tasks.find(task => task.id === id)
    if (current === undefined) throw new TeamTaskError('not found', 'NOT_FOUND')
    const next = { ...current, ...patch, updatedAt: 2 }
    this.tasks[this.tasks.indexOf(current)] = next
    return next
  }

  override async remove(id: TeamTask['id']): Promise<void> {
    const index = this.tasks.findIndex(task => task.id === id)
    if (index >= 0) this.tasks.splice(index, 1)
  }
}

describe('TeamTaskStore', () => {
  it('mounts a provider as ctx.teamTasks', async () => {
    const ctx = new Context()
    await ctx.plugin(StubStore)
    expect(ctx.teamTasks).toBeInstanceOf(StubStore)
  })

  it('delegates create and list to the provider', async () => {
    const ctx = new Context()
    await ctx.plugin(StubStore)
    const created = await ctx.teamTasks.create({ title: 'bug' })
    expect(created.status).toBe('todo')
    expect(created.priority).toBe('medium')
    await expect(ctx.teamTasks.list()).resolves.toEqual([created])
  })
})

describe('TEAM_TASK_TRANSITIONS', () => {
  it('declares the team-board lanes', () => {
    expect(TEAM_TASK_TRANSITIONS).toEqual({
      todo: ['doing', 'human', 'done'],
      doing: ['done', 'todo', 'human'],
      human: ['done', 'doing', 'todo'],
      done: ['doing'],
    })
  })
})

describe('TeamTaskError', () => {
  it('carries a stable machine-routing code', () => {
    const error = new TeamTaskError('no such task', 'NOT_FOUND')
    expect(error.name).toBe('TeamTaskError')
    expect(error.code).toBe('NOT_FOUND')
  })
})
