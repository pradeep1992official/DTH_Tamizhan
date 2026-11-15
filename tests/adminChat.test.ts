import { expect, it } from 'vitest';
import { buildAdminChatHistory, type AdminChatTurn } from '../src/lib/adminChat';
import { adminHistorySchema } from '../src/lib/adminAnalytics';

it('keeps recent multi-turn context within the server history limit', () => {
  const turns: AdminChatTurn[] = Array.from({ length: 20 }, (_, i) => ({ id: String(i), role: i % 2 ? 'assistant' : 'user', content: `Message ${i}` }));
  const history = buildAdminChatHistory(turns);
  expect(history).toHaveLength(12);
  expect(history[0].content).toBe('Message 8');
  expect(history.at(-1)?.content).toBe('Message 19');
  expect(adminHistorySchema.safeParse(history).success).toBe(true);
});
it('preserves query dates and filters when an answer is generic or lengthy', () => {
  const turns: AdminChatTurn[] = [{ id: '1', role: 'assistant', content: 'Results ready. '.repeat(300), result: { type: 'analytics', tool: 'get_total_orders', parameters: { from: '2026-11-01', to: '2026-11-15', status: 'failed' }, timezone: 'Asia/Kolkata', data: { privateDetails: 'not needed in memory' } } }];
  const history = buildAdminChatHistory(turns);
  expect(history[0].content).toContain('2026-11-01');
  expect(history[0].content).toContain('failed');
  expect(history[0].content).not.toContain('privateDetails');
  expect(adminHistorySchema.safeParse(history).success).toBe(true);
  expect(buildAdminChatHistory([])).toEqual([]);
});
