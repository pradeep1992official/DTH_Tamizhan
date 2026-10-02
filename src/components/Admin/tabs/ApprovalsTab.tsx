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
} from 'lucide-react';
import { AdminAccount, AdminAccessRequest, Language, UserProfile, SUPER_ADMIN_EMAIL, isSuperAdminEmail } from '../../../types';
import { OperatorTheme } from '../../../lib/theme';

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
  const isLight = currentTheme.isLightMode;
  const [directEmail, setDirectEmail] = useState('');
  const [directName, setDirectName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSuperAdmin = isSuperAdminEmail(user?.email);

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

  const handleRevokeAdmin = async (admin: AdminAccount) => {
    if (!window.confirm(`Revoke admin access for ${admin.email}?`)) return;

    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/admin/revoke-user', {
        method: 'POST',
        headers,
        body: JSON.stringify({ email: admin.email }),
      });

      if (res.ok) {
        showToast(`Access revoked for ${admin.email}`);
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
    <div className="p-4 sm:p-6 space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div 
        className={`p-5 rounded-2xl border shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
          isLight 
            ? 'bg-white border-gray-200 text-gray-900' 
            : 'bg-black/30 border-white/10 text-white'
        }`}
      >
        <div className="flex items-center gap-3.5">
          <div 
            className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border shadow-inner"
            style={{
              backgroundColor: `${currentTheme.primaryColor}15`,
              borderColor: `${currentTheme.primaryColor}30`,
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
                className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border"
                style={{
                  backgroundColor: `${currentTheme.primaryColor}15`,
                  color: currentTheme.primaryColor,
                  borderColor: `${currentTheme.primaryColor}30`,
                }}
              >
                RBAC
              </span>
            </div>
            <p className={`text-xs mt-0.5 ${currentTheme.subText}`}>
              Authorize administrative accounts to grant operations access across customer records, recharge orders, and catalog pricing.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={accessLoading}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all shadow-xs ${
            isLight 
              ? 'bg-gray-50 hover:bg-gray-100 text-gray-800 border-gray-300' 
              : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
          }`}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${accessLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Team</span>
        </button>
      </div>

      {/* Direct Authorization Form (Super Admin Only) */}
      {isSuperAdmin && (
        <div className={`p-5 rounded-2xl border ${isLight ? 'bg-white border-gray-200 shadow-xs' : 'bg-black/20 border-white/10'}`}>
          <div className="mb-4">
            <h4 className="text-sm font-bold flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-500" />
              Direct Administrator Authorization
            </h4>
            <p className={`text-xs ${currentTheme.subText}`}>
              Add a new administrator by email to instantly grant operational access.
            </p>
          </div>

          <form onSubmit={handleGrantAdmin} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="email"
              required
              value={directEmail}
              onChange={(e) => setDirectEmail(e.target.value)}
              placeholder="Admin Email (e.g. manager@gmail.com)"
              className={`px-3 py-2 rounded-xl text-xs border font-medium focus:outline-none ${
                isLight ? 'bg-white border-gray-200 text-gray-800' : 'bg-black/30 border-white/10 text-white'
              }`}
            />
            <input
              type="text"
              value={directName}
              onChange={(e) => setDirectName(e.target.value)}
              placeholder="Full Name / Branch (Optional)"
              className={`px-3 py-2 rounded-xl text-xs border font-medium focus:outline-none ${
                isLight ? 'bg-white border-gray-200 text-gray-800' : 'bg-black/30 border-white/10 text-white'
              }`}
            />
            <button
              type="submit"
              disabled={isSubmitting || !directEmail.trim()}
              className="py-2 px-4 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white transition-all flex items-center justify-center gap-1.5 shadow-xs"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isSubmitting ? 'Authorizing...' : 'Authorize Administrator'}</span>
            </button>
          </form>
        </div>
      )}

      {/* Pending Access Requests */}
      {pendingRequests.length > 0 && (
        <div className={`p-5 rounded-2xl border border-amber-500/30 ${isLight ? 'bg-amber-50/50' : 'bg-amber-950/20'}`}>
          <div className="mb-3">
            <h4 className="text-sm font-bold flex items-center gap-2 text-amber-700 dark:text-amber-300">
              <Clock className="w-4 h-4" />
              Pending Access Requests ({pendingRequests.length})
            </h4>
          </div>

          <div className="space-y-2">
            {pendingRequests.map((req) => (
              <div
                key={req.id}
                className={`p-3 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                  isLight ? 'bg-white border-gray-200' : 'bg-black/30 border-white/10'
                }`}
              >
                <div>
                  <p className="text-xs font-bold">{req.userName || req.userEmail}</p>
                  <p className="text-[11px] font-mono text-gray-500">{req.userEmail}</p>
                  {req.notes && <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-1">{req.notes}</p>}
                </div>

                {isSuperAdmin && (
                  <button
                    type="button"
                    onClick={() => handleApproveRequest(req)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1"
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
      <div className={`p-5 rounded-2xl border ${isLight ? 'bg-white border-gray-200 shadow-xs' : 'bg-black/20 border-white/10'}`}>
        <div className="mb-4">
          <h4 className="text-sm font-bold flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            Authorized Administrators Directory ({approvedAdmins.length})
          </h4>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className={`border-b ${isLight ? 'bg-gray-50 text-gray-600' : 'bg-black/40 text-gray-400'}`}>
              <tr>
                <th className="py-3 px-4 font-bold">Admin Details</th>
                <th className="py-3 px-4 font-bold">Role</th>
                <th className="py-3 px-4 font-bold">Authorized Date</th>
                {isSuperAdmin && <th className="py-3 px-4 font-bold text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
              {approvedAdmins.map((admin) => {
                const isSuper = isSuperAdminEmail(admin.email);
                return (
                  <tr key={admin.uid || admin.email} className="hover:bg-gray-50/50 dark:hover:bg-white/5">
                    <td className="py-3 px-4">
                      <p className="font-bold text-gray-800 dark:text-gray-100">{admin.name || admin.email}</p>
                      <p className="text-[11px] font-mono text-gray-500">{admin.email}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isSuper
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        }`}
                      >
                        {isSuper ? 'Super Admin' : 'Admin'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-500 text-[11px]">
                      {admin.approvedAt ? new Date(admin.approvedAt).toLocaleDateString() : 'Initial'}
                    </td>
                    {isSuperAdmin && (
                      <td className="py-3 px-4 text-right">
                        {!isSuper && (
                          <button
                            type="button"
                            onClick={() => handleRevokeAdmin(admin)}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors"
                            title="Revoke Admin Access"
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
    </div>
  );
};
