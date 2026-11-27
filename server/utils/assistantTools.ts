import { runAiTool } from './aiToolSecurity';
import { readServiceBrands } from '../models/serviceBrands';
import { supportRecommendationArgs, supportPrefillArgs, servicePrefillArgs } from '../../src/lib/supportRouting';
import { recommendSupport, prefillSupport, prefillService } from './supportRouting';
import { contactDraftArgs, refundDraftArgs } from '../../src/lib/assistantDrafts';
import { draftRefund } from '../models/assistantDrafts';
import { assistantHistory } from '../models/assistantHistory';
import { z } from 'zod';
import { navigateArgs, plansArgs, rechargeStatusArgs, historyArgs, type AssistantAction } from '../../src/lib/assistantActions';
import { planModel } from '../models/planModel';
import { validateCatalogPack } from '../../src/lib/catalog';

export const toolsRegistry = Object.freeze({
  recommend_support_option: { description: 'Suggest free support for website/payment/recharge/refund/account issues or the optional Rs.50 DTH complaint-assistance service for signal/channels/box issues. Pass the user problem, never submit or pay. User confirms the suggestion.', schema: supportRecommendationArgs },
  prefill_support_form: { description: 'Prepare the free support form with user-provided fields and a clear one-line description. No invented identities or order IDs; no submission. User must review and submit.', schema: supportPrefillArgs },
  prefill_service_request: { description: 'Prepare the optional Rs.50 complaint-assistance form with user-provided fields and a clear one-line description. Read get_service_brands first if brand format is needed. No submission or payment. User must confirm and pay.', schema: servicePrefillArgs },
  get_service_brands: { description: 'Read the current admin-configured service request brands and subscriber ID formats. Use this source rather than guessing formats.', schema: z.object({}).strict() },
  draft_contact_message: { description: 'Create an unsent contact draft for confirmation. Categorize the issue as recharge_failed, wrong_operator, refund, account, or other. Never submit it.', schema: contactDraftArgs },
  draft_refund_request: { description: 'Create an unsent refund request draft. Requires the user-provided order ID and reason. Ownership and eligibility are checked by the server; never promise approval or submit.', schema: refundDraftArgs },
  get_recharge_status: { description: 'Look up the signed-in user?s recharge status by order ID. Never invent a status.', schema: rechargeStatusArgs },
  get_my_history: { description: 'Read the signed-in user?s most recent recharges; limit must be 1 to 20. No UID argument.', schema: historyArgs },
  navigate: { description: 'Open a public site page only when the user explicitly asks to open or visit it. Never use navigation instead of answering a pack comparison, cheapest-pack, payment-status or recharge-field question.', schema: navigateArgs },
  get_plans: { description: 'Find catalog plans for an operator at or below max_price in rupees (total pack price). Ask for missing operator or budget.', schema: plansArgs },
} as const);
export const toolDefinitions = Object.entries(toolsRegistry).map(([name, tool]) => ({
  name, description: tool.description, parametersJsonSchema: z.toJSONSchema(tool.schema),
}));
export class InvalidAssistantTool extends Error {}
export async function executeAssistantTool(name: unknown, args: unknown, uid: string): Promise<AssistantAction> {
  return runAiTool('customer', name, args, async verifiedUid => executeCustomerTool(name, args, verifiedUid), uid);
}
async function executeCustomerTool(name: unknown, args: unknown, uid: string): Promise<AssistantAction> {
  if (!uid) throw new InvalidAssistantTool('Authentication required.');
  if (typeof name !== 'string' || !Object.hasOwn(toolsRegistry, name)) throw new InvalidAssistantTool('Unknown assistant tool.');
  const parsed = toolsRegistry[name as keyof typeof toolsRegistry].schema.safeParse(args);
  if (!parsed.success) throw new InvalidAssistantTool('Invalid assistant tool arguments.');
  if (name === 'recommend_support_option') return recommendSupport(uid, args);
  if (name === 'prefill_support_form') return prefillSupport(uid, args);
  if (name === 'prefill_service_request') return prefillService(args);
  if (name === 'get_service_brands') return { type: 'show_service_brands', brands: await readServiceBrands() };
  if (name === 'draft_contact_message') return { type: 'contact_draft', draft: contactDraftArgs.parse(args) };
  if (name === 'draft_refund_request') return draftRefund(uid, args);
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
