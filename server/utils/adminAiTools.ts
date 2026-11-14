import { ADMIN_DATA_TOOLS, analyticsRangeSchema, totalOrdersArgs, topPlansArgs } from '../../src/lib/adminAnalytics';
import { executeAnalyticsRead } from '../models/adminAnalytics';
import { runAiTool } from './aiToolSecurity';
import { z } from 'zod';
import { openTicketsArgs, rechargeQueryArgs, pendingRechargeArgs, type AdminQueryResult } from '../../src/lib/adminAi';
import { openSupportTickets, queryAdminRecharges, overallPendingRecharges, adminRechargeTotals, adminRevenueTotals } from '../models/adminAiData';
export class InvalidAdminTool extends Error {}
export const adminToolsRegistry = Object.freeze({
  get_total_orders: { schema: totalOrdersArgs, description: 'Count recorded recharge orders by inclusive India creation-date range and status. from=null means all earlier dates; to must be today or earlier. status=all includes every status. Returns live/test counts separately.' },
  get_total_revenue: { schema: analyticsRangeSchema, description: 'Sum only successful completed live recharges with matching captured paid INR payments in the inclusive date range. Excludes test, failed, pending and refunded. from=null means all earlier dates. All math is server-side.' },
  get_failed_recharges: { schema: analyticsRangeSchema, description: 'Read failed recharge orders for inclusive India creation dates. from=null means all earlier dates. Returns server-counted total and up to 100 rows.' },
  get_top_plans: { schema: topPlansArgs, description: 'Rank plans by successful completed live recharge count, across all earlier dates through today. limit 1 to 20. Server computes counts and revenue.' },
  get_orders_by_operator: { schema: analyticsRangeSchema, description: 'Group recorded orders by operator for inclusive India creation dates. Server counts statuses and live/test orders. from=null means all earlier dates.' },
  get_pending_refunds: { schema: z.object({}).strict(), description: 'Read currently open imported refund tickets. No arguments; does not execute or approve refunds.' },
  get_revenue_totals: { schema: z.object({}).strict(), description: 'Sum recorded captured INR payments through today, live and test separately. Excludes pending, failed and refunded payments. Use for total revenue or collections, never return order counts. Not accounting profit. No writes.' },
  get_recharge_totals: { schema: z.object({}).strict(), description: 'Count ALL recorded recharge orders across every status through today. Returns live and test counts separately with completed, pending and failed breakdowns. Use for total recharges, not the pending-only list. No arguments or writes.' },
  list_pending_recharges: { schema: pendingRechargeArgs, description: 'Read ALL paid unfinished recharges (live and test) from the same payment-backed source as Pending Orders, through today in Asia/Kolkata, including older pending and processing orders. No start date or 31-day cutoff. Use for overall pending or any pending request without an explicit historical date range. Bounded pages, follow nextCursor for more.' },
  query_recharges: { schema: rechargeQueryArgs, description: 'Read live recharges by exact status and inclusive creation-date range in Asia/Kolkata. Max 31 days and 100 rows. For yesterday use yesterday for both dates. No raw queries.' },
  list_open_tickets: { schema: openTicketsArgs, description: 'Read a bounded set of open imported contact/refund tickets. Never updates a ticket.' },
} as const);
export const adminToolDefinitions = Object.entries(adminToolsRegistry).map(([name, tool]) => ({ name, description: tool.description, parametersJsonSchema: z.toJSONSchema(tool.schema) }));
export const adminDataToolDefinitions = adminToolDefinitions.filter(tool => (ADMIN_DATA_TOOLS as readonly string[]).includes(tool.name));
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
  if ((ADMIN_DATA_TOOLS as readonly string[]).includes(name)) {
    const tool = name as typeof ADMIN_DATA_TOOLS[number];
    return { type: 'analytics', tool, parameters: validation.data as Record<string, unknown>, timezone: 'Asia/Kolkata', data: await executeAnalyticsRead(tool, validation.data as Record<string, unknown>, now) };
  }
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
