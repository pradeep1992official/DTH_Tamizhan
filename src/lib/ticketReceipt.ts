import { paymentAuthHeaders } from './paymentAuth';
export async function downloadTicketFile(path: string, filename: string) {
  const response = await fetch(path, { headers: await paymentAuthHeaders(), cache: 'no-store' });
  if (!response.ok) throw new Error('Download is not ready. Please retry.');
  const url = URL.createObjectURL(await response.blob()); const anchor = document.createElement('a');
  anchor.href = url; anchor.download = filename; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
