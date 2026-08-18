/**
 * `@deepseek-ai/dsh-vision-attachment`: the shipped image-admission consumer.
 * When a text-only model route admits an image prompt, this plugin rewrites
 * each image part to a text description through the `vision` seam, so the
 * upload is accepted instead of refused. With no vision service mounted the
 * parts pass through untouched and the host keeps its refusal.
 * @module @deepseek-ai/dsh-vision-attachment
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type { ImageAdmissionService, PromptContentPart } from '@deepseek-ai/dsh-host-apiproxy'
import type { VisionService } from '@deepseek-ai/dsh-vision'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'vision-attachment'

/** No required services: `vision` is resolved per call so the plugin degrades to the host's refusal. */
export const inject: readonly string[] = []

/** Plugin config: the optional project background injected beside each description. */
export interface Config {
  /** One-line project context (for example "收银系统：桌面端 POS + 手机点餐 H5"). */
  projectContext?: string
}

export const Config: z<Config> = z.object({
  projectContext: z.string(),
})

/** Model-facing envelope for one vision-analyzed image. */
function formatImageDescription(name: string | undefined, description: string, projectContext?: string): string {
  return [`[attached image: ${name ?? 'image'}]`, projectContext, description]
    .filter((part): part is string => part !== undefined && part.length > 0)
    .join('\n\n')
}

/** Decode a browser payload while rejecting non-canonical base64 forms. */
function decodeBase64(data: string): Uint8Array {
  const decoded = Buffer.from(data, 'base64')
  if (data.length === 0 || decoded.toString('base64') !== data) {
    throw new Error('vision-attachment: image upload is not canonical base64')
  }
  return new Uint8Array(decoded)
}

/**
 * Provide the `imageAdmission` service the gateway reads on text-only routes.
 * @param ctx - plugin context supplying the optional `vision` service.
 * @param config - the resolved plugin config.
 */
export function apply(ctx: Context, config: Config): void {
  const service: ImageAdmissionService = {
    rewriteImageParts: async (parts, _model) => {
      const vision: VisionService | undefined = ctx.get('vision')
      if (vision === undefined) return parts
      const out: PromptContentPart[] = []
      for (const part of parts) {
        if (part.type !== 'image') {
          out.push(part)
          continue
        }
        const result = await vision.analyzeImage({
          data: decodeBase64(part.data),
          mediaType: part.mediaType,
          ...part.name === undefined ? {} : { name: part.name },
        })
        out.push({ type: 'text', text: formatImageDescription(part.name, result.text, config.projectContext) })
      }
      return out
    },
  }
  ctx.provide('imageAdmission', service)
}
