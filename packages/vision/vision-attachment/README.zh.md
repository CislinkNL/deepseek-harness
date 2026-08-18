# @deepseek-ai/dsh-vision-attachment

[English](README.md) | 中文

已随包发布的图片准入消费者。当纯文本模型路由（例如 DeepSeek 的 chat-completions 适配器）准入一条带图片的 prompt 时，本插件通过 `vision` seam（`ctx.vision`，由 `@deepseek-ai/dsh-vision-http` 提供）把每个图片 part 重写为文本描述，上传因此被接受而不是被拒绝。未挂载 vision 服务时，part 原样透传，宿主保留 `MODEL_DOES_NOT_SUPPORT_IMAGES` 拒绝。

## 配置

| 键 | 默认值 | 说明 |
| --- | --- | --- |
| `projectContext` | — | 注入到信封与描述之间的一行项目背景。 |

## 模型体验

间接生效，通过网关的图片准入：模型读到的是本消费者渲染的描述文本，而不是 `UNSUPPORTED_CONTENT` 失败。

#### KV Cache 影响

描述文本与其他用户内容一样参与请求；不同的描述会使受影响的后缀失效。

## 已知限制与后续工作

- 分析失败以附件错误（`IMAGE_ADMISSION_FAILED`）呈现，不会回退到其它 provider。
- 描述按上传逐次生成；重复图片尚无按会话的缓存。
