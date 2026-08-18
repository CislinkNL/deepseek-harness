# @deepseek-ai/dsh-vision-http

[English](README.md) | 中文

vision seam 的 OpenAI 兼容 HTTP provider。把它作为服务挂载即可提供 `ctx.vision`：图片准入随后把上传的图片转换为文本描述，供纯文本模型路由使用，而不是直接拒绝。provider 把图片以 base64 data URL 形式 POST 到 `{baseURL}/chat/completions`。

默认指向 [Z.ai](https://z.ai) 的 GLM-4V（`glm-4v-flash`，免费档）。任何 OpenAI 兼容的视觉端点都可通过覆盖 `baseURL` / `model` 使用——例如国内智谱平台（`https://open.bigmodel.cn/api/paas/v4`）或 SiliconFlow（`https://api.siliconflow.cn/v1`、`Qwen/Qwen2.5-VL-32B-Instruct`）。

## 配置

| 键 | 默认值 | 说明 |
| --- | --- | --- |
| `apiKey` | — | 明文密钥；优先用 `apiKeyEnv`，避免密钥进入配置文件。 |
| `apiKeyEnv` | `Z_AI_API_KEY` | 每次调用经 `ctx.credentials` 解析的凭据引用，之后回退到启动环境。 |
| `baseURL` | `https://api.z.ai/api/paas/v4` | OpenAI 兼容基础地址；追加 `/chat/completions`。 |
| `model` | `glm-4v-flash` | 视觉模型 id。 |
| `maxTokens` | `1024` | 最大生成 token；`glm-4v-flash` 上限为 1024。 |
| `timeoutMs` | `60000` | 请求超时。 |
| `maxImageBytes` | `15728640`（15 MiB） | 单张图片的编码字节上限。 |
| `maxResponseChars` | `8000` | 保留的 provider 描述字符数。 |

带凭据的请求从不跟随重定向：3xx 一律按 provider 错误处理，从而避免密钥和图片被转发到其它源。

## 模型体验

间接生效：返回的描述替换模型可见内容中的图片块，因此模型读到的是普通文本。

#### KV Cache 影响

描述文本与其他用户内容一样参与请求；不同的描述会使受影响的后缀失效。

## 已知限制与后续工作

- 未接入 settings 配置段；provider 通过 `cordis.yml` 加凭据引用配置。
- provider 返回空描述时直接失败，不会回退到其它 provider——故障转移组合不在本 seam 范围内。
- `maxResponseChars` 按字符数截断，不按 token 或句子边界。
