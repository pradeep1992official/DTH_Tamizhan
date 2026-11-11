import { expect, it } from 'vitest';
import { ApproveUserSchema, RevokeUserSchema } from '../server/middleware/validation';

it('accepts the admin approval email and preserves the optional name', () => {
  expect(ApproveUserSchema.parse({ userEmail: ' Admin@Example.com ', name: ' Admin Name ' }))
    .toEqual({ userEmail: 'admin@example.com', name: 'Admin Name' });
  expect(ApproveUserSchema.safeParse({ userEmail: 'admin@example.com' }).success).toBe(true);
});
it('requires a valid userEmail for approval and revocation', () => {
  for (const schema of [ApproveUserSchema, RevokeUserSchema]) {
    expect(schema.safeParse({ email: 'admin@example.com' }).success).toBe(false);
    expect(schema.safeParse({ userEmail: 'invalid' }).success).toBe(false);
    expect(schema.safeParse({ userEmail: 'admin@example.com' }).success).toBe(true);
  }
});
