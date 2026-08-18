# @deepseek-ai/dsh-vision-http

English | [中文](README.zh.md)

An OpenAI-compatible HTTP provider for the vision seam. Mount it as a service to provide `ctx.vision`: image admission then converts uploaded images to text descriptions for text-only model routes instead of refusing them. The provider POSTs the image as a base64 data URL to `{baseURL}/chat/completions`.

Defaults target [Z.ai](https://z.ai)'s GLM-4V (`glm-4v-flash`, free tier). Any OpenAI-compatible vision endpoint works by overriding `baseURL` / `model` — for example the domestic Zhipu platform (`https://open.bigmodel.cn/api/paas/v4`) or SiliconFlow (`https://api.siliconflow.cn/v1`, `Qwen/Qwen2.5-VL-32B-Instruct`).

## Configuration

| Key | Default | Description |
| --- | --- | --- |
| `apiKey` | — | Literal key; prefer `apiKeyEnv` so no secret enters configuration files. |
| `apiKeyEnv` | `Z_AI_API_KEY` | Credential reference resolved per call through `ctx.credentials`, then the ambient launch environment. |
| `baseURL` | `https://api.z.ai/api/paas/v4` | OpenAI-compatible base; `/chat/completions` is appended. |
| `model` | `glm-4v-flash` | Vision model id. |
| `maxTokens` | `1024` | Maximum generated tokens; `glm-4v-flash` caps at 1024. |
| `timeoutMs` | `60000` | Request timeout. |
| `maxImageBytes` | `15728640` (15 MiB) | Encoded-byte ceiling for one image. |
| `maxResponseChars` | `8000` | Characters retained from the provider description. |

The credentialed request never follows redirects: a 3xx fails as a provider error, so the key and image cannot be forwarded to another origin.

## Model Experience

Indirectly, through the image-admission consumer that renders the returned description in place of an image block.

#### KV Cache effect

The description text joins the request like any other user content; a differing description invalidates the affected suffix.

## Known Limitations and Deferred Work

- No settings-section integration; the provider is configured through `cordis.yml` plus a credential reference.
- Empty provider output fails the call rather than falling back to another provider — failover composition is out of scope for this seam.
- `maxResponseChars` truncates by character count, not token or sentence boundary.
