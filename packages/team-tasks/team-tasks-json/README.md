# @deepseek-ai/dsh-team-tasks-json

English | [中文](README.zh.md)

Single-file JSON persistence for the team task board seam. One `{ version, tasks }` document at the configured path, rewritten atomically under a cross-process file lock; readers stay lock-free because the rename commit is atomic. The provider validates the document on every read and mutation.

## Configuration

| Key | Default | Description |
| --- | --- | --- |
| `path` | — (required) | Absolute path of the `{ version, tasks }` JSON document. |

## Model Experience

Indirectly, through the board seam it persists for.

#### KV Cache effect

Board writes never touch session requests, so no KV cache is affected.

## Known Limitations and Deferred Work

- Cross-process writers serialize on a lock file; a crashed lock holder stalls writers until the lock timeout.
- No compaction or archival of long boards yet.
