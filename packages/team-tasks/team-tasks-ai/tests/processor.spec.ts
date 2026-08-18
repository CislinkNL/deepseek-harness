import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { TeamTaskError } from '@deepseek-ai/dsh-team-tasks'
import type { TeamTask, TeamTaskId as TeamTaskIdType } from '@deepseek-ai/dsh-team-tasks'
import JsonTeamTaskStore from '@deepseek-ai/dsh-team-tasks-json'
import TeamTaskProcessor from '@deepseek-ai/dsh-team-tasks-ai'

/** Scripted processor: no agent composition, a fixed report per run. */
class ScriptedProcessor extends TeamTaskProcessor {
  static override inject: readonly string[] = []

  readonly reports: string[] = []

  protected override async runTurn(task: TeamTask): Promise<string> {
    this.reports.push(task.title)
    return 'analysis: found and fixed'
  }
}

let dir: string
let ctx: Context

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'dsh-team-tasks-ai-'))
  ctx = new Context()
  await ctx.plugin(JsonTeamTaskStore, { path: join(dir, 'board.json') })
  await ctx.plugin(ScriptedProcessor, {})
})

afterEach(async () => {
  await ctx.fiber.dispose()
  await rm(dir, { recursive: true, force: true })
})

describe('TeamTaskProcessor', () => {
  it('settles a todo task as done with the report', async () => {
    const created = await ctx.teamTasks.create({ title: 'checkout hangs', notes: 'repro' })
    const settled = await ctx.teamTaskProcessor.process(created.id)
    expect(settled.status).toBe('done')
    expect(settled.aiReport?.text).toBe('analysis: found and fixed')
  })

  it('rejects an unknown task with NOT_FOUND', async () => {
    await expect(ctx.teamTaskProcessor.process('missing' as TeamTaskIdType))
      .rejects.toThrow(expect.objectContaining({ code: 'NOT_FOUND' }))
  })

  it('marks human and records the failure note when the turn throws', async () => {
    const created = await ctx.teamTasks.create({ title: 'boom' })
    const failing = new Context()
    await failing.plugin(JsonTeamTaskStore, { path: join(dir, 'board.json') })
    await failing.plugin(class extends TeamTaskProcessor {
      static override inject = [] as const
      protected override async runTurn(): Promise<string> {
        throw new TeamTaskError('the dispatched turn failed', 'TURN_FAILED')
      }
    }, {})
    await expect(failing.teamTaskProcessor.process(created.id)).rejects.toThrow(expect.objectContaining({ code: 'TURN_FAILED' }))
    const listed = await failing.teamTasks.list()
    expect(listed[0]?.status).toBe('human')
    expect(listed[0]?.aiReport?.text).toContain('AI 处理失败')
    await failing.fiber.dispose()
  })
})
