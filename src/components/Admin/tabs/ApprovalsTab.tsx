import React, { useState } from 'react';
import {
  ShieldCheck,
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle2,
  Clock,
  UserCheck,
  AlertCircle,
  X
} from '../../../lib/icons';
import { AdminAccount, AdminAccessRequest, Language, UserProfile, SUPER_ADMIN_EMAIL, isSuperAdminEmail } from '../../../types';
import { OperatorTheme } from '../../../lib/theme';
import { translations } from '../../../lib/translations';
import { useAccessibleModal } from '../../../lib/useAccessibleModal';

interface ApprovalsTabProps {
  approvedAdmins: AdminAccount[];
  pendingRequests: AdminAccessRequest[];
  accessLoading: boolean;
  onRefresh: () => void;
  getAuthHeaders: () => Promise<Record<string, string>>;
  currentTheme: OperatorTheme;
  currentLang: Language;
  showToast: (msg: string) => void;
  user: UserProfile | null;
}

export const ApprovalsTab: React.FC<ApprovalsTabProps> = ({
  approvedAdmins,
  pendingRequests,
  accessLoading,
  onRefresh,
  getAuthHeaders,
  currentTheme,
  currentLang,
  showToast,
  user,
}) => {
  const t = translations[currentLang];
  const isLight = currentTheme.isLightMode;
  const [directEmail, setDirectEmail] = useState('');
  const [directName, setDirectName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [adminToRevoke, setAdminToRevoke] = useState<AdminAccount | null>(null);

  const { modalRef: revokeModalRef } = useAccessibleModal({
    isOpen: Boolean(adminToRevoke),
    onClose: () => setAdminToRevoke(null),
  });

  const isSuperAdmin = isSuperAdminEmail(user?.email);

  const handleRevokeAdmin = (admin: AdminAccount) => {
    setAdminToRevoke(admin);
  };

  const handleGrantAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directEmail.trim()) return;

    setIsSubmitting(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/admin/approve-user', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email: directEmail.trim().toLowerCase(),
          name: directName.trim() || undefined,
        }),
      });

      if (res.ok) {
        showToast(`Administrator privileges granted to ${directEmail}`);
        setDirectEmail('');
        setDirectName('');
        onRefresh();
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.error || 'Failed to authorize administrator');
      }
    } catch (err) {
      showToast('Network error authorizing admin');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmRevoke = async () => {
    if (!adminToRevoke) return;
    const emailToRevoke = adminToRevoke.email;
    setAdminToRevoke(null);

    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/admin/revoke-user', {
        method: 'POST',
        headers,
        body: JSON.stringify({ email: emailToRevoke }),
      });

      if (res.ok) {
        showToast(`Access revoked for ${emailToRevoke}`);
        onRefresh();
      } else {
        showToast('Failed to revoke admin access');
      }
    } catch (err) {
      showToast('Error revoking access');
    }
  };

  const handleApproveRequest = async (request: AdminAccessRequest) => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/admin/approve-user', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email: request.userEmail,
          name: request.userName,
          requestId: request.id,
        }),
      });

      if (res.ok) {
        showToast(`Request approved for ${request.userEmail}`);
        onRefresh();
      } else {
        showToast('Failed to approve request');
      }
    } catch (err) {
      showToast('Error approving request');
    }
  };

  return (
    <div className="admin-tab space-y-6   duration-200">
      {/* Header Banner */}
      <div
        className={`admin-section-heading flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
          isLight
            ? 'bg-paper border-rule text-ink'
            : 'bg-ink/30 border-rule text-accent-ink'
        }`}
      >
        <div className="flex items-center gap-3.5">
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0 border shadow-none"
            style={{
              backgroundColor: 'var(--color-accent-soft)',
              borderColor: 'var(--color-accent-soft)',
              color: currentTheme.primaryColor,
            }}
          >
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold">
                Administrator Authorization & Team Management
              </h3>
              <span
                className="text-sm font-medium px-2 py-1 rounded border"
                style={{
                  backgroundColor: 'var(--color-accent-soft)',
                  color: currentTheme.primaryColor,
                  borderColor: 'var(--color-accent-soft)',
                }}
              >
                RBAC
              </span>
            </div>
            <p className={`text-sm mt-1 ${currentTheme.subText}`}>
              Authorize administrative accounts to grant operations access across customer records, recharge orders, and catalog pricing.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={accessLoading}
          className={`px-3.5 py-2 rounded-xl text-sm font-bold border flex items-center gap-1.5 transition-colors shadow-none ${
            isLight
              ? 'bg-paper-2 hover:bg-paper-2 text-ink border-rule'
              : 'bg-paper-2 hover:bg-paper-2 text-accent-ink border-rule'
          }`}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${accessLoading ? 'animate-spin' : ''}`} />
          <span>{t.refresh}</span>
        </button>
      </div>

      {/* Direct Authorization Form (Super Admin Only) */}
      {isSuperAdmin && (
        <div className={`p-5 rounded-lg border ${isLight ? 'bg-paper border-rule shadow-none' : 'bg-ink/20 border-rule'}`}>
          <div className="mb-4">
            <h4 className="text-sm font-bold flex items-center gap-2">
              <Plus className="w-4 h-4 text-success" />
              {t.grantAdminAccess}
            </h4>
            <p className={`text-sm ${currentTheme.subText}`}>
              Add a new administrator by email to instantly grant operational access.
            </p>
          </div>

          <form onSubmit={handleGrantAdmin} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="email"
              required
              value={directEmail}
              onChange={(e) => setDirectEmail(e.target.value)}
              placeholder={t.emailAddressLabel}
              aria-label={t.emailAddressLabel}
              className={`px-3 py-2 rounded-xl text-sm border font-medium focus:outline-none ${
                isLight ? 'bg-paper border-rule text-ink' : 'bg-ink/30 border-rule text-accent-ink'
              }`}
            />
            <input
              type="text"
              value={directName}
              onChange={(e) => setDirectName(e.target.value)}
              placeholder={t.nameOptionalLabel}
              aria-label={t.nameOptionalLabel}
              className={`px-3 py-2 rounded-xl text-sm border font-medium focus:outline-none ${
                isLight ? 'bg-paper border-rule text-ink' : 'bg-ink/30 border-rule text-accent-ink'
              }`}
            />
            <button
              type="submit"
              disabled={isSubmitting || !directEmail.trim()}
              className="py-2 px-4 rounded-xl text-sm font-bold bg-accent hover:bg-accent disabled:opacity-50 text-accent-ink transition-colors flex items-center justify-center gap-1.5 shadow-none"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isSubmitting ? '...' : t.grantAccessBtn}</span>
            </button>
          </form>
        </div>
      )}

      {/* Pending Access Requests */}
      {pendingRequests.length > 0 && (
        <div className={`p-5 rounded-lg border border-rule ${isLight ? 'bg-warning/10' : 'bg-warning/10'}`}>
          <div className="mb-3">
            <h4 className="text-sm font-bold flex items-center gap-2 text-warning ">
              <Clock className="w-4 h-4" />
              {t.pendingAccessRequests} ({pendingRequests.length})
            </h4>
          </div>

          <div className="space-y-2">
            {pendingRequests.map((req) => (
              <div
                key={req.id}
                className={`p-3 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                  isLight ? 'bg-paper border-rule' : 'bg-ink/30 border-rule'
                }`}
              >
                <div>
                  <p className="text-sm font-bold">{req.userName || req.userEmail}</p>
                  <p className="text-sm font-mono text-muted">{req.userEmail}</p>
                  {req.notes && <p className="text-sm text-muted  mt-1">{req.notes}</p>}
                </div>

                {isSuperAdmin && (
                  <button
                    type="button"
                    onClick={() => handleApproveRequest(req)}
                    className="px-3 py-1.5 rounded-lg text-sm font-bold bg-accent hover:bg-accent text-accent-ink flex items-center gap-1"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Approve Access</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Authorized Admins Table */}
      <div className={`p-5 rounded-lg border ${isLight ? 'bg-paper border-rule shadow-none' : 'bg-ink/20 border-rule'}`}>
        <div className="mb-4">
          <h4 className="text-sm font-bold flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-success" />
            {t.authorizedAdministrators} ({approvedAdmins.length})
          </h4>
        </div>

        <div className="overflow-x-auto">
          <table className="admin-responsive-table w-full text-left text-sm">
            <thead className={`border-b ${isLight ? 'bg-paper-2 text-muted' : 'bg-ink/40 text-muted'}`}>
              <tr>
                <th className="py-3 px-4 font-bold">Admin Details</th>
                <th className="py-3 px-4 font-bold">Role</th>
                <th className="py-3 px-4 font-bold">Authorized Date</th>
                {isSuperAdmin && <th className="py-3 px-4 font-bold text-right">{t.actions}</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-rule ">
              {approvedAdmins.map((admin) => {
                const isSuper = isSuperAdminEmail(admin.email);
                return (
                  <tr key={admin.uid || admin.email} className="hover:bg-paper-2 ">
                    <td data-label="Admin Details" className="py-3 px-4">
                      <p className="font-bold text-ink ">{admin.name || admin.email}</p>
                      <p className="text-sm font-mono text-muted">{admin.email}</p>
                    </td>
                    <td data-label="Role" className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-sm font-bold ${
                          isSuper
                            ? 'bg-warning/10 text-warning  border border-rule'
                            : 'bg-success/10 text-success  border border-rule'
                        }`}
                      >
                        {isSuper ? t.superAdminBadge : t.adminBadge}
                      </span>
                    </td>
                    <td data-label="Authorized Date" className="py-3 px-4 text-muted text-sm">
                      {admin.approvedAt ? new Date(admin.approvedAt).toLocaleDateString() : 'Initial'}
                    </td>
                    {isSuperAdmin && (
                      <td data-label={t.actions} className="py-3 px-4 text-right">
                        {!isSuper && (
                          <button
                            type="button"
                            onClick={() => handleRevokeAdmin(admin)}
                            aria-label={`${t.revokeAccess}: ${admin.email}`}
                            className="p-1.5 rounded-lg text-error hover:bg-error/10 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-error   "
                            title={t.revokeAccess}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Accessible Revoke Confirmation Modal */}
      {adminToRevoke && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 "
          role="dialog"
          aria-modal="true"
          aria-labelledby="revoke-modal-title"
        >
          <div
            ref={revokeModalRef}
            className={`w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto p-6 rounded-xl border shadow-2xl relative ${
              isLight ? 'bg-paper border-rule text-ink' : 'bg-paper border-rule text-accent-ink'
            }`}
          >
            <div className="w-12 h-12 rounded-lg bg-error/10 text-error flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 id="revoke-modal-title" className="text-lg font-bold">
              {t.confirmRevokeTitle}
            </h3>
            <p className="text-sm text-muted  mt-2 leading-relaxed">
              {t.confirmRevokeDesc}
              <span className="font-mono font-bold text-ink  block mt-1">{adminToRevoke.email}</span>
            </p>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setAdminToRevoke(null)}
                className={`px-4 py-2 rounded-xl text-sm font-medium border ${
                  isLight ? 'bg-paper-2 hover:bg-paper-2 border-rule' : 'bg-paper-2 hover:bg-paper-2 border-rule'
                }`}
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={handleConfirmRevoke}
                className="px-4 py-2 rounded-xl text-sm font-bold bg-accent hover:bg-accent text-accent-ink shadow-none flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>{t.revokeAccess}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
