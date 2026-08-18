/** Vision capability vocabulary. @module @deepseek-ai/dsh-vision/types */

import type { ImageMediaType } from '@deepseek-ai/dsh-attachment'

export type { ImageMediaType } from '@deepseek-ai/dsh-attachment'

/** Encoded image bytes plus the media type a provider must send. */
export interface AnalyzeImageInput {
  /** Exact encoded raster bytes. */
  data: Uint8Array
  /** Media type already verified against the bytes by the attachment service. */
  mediaType: ImageMediaType
  /** Optional display name stripped of local path information. */
  name?: string
}

/** Per-call options for one image analysis. */
export interface AnalyzeImageOptions {
  /** Extra instruction appended to the provider's standard describe instruction. */
  instruction?: string
  /** Optional cancellation forwarded to the provider. */
  signal?: AbortSignal
}

/** The provider's text account of one image. */
export interface AnalyzeImageResult {
  /** Model-facing description; empty text is a provider failure, not a result. */
  text: string
}
