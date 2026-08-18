# @deepseek-ai/dsh-vision-attachment

English | [中文](README.zh.md)

The shipped image-admission consumer. When a text-only model route (for example the DeepSeek chat-completions adapter) admits an image prompt, this plugin rewrites each image part to a text description through the `vision` seam (`ctx.vision`, served by `@deepseek-ai/dsh-vision-http`), so the upload is accepted instead of refused. With no vision service mounted the parts pass through untouched and the host keeps its `MODEL_DOES_NOT_SUPPORT_IMAGES` refusal.

## Configuration

| Key | Default | Description |
| --- | --- | --- |
| `projectContext` | — | One-line project background injected between the envelope and each description. |

## Model Experience

Indirectly, through the gateway's image admission: the model reads the description text this consumer renders instead of receiving an `UNSUPPORTED_CONTENT` failure.

#### KV Cache effect

The description text joins the request like any other user content; a differing description invalidates the affected suffix.

## Known Limitations and Deferred Work

- Analysis failures surface as an attachment error (`IMAGE_ADMISSION_FAILED`) rather than falling back to another provider.
- Descriptions are generated per upload; no per-session caching of repeated images yet.
