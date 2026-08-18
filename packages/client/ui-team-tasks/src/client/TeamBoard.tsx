/**
 * Floating task-board surface: a FAB over the conversation shell and the board
 * dialog it opens. Pure presentation — every wire call arrives through the
 * injected action props, and open/list state stays component-private.
 */

import { useCallback, useEffect, useState } from 'react'
import clsx from 'clsx'
import type {
  RpcResponse,
  TeamTaskCreateFields,
  TeamTaskId,
  TeamTaskPriority,
  TeamTaskUpdateFields,
  TeamTaskView,
} from '@deepseek-ai/dsh-api-remotes/client'
import css from './TeamBoard.module.css'

/** Injected business face of the board entry (one callback per RPC verb). */
export interface TeamBoardActions {
  listTasks: () => Promise<RpcResponse<{ tasks: TeamTaskView[] }>>
  createTask: (fields: TeamTaskCreateFields) => Promise<RpcResponse<{ task: TeamTaskView }>>
  updateTask: (id: TeamTaskId, patch: TeamTaskUpdateFields) => Promise<RpcResponse<{ task: TeamTaskView }>>
  removeTask: (id: TeamTaskId) => Promise<RpcResponse<{ removed: true }>>
  processTask: (id: TeamTaskId) => Promise<RpcResponse<{ task: TeamTaskView }>>
}

const STATUS_LABEL: Record<TeamTaskView['status'], string> = {
  todo: '待办',
  doing: '进行中',
  human: '需人工',
  done: '已完成',
}

const PRIORITY_LABEL: Record<TeamTaskPriority, string> = {
  high: '高',
  medium: '中',
  low: '低',
}

/**
 * Render the floating board button and the board dialog.
 * @param props - the injected wire actions.
 * @returns the always-mounted FAB plus the dialog while open.
 */
export function TeamBoard({ listTasks, createTask, updateTask, removeTask, processTask }: TeamBoardActions) {
  const [open, setOpen] = useState(false)
  const [tasks, setTasks] = useState<readonly TeamTaskView[]>([])
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [priority, setPriority] = useState<TeamTaskPriority>('medium')

  const refresh = useCallback(async (): Promise<void> => {
    setBusy(true)
    try {
      const result = await listTasks()
      if (result.result.ok) setTasks(result.result.value.tasks)
      else setNotice(result.result.error.message)
    } finally {
      setBusy(false)
    }
  }, [listTasks])

  useEffect(() => {
    if (!open) return
    void refresh()
  }, [open, refresh])

  const submit = async (): Promise<void> => {
    if (title.trim() === '') return
    setBusy(true)
    try {
      const result = await createTask({
        title: title.trim(),
        priority,
        ...notes.trim() === '' ? {} : { notes: notes.trim() },
      })
      if (result.result.ok) {
        setTitle('')
        setNotes('')
        await refresh()
      } else {
        setNotice(result.result.error.message)
      }
    } finally {
      setBusy(false)
    }
  }

  const transition = async (task: TeamTaskView, status: NonNullable<TeamTaskUpdateFields['status']>): Promise<void> => {
    setBusy(true)
    try {
      const result = await updateTask(task.id, { status })
      if (result.result.ok) await refresh()
      else setNotice(result.result.error.message)
    } finally {
      setBusy(false)
    }
  }

  const remove = async (task: TeamTaskView): Promise<void> => {
    setBusy(true)
    try {
      const result = await removeTask(task.id)
      if (result.result.ok) await refresh()
      else setNotice(result.result.error.message)
    } finally {
      setBusy(false)
    }
  }

  const process = async (task: TeamTaskView): Promise<void> => {
    setBusy(true)
    try {
      const result = await processTask(task.id)
      if (result.result.ok) await refresh()
      else setNotice(result.result.error.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button
        type="button"
        className={css.fab}
        aria-label="任务看板"
        aria-expanded={open}
        onClick={() => {
          setOpen(value => !value)
        }}
      >
        📋
      </button>
      {open && (
        <div
          className={css.backdrop}
          role="dialog"
          aria-modal="true"
          aria-label="团队任务看板"
          onClick={(event) => {
            if (event.target === event.currentTarget) setOpen(false)
          }}
        >
          <div className={css.panel}>
            <header className={css.header}>
              <h2>团队任务看板</h2>
              <button
                type="button"
                aria-label="关闭"
                onClick={() => {
                  setOpen(false)
                }}
              >✕</button>
            </header>
            <form
              className={css.form}
              onSubmit={(event) => {
                event.preventDefault()
                void submit()
              }}
            >
              <input
                value={title}
                placeholder="任务标题（必填）"
                onChange={(event) => {
                  setTitle(event.target.value)
                }}
              />
              <select
                aria-label="优先级"
                value={priority}
                onChange={(event) => {
                  setPriority(event.target.value as TeamTaskPriority)
                }}
              >
                <option value="low">优先级：低</option>
                <option value="medium">优先级：中</option>
                <option value="high">优先级：高</option>
              </select>
              <textarea
                value={notes}
                placeholder="备注 / 复现步骤（可选）"
                onChange={(event) => {
                  setNotes(event.target.value)
                }}
              />
              <button type="submit" disabled={busy || title.trim() === ''}>提交任务</button>
            </form>
            {notice !== null && <p className={css.notice} role="alert">{notice}</p>}
            <ul className={css.list}>
              {tasks.map(task => (
                <li key={String(task.id)} className={clsx(css.task, css[`status-${task.status}`])}>
                  <div className={css.taskTitle}>
                    {task.title}
                    <span className={css.tag}>{PRIORITY_LABEL[task.priority]}</span>
                    <span className={css.tag}>{STATUS_LABEL[task.status]}</span>
                  </div>
                  {task.notes !== undefined && task.notes !== '' && <p className={css.notes}>{task.notes}</p>}
                  <div className={css.actions}>
                    {task.status === 'todo' && (
                      <>
                        <button type="button" onClick={() => void process(task)} disabled={busy}>🤖 AI 处理</button>
                        <button type="button" onClick={() => void transition(task, 'doing')}>▶ 开始</button>
                      </>
                    )}
                    {task.status !== 'done' && (
                      <button type="button" onClick={() => void transition(task, 'done')}>✔ 完成</button>
                    )}
                    {task.status === 'done' && (
                      <button type="button" onClick={() => void transition(task, 'doing')}>↺ 重开</button>
                    )}
                    {task.status !== 'human' && (
                      <button type="button" onClick={() => void transition(task, 'human')}>🫵 需人工</button>
                    )}
                    <button type="button" onClick={() => void remove(task)}>🗑 删除</button>
                  </div>
                </li>
              ))}
              {tasks.length === 0 && !busy && <li className={css.empty}>暂无任务，提交第一条吧</li>}
            </ul>
          </div>
        </div>
      )}
    </>
  )
}
