/**
 * `@deepseek-ai/dsh-team-tasks-ai`: the board's AI auto-processing consumer.
 * `process(id)` moves a task to `doing`, dispatches one agent turn over the
 * task fields, and settles `done` with the assistant report or `human` with
 * the failure note. The turn runner is protected so tests substitute a
 * scripted report without a live model.
 * @module @deepseek-ai/dsh-team-tasks-ai
 */

import { randomUUID } from 'node:crypto'
import { Context, Service } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-agent'
import type {} from '@deepseek-ai/dsh-agent-presets'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import type { Message } from '@deepseek-ai/dsh-llm'
import { SessionId } from '@deepseek-ai/dsh-session'
import type { Session, SessionEvent } from '@deepseek-ai/dsh-session'
import { TeamTaskError } from '@deepseek-ai/dsh-team-tasks'
import type { TeamTask, TeamTaskId as TeamTaskIdType } from '@deepseek-ai/dsh-team-tasks'

declare module '@deepseek-ai/cordis' {
  interface Context {
    teamTaskProcessor: TeamTaskProcessor
  }
}

/** Default maximum characters retained from the dispatched report. */
export const DEFAULT_MAX_REPORT_CHARS = 8000

/** Per-call options for one processing run. */
export interface ProcessTeamTaskOptions {
  /** Cancellation forwarded to the board read and the dispatched turn. */
  signal?: AbortSignal
}

/** Processor configuration. */
export interface Config {
  /** Maximum characters retained from the dispatched report. */
  maxReportChars?: number
}

export const Config: z<Config> = z.object({
  maxReportChars: z.number().step(1).min(1).default(DEFAULT_MAX_REPORT_CHARS),
})

/**
 * AI auto-processing consumer for the shared board. Mounted as a service; the
 * gateway's `teamTask.process` RPC consults it via `ctx.get`.
 */
export class TeamTaskProcessor extends Service {
  static inject: readonly string[] = ['agents', 'agentPresets', 'sessions']
  static Config: z<Config> = Config

  private readonly maxReportChars: number

  constructor(ctx: Context, config: Config) {
    super(ctx, 'teamTaskProcessor')
    this.maxReportChars = config.maxReportChars ?? DEFAULT_MAX_REPORT_CHARS
  }

  /**
   * Process one task: `doing`, one dispatched turn, then `done` with the
   * report or `human` with the failure note (the failure rethrows).
   * @param id - the task identifier.
   * @param options - optional cancellation.
   * @returns the settled task.
   */
  async process(id: TeamTaskIdType, options: ProcessTeamTaskOptions = {}): Promise<TeamTask> {
    const teamTasks = this.ctx.get('teamTasks')
    if (teamTasks === undefined) {
      throw new TeamTaskError('the team task board is unavailable: no team-tasks service is composed', 'UNAVAILABLE')
    }
    const listed = await teamTasks.list(options.signal)
    const task = listed.find(candidate => String(candidate.id) === String(id))
    if (task === undefined) {
      throw new TeamTaskError(`team task "${String(id)}" not found`, 'NOT_FOUND')
    }
    await teamTasks.update(id, { status: 'doing' })
    try {
      const report = await this.runTurn(task, options)
      return await teamTasks.update(id, { status: 'done', aiReport: { text: report, at: Date.now() } })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      await teamTasks.update(id, {
        status: 'human',
        aiReport: { text: `AI 处理失败：${message}`.slice(0, this.maxReportChars), at: Date.now() },
      })
      throw error
    }
  }

  /**
   * Run one agent turn over the task and return the assistant report. Tests
   * override this to script a report; production composes an agent with the
   * default preset (tools included) and awaits its turn end.
   * @param task - the task being processed.
   * @param options - optional cancellation.
   * @returns the bounded report text.
   */
  protected async runTurn(task: TeamTask, options: ProcessTeamTaskOptions): Promise<string> {
    const sessionId = SessionId(randomUUID())
    const handle = await this.ctx.agents.create({
      sessionId,
      setup: agentCtx => this.ctx.agentPresets.mount(agentCtx).then(() => undefined),
    })
    try {
      const settled = this.awaitTurnEnd(handle.agent.session, options.signal)
      handle.agent.followup(createUserMessage({
        content: [{ type: 'text', text: this.promptFor(task) }],
        source: { kind: 'plugin', plugin: 'team-tasks-ai' },
      }))
      await settled
      const messages = handle.agent.session.deriveMessages()
      const assistant = [...messages].reverse().find((message): message is Message => message.role === 'assistant')
      const text = assistant?.content
        .filter(block => block.type === 'text')
        .map(block => block.text)
        .join('') ?? ''
      if (text.trim() === '') {
        throw new TeamTaskError('the dispatched turn produced no report', 'EMPTY_REPORT')
      }
      return text.slice(0, this.maxReportChars)
    } finally {
      await handle.dispose()
    }
  }

  /** Model-facing prompt for one task dispatch. */
  private promptFor(task: TeamTask): string {
    return [
      '这是一个团队任务，请在工作区中分析并尝试修复，最后汇报：问题定位、改动内容、验证步骤。',
      '',
      `标题：${task.title}`,
      `优先级：${task.priority}`,
      ...task.section === undefined ? [] : [`板块：${task.section}`],
      ...task.notes === undefined ? [] : [`备注：${task.notes}`],
      ...task.reporter === undefined ? [] : [`上报人：${task.reporter}`],
    ].join('\n')
  }

  /** Resolve when the session's next turn ends; an error turn or abort rejects. */
  private awaitTurnEnd(session: Session, signal?: AbortSignal): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const onAbort = (): void => { reject(new Error('the dispatched turn was cancelled')) }
      signal?.addEventListener('abort', onAbort, { once: true })
      const off = this.ctx.on('session/event', (emitting: Session, event: SessionEvent) => {
        if (emitting !== session || event.type !== 'turn/end') return
        off()
        signal?.removeEventListener('abort', onAbort)
        if (event.data.reason.kind === 'error') reject(new Error('the dispatched turn failed'))
        else resolve()
      })
    })
  }
}

export default TeamTaskProcessor
