import { paymentAuthHeaders } from './paymentAuth';
export async function ticketApi(path = '', body?: unknown) {
  const response = await fetch(`/api/tickets${path}`, { method: body === undefined ? 'GET' : 'POST',
    headers: { ...await paymentAuthHeaders(), 'Content-Type': 'application/json' }, cache: 'no-store', body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await response.json();
  if (!response.ok || !data.success) throw new Error(data.error || 'This request could not be completed. Please retry.');
  return data;
}
