import { AdminRefreshButton } from '../AdminRefreshButton';
import React, { useRef, useState } from 'react';
import {
  ShieldCheck,
  Plus,
  RefreshCw,
  CheckCircle2,
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
  const [grantError, setGrantError] = useState<string | null>(null);
  const grantInFlight = useRef(false);
  const [adminToRevoke, setAdminToRevoke] = useState<AdminAccount | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);
  const revokeInFlight = useRef(false);

  const { modalRef: revokeModalRef } = useAccessibleModal({
    isOpen: Boolean(adminToRevoke),
    onClose: () => { if (!revokeInFlight.current) setAdminToRevoke(null); },
  });

  const isSuperAdmin = isSuperAdminEmail(user?.email);

  const handleRevokeAdmin = (admin: AdminAccount) => {
    setRevokeError(null);
    setAdminToRevoke(admin);
  };

  const handleGrantAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directEmail.trim() || grantInFlight.current) return;
    if (!window.confirm(`Grant administrator access to ${directEmail.trim().toLowerCase()}?`)) return;

    grantInFlight.current = true;
    setIsSubmitting(true);
    setGrantError(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/admin/approve-user', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          userEmail: directEmail.trim().toLowerCase(),
          name: directName.trim() || undefined,
        }),
      });

      const data = await res.json().catch(() => null);
      if (res.ok && data?.success === true) {
        showToast(`Administrator privileges granted to ${directEmail}`);
        setDirectEmail('');
        setDirectName('');
        onRefresh();
      } else {
        const tamilErrors: Record<string, string> = {
          ADMIN_ACCOUNT_NOT_REGISTERED: 'இந்த மின்னஞ்சல் இந்தச் செயலியில் பதிவு செய்யப்படவில்லை. முதலில் Google மூலம் ஒருமுறை உள்நுழையச் சொல்லி, பின்னர் அணுகலை வழங்கவும்.',
          ADMIN_AUTH_UNAVAILABLE: 'Firebase கணக்கைச் சரிபார்க்க முடியவில்லை. சேவையகச் சான்றுகளையும் Authentication அனுமதிகளையும் சரிபார்க்கவும்.',
          ADMIN_REGISTRY_UNAVAILABLE: 'நிர்வாக அணுகலைச் சேமிக்க முடியவில்லை. சேவையகத்தின் Firestore அனுமதிகளைச் சரிபார்க்கவும்.',
        };
        setGrantError((currentLang === 'ta' && tamilErrors[data?.code]) || (typeof data?.error === 'string' ? data.error : `Unable to grant access (HTTP ${res.status}). Please retry.`));
      }
    } catch (err) {
      setGrantError(currentLang === 'ta' ? 'அணுகலை வழங்க முடியவில்லை. இணைப்பையும் உள்நுழைவையும் சரிபார்த்து மீண்டும் முயற்சிக்கவும்.' : 'Unable to grant access. Check your connection and sign-in, then retry.');
    } finally {
      grantInFlight.current = false;
      setIsSubmitting(false);
    }
  };

  const handleConfirmRevoke = async () => {
    if (!adminToRevoke || revokeInFlight.current) return;
    const emailToRevoke = adminToRevoke.email;
    revokeInFlight.current = true;
    setIsRevoking(true);
    setRevokeError(null);

    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/admin/revoke-user', {
        method: 'POST',
        headers,
        body: JSON.stringify({ userEmail: emailToRevoke, uid: adminToRevoke.uid }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success === true) {
        showToast(`Access revoked for ${emailToRevoke}`);
        setAdminToRevoke(null);
        onRefresh();
      } else {
        setRevokeError(typeof data?.error === 'string' ? data.error : `Unable to revoke access (HTTP ${res.status}). Please retry.`);
      }
    } catch (err) {
      setRevokeError(currentLang === 'ta' ? 'அணுகலை ரத்து செய்ய முடியவில்லை. இணைப்பைச் சரிபார்த்து மீண்டும் முயற்சிக்கவும்.' : 'Unable to revoke access. Check your connection and sign-in, then retry.');
    } finally {
      revokeInFlight.current = false;
      setIsRevoking(false);
    }
  };

  return (
    <div className="admin-tab admin-team-tab space-y-4   duration-200">
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
                Manage administrator access.
              </h3>

            </div>

          </div>
        </div>

        <AdminRefreshButton onRefresh={onRefresh} loading={accessLoading} label={t.refresh} />
      </div>

      {/* Direct Authorization Form (Super Admin Only) */}
      {isSuperAdmin && (
        <div className={`p-5 rounded-lg border ${isLight ? 'bg-paper border-rule shadow-none' : 'bg-ink/20 border-rule'}`}>
          <div className="mb-4">
            <h4 className="text-sm font-bold flex items-center gap-2">
              <Plus className="w-4 h-4 text-success" />
              {t.grantAdminAccess}
            </h4>
            <p id="grant-admin-help" className={`text-sm ${currentTheme.subText}`}>
              {currentLang === 'ta' ? 'முதலில் இந்தச் செயலியில் Google மூலம் ஒருமுறை உள்நுழைந்தவரின் மின்னஞ்சலுக்கு நிர்வாக அணுகலை வழங்கவும்.' : 'The person must sign in to this app with Google once before you can grant administrator access to their email.'}
            </p>
          </div>

          <form onSubmit={handleGrantAdmin} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="email"
              required
              disabled={isSubmitting}
              aria-describedby={grantError ? 'grant-admin-help grant-admin-error' : 'grant-admin-help'}
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
              disabled={isSubmitting}
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
              <span>{isSubmitting ? 'Granting...' : 'Grant access'}</span>
            </button>
          </form>
          {grantError && <p id="grant-admin-error" role="alert" className="mt-3 text-sm text-error">{grantError}</p>}
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
                      <p className="font-bold text-ink ">{admin.name || admin.displayName || admin.email}</p>
                      {(admin.name || admin.displayName) && (admin.name || admin.displayName)!.toLowerCase() !== admin.email.toLowerCase() && <p className="text-sm font-mono text-muted">{admin.email}</p>}
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
                      {admin.approvedAt ? new Date(admin.approvedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }) : 'Initial'}
                    </td>
                    {isSuperAdmin && (
                      <td data-label={t.actions} className="py-3 px-4 text-right">
                        {isSuper && <span className="text-xs text-muted">Protected</span>}
                        {!isSuper && (
                          <button
                            type="button"
                            onClick={() => handleRevokeAdmin(admin)}
                            aria-label={`${t.revokeAccess}: ${admin.email}`}
                            className="p-1.5 rounded-lg text-error hover:bg-error/10 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-error   "
                            title={t.revokeAccess}
                          >
                            <ShieldCheck className="w-4 h-4" />
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
            <p className="text-sm text-muted mt-2">{currentLang === 'ta' ? 'நிர்வாக அணுகல் மட்டும் ரத்து செய்யப்படும். பயனர் கணக்கும் தரவும் நீக்கப்படாது.' : 'This removes admin access. The user account and data are kept.'}</p>
            {revokeError && <p role="alert" className="text-sm text-error mt-3">{revokeError}</p>}

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setAdminToRevoke(null)}
                disabled={isRevoking}
                className={`px-4 py-2 rounded-xl text-sm font-medium border ${
                  isLight ? 'bg-paper-2 hover:bg-paper-2 border-rule' : 'bg-paper-2 hover:bg-paper-2 border-rule'
                }`}
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={handleConfirmRevoke}
                disabled={isRevoking}
                className="px-4 py-2 rounded-xl text-sm font-bold bg-accent hover:bg-accent text-accent-ink shadow-none flex items-center gap-1.5"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{isRevoking ? (currentLang === 'ta' ? 'ரத்து செய்கிறது…' : 'Revoking…') : t.revokeAccess}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
