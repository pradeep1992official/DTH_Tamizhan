import { paymentAuthHeaders } from './paymentAuth';
export async function downloadTicketFile(path: string, filename: string) {
  const response = await fetch(path, { headers: await paymentAuthHeaders(), cache: 'no-store' });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error || 'Could not download the bill. Please try again.');
  }
  const url = URL.createObjectURL(await response.blob()); const anchor = document.createElement('a');
  anchor.href = url; anchor.download = filename; document.body.appendChild(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
