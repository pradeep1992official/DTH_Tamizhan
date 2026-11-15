import { AdminRechargeTotals } from '../src/components/Admin/AdminRechargeTotals';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { AdminAiPanel } from '../src/components/Admin/AdminAiPanel';
import { pageMetadata } from '../src/lib/pageMetadata';
import { importedTicketSchema } from '../src/lib/adminAi';
it('renders the assistant without duplicating ticket management', () => {
  const headers = vi.fn();
  const html = renderToStaticMarkup(<AdminAiPanel getAuthHeaders={headers} currentLang="en" />);
  expect(html).not.toContain('Support tickets ('); expect(html).not.toContain('Draft reply');
  expect(html).not.toContain('Overall pending recharges</button>'); expect(html).toContain('Ask about recharges or tickets'); expect(html).not.toContain('<details');
  expect(html).not.toContain('href="mailto:'); expect(headers).not.toHaveBeenCalled();
  expect(pageMetadata('/admin/ai').status).toBe(200); expect(pageMetadata('/admin/ai').noindex).toBe(true);
});
it('validates imported ticket contracts instead of accepting executable or arbitrary fields', () => {
  const ticket = { kind: 'refund', status: 'open', category: 'refund', subject: 'Refund', message: 'Please review', replyEmail: 'customer@example.com', createdAt: '2026-11-13T00:00:00Z' };
  expect(importedTicketSchema.safeParse(ticket).success).toBe(true);
  expect(importedTicketSchema.safeParse({ ...ticket, query: 'users' }).success).toBe(false);
  expect(importedTicketSchema.safeParse({ ...ticket, replyEmail: 'javascript:alert(1)' }).success).toBe(false);
});

it('renders the screenshot totals as separate labeled counts without question-mark separators', () => {
  const html = renderToStaticMarkup(<AdminRechargeTotals result={{ type: 'recharge_totals', through_date: '2026-11-14', timezone: 'Asia/Kolkata',
    live: { total: 0, completed: 0, pending: 0, failed: 0, other: 0 }, test: { total: 8, completed: 7, pending: 1, failed: 0, other: 0 } }} />);
  expect(html).toContain('Total orders'); expect(html).toContain('Live orders'); expect(html).toContain('Test orders');
  expect(html).toContain('14 Nov 2026'); expect(html).toContain('Status breakdown'); expect(html).toContain('Test orders: no real recharge.');
  expect(html).not.toContain('?'); expect(html.match(/<dd/g)).toHaveLength(3);
});
