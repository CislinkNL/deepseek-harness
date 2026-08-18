/** Team task identifier brand. @module @deepseek-ai/dsh-team-tasks/brand */

import type { Branded } from '@deepseek-ai/dsh-brand'

/** Opaque identifier for one shared team-board task. */
export type TeamTaskId = Branded<'TeamTaskId'>

/**
 * Brand a validated storage identifier.
 * @param value - backend-produced opaque identifier.
 * @returns the branded identifier.
 */
export function TeamTaskId(value: string): TeamTaskId {
  return value as TeamTaskId
}
