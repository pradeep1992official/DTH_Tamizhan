import { expect, it } from 'vitest';
import { adminTicketUpdate, validateTicketTransition } from '../server/models/ticketAdmin';
import { placementHoursLeft, customerUpdateLink } from '../src/components/Admin/TicketsPanel';
import type { Ticket } from '../src/lib/tickets';
it('enforces support and paid-service lifecycle transitions', () => {
  const now = Date.parse('2026-11-14T12:00:00Z'); const paidAt = '2026-11-14T10:00:00Z';
  expect(() => validateTicketTransition('support', 'open', 'in_progress', '', null, now)).not.toThrow();
  expect(() => validateTicketTransition('service_request', 'paid', 'placed_with_company', 'COMP-1', paidAt, now)).not.toThrow();
  for (const [current, next] of [['pending_payment', 'paid'], ['closed', 'open'], ['paid', 'resolved'], ['expired', 'placed_with_company']] as const) expect(() => validateTicketTransition('service_request', current, next, 'COMP-1', paidAt, now)).toThrow();
});
it('requires reference before placement and refuses overdue or refunding requests', () => {
  const paidAt = '2026-11-13T12:00:00Z'; const now = Date.parse('2026-11-14T12:00:00Z');
  expect(() => validateTicketTransition('service_request', 'paid', 'placed_with_company', '', paidAt, now - 1)).toThrow();
  expect(() => validateTicketTransition('service_request', 'paid', 'placed_with_company', 'COMP-1', paidAt, now)).toThrow();
  expect(() => validateTicketTransition('service_request', 'paid', 'placed_with_company', 'COMP-1', paidAt, now - 1, true)).toThrow();
});
it('rejects admin attempts to overwrite financial or ownership fields through notes/status API', () => {
  for (const extra of [{ uid: 'victim' }, { payment: { status: 'paid' } }, { receipt: {} }, { ticketNo: 'fake' }]) expect(adminTicketUpdate.safeParse(extra).success).toBe(false);
});
it('computes deadline countdowns and safely encodes WhatsApp drafts', () => {
  const ticket = { status: 'paid', payment: { paidAt: '2026-11-14T10:00:00Z' }, phone: '9876543210', ticketNo: 'SRQ-0001', companyRefNo: 'COMP & 1' } as Ticket;
  expect(placementHoursLeft(ticket, Date.parse('2026-11-15T09:00:00Z'))).toBe(1);
  expect(customerUpdateLink(ticket)).toContain('https://wa.me/919876543210?text=');
  expect(decodeURIComponent(customerUpdateLink(ticket))).toContain('COMP & 1');
});
