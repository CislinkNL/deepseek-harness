/**
 * Web team task board plugin, client half. Provides a floating board button
 * over the conversation shell plus the board dialog it opens. Registers into
 * the shipped `shell.overlay` list slot (additive, root scope) and waits on
 * its declaration through `slots.inject`; the wire calls ride the shared
 * connection's `teamTasks` RPC domain as plain callbacks.
 * @module @deepseek-ai/dsh-client-ui-team-tasks/client
 */

import type { Context } from '@deepseek-ai/cordis'
import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client'
// Type-only: brings the `ctx.slots` Context merge into this program.
import type {} from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: brings the `shell.overlay` SlotMap declaration into this program.
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import { TeamBoard } from './TeamBoard.tsx'
import type { TeamBoardActions } from './TeamBoard.tsx'

export type { TeamBoardActions } from './TeamBoard.tsx'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'ui-team-tasks'

/** The shared connection (RPC face) and the slot registry must exist before the board mounts. */
export const inject = ['connection', 'slots'] as const

/**
 * Register the board into `shell.overlay`.
 * @param ctx - client cordis context supplying the shared connection.
 */
export function apply(ctx: Context): void {
  // The client connection service is provided without a Context declaration,
  // so the read narrows explicitly.
  const connection = ctx.get('connection') as ConnectionHandle | undefined
  if (connection === undefined) {
    throw new Error('ui-team-tasks: no connection service mounted — the board cannot reach the teamTask RPC domain')
  }
  ctx.slots.inject('shell.overlay', () => ctx.slots.register({
    name: 'shell.overlay',
    id: 'team-tasks',
    inject: (): TeamBoardActions => ({
      listTasks: () => connection.api.teamTasks.list({}),
      createTask: fields => connection.api.teamTasks.create(fields),
      updateTask: (id, patch) => connection.api.teamTasks.update({ id, patch }),
      removeTask: id => connection.api.teamTasks.remove({ id }),
      processTask: id => connection.api.teamTasks.process({ id }),
    }),
  }, TeamBoard))
}
