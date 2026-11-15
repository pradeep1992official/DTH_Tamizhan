import type { AdminHistory } from './adminAnalytics';
import type { AdminQueryResult } from './adminAi';

export interface AdminChatTurn {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  result?: AdminQueryResult | null;
}

export function buildAdminChatHistory(turns: AdminChatTurn[]): AdminHistory {
  return turns.slice(-12).map(turn => {
    const context = turn.result?.type === 'analytics'
      ? `\nQuery context: ${JSON.stringify({ tool: turn.result.tool, parameters: turn.result.parameters })}` : '';
    return { role: turn.role, content: turn.content.slice(0, 2000 - context.length) + context };
  });
}
