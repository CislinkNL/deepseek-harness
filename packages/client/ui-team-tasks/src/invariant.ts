/** Package-owned invariant companion for `@deepseek-ai/dsh-client-ui-team-tasks`.
 *  @module @deepseek-ai/dsh-client-ui-team-tasks/invariant */

/* jscpd:ignore-start */
import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-client-ui-team-tasks'
/** Cordis companion plugin name. */
export const name = 'ui-team-tasks-invariant'
/** Service required before package ownership can be reserved. */
export const inject = ['invariants']
/** No runtime invariant: the browser-side board renders RPC data verbatim; the host store owns validation. */
const install: InvariantInstaller = () => {}
/**
 * Register the package invariant companion.
 * @param ctx - Cordis context carrying the invariant service.
 * @returns the registration disposer.
 */
export const apply = (ctx: Context): Promise<() => void> => Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
/* jscpd:ignore-end */
