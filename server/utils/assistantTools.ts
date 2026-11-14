import { assistantHistory } from '../models/assistantHistory';
import { z } from 'zod';
import { navigateArgs, plansArgs, rechargeStatusArgs, historyArgs, type AssistantAction } from '../../src/lib/assistantActions';
import { planModel } from '../models/planModel';
import { validateCatalogPack } from '../../src/lib/catalog';

export const toolsRegistry = {
  get_recharge_status: { description: 'Look up the signed-in user?s recharge status by order ID. Never invent a status.', schema: rechargeStatusArgs },
  get_my_history: { description: 'Read the signed-in user?s most recent recharges; limit must be 1 to 20. No UID argument.', schema: historyArgs },
  navigate: { description: 'Open a public site page when the user asks to visit it.', schema: navigateArgs },
  get_plans: { description: 'Find catalog plans for an operator at or below max_price in rupees (total pack price). Ask for missing operator or budget.', schema: plansArgs },
} as const;
export const toolDefinitions = Object.entries(toolsRegistry).map(([name, tool]) => ({
  name, description: tool.description, parametersJsonSchema: z.toJSONSchema(tool.schema),
}));
export class InvalidAssistantTool extends Error {}
export async function executeAssistantTool(name: unknown, args: unknown, uid: string): Promise<AssistantAction> {
  if (!uid) throw new InvalidAssistantTool('Authentication required.');
  if (typeof name !== 'string' || !Object.hasOwn(toolsRegistry, name)) throw new InvalidAssistantTool('Unknown assistant tool.');
  const parsed = toolsRegistry[name as keyof typeof toolsRegistry].schema.safeParse(args);
  if (!parsed.success) throw new InvalidAssistantTool('Invalid assistant tool arguments.');
  if (name === 'get_recharge_status') {
    const { order_id } = rechargeStatusArgs.parse(args);
    const orders = await assistantHistory(uid, 1, order_id);
    return { type: 'show_recharge_status', order: orders[0] || null };
  }
  if (name === 'get_my_history') return { type: 'show_history', orders: await assistantHistory(uid, historyArgs.parse(args).limit) };
  if (name === 'navigate') return { type: 'navigate', page: navigateArgs.parse(args).page };
  const { operator, max_price } = plansArgs.parse(args);
  const plans = (await planModel.getForOperator(operator)).filter(plan => plan.operator === operator &&
    plan.amount <= max_price && !validateCatalogPack(plan).length)
    .sort((a, b) => a.amount - b.amount || a.id.localeCompare(b.id)).slice(0, 20)
    .map(plan => ({ id: plan.id, name: plan.plan_name, operator: plan.operator, amount: plan.amount, duration: plan.duration_months }));
  return { type: 'show_plans', plans };
}
