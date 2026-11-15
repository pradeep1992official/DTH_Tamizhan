import { expect, it } from 'vitest';
import { productionCsp } from '../server/securityHeaders';
it('starts production CSP in report-only mode with required checkout and auth resources', () => {
  const policy = productionCsp(false);
  expect(policy.reportOnly).toBe(true);
  expect(policy.directives.scriptSrc).toContain('https://checkout.razorpay.com');
  expect(policy.directives.scriptSrc).not.toContain("'unsafe-eval'");
  expect(policy.directives.objectSrc).toEqual(["'none'"]);
  expect(policy.directives.reportUri).toEqual(['/api/csp-report']);
  expect(productionCsp(true).reportOnly).toBe(false);
});
