# @deepseek-ai/dsh-client-ui-team-tasks

English | [中文](README.zh.md)

Web team task board feature: a floating board button over the conversation shell plus the shared board dialog it opens. Team members submit tasks and bugs, watch the status lanes, and drive the status flow through the host `teamTasks` RPC domain. Pure presentation — every wire call arrives through injected callbacks and board state stays component-private.

## Model Experience

None, as the board renders and mutates durable task data without touching session requests.

#### KV Cache effect

Board operations never enter session requests, so no KV cache is affected.

## Known Limitations and Deferred Work

- The board ships title, priority, notes, and the status flow first; sections, model pick, due dates, and task attachments from the original toolchain are deferred.
- The AI auto-processing button (dispatching a subagent to analyze and attempt fixes) is a separate host consumer and is deferred.
- Board copy is hardcoded Chinese; the locale namespace seat is deferred.
