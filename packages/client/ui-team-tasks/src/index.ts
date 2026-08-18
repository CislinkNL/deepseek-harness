/**
 * Web team task board plugin, node half.
 *
 * Deliberately empty. The board is a browser-side surface only: the host-side
 * `teamTasks` service and its RPC domain are composed wherever the deployment
 * mounts them, and this package contributes no model-facing or host surface.
 */

/** Host plugin body — nothing to mount on the node side. */
export function apply(): void {}
