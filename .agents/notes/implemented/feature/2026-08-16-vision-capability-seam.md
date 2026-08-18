# Agent Note: Vision capability seam — text-only models describe uploaded images

Status: implemented

English | [中文](2026-08-16-vision-capability-seam.zh.md)

## Problem

The DeepSeek chat-completions adapter declares `inputModalities: ['text']` and rejects image content at its serializer (`UNSUPPORTED_CONTENT`); the Web host's image admission answers the same fact earlier by refusing a prompt with `MODEL_DOES_NOT_SUPPORT_IMAGES` on a text-only route. A team using DeepSeek therefore could not attach a screenshot at all — the original `team-web` toolchain solved this by routing the image through a vision model and handing DeepSeek a text description, and dsh had no equivalent.

## Decision

A new **vision capability seam** (`ctx.vision`, package `@deepseek-ai/dsh-vision`) turns encoded image bytes into a text description: `VisionService.analyzeImage(input, options) → { text }`, mounted once per context like `ctx.attachments`. The provider role ships as `@deepseek-ai/dsh-vision-http`, an OpenAI-compatible `POST {baseURL}/chat/completions` service (default Z.ai `glm-4v-flash`; any OpenAI-compatible vision endpoint works by overriding `baseURL`/`model`), whose credentialed request never follows redirects.

The conversion policy (decode, analyze, format the model-facing envelope) is a **consumer plugin**, not host code: `packages/host/apiproxy` exposes a minimal `imageAdmission` service extension point (`ImageAdmissionService.rewriteImageParts(parts, model)`, read via `ctx.get`), and a composed plugin provides that service. When a text-only route admits an image, the gateway consults the service; content that still carries an image keeps the refusal, and no service keeps the original `MODEL_DOES_NOT_SUPPORT_IMAGES` behavior. The reference consumer (`dsh-team-vision-attachment`) lives in a separate plugin repository and wraps `ctx.get('vision')`; the host core stays independent of both the vision seam and the consumer, so a text-only deployment's behavior is fully determined by which plugins it composes.

The conversion happens at admission, not at request assembly: history stays image-free, so `session.selectModel`'s "session already contains images" refusal naturally disappears for these sessions and model switching stays free.

## Alternatives considered

**A model-driven `see_image` tool (the text-only model calls a vision tool on demand).** This is the complementary tier the original toolchain also kept, and a community plugin (`dsh-tool-see-image`) already exists in this shape. It keeps the model in control and supports targeted follow-up reads, but it requires the model to actually invoke the tool and leaves the image reference in history; admission-time conversion is the automatic, model-agnostic path.

**A selectable vision registry (like `ctx.web`'s search/fetch providers).** Vision has one operation and one transport per deployment; a registry adds selection and ambiguity machinery without a current multi-provider consumer. A mounted provider *is* the service, matching `ctx.attachments`.

**Request-assembly rewrite (convert images right before each model call).** Preserves the original image in history for later re-analysis, but re-runs conversion per turn, keeps image blocks in the log, and forces every assembler consumer to be modality-aware. Admission conversion is cheaper and matches the original toolchain's "no image residue in history" property.

## Consequences

Text-only DeepSeek routes can now reason about uploaded screenshots through a text description; image-capable routes and no-consumer deployments keep the original refusal. Coverage is two-layered: `api-proxy-vision.spec.ts` mounts the real gateway and drives `sessions.prompt` for the refusal/rewrite/passthrough branches of the `imageAdmission` extension point, and `apps/web/tests/vision-admission.e2e.ts` boots the shipped Web composition through the Loader (keyless, host-only) and pins the durable model-visible text (`[attached image: shot.png] …`) with no image block. Provider transport limits (redirect rejection, byte/timeout/char bounds) are unit-tested in `dsh-vision-http`.

The automatic-conversion path deliberately discards the original bytes after describing them, so a later switch to an image-capable model cannot re-read the upload; that follow-up tier (persist + model-driven `see_image`) is deferred. The reference consumer and the provider's settings section both live outside this core change — the consumer in a separate plugin repository, and the provider's settings integration deferred.

## Related

- [Atomic Web image admission](../../implemented/bug-fix/2026-07-29-atomic-web-image-admission.md) owns the admission chain this seam extends.
- [Minimal `read_image` tool](../../implemented/feature/2026-08-10-minimal-read-image-tool.md) owns the image-capable read path.
