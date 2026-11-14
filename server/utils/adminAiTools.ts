import { runAiTool } from './aiToolSecurity';
import { z } from 'zod';
import { openTicketsArgs, rechargeQueryArgs, pendingRechargeArgs, type AdminQueryResult } from '../../src/lib/adminAi';
import { openSupportTickets, queryAdminRecharges, overallPendingRecharges, adminRechargeTotals, adminRevenueTotals } from '../models/adminAiData';
export class InvalidAdminTool extends Error {}
export const adminToolsRegistry = Object.freeze({
  get_revenue_totals: { schema: z.object({}).strict(), description: 'Sum recorded captured INR payments through today, live and test separately. Excludes pending, failed and refunded payments. Use for total revenue or collections, never return order counts. Not accounting profit. No writes.' },
  get_recharge_totals: { schema: z.object({}).strict(), description: 'Count ALL recorded recharge orders across every status through today. Returns live and test counts separately with completed, pending and failed breakdowns. Use for total recharges, not the pending-only list. No arguments or writes.' },
  list_pending_recharges: { schema: pendingRechargeArgs, description: 'Read ALL paid unfinished recharges (live and test) from the same payment-backed source as Pending Orders, through today in Asia/Kolkata, including older pending and processing orders. No start date or 31-day cutoff. Use for overall pending or any pending request without an explicit historical date range. Bounded pages, follow nextCursor for more.' },
  query_recharges: { schema: rechargeQueryArgs, description: 'Read live recharges by exact status and inclusive creation-date range in Asia/Kolkata. Max 31 days and 100 rows. For yesterday use yesterday for both dates. No raw queries.' },
  list_open_tickets: { schema: openTicketsArgs, description: 'Read a bounded set of open imported contact/refund tickets. Never updates a ticket.' },
} as const);
export const adminToolDefinitions = Object.entries(adminToolsRegistry).map(([name, tool]) => ({ name, description: tool.description, parametersJsonSchema: z.toJSONSchema(tool.schema) }));
export function indiaDateRange(start: string, end: string) {
  const dates = rechargeQueryArgs.pick({ start_date: true, end_date: true }).parse({ start_date: start, end_date: end });
  const from = Date.parse(`${dates.start_date}T00:00:00+05:30`); const through = Date.parse(`${dates.end_date}T00:00:00+05:30`) + 86_400_000;
  if (through <= from || through - from > 31 * 86_400_000) throw new InvalidAdminTool('Choose an ordered date range of at most 31 days.');
  return { after: new Date(from - 1).toISOString(), through: new Date(through - 1).toISOString() };
}
export async function executeAdminTool(name: unknown, args: unknown, now = Date.now()): Promise<AdminQueryResult> {
  return runAiTool('admin', name, args, async () => executeAdminRead(name, args, now));
}
async function executeAdminRead(name: unknown, args: unknown, now: number): Promise<AdminQueryResult> {
  if (typeof name !== 'string' || !Object.hasOwn(adminToolsRegistry, name)) throw new InvalidAdminTool('Unknown admin AI tool.');
  const validation = adminToolsRegistry[name as keyof typeof adminToolsRegistry].schema.safeParse(args);
  if (!validation.success) throw new InvalidAdminTool('Invalid admin AI tool arguments.');
  if (name === 'get_revenue_totals') {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
    return { type: 'revenue_totals', ...await adminRevenueTotals(indiaDateRange(today, today).through), through_date: today, timezone: 'Asia/Kolkata' };
  }
  if (name === 'get_recharge_totals') {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
    return { type: 'recharge_totals', ...await adminRechargeTotals(indiaDateRange(today, today).through), through_date: today, timezone: 'Asia/Kolkata' };
  }
  if (name === 'list_pending_recharges') {
    const parameters = pendingRechargeArgs.parse(args);
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
    const through = indiaDateRange(today, today).through;
    return { type: 'pending_recharges', ...await overallPendingRecharges(through, parameters.limit, parameters.cursor), through_date: today, timezone: 'Asia/Kolkata' };
  }
  if (name === 'list_open_tickets') {
    const params = openTicketsArgs.parse(args); const tickets = await openSupportTickets(params.kind, params.limit);
    return { type: 'tickets', tickets, limited: tickets.length === params.limit };
  }
  const parameters = rechargeQueryArgs.parse(args); const range = indiaDateRange(parameters.start_date, parameters.end_date);
  const rows = await queryAdminRecharges(parameters.status, range.after, range.through, parameters.limit);
  return { type: 'recharges', rows, parameters, timezone: 'Asia/Kolkata', limited: rows.length === parameters.limit };
}
