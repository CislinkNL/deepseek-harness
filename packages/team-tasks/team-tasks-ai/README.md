# @deepseek-ai/dsh-team-tasks-ai

English | [中文](README.zh.md)

The team board's AI auto-processing consumer (`ctx.teamTaskProcessor`). `process(id)` moves a task to `doing`, dispatches one agent turn over the task fields (the default preset supplies the tools, so the turn can analyze and attempt fixes), and settles `done` with the assistant report or `human` with the failure note. The gateway's `teamTask.process` RPC consults it via `ctx.get`.

## Configuration

| Key | Default | Description |
| --- | --- | --- |
| `maxReportChars` | `8000` | Maximum characters retained from the dispatched report. |

## Model Experience

Indirectly, through the dispatched turn this consumer runs: the task fields ride a model-facing prompt and the assistant report returns to durable storage.

#### KV Cache effect

The dispatched turn is its own session; board processing never touches any user session's request, so no user-session KV cache is affected.

## Known Limitations and Deferred Work

- The turn runs in a fresh session with the default preset; task-specific sections, model-pick, and per-task tool restrictions are deferred.
- Processing is explicit (the board's 🤖 button), not automatic on creation.
