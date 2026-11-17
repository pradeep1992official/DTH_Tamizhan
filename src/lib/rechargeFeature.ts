let effective = false;
try { if (typeof document !== 'undefined') effective = JSON.parse(document.getElementById('dth-features')?.textContent || '{}').rechargeEnabled === true; } catch { /* Fail closed. */ }
export function clientRechargeEnabled() { return effective; }
export function setClientRechargeEnabled(value: boolean) { effective = value === true; }
export function isRechargePage(path: string) { return /^\/(recharge|plans|connections)(?:\/|$)/i.test(path); }
export function rechargeReturnTarget(search: string) {
  const params = new URLSearchParams(search);
  // Only an existing payment identifier is carried to read-only recovery, never a new checkout.
  const value = params.get('payment') || params.get('paymentId') || params.get('orderId') || params.get('order_id') || params.get('razorpay_order_id') || params.get('razorpay_payment_id');
  return value && /^[a-zA-Z0-9_-]{1,128}$/.test(value) ? '/history?' + new URLSearchParams({ payment: value }) : '/new-connection';
}
