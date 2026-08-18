/**
 * `@deepseek-ai/dsh-team-tasks-json`: single-file JSON persistence for the
 * team task board seam. One `{ version, tasks }` document at the configured
 * path, rewritten atomically under a cross-process file lock; readers stay
 * lock-free because the rename commit is atomic. In-process mutations
 * serialize on one promise chain.
 * @module @deepseek-ai/dsh-team-tasks-json
 */

import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { writeFileAtomic, withFileLock } from '@deepseek-ai/dsh-atomic-write'
import { resolveDshHome } from '@deepseek-ai/dsh-home-paths'
import { TeamTaskError, TeamTaskId, TeamTaskStore, TEAM_TASK_TRANSITIONS } from '@deepseek-ai/dsh-team-tasks'
import type {
  CreateTeamTask,
  TeamTask,
  TeamTaskId as TeamTaskIdType,
  TeamTaskPriority,
  TeamTaskStatus,
  UpdateTeamTask,
} from '@deepseek-ai/dsh-team-tasks'

const FILE_VERSION = 1
const STATUSES: readonly TeamTaskStatus[] = ['todo', 'doing', 'human', 'done']
const PRIORITIES: readonly TeamTaskPriority[] = ['high', 'medium', 'low']

/** Provider configuration; explicit `path` wins, otherwise the board lives under `$DSH_HOME/team-tasks/board.json`. */
export interface Config {
  /** Absolute path of the `{ version, tasks }` JSON document. */
  path?: string
  /** Explicit harness home; omitted follows `DSH_HOME`, then `~/.dsh`. */
  dshHome?: string
}

export const Config: z<Config> = z.object({
  path: z.string(),
  dshHome: z.string(),
})

/** One mutation helper: serialize in-process writers on one chain. */
type Mutation<T> = () => Promise<T>

/** Whether an error is a missing-file ENOENT. */
function isENOENT(error: unknown): boolean {
  return (error as { code?: unknown } | null)?.code === 'ENOENT'
}

/** Read the board document into task objects; a missing file is an empty board. */
async function readDocument(path: string): Promise<TeamTask[]> {
  let text: string
  try {
    text = await readFile(path, 'utf8')
  } catch (error: unknown) {
    if (isENOENT(error)) return []
    throw new TeamTaskError('cannot read the team task board file', 'STORAGE', { cause: error })
  }
  return parseBoard(text)
}

/** Parse and validate the durable document. */
function parseBoard(text: string): TeamTask[] {
  let doc: unknown
  try {
    doc = JSON.parse(text)
  } catch (error: unknown) {
    throw new TeamTaskError('team task board file is not valid JSON', 'CORRUPT', { cause: error })
  }
  if (typeof doc !== 'object' || doc === null) {
    throw new TeamTaskError('team task board file has an invalid document', 'CORRUPT')
  }
  const { version, tasks } = doc as { version?: unknown; tasks?: unknown }
  if (version !== FILE_VERSION) {
    throw new TeamTaskError(`team task board version ${String(version)} is unsupported`, 'CORRUPT')
  }
  if (!Array.isArray(tasks)) {
    throw new TeamTaskError('team task board file has no task list', 'CORRUPT')
  }
  return tasks.map((task, index) => validateTask(task, index))
}

/** Validate one durable task record; unknown extra fields survive round-trips. */
function validateTask(value: unknown, index: number): TeamTask {
  if (typeof value !== 'object' || value === null) {
    throw new TeamTaskError(`team task #${index} is not an object`, 'CORRUPT')
  }
  const task = value as Record<string, unknown>
  if (typeof task.id !== 'string' || task.id === '') {
    throw new TeamTaskError(`team task #${index} has no valid id`, 'CORRUPT')
  }
  if (typeof task.title !== 'string' || task.title === '') {
    throw new TeamTaskError(`team task #${index} has no valid title`, 'CORRUPT')
  }
  if (typeof task.status !== 'string' || !STATUSES.includes(task.status as TeamTaskStatus)) {
    throw new TeamTaskError(`team task #${index} has an unknown status`, 'CORRUPT')
  }
  for (const field of ['priority', 'severity'] as const) {
    if (task[field] !== undefined && (typeof task[field] !== 'string'
      || !PRIORITIES.includes(task[field] as TeamTaskPriority))) {
      throw new TeamTaskError(`team task #${index} has an unknown ${field}`, 'CORRUPT')
    }
  }
  if (typeof task.createdAt !== 'number' || typeof task.updatedAt !== 'number') {
    throw new TeamTaskError(`team task #${index} has no valid timestamps`, 'CORRUPT')
  }
  return task as unknown as TeamTask
}

/** Reject a non-empty-string violation at the durable boundary. */
function assertTitle(title: string | undefined): void {
  if (title !== undefined && title.trim() === '') {
    throw new TeamTaskError('task title must be non-empty', 'EMPTY_TITLE')
  }
}

/** Reject an unknown enum value at the durable boundary. */
function assertKnown(field: string, value: string | undefined, known: readonly string[]): void {
  if (value !== undefined && !known.includes(value)) {
    throw new TeamTaskError(`unknown ${field} "${value}"`, 'INVALID_FIELD')
  }
}

/** JSON-backed team task board store. */
export class JsonTeamTaskStore extends TeamTaskStore {
  static Config: z<Config> = Config

  private readonly path: string
  private chain: Promise<unknown> = Promise.resolve()

  constructor(ctx: Context, config: Config) {
    super(ctx)
    this.path = (config.path ?? join(resolveDshHome(config.dshHome), 'team-tasks', 'board.json')).trim()
    if (this.path === '') {
      throw new TeamTaskError('team-tasks-json: path must be a non-empty absolute file path', 'INVALID_CONFIG')
    }
  }

  /** Serialize one mutation behind all prior in-process mutations. */
  private mutate<T>(operation: Mutation<T>): Promise<T> {
    const result = this.chain.then(operation, operation)
    this.chain = result.then(() => undefined, () => undefined)
    return result
  }

  private async writeDocument(tasks: readonly TeamTask[]): Promise<void> {
    await writeFileAtomic(this.path, JSON.stringify({ version: FILE_VERSION, tasks }, null, 2) + '\n', { mode: 0o600 })
  }

  override async list(signal?: AbortSignal): Promise<readonly TeamTask[]> {
    signal?.throwIfAborted()
    const tasks = await readDocument(this.path)
    signal?.throwIfAborted()
    return tasks.sort((a, b) => b.updatedAt - a.updatedAt)
  }

  override async create(input: CreateTeamTask): Promise<TeamTask> {
    assertTitle(input.title)
    assertKnown('priority', input.priority, PRIORITIES)
    assertKnown('severity', input.severity, PRIORITIES)
    const now = Date.now()
    const task: TeamTask = {
      id: TeamTaskId(randomUUID()),
      title: input.title.trim(),
      ...input.section === undefined || input.section === '' ? {} : { section: input.section },
      priority: input.priority ?? 'medium',
      ...input.severity === undefined ? {} : { severity: input.severity },
      ...input.reporter === undefined || input.reporter === '' ? {} : { reporter: input.reporter },
      ...input.assignee === undefined || input.assignee === '' ? {} : { assignee: input.assignee },
      ...input.notes === undefined || input.notes === '' ? {} : { notes: input.notes },
      ...input.due === undefined || input.due === '' ? {} : { due: input.due },
      ...input.model === undefined || input.model === '' ? {} : { model: input.model },
      status: 'todo',
      createdAt: now,
      updatedAt: now,
    }
    await this.mutate(async () => {
      await withFileLock(this.path, async () => {
        const tasks = await readDocument(this.path)
        tasks.push(task)
        await this.writeDocument(tasks)
      })
    })
    return task
  }

  override async update(id: TeamTaskIdType, patch: UpdateTeamTask): Promise<TeamTask> {
    assertTitle(patch.title)
    assertKnown('priority', patch.priority, PRIORITIES)
    assertKnown('severity', patch.severity, PRIORITIES)
    assertKnown('status', patch.status, STATUSES)
    const updated = await this.mutate(async () => {
      let stored: TeamTask | undefined
      await withFileLock(this.path, async () => {
        const tasks = await readDocument(this.path)
        const index = tasks.findIndex(task => String(task.id) === String(id))
        const current = index === -1 ? undefined : tasks[index]
        if (current === undefined) return
        if (patch.status !== undefined && patch.status !== current.status) {
          const legal = TEAM_TASK_TRANSITIONS[current.status]
          if (!legal.includes(patch.status)) {
            throw new TeamTaskError(
              `cannot move a task from "${current.status}" to "${patch.status}"`,
              'ILLEGAL_TRANSITION',
            )
          }
        }
        const next: TeamTask = {
          ...current,
          ...patch,
          ...patch.title === undefined ? {} : { title: patch.title.trim() },
          updatedAt: Date.now(),
        }
        tasks[index] = next
        await this.writeDocument(tasks)
        stored = next
      })
      return stored
    })
    if (updated === undefined) {
      throw new TeamTaskError(`team task "${String(id)}" not found`, 'NOT_FOUND')
    }
    return updated
  }

  override async remove(id: TeamTaskIdType): Promise<void> {
    await this.mutate(async () => {
      await withFileLock(this.path, async () => {
        const tasks = await readDocument(this.path)
        const kept = tasks.filter(task => String(task.id) !== String(id))
        if (kept.length === tasks.length) return
        await this.writeDocument(kept)
      })
    })
  }
}

export default JsonTeamTaskStore
