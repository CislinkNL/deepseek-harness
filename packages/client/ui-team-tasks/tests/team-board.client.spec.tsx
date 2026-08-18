// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { TeamTaskView } from '@deepseek-ai/dsh-api-remotes/client'
import { TeamBoard } from '../src/client/TeamBoard.tsx'
import type { TeamBoardActions } from '../src/client/TeamBoard.tsx'

afterEach(() => {
  cleanup()
})

function task(over: Partial<TeamTaskView> = {}): TeamTaskView {
  return { id: 't1' as never, title: 'bug', priority: 'medium', status: 'todo', createdAt: 0, updatedAt: 0, ...over }
}

function actions(over: Partial<TeamBoardActions> = {}): TeamBoardActions {
  return {
    listTasks: vi.fn(async () => ({ rpcId: 'r' as never, result: { ok: true as const, value: { tasks: [] } } })),
    createTask: vi.fn(async () => ({ rpcId: 'r' as never, result: { ok: true as const, value: { task: task() } } })),
    updateTask: vi.fn(async () => ({ rpcId: 'r' as never, result: { ok: true as const, value: { task: task() } } })),
    removeTask: vi.fn(async () => ({ rpcId: 'r' as never, result: { ok: true as const, value: { removed: true as const } } })),
    processTask: vi.fn(async () => ({ rpcId: 'r' as never, result: { ok: true as const, value: { task: task() } } })),
    ...over,
  }
}

describe('TeamBoard', () => {
  it('renders the floating button and opens the board listing tasks', async () => {
    const board = actions({
      listTasks: vi.fn(async () => ({
        rpcId: 'r' as never,
        result: { ok: true as const, value: { tasks: [task({ title: 'checkout hangs' })] } },
      })),
    })
    render(<TeamBoard {...board} />)
    const fab = screen.getByRole('button', { name: '任务看板' })
    expect(fab.getAttribute('aria-expanded')).toBe('false')

    fireEvent.click(fab)
    const dialog = await screen.findByRole('dialog', { name: '团队任务看板' })
    await waitFor(() => {
      expect(dialog.textContent).toContain('checkout hangs')
    })
    expect(dialog.textContent).toContain('待办')
    expect(board.listTasks).toHaveBeenCalledOnce()
  })

  it('submits a new task with its fields and refreshes', async () => {
    const board = actions()
    render(<TeamBoard {...board} />)
    fireEvent.click(screen.getByRole('button', { name: '任务看板' }))
    fireEvent.change(screen.getByPlaceholderText('任务标题（必填）'), { target: { value: 'new bug' } })
    fireEvent.change(screen.getByPlaceholderText('备注 / 复现步骤（可选）'), { target: { value: 'repro' } })
    const form = screen.getByPlaceholderText('任务标题（必填）').closest('form')
    if (form === null) throw new Error('task form missing')
    fireEvent.submit(form)
    await waitFor(() => {
      expect(board.createTask).toHaveBeenCalledWith({ title: 'new bug', priority: 'medium', notes: 'repro' })
    })
  })

  it('dispatches AI processing from a todo task', async () => {
    const board = actions({
      listTasks: vi.fn(async () => ({
        rpcId: 'r' as never,
        result: { ok: true as const, value: { tasks: [task()] } },
      })),
    })
    render(<TeamBoard {...board} />)
    fireEvent.click(screen.getByRole('button', { name: '任务看板' }))
    await screen.findByRole('dialog', { name: '团队任务看板' })
    fireEvent.click(screen.getByRole('button', { name: '🤖 AI 处理' }))
    await waitFor(() => {
      expect(board.processTask).toHaveBeenCalledWith('t1' as never)
    })
  })

  it('transitions and removes tasks through the wire actions', async () => {
    const board = actions({
      listTasks: vi.fn(async () => ({
        rpcId: 'r' as never,
        result: { ok: true as const, value: { tasks: [task()] } },
      })),
    })
    render(<TeamBoard {...board} />)
    fireEvent.click(screen.getByRole('button', { name: '任务看板' }))
    await screen.findByRole('dialog', { name: '团队任务看板' })
    fireEvent.click(screen.getByRole('button', { name: '▶ 开始' }))
    await waitFor(() => {
      expect(board.updateTask).toHaveBeenCalledWith('t1' as never, { status: 'doing' })
    })
    fireEvent.click(screen.getByRole('button', { name: '🗑 删除' }))
    await waitFor(() => {
      expect(board.removeTask).toHaveBeenCalledWith('t1' as never)
    })
  })
})
