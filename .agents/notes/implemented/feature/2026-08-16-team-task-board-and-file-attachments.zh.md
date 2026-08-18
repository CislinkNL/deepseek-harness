# Agent Note: 团队任务看板与文件附件——团队上手界面

Status: implemented

[English](2026-08-16-team-task-board-and-file-attachments.md) | 中文

## 问题

原 `team-web` 工具链对团队的价值在于快速参与：一个浮动任务看板用于上报 bug 和跟踪状态，以及一个能接收文件而非只有文本的输入框。Harness 的 Web 界面此前两者都缺：prompt 只带文本与位图（粘贴/拖拽，没有可见按钮），也没有共享多用户任务存储——会话日志按设计是单会话的。

## 决策

**团队任务看板 seam**（`ctx.teamTasks`，`@deepseek-ai/dsh-team-tasks`）存储共享、多用户、跨会话的任务；`@deepseek-ai/dsh-team-tasks-json` provider 在 `$DSH_HOME/team-tasks/board.json`（显式 `path` 优先）持久化一份 `{ version, tasks }` JSON 文档，在跨进程文件锁下原子整文件重写，每次读写都校验文档。存储强制状态机（`todo → doing | human | done`；`done` 只能回 `doing`），未知 id 以 `NOT_FOUND` 拒绝。

**RPC 域**（`teamTask.list/create/update/remove`）遵循 contract 层模式：api 契约 + zod schema + `rpc-map` + 宿主 handler + 客户端 carrier + `team-task-error` wire 错误码（存储的稳定错误码放在 `details.reason`）。

**看板 UI**（`@deepseek-ai/dsh-client-ui-team-tasks`）是一个 `shell.overlay` list-slot 条目：浮动 📋 按钮 + 一个对话框，含提交表单（标题/优先级/备注）、带状态标签的行、以及流转/删除操作。它是纯展示——wire 调用以注入回调到达，看板状态保持组件私有。

**文件附件**把 prompt wire 扩展出 `{ type: 'file', name, data, size }`。宿主准入把每个文件 part 物化到会话工作区的 `.dsh-uploads/`（带时间戳随机后缀的清洗叶子名），并替换为工作区路径文本——文件总是经由模型工具读取，适用于任何模型路由。上限（`maxFileBytes` 10 MiB、`maxFilesPerMessage` 10）是网关配置；浏览器原始文件名从不进入模型，只有清洗后的叶子名。输入框新增可见的 📎 附件按钮（选择器与粘贴/拖拽走同一 intake 预检）、文件 chips 行，输入 machine 在提交与恢复路径上与 `imageIds` 并列携带 `fileIds`。

## 备选方案

**单会话任务状态。** 复用会话日志会让看板变成单用户且绑定单个会话生命周期——与团队看板恰恰相反。

**用 context 事件做文件准入扩展点。** 图片路径用 `imageAdmission` 服务 seam 是因为转换依赖模型；文件与模型无关（任何路由都靠工具读取），因此选择了普通准入步骤而非再开一个扩展点。

**准入时内联文件文本。** 从任意文档抽取文本需要逐格式解析器且损失保真度；路径文本形式（原工具链的做法）保留每种格式并让模型自己的工具读取文件。

## 后果

团队成员可以从任意会话经浮动看板上报并跟踪工作，也可以同时附加截图与文档。输入框的 draft machine、hub sink、服务序列化与准入都在图片旁并列携带文件，失败时遵循相同的提交/恢复纪律。宿主准入由 `api-proxy-file-admission.spec.ts` 覆盖（工作区写入、字节/数量上限、穿越名清洗），看板由 `team-board.client.spec.tsx` 加 seam/provider/网关单元套件覆盖；可见输入框改动遵循 GUI 车道规则（`test:gui` 绿，浏览器 replay 冒烟待跑）。

AI 自动处理消费者（`@deepseek-ai/dsh-team-tasks-ai`）与存储一并发布：看板的 🤖 按钮驱动 `teamTask.process`，把任务转到 `doing`、按任务字段派发一个 agent 轮次，并以报告结算为 `done` 或以失败说明结算为 `human`；脚本化轮次的单元套件覆盖两种结算。推迟项：板块/模型选择/截止日期字段、以及新输入框 chrome 的浏览器 e2e replay。

## 相关

- [Vision capability seam](2026-08-16-vision-capability-seam.md) 拥有本界面所组合的图片转换层。
- [Atomic Web image admission](../../implemented/bug-fix/2026-07-29-atomic-web-image-admission.md) 拥有文件物化所加入的准入链。
