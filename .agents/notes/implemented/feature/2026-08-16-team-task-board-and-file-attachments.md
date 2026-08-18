# Agent Note: Team task board and file attachments — the team onboarding surface

Status: implemented

English | [中文](2026-08-16-team-task-board-and-file-attachments.zh.md)

## Problem

The original `team-web` toolchain's value for a team was fast participation: a floating task board to report bugs and track status, and a composer that accepts files, not just text. The harness Web surface had neither: prompts carried only text and raster images (paste/drag, no visible button), and no shared multi-user task store existed — the session log is per-session by design.

## Decision

A **team task board seam** (`ctx.teamTasks`, `@deepseek-ai/dsh-team-tasks`) stores shared, multi-user, cross-session tasks; the `@deepseek-ai/dsh-team-tasks-json` provider persists one `{ version, tasks }` JSON document under `$DSH_HOME/team-tasks/board.json` (explicit `path` wins) with atomic rewrite under a cross-process file lock, validating the document on every read and mutation. The store enforces a status state machine (`todo → doing | human | done`; `done → doing` only) and rejects unknown ids with `NOT_FOUND`.

The **RPC domain** (`teamTask.list/create/update/remove`) follows the contract-layer pattern: api contract + zod schemas + `rpc-map` + host handler + client carrier + the `team-task-error` wire code (the store's stable codes ride in `details.reason`).

The **board UI** (`@deepseek-ai/dsh-client-ui-team-tasks`) is one `shell.overlay` list-slot entry: a floating 📋 button plus a dialog with a submit form (title/priority/notes), status-tagged rows, and the transition/remove actions. It is pure presentation — wire calls arrive as injected callbacks and board state stays component-private.

**File attachments** extend the prompt wire with `{ type: 'file', name, data, size }`. Host admission materializes every file part into the session workspace's `.dsh-uploads/` (a timestamped random-suffixed sanitized leaf) and replaces it with a workspace-path text part — files always route through model tools, for every model route. Limits (`maxFileBytes` 10 MiB, `maxFilesPerMessage` 10) are gateway config; the browser name never reaches the model, only the sanitized leaf. The composer gains a visible 📎 attach button (picker feeds the same intake pre-check as paste/drop), a file chip row, and the input machine carries `fileIds` beside `imageIds` through submit and restore.

## Alternatives considered

**Per-session task state.** Reusing the session log would make the board single-user and bound to one session's lifecycle — the opposite of a team board.

**A context event extension point for file admission.** The image path already uses the `imageAdmission` service seam because conversion is model-dependent; files are model-independent (every route reads them through tools), so a plain admission step was chosen instead of another extension point.

**Inlining file text at admission.** Extracting text from arbitrary documents needs per-format parsers and loses fidelity; the path-text form (the original toolchain's approach) keeps every format and lets the model's own tools read the file.

## Consequences

Team members can report and track work from any session through the floating board, and can attach both screenshots and documents. The composer's draft machine, hub sink, service serialization, and admission all carry files beside images, with the same commit/restore discipline on failure. Host admission is covered by `api-proxy-file-admission.spec.ts` (workspace write, byte/count limits, traversal-name sanitization), the board by `team-board.client.spec.tsx` plus the seam/provider/gateway unit suites; the visible-composer change follows the GUI lane rules (`test:gui` green, browser replay smoke pending in this change).

The AI auto-processing consumer (`@deepseek-ai/dsh-team-tasks-ai`) ships beside the store: the board's 🤖 button drives `teamTask.process`, which moves the task to `doing`, dispatches one agent turn over the task fields, and settles `done` with the report or `human` with the failure note; a scripted-turn unit suite covers both settlements. Deferred: sections/model-pick/due-date fields and the browser e2e replay of the new composer chrome.

## Related

- [Vision capability seam](2026-08-16-vision-capability-seam.md) owns the image conversion tier this surface composes with.
- [Atomic Web image admission](../../implemented/bug-fix/2026-07-29-atomic-web-image-admission.md) owns the admission chain file materialization joins.
