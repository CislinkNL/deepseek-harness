# @deepseek-ai/dsh-team-tasks-ai

[English](README.md) | 中文

团队看板的 AI 自动处理消费者（`ctx.teamTaskProcessor`）。`process(id)` 把任务转到 `doing`，按任务字段派发一个 agent 轮次（默认 preset 提供工具，因此该轮次可以分析并尝试修复），并以助手报告结算为 `done`，失败则以失败说明结算为 `human`。网关的 `teamTask.process` RPC 通过 `ctx.get` 查询它。

## 配置

| 键 | 默认值 | 说明 |
| --- | --- | --- |
| `maxReportChars` | `8000` | 保留的派发报告最大字符数。 |

## 模型体验

间接生效，通过该消费者派发的轮次：任务字段进入模型可见的 prompt，助手报告返回持久存储。

#### KV Cache 影响

派发轮次是独立会话；看板处理从不触碰任何用户会话的请求，因此不影响任何用户会话的 KV cache。

## 已知限制与后续工作

- 轮次运行在带默认 preset 的全新会话中；任务专属板块、模型选择与按任务限制工具被推迟。
- 处理是显式的（看板 🤖 按钮触发），不是创建时自动运行。
