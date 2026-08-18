# Agent Note: 视觉能力 seam——纯文本模型描述上传图片

Status: implemented

[English](2026-08-16-vision-capability-seam.md) | 中文

## 问题

DeepSeek 的 chat-completions 适配器声明了 `inputModalities: ['text']`，并在序列化器层拒绝图片内容（`UNSUPPORTED_CONTENT`）；Web 宿主的图片准入则更早地用同一事实在文本路由上以 `MODEL_DOES_NOT_SUPPORT_IMAGES` 拒绝携带图片的 prompt。因此使用 DeepSeek 的团队根本无法附加截图——原来的 `team-web` 工具链通过把图片交给视觉模型、再把文本描述交给 DeepSeek 来解决，而 dsh 此前没有对应能力。

## 决策

新增一个**视觉能力 seam**（`ctx.vision`，包 `@deepseek-ai/dsh-vision`），把编码后的图片字节转成文本描述：`VisionService.analyzeImage(input, options) → { text }`，与 `ctx.attachments` 一样每个 context 挂载一次。Provider 角色由 `@deepseek-ai/dsh-vision-http` 提供，是一个 OpenAI 兼容的 `POST {baseURL}/chat/completions` 服务（默认 Z.ai 的 `glm-4v-flash`；任何 OpenAI 兼容视觉端点都可通过覆盖 `baseURL`/`model` 使用），其带凭据请求从不跟随重定向。

转换策略（解码、分析、格式化模型可见信封）是一个 **consumer 插件**，而不是宿主代码：`packages/host/apiproxy` 暴露一个极简的 `imageAdmission` 服务扩展点（`ImageAdmissionService.rewriteImageParts(parts, model)`，通过 `ctx.get` 读取），由组合进来的插件提供该服务。当文本路由准入图片时，网关查询该服务；内容仍含图片则保持拒绝，无服务则保持原有的 `MODEL_DOES_NOT_SUPPORT_IMAGES` 行为。参考 consumer（`dsh-team-vision-attachment`）位于独立的插件仓库，内部包裹 `ctx.get('vision')`；宿主核心与 vision seam、consumer 均解耦，因此文本型部署的行为完全由它组合了哪些插件决定。

转换发生在准入阶段，而非请求组装阶段：历史不含图片，因此 `session.selectModel` 的「会话已含图片」拒绝对这些会话自然消失，模型切换保持自由。

## 备选方案

**模型驱动的 `see_image` 工具（纯文本模型按需调用视觉工具）。** 这是原工具链同样保留的互补档，社区插件（`dsh-tool-see-image`）已经以这种形态存在。它让模型保持主动、支持针对性的追问，但要求模型真的去调用工具，且图片引用会留在历史里；准入转换是自动、与模型无关的路径。

**可选的 vision 注册表（类似 `ctx.web` 的 search/fetch provider）。** vision 只有一种操作、每次部署一种传输方式；在没有多 provider 消费者的情况下，注册表只会引入选择与歧义机制。挂载的 provider 就是该服务，与 `ctx.attachments` 一致。

**请求组装期重写（每次模型调用前转换图片）。** 保留历史中的原始图片以便日后重新分析，但每次轮次都要重新转换、日志中仍保留图片块，并迫使每个 assembler 消费者都感知模态。准入转换更便宜，也符合原工具链「历史无图片残留」的特性。

## 后果

文本型的 DeepSeek 路由现在能通过文本描述理解上传的截图；支持图片的路由和无 consumer 的部署保持原有拒绝。覆盖分两层：`api-proxy-vision.spec.ts` 挂载真实网关并驱动 `sessions.prompt`，覆盖 `imageAdmission` 扩展点的拒绝/改写/透传三个分支；`apps/web/tests/vision-admission.e2e.ts` 通过 Loader 启动真实 Web 组合（keyless、纯宿主机），钉死持久化后的模型可见文本（`[attached image: shot.png] …`）且不含图片块。provider 的传输上限（重定向拒绝、字节/超时/字符边界）在 `dsh-vision-http` 中做了单元测试。

自动转换路径在描述后故意丢弃原始字节，因此之后切换到支持图片的模型无法重读该上传；这一后续档（持久化 + 模型驱动的 `see_image`）被推迟。参考 consumer 与 provider 的 settings 配置段都位于本次核心改动之外——consumer 在独立插件仓库，provider 的 settings 集成被推迟。

## 相关

- [Atomic Web image admission](../../implemented/bug-fix/2026-07-29-atomic-web-image-admission.md) 拥有本 seam 所扩展的准入链。
- [Minimal `read_image` tool](../../implemented/feature/2026-08-10-minimal-read-image-tool.md) 拥有支持图片的读取路径。
