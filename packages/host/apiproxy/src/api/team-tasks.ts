/**
 * team-tasks domain contract. The board is shared and session-independent, so
 * every method is unary over the composed `teamTasks` service and takes no
 * sessionId; method signatures are the source of truth.
 */

import type { Branded } from '@deepseek-ai/dsh-brand'
import type { RpcRequest, RpcResponse } from './rpc.ts'

/** Identifies one shared team-board task. */
export type TeamTaskId = Branded<'TeamTaskId'>

/** Board status lane; the store enforces the transition state machine. */
export type TeamTaskStatus = 'todo' | 'doing' | 'human' | 'done'

/** Three-level priority and severity vocabulary. */
export type TeamTaskPriority = 'high' | 'medium' | 'low'

/** The AI processing run's report. */
export interface TeamTaskAiReport {
  text: string
  at: number
}

/** One shared team-board task, as the wire view. */
export interface TeamTaskView {
  id: TeamTaskId
  title: string
  section?: string
  priority: TeamTaskPriority
  severity?: TeamTaskPriority
  reporter?: string
  assignee?: string
  notes?: string
  due?: string
  model?: string
  status: TeamTaskStatus
  aiReport?: TeamTaskAiReport
  createdAt: number
  updatedAt: number
}

/** Create fields accepted by the store. */
export interface TeamTaskCreateFields {
  title: string
  section?: string
  priority?: TeamTaskPriority
  severity?: TeamTaskPriority
  reporter?: string
  assignee?: string
  notes?: string
  due?: string
  model?: string
}

/** Update fields accepted by the store; `status` follows the transition state machine. */
export interface TeamTaskUpdateFields {
  title?: string
  section?: string
  priority?: TeamTaskPriority
  severity?: TeamTaskPriority
  assignee?: string
  notes?: string
  due?: string
  model?: string
  status?: TeamTaskStatus
  aiReport?: TeamTaskAiReport
}

/** Team-task domain unary methods over the shared board. */
export interface TeamTasksApi {
  /** List every task, newest mutation first. */
  list(request: RpcRequest<{}>): Promise<RpcResponse<{ tasks: TeamTaskView[] }>>

  /** Create one task; status starts at `todo`. */
  create(request: RpcRequest<TeamTaskCreateFields>): Promise<RpcResponse<{ task: TeamTaskView }>>

  /** Patch one task; the store rejects illegal status transitions. */
  update(request: RpcRequest<{ id: TeamTaskId; patch: TeamTaskUpdateFields }>):
  Promise<RpcResponse<{ task: TeamTaskView }>>

  /** Remove one task; removing an absent id is a no-op. */
  remove(request: RpcRequest<{ id: TeamTaskId }>): Promise<RpcResponse<{ removed: true }>>

  /** Dispatch one AI processing run for the task (analysis + fix attempt + report). */
  process(request: RpcRequest<{ id: TeamTaskId }>): Promise<RpcResponse<{ task: TeamTaskView }>>
}
