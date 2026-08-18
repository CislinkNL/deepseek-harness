# @deepseek-ai/dsh-team-tasks-json

[English](README.md) | 中文

团队任务看板 seam 的单文件 JSON 持久化。配置路径上保存一份 `{ version, tasks }` 文档，在跨进程文件锁下原子整文件重写；读者无锁，因为 rename 提交是原子的。Provider 在每次读取与变更时校验文档。

## 配置

| 键 | 默认值 | 说明 |
| --- | --- | --- |
| `path` | —（必填） | `{ version, tasks }` JSON 文档的绝对路径。 |

## 模型体验

间接生效，通过它所持久化的看板 seam。

#### KV Cache 影响

看板写入从不触碰会话请求，因此不影响任何 KV cache。

## 已知限制与后续工作

- 跨进程写者靠锁文件串行化；锁持有者崩溃会让写者阻塞到锁超时。
- 长看板尚无压缩或归档。
