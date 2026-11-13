export interface VerifiedPayment {
  paid: boolean; status: string; order_id: string; payment_id: string;
  amount: number; currency: string; created_at: number; test_mode: boolean;
}

const escape = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);

async function embeddedImage(path: string) {
  try {
    const response = await fetch(path);
    if (!response.ok) return '';
    const blob = await response.blob();
    if (!blob.type.startsWith('image/')) return '';
    return await new Promise<string>(resolve => {
      const reader = new FileReader(); reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => resolve(''); reader.readAsDataURL(blob);
    });
  } catch { return ''; }
}

export async function downloadPaymentReceipt(payment: VerifiedPayment, details: {
  operator: string; subscriber: string; plan: string; logo?: string;
}) {
  const [providerLogo, operatorLogo] = await Promise.all([
    embeddedImage('/assets/razorpay-logo.png'), details.logo ? embeddedImage(details.logo) : Promise.resolve(''),
  ]);
  const amount = new Intl.NumberFormat('en-IN', { style: 'currency', currency: payment.currency }).format(payment.amount / 100);
  const date = new Date(payment.created_at * 1000).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });
  const rows = [['Operator', details.operator], ['Subscriber ID', details.subscriber], ['Selected plan', details.plan],
    ['Payment ID', payment.payment_id], ['Order ID', payment.order_id], ['Payment date (IST)', date], ['Payment status', payment.status]];
  const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Payment receipt ${escape(payment.payment_id)}</title>
<style>body{font:15px/1.6 system-ui,sans-serif;color:#302c2a;background:#f5f2ee;margin:0;padding:32px}main{max-width:650px;margin:auto;background:white;padding:36px;border-top:5px solid #68162f;border-radius:8px}header{display:flex;justify-content:space-between;align-items:center;gap:24px}img{object-fit:contain;max-width:110px;max-height:48px}h1{font-size:28px;margin:8px 0}h2{font-size:15px;color:#68162f}p{color:#655d59}dl>div{display:grid;grid-template-columns:1fr 2fr;gap:20px;padding:12px 0;border-bottom:1px solid #e9e1d7}dt{color:#655d59}dd{margin:0;overflow-wrap:anywhere}.total{display:flex;justify-content:space-between;gap:20px;align-items:center;margin:24px 0;font-size:20px}.total strong{font-size:30px;color:#68162f}.note{font-size:13px;padding:16px;background:#f8f4ee}footer{display:flex;align-items:center;justify-content:center;gap:12px;padding-top:24px;font-size:12px;color:#655d59}button{padding:12px 20px;background:#68162f;color:white;border:0;border-radius:6px;cursor:pointer}@media print{body{background:white;padding:0}main{border:0;padding:20px}button{display:none}}@media(max-width:480px){body{padding:12px}main{padding:20px}dl>div{grid-template-columns:1fr;gap:4px}}</style>
<main><header><strong>DTH TAMIZHAN</strong>${operatorLogo ? `<img src="${operatorLogo}" alt="${escape(details.operator)}">` : ''}</header>
<h1>Payment receipt</h1>${payment.test_mode ? '<h2>TEST PAYMENT · No real money collected</h2>' : ''}
<dl>${rows.map(([key, value]) => `<div><dt>${escape(key)}</dt><dd>${escape(value)}</dd></div>`).join('')}</dl>
<div class="total"><span>Amount paid</span><strong>${escape(amount)}</strong></div>
<p class="note">This receipt confirms the captured payment only. Recharge processing has not started. This is not a tax invoice or confirmation of an operator recharge.</p>
<button onclick="window.print()">Print / Save as PDF</button>
<footer>Payment processed by ${providerLogo ? `<img src="${providerLogo}" alt="Razorpay">` : 'Razorpay'}</footer></main></html>`;
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url;
  link.download = `DTH-Tamizhan-Receipt-${payment.payment_id.replace(/[^a-zA-Z0-9_-]/g, '')}.html`;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
