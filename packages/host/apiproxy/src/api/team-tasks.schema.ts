/**
 * team-tasks domain zod schemas: request payloads and response values for the
 * four board methods. Branded ids and the Wire widening keep the cast
 * discipline of the other domains (two-level parse at the carrier).
 */

import { z } from 'zod'
import type { Wire } from './rpc.schema.ts'
import type { RequestPayload, ResponseValue, TeamTaskView } from './index.ts'

/** TeamTaskView schema. */
export const teamTaskViewSchema = z.object({
  id: z.string(),
  title: z.string(),
  section: z.string().optional(),
  priority: z.enum(['high', 'medium', 'low']),
  severity: z.enum(['high', 'medium', 'low']).optional(),
  reporter: z.string().optional(),
  assignee: z.string().optional(),
  notes: z.string().optional(),
  due: z.string().optional(),
  model: z.string().optional(),
  status: z.enum(['todo', 'doing', 'human', 'done']),
  aiReport: z.object({ text: z.string(), at: z.number() }).optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
}) as unknown as z.ZodType<Wire<TeamTaskView>>

/** Shared create-fields schema. */
const teamTaskCreateFieldsSchema = z.object({
  title: z.string().min(1),
  section: z.string().optional(),
  priority: z.enum(['high', 'medium', 'low']).optional(),
  severity: z.enum(['high', 'medium', 'low']).optional(),
  reporter: z.string().optional(),
  assignee: z.string().optional(),
  notes: z.string().optional(),
  due: z.string().optional(),
  model: z.string().optional(),
})

/** Shared update-fields schema. */
const teamTaskUpdateFieldsSchema = z.object({
  title: z.string().min(1).optional(),
  section: z.string().optional(),
  priority: z.enum(['high', 'medium', 'low']).optional(),
  severity: z.enum(['high', 'medium', 'low']).optional(),
  assignee: z.string().optional(),
  notes: z.string().optional(),
  due: z.string().optional(),
  model: z.string().optional(),
  status: z.enum(['todo', 'doing', 'human', 'done']).optional(),
  aiReport: z.object({ text: z.string(), at: z.number() }).optional(),
})

/** teamTask.list request payload. */
export const teamTaskListRequestSchema = z.object({}) as unknown as z.ZodType<Wire<RequestPayload<'teamTask.list'>>>

/** teamTask.list response value. */
export const teamTaskListValueSchema = z.object({
  tasks: z.array(teamTaskViewSchema),
}) as unknown as z.ZodType<Wire<ResponseValue<'teamTask.list'>>>

/** teamTask.create request payload. */
export const teamTaskCreateRequestSchema = teamTaskCreateFieldsSchema as unknown as z.ZodType<Wire<RequestPayload<'teamTask.create'>>>

/** teamTask.create response value. */
export const teamTaskCreateValueSchema = z.object({
  task: teamTaskViewSchema,
}) as unknown as z.ZodType<Wire<ResponseValue<'teamTask.create'>>>

/** teamTask.update request payload. */
export const teamTaskUpdateRequestSchema = z.object({
  id: z.string(),
  patch: teamTaskUpdateFieldsSchema,
}) as unknown as z.ZodType<Wire<RequestPayload<'teamTask.update'>>>

/** teamTask.update response value. */
export const teamTaskUpdateValueSchema = z.object({
  task: teamTaskViewSchema,
}) as unknown as z.ZodType<Wire<ResponseValue<'teamTask.update'>>>

/** teamTask.remove request payload. */
export const teamTaskRemoveRequestSchema = z.object({
  id: z.string(),
}) as unknown as z.ZodType<Wire<RequestPayload<'teamTask.remove'>>>

/** teamTask.remove response value. */
export const teamTaskRemoveValueSchema = z.object({
  removed: z.literal(true),
}) as unknown as z.ZodType<Wire<ResponseValue<'teamTask.remove'>>>

/** teamTask.process request payload. */
export const teamTaskProcessRequestSchema = z.object({
  id: z.string(),
}) as unknown as z.ZodType<Wire<RequestPayload<'teamTask.process'>>>

/** teamTask.process response value. */
export const teamTaskProcessValueSchema = z.object({
  task: teamTaskViewSchema,
}) as unknown as z.ZodType<Wire<ResponseValue<'teamTask.process'>>>
