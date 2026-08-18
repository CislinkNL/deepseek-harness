/** Team task board vocabulary. @module @deepseek-ai/dsh-team-tasks/types */

import type { TeamTaskId } from './brand.ts'

export type { TeamTaskId } from './brand.ts'

/** Board status lane; transitions are enforced by the store's state machine. */
export type TeamTaskStatus = 'todo' | 'doing' | 'human' | 'done'

/** Three-level priority and severity vocabulary. */
export type TeamTaskPriority = 'high' | 'medium' | 'low'

/** One shared team-board task. */
export interface TeamTask {
  /** Opaque storage identifier; never a display handle or path. */
  id: TeamTaskId
  /** Non-empty one-line title. */
  title: string
  /** Deployment-defined board section id, for example `pos-desktop`. */
  section?: string
  /** Task priority; defaults to `medium`. */
  priority: TeamTaskPriority
  /** Reported severity, for bug-style entries. */
  severity?: TeamTaskPriority
  /** Who reported the task; immutable after creation. */
  reporter?: string
  /** Who currently owns the task. */
  assignee?: string
  /** Free-form notes and hand-off context. */
  notes?: string
  /** Optional due date in `YYYY-MM-DD` form. */
  due?: string
  /** Model route the AI processing should use, when configured. */
  model?: string
  /** Current status lane. */
  status: TeamTaskStatus
  /** The AI processing run's report, when one has completed. */
  aiReport?: { text: string; at: number }
  /** Creation epoch milliseconds. */
  createdAt: number
  /** Last-mutation epoch milliseconds. */
  updatedAt: number
}

/** Fields accepted when creating one task. */
export interface CreateTeamTask {
  /** Non-empty one-line title. */
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

/** Fields accepted when updating one task; `status` transitions follow the state machine. */
export interface UpdateTeamTask {
  title?: string
  section?: string
  priority?: TeamTaskPriority
  severity?: TeamTaskPriority
  assignee?: string
  notes?: string
  due?: string
  model?: string
  status?: TeamTaskStatus
  aiReport?: { text: string; at: number }
}
