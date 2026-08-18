# @deepseek-ai/dsh-vision

[English](README.md) | 中文

视觉能力 seam。`ctx.vision` 把编码后的图片字节转成文本描述，从而让纯文本模型路由——DeepSeek 的 chat-completions 适配器声明了 `inputModalities: ['text']`——能够理解它本无法接收的图片。Provider 负责传输、凭据与上限；消费者（图片准入）通过 `ctx.get('vision')` 解析该服务，未挂载时保留自身的拒绝逻辑。

该服务与 `ctx.attachments` 一样，每个 context 挂载一次，而不是可选注册表：vision 只有一个操作、每次部署只有一种传输方式，挂载的 provider 就是该服务。`analyzeImage` 接收已校验过的字节（调用方负责解码、attachment 服务校验媒体类型），返回非空文本；空描述视为 provider 失败。

## 模型体验

间接生效：返回的文本替换模型可见内容中的图片块，因此纯文本模型读到的是普通描述，而不是 `UNSUPPORTED_CONTENT` 失败。

#### KV Cache 影响

描述文本与其他用户内容一样参与请求，因此不同的描述会使受影响的后缀缓存失效；原始图片字节永远不会进入 provider 请求。

## 已知限制与后续工作

- 版本一只支持每次调用描述一张位图（PNG/JPEG/WebP/GIF）；多图与视频分析需要单独的契约。
- Provider 采用部署级挂载（无注册表、无运行时选择）；需要多 provider 故障转移的部署须在本 seam 之外自行组合。
- 模型驱动的 `see_image` 工具（纯文本模型按需调用视觉工具，而非自动准入转换）是互补的另一档，不属于本 seam。
