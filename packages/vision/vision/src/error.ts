/** Vision failure class. @module @deepseek-ai/dsh-vision/error */

/**
 * Stable failures suitable for host RPC error mapping. Consumers route on
 * `code`, never on the prototype chain.
 */
export class VisionError extends Error {
  /** Stable machine-routing failure code. */
  readonly code: string

  /**
   * @param message - human-readable failure description without raw bytes or secrets.
   * @param code - stable machine-routing code.
   * @param options - optional chained cause.
   */
  constructor(message: string, code: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'VisionError'
    this.code = code
  }
}
