/**
 * Service Definition for the vision capability seam (`ctx.vision`). A vision
 * provider turns encoded image bytes into a text description, which lets a
 * text-only model (for example the DeepSeek chat-completions route) "see" an
 * image without carrying image content on its wire route.
 * @module @deepseek-ai/dsh-vision
 */

import { Context, Service } from '@deepseek-ai/cordis'
import type {
  AnalyzeImageInput,
  AnalyzeImageOptions,
  AnalyzeImageResult,
} from './types.ts'

export { VisionError } from './error.ts'
export type {
  AnalyzeImageInput,
  AnalyzeImageOptions,
  AnalyzeImageResult,
  ImageMediaType,
} from './types.ts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    vision: VisionService
  }
}

/**
 * Abstract vision service. Providers implement {@link analyzeImage} over their
 * transport; the service is mounted once per context, so a consumer resolves
 * `ctx.get('vision')` and, when absent, keeps its own text-only refusal path.
 */
export abstract class VisionService extends Service {
  constructor(ctx: Context) {
    super(ctx, 'vision')
  }

  /**
   * Describe one image in text. Implementations reject empty output and must
   * observe the caller's `signal` around transport work.
   * @param input - encoded bytes and verified media type.
   * @param options - optional extra instruction and cancellation signal.
   * @returns the model-facing description.
   */
  abstract analyzeImage(input: AnalyzeImageInput, options?: AnalyzeImageOptions): Promise<AnalyzeImageResult>
}

export default VisionService
