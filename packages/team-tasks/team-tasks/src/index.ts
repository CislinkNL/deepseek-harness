/**
 * Service Definition for the shared team task board seam (`ctx.teamTasks`).
 * Unlike the per-session log, the board is shared, multi-user, and
 * cross-session: it needs its own durable store. Providers own persistence and
 * enforce the status state machine; consumers (the Web board surface and the
 * AI auto-processing loop) read and mutate through these four operations.
 * @module @deepseek-ai/dsh-team-tasks
 */

import { Context, Service } from '@deepseek-ai/cordis'
import type {
  CreateTeamTask,
  TeamTask,
  TeamTaskStatus,
  UpdateTeamTask,
} from './types.ts'
import type { TeamTaskId as TeamTaskIdType } from './brand.ts'

export { TeamTaskError } from './error.ts'
export { TeamTaskId } from './brand.ts'
export type {
  CreateTeamTask,
  TeamTask,
  TeamTaskId as TeamTaskIdType,
  TeamTaskPriority,
  TeamTaskStatus,
  UpdateTeamTask,
} from './types.ts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    teamTasks: TeamTaskStore
  }
}

/** Legal status transitions, keyed by the current status. */
export const TEAM_TASK_TRANSITIONS: Readonly<Record<TeamTaskStatus, readonly TeamTaskStatus[]>> = {
  todo: ['doing', 'human', 'done'],
  doing: ['done', 'todo', 'human'],
  human: ['done', 'doing', 'todo'],
  done: ['doing'],
}

/**
 * Abstract team task board service. Providers implement durable CRUD over
 * their storage and enforce {@link TEAM_TASK_TRANSITIONS} on status patches.
 */
export abstract class TeamTaskStore extends Service {
  constructor(ctx: Context) {
    super(ctx, 'teamTasks')
  }

  /**
   * List every task, newest mutation first.
   * @param signal - optional cancellation for storage reads.
   * @returns the current board.
   */
  abstract list(signal?: AbortSignal): Promise<readonly TeamTask[]>

  /**
   * Create one task with a non-empty title; priority defaults to `medium` and
   * the initial status is `todo`.
   * @param input - the create fields.
   * @returns the stored task.
   */
  abstract create(input: CreateTeamTask): Promise<TeamTask>

  /**
   * Patch one task. A `status` patch must be a legal transition from the
   * task's current status; an unknown id fails with `NOT_FOUND`.
   * @param id - the task identifier.
   * @param patch - the fields to change.
   * @returns the stored task after the patch.
   */
  abstract update(id: TeamTaskIdType, patch: UpdateTeamTask): Promise<TeamTask>

  /**
   * Remove one task; removing an absent id is a no-op.
   * @param id - the task identifier.
   */
  abstract remove(id: TeamTaskIdType): Promise<void>
}

export default TeamTaskStore
