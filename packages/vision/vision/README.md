# @deepseek-ai/dsh-vision

English | [中文](README.zh.md)

The vision capability seam. `ctx.vision` turns encoded image bytes into a text description, so a text-only model route — the DeepSeek chat-completions adapter declares `inputModalities: ['text']` — can reason about an image it could not otherwise receive. Providers own the transport, credentials, and limits; consumers (image admission) resolve `ctx.get('vision')` and, when the service is absent, keep their own refusal.

The service is mounted once per context, like `ctx.attachments`, rather than as a selectable registry: vision has a single operation and a single transport per deployment, and a mounted provider is the service. `analyzeImage` takes already-verified bytes (the caller decodes and the attachment service validates media type) and returns non-empty text; an empty description is a provider failure.

## Model Experience

Indirectly, through the image-admission consumer that replaces an image block with the provider's text description.

#### KV Cache effect

The description text participates in the request like any other user content, so a differing description invalidates the affected request suffix; the original image bytes never reach the provider request.

## Known Limitations and Deferred Work

- Version one describes one raster image (PNG/JPEG/WebP/GIF) per call; multi-image and video analysis need separate contracts.
- Providers are deployment-mounted (no registry or runtime selection); a deployment wanting failover between providers must compose it outside this seam.
- A model-driven `see_image` tool (the text-only model calling a vision tool on demand, rather than automatic admission conversion) is a complementary tier, not this seam.
