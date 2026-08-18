/** Team task failure class. @module @deepseek-ai/dsh-team-tasks/error */

/**
 * Stable failures suitable for host RPC error mapping. Consumers route on
 * `code`, never on the prototype chain.
 */
export class TeamTaskError extends Error {
  /** Stable machine-routing failure code. */
  readonly code: string

  /**
   * @param message - human-readable failure description.
   * @param code - stable machine-routing code.
   * @param options - optional chained cause.
   */
  constructor(message: string, code: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'TeamTaskError'
    this.code = code
  }
}
