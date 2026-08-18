/**
 * `@deepseek-ai/dsh-vision-http`: an OpenAI-compatible HTTP provider for the
 * vision seam. Mounted as a service (default export), it provides `ctx.vision`
 * and turns image bytes into a text description over `POST
 * {baseURL}/chat/completions`. Defaults target Z.ai's GLM-4V; any
 * OpenAI-compatible vision endpoint works by overriding `baseURL` / `model`.
 * @module @deepseek-ai/dsh-vision-http
 */

import { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { credentialRef } from '@deepseek-ai/dsh-credentials'
import type { CredentialRef } from '@deepseek-ai/dsh-credentials'
import { launchEnvironmentOf } from '@deepseek-ai/dsh-launch-environment'
import { VisionError, VisionService } from '@deepseek-ai/dsh-vision'
import type { AnalyzeImageInput, AnalyzeImageOptions, AnalyzeImageResult } from '@deepseek-ai/dsh-vision'
import { analyzeImageHttp, DEFAULT_INSTRUCTION, encodeImageDataUrl } from './client.ts'

export {
  DEFAULT_INSTRUCTION,
  analyzeImageHttp,
  buildVisionBody,
  encodeImageDataUrl,
  parseVisionResponse,
} from './client.ts'
export type { VisionHttpRequest } from './client.ts'

/** Default endpoint base (Z.ai OpenAI-compatible API); `{baseURL}/chat/completions` is appended. */
export const DEFAULT_BASE_URL = 'https://api.z.ai/api/paas/v4'
/** Default vision model (free GLM-4V tier; raise `maxTokens` if a larger model is configured). */
export const DEFAULT_MODEL = 'glm-4v-flash'
/** Default credential reference, matching the Z.ai platform key used by the team-web toolchain. */
export const DEFAULT_API_KEY_ENV = 'Z_AI_API_KEY'
/** Default maximum generated tokens (glm-4v-flash caps at 1024). */
export const DEFAULT_MAX_TOKENS = 1024
/** Default request timeout in milliseconds. */
export const DEFAULT_TIMEOUT_MS = 60_000
/** Default maximum encoded bytes accepted for one image. */
export const DEFAULT_MAX_IMAGE_BYTES = 15 * 1024 * 1024
/** Default maximum characters retained from the provider description. */
export const DEFAULT_MAX_RESPONSE_CHARS = 8_000

/** Provider configuration (all fields defaulted; `apiKey`/`baseURL` resolve with env fallbacks). */
export interface Config {
  /** Literal API key; prefer {@link apiKeyEnv} so no secret enters configuration files. */
  apiKey?: string
  /** Credential reference resolved per call; defaults to `Z_AI_API_KEY`. */
  apiKeyEnv?: string
  /** OpenAI-compatible endpoint base; `/chat/completions` is appended. */
  baseURL?: string
  /** Vision model id accepted by the endpoint. */
  model?: string
  /** Maximum generated tokens. */
  maxTokens?: number
  /** Request timeout in milliseconds. */
  timeoutMs?: number
  /** Maximum encoded bytes accepted for one image. */
  maxImageBytes?: number
  /** Maximum characters retained from the provider description. */
  maxResponseChars?: number
}

export const Config: z<Config> = z.object({
  apiKey: z.string().role('secret'),
  apiKeyEnv: z.string().role('credential-ref').default(DEFAULT_API_KEY_ENV),
  baseURL: z.string(),
  model: z.string().default(DEFAULT_MODEL),
  maxTokens: z.number().step(1).min(1).default(DEFAULT_MAX_TOKENS),
  timeoutMs: z.number().step(1).min(1).default(DEFAULT_TIMEOUT_MS),
  maxImageBytes: z.number().step(1).min(1).default(DEFAULT_MAX_IMAGE_BYTES),
  maxResponseChars: z.number().step(1).min(1).default(DEFAULT_MAX_RESPONSE_CHARS),
})

/** Bound the provider description to the configured character limit. */
function boundText(text: string, maxChars: number): string {
  return text.length <= maxChars ? text : text.slice(0, maxChars)
}

/** HTTP-backed vision service. One instance provides `ctx.vision`. */
export class HttpVisionService extends VisionService {
  static Config: z<Config> = Config

  private readonly baseURL: string
  private readonly model: string
  private readonly maxTokens: number
  private readonly timeoutMs: number
  private readonly maxImageBytes: number
  private readonly maxResponseChars: number
  private readonly literalApiKey: string | undefined
  private readonly apiKeyEnv: CredentialRef

  constructor(ctx: Context, config: Config) {
    super(ctx)
    this.baseURL = config.baseURL ?? DEFAULT_BASE_URL
    this.model = config.model ?? DEFAULT_MODEL
    this.maxTokens = config.maxTokens ?? DEFAULT_MAX_TOKENS
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS
    this.maxImageBytes = config.maxImageBytes ?? DEFAULT_MAX_IMAGE_BYTES
    this.maxResponseChars = config.maxResponseChars ?? DEFAULT_MAX_RESPONSE_CHARS
    this.literalApiKey = config.apiKey !== undefined && config.apiKey.length > 0 ? config.apiKey : undefined
    this.apiKeyEnv = credentialRef(config.apiKeyEnv ?? DEFAULT_API_KEY_ENV)
  }

  /**
   * Resolve the API key for one call: literal config wins, then the credential
   * seam, then the ambient launch environment. Re-resolved per call so a
   * changed credential reaches the next operation without a restart.
   * @returns the key, or undefined while unconfigured.
   */
  private async resolveApiKey(): Promise<string | undefined> {
    if (this.literalApiKey !== undefined) return this.literalApiKey
    const credentials = this.ctx.get('credentials')
    if (credentials !== undefined) {
      const resolved = await credentials.resolve(this.apiKeyEnv)
      if (resolved !== undefined) return resolved.value
    }
    const ambient = launchEnvironmentOf(this.ctx).get(this.apiKeyEnv)
    return ambient !== undefined && ambient.value.length > 0 ? ambient.value : undefined
  }

  override async analyzeImage(input: AnalyzeImageInput, options?: AnalyzeImageOptions): Promise<AnalyzeImageResult> {
    if (input.data.byteLength === 0) throw new VisionError('image is empty', 'INVALID_IMAGE')
    if (input.data.byteLength > this.maxImageBytes) {
      throw new VisionError('image exceeds the configured byte limit', 'IMAGE_TOO_LARGE')
    }
    const apiKey = await this.resolveApiKey()
    if (apiKey === undefined) {
      throw new VisionError(`no vision API key resolved from credential "${this.apiKeyEnv}"`, 'NO_API_KEY')
    }
    const instruction = options?.instruction === undefined || options.instruction.length === 0
      ? DEFAULT_INSTRUCTION
      : options.instruction
    const text = await analyzeImageHttp({
      baseURL: this.baseURL,
      apiKey,
      model: this.model,
      maxTokens: this.maxTokens,
      timeoutMs: this.timeoutMs,
      dataUrl: encodeImageDataUrl(input.mediaType, input.data),
      instruction,
    }, options?.signal)
    return { text: boundText(text, this.maxResponseChars) }
  }
}

export default HttpVisionService
