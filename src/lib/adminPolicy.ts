// Keep the Firestore rules root identity aligned with this fixed policy.
export const ROOT_ADMIN_EMAIL = 'professorpradeeps@gmail.com';
export function approvedAdminRecord(email: string, record: { email?: string; status?: string } | undefined): boolean {
  return record?.status === 'approved' && typeof record.email === 'string' && record.email.toLowerCase() === email.toLowerCase();
}
