# @deepseek-ai/dsh-team-tasks

English | [中文](README.zh.md)

The shared team task board seam (`ctx.teamTasks`). This is the one store that deliberately does not reuse the per-session log: a team board is shared, multi-user, and cross-session, so it needs its own durable storage. Providers implement CRUD and enforce the status state machine (`todo → doing | human | done`, and `done → doing` only); consumers are the Web board surface and the AI auto-processing loop.

## Model Experience

Indirectly, through the AI processing consumer that renders task content into a dispatched agent's context.

#### KV Cache effect

Board mutations never touch session requests, so task changes do not invalidate any session KV cache; only the consumer's dispatched turn materializes task text.

## Known Limitations and Deferred Work

- The store is a single shared document; multi-writer merge semantics and an event log are deferred.
- Section vocabulary and model routes are deployment-defined strings; validation is the consumer's job.
- AI auto-processing (analysis and fix dispatch) is a separate consumer, not this seam.
