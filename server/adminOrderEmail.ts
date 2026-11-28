import type { PaymentLedgerEntry } from './models/paymentLedger';
import { receiptEmail } from './receiptEmail';

const escape = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const site = 'https://dthtamizhan.in';
const logos: Record<string, string> = { airtel_dth: 'airtel_logo.png', sun_direct: 'sun_logo.png', tata_play: 'tata_logo.png', dish_tv: 'dishtv_logo.png', d2h: 'd2h_logo.png' };

export function adminOrderEmail(payment: PaymentLedgerEntry) {
  // Email links must work on the recipient's device, including when sent from local development.
  let origin = site;
  try {
    const url = new URL(process.env.APP_URL || site);
    const host = url.hostname.toLowerCase();
    if (url.protocol === 'https:' && !url.username && !url.password && host.includes('.') &&
      !/^(localhost|127\.|0\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host) &&
      !/\.(localhost|local|test|internal)$/.test(host)) origin = url.origin;
  } catch { /* Use the public business website. */ }
  const adminUrl = `${origin}/admin/pending`;
  const receipt = receiptEmail(payment, 'payment');
  const rows = receipt.pdfData.rows;
  const operator = rows.find(([label]) => label === 'Operator')![1];
  const amount = rows.find(([label]) => label === 'Amount')![1];
  const date = rows.find(([label]) => label === 'Date (IST)')![1];
  const testNote = payment.testMode ? 'TEST ORDER: No real money was collected. Do not fulfil this recharge.' : 'Payment is confirmed. Complete the recharge, then update its status in the admin panel.';
  const textContent = `DTH TAMIZHAN | ORDER DESK\nNew paid recharge order${payment.testMode ? ' [TEST]' : ''}\nAwaiting recharge\n\n${rows.map(([key, value]) => `${key}: ${value}`).join('\n')}\n\n${testNote}\nOpen orders: ${adminUrl}`;
  const details = (items: string[]) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows.filter(([label]) => items.includes(label)).map(([label, value]) => `<tr><td width="36%" style="padding:12px 0;border-bottom:1px solid #eee7e3;color:#776b68;font-size:13px;vertical-align:top">${escape(label)}</td><td style="padding:12px 0 12px 10px;border-bottom:1px solid #eee7e3;color:#302529;font-size:14px;font-weight:bold;word-break:break-word;overflow-wrap:anywhere">${escape(value)}</td></tr>`).join('')}</table>`;
  const logo = logos[payment.operator];
  const htmlContent = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>New recharge order | DTH Tamizhan</title></head>
<body style="margin:0;padding:0;background-color:#f4f0ed;font-family:Arial,Helvetica,sans-serif;color:#302529">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all">${escape(amount)} received for ${escape(operator)}. ${payment.testMode ? 'Test order.' : 'Recharge needs your attention.'}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#f4f0ed"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background-color:#ffffff;border:1px solid #e7ddda;border-top:5px solid #a70f21;border-radius:12px">
<tr><td style="padding:20px 24px;border-bottom:1px solid #eee7e3"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td width="76"><img src="${site}/dth-tamizhan-logo.png" width="64" height="64" alt="DTH Tamizhan" style="display:block;border:0"></td><td><p style="margin:0;color:#761728;font-size:19px;font-weight:bold;letter-spacing:1px">DTH TAMIZHAN</p><p style="margin:6px 0 0;color:#877774;font-size:10px;letter-spacing:2px">ORDER DESK</p></td></tr></table></td></tr>
<tr><td style="padding:28px 24px 24px"><p style="margin:0 0 14px;font-size:11px;font-weight:bold;letter-spacing:1px;color:#24704e">${payment.testMode ? 'TEST PAYMENT &middot; NO FULFILMENT' : 'PAYMENT RECEIVED'}</p><h1 style="margin:0 0 10px;font-size:28px;line-height:1.25;color:#451522">New recharge order</h1><p style="margin:0;font-size:14px;line-height:1.7;color:#776b68">${payment.testMode ? 'This is a test transaction. Do not process a real recharge.' : 'A customer has paid. This recharge is ready for your attention.'}</p></td></tr>
<tr><td style="padding:0 24px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#fbf6f2" style="border:1px solid #eadbd2;border-radius:8px"><tr><td style="padding:20px"><p style="margin:0 0 8px;color:#776b68;font-size:11px;letter-spacing:1px">${payment.testMode ? 'TEST AMOUNT' : 'AMOUNT PAID'}</p><p style="margin:0;color:#761728;font-size:32px;font-weight:bold">${escape(amount)}</p><p style="margin:10px 0 0;color:#956022;font-size:12px;font-weight:bold">Awaiting recharge</p></td><td align="right" style="padding:20px;vertical-align:middle">${logo ? `<img src="${site}/${logo}" width="90" alt="${escape(operator)}" style="display:block;width:90px;height:auto;border:0;margin-bottom:8px">` : ''}<p style="margin:0;font-size:12px;color:#554540">${escape(operator)}</p></td></tr></table></td></tr>
<tr><td style="padding:24px 24px 8px"><h2 style="margin:0 0 6px;color:#761728;font-size:12px;letter-spacing:1px">CUSTOMER &amp; RECHARGE</h2>${details(['Customer', 'Phone', 'Subscriber ID', 'Pack', 'Validity'])}</td></tr>
<tr><td style="padding:20px 24px"><h2 style="margin:0 0 6px;color:#761728;font-size:12px;letter-spacing:1px">PAYMENT DETAILS</h2>${details(['Order ID', 'Payment ID'])}<p style="margin:12px 0 0;color:#877774;font-size:12px;line-height:1.6">${escape(date)} IST</p></td></tr>
<tr><td style="padding:4px 24px 28px"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td bgcolor="#761728" style="border-radius:6px;mso-padding-alt:16px 24px"><a href="${escape(adminUrl)}" style="display:inline-block;padding:16px 24px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:bold">Open order dashboard &rarr;</a></td></tr></table><p style="margin:14px 0 0;font-size:12px;line-height:1.7;color:#776b68">${escape(testNote)}</p><p style="margin:10px 0 0;font-size:11px;line-height:1.6;color:#877774">Button not working? <a href="${escape(adminUrl)}" style="color:#761728;word-break:break-all">${escape(adminUrl)}</a></p></td></tr>
<tr><td style="padding:20px 24px;border-top:1px solid #eee7e3;background-color:#fcfaf8"><p style="margin:0;color:#761728;font-weight:bold;font-size:12px">DTH Tamizhan</p><p style="margin:8px 0 0;font-size:11px;color:#877774;line-height:1.7">Automatic order alert for your operations team.<br><a href="${site}" style="color:#761728;text-decoration:none">dthtamizhan.in</a> &middot; <a href="mailto:support@dthtamizhan.in" style="color:#761728;text-decoration:none">Contact support</a></p></td></tr>
</table></td></tr></table></body></html>`;
  return { subject: `${payment.testMode ? '[TEST] ' : ''}New paid recharge order - ${payment.orderId}`, textContent, htmlContent };
}
