import React, { useState } from 'react';
import { 
  ShieldCheck, 
  UserCheck, 
  Users, 
  Key, 
  Lock, 
  Check, 
  X, 
  AlertCircle, 
  Crown, 
  Briefcase, 
  User, 
  Plus, 
  UserPlus, 
  CheckCircle2, 
  ShieldAlert,
  Sparkles
} from 'lucide-react';
import { UserProfile, Language } from '../types';
import { OperatorTheme } from '../lib/theme';

interface AdminRolesViewProps {
  user: UserProfile | null;
  onUpdateUserRole?: (updated: UserProfile) => void;
  onOpenAuth?: () => void;
  currentTheme: OperatorTheme;
  currentLang: Language;
}

interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'dealer' | 'customer';
  is_plan_admin: boolean;
  is_worker: boolean;
  lastActive: string;
}

const DEFAULT_TEAM_MEMBERS: TeamMember[] = [
  {
    id: 'usr-1',
    email: 'professorpradeeps@gmail.com',
    name: 'Pradeep S (Lead Administrator)',
    role: 'admin',
    is_plan_admin: true,
    is_worker: true,
    lastActive: 'Active Now',
  },
  {
    id: 'usr-2',
    email: 'chennai.dealer@dthtamizhan.in',
    name: 'Kannan R (Chennai Hub Dealer)',
    role: 'dealer',
    is_plan_admin: false,
    is_worker: true,
    lastActive: '12 mins ago',
  },
  {
    id: 'usr-3',
    email: 'madurai.fulfillment@dthtamizhan.in',
    name: 'Muthu K (Madurai Fulfillment)',
    role: 'dealer',
    is_plan_admin: false,
    is_worker: true,
    lastActive: '2 hours ago',
  },
  {
    id: 'usr-4',
    email: 'subscriber.sample@dthtamizhan.in',
    name: 'Ramesh Sundaram (Subscriber)',
    role: 'customer',
    is_plan_admin: false,
    is_worker: false,
    lastActive: 'Yesterday',
  },
];

export const AdminRolesView: React.FC<AdminRolesViewProps> = ({
  user,
  onUpdateUserRole,
  onOpenAuth,
  currentTheme,
  currentLang,
}) => {
  const isLight = currentTheme.isLightMode;

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(() => {
    try {
      const saved = localStorage.getItem('dth_team_members');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_TEAM_MEMBERS;
  });

  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'dealer' | 'customer'>('dealer');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const currentRole = user?.role || (user?.is_plan_admin ? 'admin' : (user?.is_worker ? 'dealer' : 'customer'));

  const handleRoleSwitch = (targetRole: 'admin' | 'dealer' | 'customer') => {
    const updatedUser: UserProfile = {
      uid: user?.uid || 'usr-active-session',
      phoneNumber: user?.phoneNumber || '+91 98401 23456',
      email: user?.email || 'professorpradeeps@gmail.com',
      displayName: user?.displayName || 'Pradeep S',
      role: targetRole,
      is_plan_admin: targetRole === 'admin',
      is_worker: targetRole === 'admin' || targetRole === 'dealer',
      createdAt: user?.createdAt || new Date().toISOString(),
      lastLoginAt: user?.lastLoginAt || new Date().toISOString(),
      authProviders: user?.authProviders || ['google.com'],
    };

    if (onUpdateUserRole) {
      onUpdateUserRole(updatedUser);
    }
    try {
      localStorage.setItem('dth_tamizhan_user', JSON.stringify(updatedUser));
    } catch {}

    setStatusMessage(`Active session role switched to "${targetRole.toUpperCase()}".`);
    setTimeout(() => setStatusMessage(null), 3500);
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !newEmail.includes('@')) {
      alert('Please enter a valid email address.');
      return;
    }

    const newMember: TeamMember = {
      id: `usr-${Date.now()}`,
      email: newEmail.trim().toLowerCase(),
      name: newName.trim() || newEmail.split('@')[0],
      role: newRole,
      is_plan_admin: newRole === 'admin',
      is_worker: newRole === 'admin' || newRole === 'dealer',
      lastActive: 'Just added',
    };

    const updated = [newMember, ...teamMembers];
    setTeamMembers(updated);
    try {
      localStorage.setItem('dth_team_members', JSON.stringify(updated));
    } catch {}

    setNewEmail('');
    setNewName('');
    setStatusMessage(`Added ${newMember.name} as ${newRole.toUpperCase()}.`);
    setTimeout(() => setStatusMessage(null), 3500);
  };

  const handleMemberRoleChange = (memberId: string, role: 'admin' | 'dealer' | 'customer') => {
    const updated = teamMembers.map((m) => {
      if (m.id === memberId) {
        return {
          ...m,
          role,
          is_plan_admin: role === 'admin',
          is_worker: role === 'admin' || role === 'dealer',
        };
      }
      return m;
    });
    setTeamMembers(updated);
    try {
      localStorage.setItem('dth_team_members', JSON.stringify(updated));
    } catch {}
    setStatusMessage('User permission tier updated.');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  return (
    <div className="p-5 sm:p-7 space-y-7 animate-in fade-in duration-300">
      {/* Role Feedback Banner */}
      {statusMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 shadow-sm animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Active Session Role Switcher Bar */}
      <div 
        className={`p-5 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-sm ${
          isLight ? 'bg-gray-50/80 border-gray-200' : 'bg-black/20 border-white/10'
        }`}
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span 
              className="p-1.5 rounded-lg border shadow-xs"
              style={{
                backgroundColor: `${currentTheme.primaryColor}15`,
                color: currentTheme.primaryColor,
                borderColor: `${currentTheme.primaryColor}30`,
              }}
            >
              <Key className="w-4 h-4" />
            </span>
            <h3 className={`text-base font-bold ${currentTheme.headingText}`}>
              Active Session Role: <span className="uppercase font-mono" style={{ color: currentTheme.primaryColor }}>{currentRole}</span>
            </h3>
          </div>
          <p className={`text-xs ${currentTheme.subText}`}>
            Logged in as <strong className={isLight ? 'text-gray-900' : 'text-white'}>{user?.email || 'professorpradeeps@gmail.com'}</strong>. Toggle between roles to verify UI isolation and test RBAC permissions.
          </p>
        </div>

        {/* Quick Role Switcher Buttons */}
        <div 
          className={`inline-flex p-1 rounded-xl border self-start md:self-auto ${
            isLight ? 'bg-white border-gray-300 shadow-sm' : 'bg-black/40 border-white/15'
          }`}
        >
          <button
            type="button"
            onClick={() => handleRoleSwitch('admin')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              currentRole === 'admin'
                ? 'text-white shadow-sm'
                : isLight
                ? 'text-gray-600 hover:text-black'
                : 'text-gray-300 hover:text-white'
            }`}
            style={{
              backgroundColor: currentRole === 'admin' ? currentTheme.primaryColor : undefined,
            }}
          >
            <Crown className="w-3.5 h-3.5" />
            <span>Admin</span>
          </button>

          <button
            type="button"
            onClick={() => handleRoleSwitch('dealer')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              currentRole === 'dealer'
                ? 'text-white shadow-sm'
                : isLight
                ? 'text-gray-600 hover:text-black'
                : 'text-gray-300 hover:text-white'
            }`}
            style={{
              backgroundColor: currentRole === 'dealer' ? currentTheme.primaryColor : undefined,
            }}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Dealer</span>
          </button>

          <button
            type="button"
            onClick={() => handleRoleSwitch('customer')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              currentRole === 'customer'
                ? 'text-white shadow-sm'
                : isLight
                ? 'text-gray-600 hover:text-black'
                : 'text-gray-300 hover:text-white'
            }`}
            style={{
              backgroundColor: currentRole === 'customer' ? currentTheme.primaryColor : undefined,
            }}
          >
            <User className="w-3.5 h-3.5" />
            <span>Customer</span>
          </button>
        </div>
      </div>

      {/* RBAC Capabilities Matrix & Permissions Table */}
      <div 
        className={`border rounded-2xl overflow-hidden shadow-sm ${
          isLight ? 'bg-white border-gray-200' : 'bg-black/30 border-white/10'
        }`}
      >
        <div className={`px-5 py-3.5 border-b flex items-center justify-between ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-white/5 border-white/10'}`}>
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4" style={{ color: currentTheme.primaryColor }} />
            <h4 className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-gray-800' : 'text-gray-200'}`}>
              Role-Based Access Control (RBAC) Permission Matrix
            </h4>
          </div>
          <span className="text-[11px] font-mono text-emerald-500 font-semibold">
            Firestore Security Rules Enforced
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className={`text-[10px] uppercase font-bold border-b ${isLight ? 'bg-gray-100/70 text-gray-600 border-gray-200' : 'bg-black/40 text-gray-400 border-white/10'}`}>
              <tr>
                <th className="px-5 py-3">Permission / Capability</th>
                <th className="px-5 py-3 text-center">Admin (<code className="text-[10px]">is_plan_admin</code>)</th>
                <th className="px-5 py-3 text-center">Dealer (<code className="text-[10px]">is_worker</code>)</th>
                <th className="px-5 py-3 text-center">Customer</th>
                <th className="px-5 py-3">Security Enforcement Path</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isLight ? 'divide-gray-200' : 'divide-white/10'}`}>
              <tr>
                <td className="px-5 py-3.5">
                  <span className={`font-semibold block ${isLight ? 'text-gray-900' : 'text-white'}`}>
                    Plan Catalog Management & Pricing
                  </span>
                  <span className={`text-[11px] ${currentTheme.subText}`}>Create, edit, and delete DTH recharge plans</span>
                </td>
                <td className="px-5 py-3.5 text-center">
                  <span className="inline-flex p-1 rounded bg-emerald-500/15 text-emerald-500"><Check className="w-4 h-4" /></span>
                </td>
                <td className="px-5 py-3.5 text-center">
                  <span className="inline-flex p-1 rounded bg-rose-500/15 text-rose-500"><X className="w-4 h-4" /></span>
                </td>
                <td className="px-5 py-3.5 text-center">
                  <span className="inline-flex p-1 rounded bg-rose-500/15 text-rose-500"><X className="w-4 h-4" /></span>
                </td>
                <td className="px-5 py-3.5 font-mono text-[11px] text-gray-400">/admin/plan</td>
              </tr>

              <tr>
                <td className="px-5 py-3.5">
                  <span className={`font-semibold block ${isLight ? 'text-gray-900' : 'text-white'}`}>
                    Order Dispatch & Fulfillment
                  </span>
                  <span className={`text-[11px] ${currentTheme.subText}`}>Update recharge status & enter operator ref IDs</span>
                </td>
                <td className="px-5 py-3.5 text-center">
                  <span className="inline-flex p-1 rounded bg-emerald-500/15 text-emerald-500"><Check className="w-4 h-4" /></span>
                </td>
                <td className="px-5 py-3.5 text-center">
                  <span className="inline-flex p-1 rounded bg-emerald-500/15 text-emerald-500"><Check className="w-4 h-4" /></span>
                </td>
                <td className="px-5 py-3.5 text-center">
                  <span className="inline-flex p-1 rounded bg-rose-500/15 text-rose-500"><X className="w-4 h-4" /></span>
                </td>
                <td className="px-5 py-3.5 font-mono text-[11px] text-gray-400">/admin/orders</td>
              </tr>

              <tr>
                <td className="px-5 py-3.5">
                  <span className={`font-semibold block ${isLight ? 'text-gray-900' : 'text-white'}`}>
                    DTH Signal Refresh Command
                  </span>
                  <span className={`text-[11px] ${currentTheme.subText}`}>Trigger satellite activation ping for set-top boxes</span>
                </td>
                <td className="px-5 py-3.5 text-center">
                  <span className="inline-flex p-1 rounded bg-emerald-500/15 text-emerald-500"><Check className="w-4 h-4" /></span>
                </td>
                <td className="px-5 py-3.5 text-center">
                  <span className="inline-flex p-1 rounded bg-emerald-500/15 text-emerald-500"><Check className="w-4 h-4" /></span>
                </td>
                <td className="px-5 py-3.5 text-center">
                  <span className="inline-flex p-1 rounded bg-amber-500/15 text-amber-500 text-[10px] font-bold px-2 py-0.5">Own Cards</span>
                </td>
                <td className="px-5 py-3.5 font-mono text-[11px] text-gray-400">/api/signal-refresh</td>
              </tr>

              <tr>
                <td className="px-5 py-3.5">
                  <span className={`font-semibold block ${isLight ? 'text-gray-900' : 'text-white'}`}>
                    Catalog & Security Audit Trail
                  </span>
                  <span className={`text-[11px] ${currentTheme.subText}`}>Inspect immutable timestamped pricing change logs</span>
                </td>
                <td className="px-5 py-3.5 text-center">
                  <span className="inline-flex p-1 rounded bg-emerald-500/15 text-emerald-500"><Check className="w-4 h-4" /></span>
                </td>
                <td className="px-5 py-3.5 text-center">
                  <span className="inline-flex p-1 rounded bg-rose-500/15 text-rose-500"><X className="w-4 h-4" /></span>
                </td>
                <td className="px-5 py-3.5 text-center">
                  <span className="inline-flex p-1 rounded bg-rose-500/15 text-rose-500"><X className="w-4 h-4" /></span>
                </td>
                <td className="px-5 py-3.5 font-mono text-[11px] text-gray-400">/admin/audit</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Team Member Role Assignment Directory */}
      <div 
        className={`border rounded-2xl overflow-hidden shadow-sm ${
          isLight ? 'bg-white border-gray-200' : 'bg-black/30 border-white/10'
        }`}
      >
        <div className={`px-5 py-3.5 border-b flex flex-wrap items-center justify-between gap-3 ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-white/5 border-white/10'}`}>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" style={{ color: currentTheme.primaryColor }} />
            <h4 className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-gray-800' : 'text-gray-200'}`}>
              Assigned User Roles Directory
            </h4>
          </div>
          <span className={`text-xs ${currentTheme.subText}`}>
            {teamMembers.length} Accounts Configured
          </span>
        </div>

        {/* Add User Form */}
        <form onSubmit={handleAddMember} className={`p-4 border-b flex flex-wrap items-center gap-3 ${isLight ? 'bg-gray-50/50 border-gray-200' : 'bg-white/[0.02] border-white/10'}`}>
          <div className="flex-1 min-w-[200px]">
            <input
              type="email"
              required
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="Add user email (e.g. dealer@dth.in)..."
              className={`w-full px-3 py-2 text-xs rounded-lg border focus:outline-none ${
                isLight 
                  ? 'bg-white border-gray-300 text-gray-900 placeholder-gray-400' 
                  : 'bg-black/40 border-white/20 text-white placeholder-gray-500'
              }`}
            />
          </div>

          <div className="w-44 min-w-[140px]">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Name or territory..."
              className={`w-full px-3 py-2 text-xs rounded-lg border focus:outline-none ${
                isLight 
                  ? 'bg-white border-gray-300 text-gray-900 placeholder-gray-400' 
                  : 'bg-black/40 border-white/20 text-white placeholder-gray-500'
              }`}
            />
          </div>

          <div className="w-36">
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as any)}
              className={`w-full px-3 py-2 text-xs rounded-lg border focus:outline-none ${
                isLight 
                  ? 'bg-white border-gray-300 text-gray-900' 
                  : 'bg-black/40 border-white/20 text-white'
              }`}
            >
              <option value="dealer">Dealer</option>
              <option value="admin">Admin</option>
              <option value="customer">Customer</option>
            </select>
          </div>

          <button
            type="submit"
            className="px-4 py-2 rounded-lg text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all hover:opacity-95"
            style={{ backgroundColor: currentTheme.primaryColor }}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Grant Role</span>
          </button>
        </form>

        {/* Members Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className={`text-[10px] uppercase font-bold border-b ${isLight ? 'bg-gray-100/70 text-gray-600 border-gray-200' : 'bg-black/40 text-gray-400 border-white/10'}`}>
              <tr>
                <th className="px-5 py-3">User & Contact</th>
                <th className="px-5 py-3">Assigned Role</th>
                <th className="px-5 py-3">Flags</th>
                <th className="px-5 py-3">Last Active</th>
                <th className="px-5 py-3 text-right">Modify Role</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isLight ? 'divide-gray-200' : 'divide-white/10'}`}>
              {teamMembers.map((member) => (
                <tr key={member.id} className={isLight ? 'hover:bg-gray-50/70' : 'hover:bg-white/[0.02]'}>
                  <td className="px-5 py-3.5">
                    <span className={`font-semibold block ${isLight ? 'text-gray-900' : 'text-white'}`}>
                      {member.name}
                    </span>
                    <span className={`text-[11px] font-mono ${currentTheme.subText}`}>
                      {member.email}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span 
                      className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border"
                      style={{
                        backgroundColor: member.role === 'admin' 
                          ? `${currentTheme.primaryColor}20` 
                          : member.role === 'dealer'
                          ? 'rgba(16, 185, 129, 0.15)'
                          : 'rgba(107, 114, 128, 0.15)',
                        borderColor: member.role === 'admin'
                          ? `${currentTheme.primaryColor}40`
                          : member.role === 'dealer'
                          ? 'rgba(16, 185, 129, 0.3)'
                          : 'rgba(107, 114, 128, 0.3)',
                        color: member.role === 'admin'
                          ? currentTheme.primaryColor
                          : member.role === 'dealer'
                          ? '#10b981'
                          : '#9ca3af',
                      }}
                    >
                      {member.role}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 space-x-1 font-mono text-[10px]">
                    {member.is_plan_admin && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        is_plan_admin
                      </span>
                    )}
                    {member.is_worker && (
                      <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                        is_worker
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-[11px] text-gray-400">
                    {member.lastActive}
                  </td>
                  <td className="px-5 py-3.5 text-right space-x-1.5">
                    {(['admin', 'dealer', 'customer'] as const).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => handleMemberRoleChange(member.id, r)}
                        disabled={member.role === r}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-all ${
                          member.role === r
                            ? 'opacity-40 cursor-not-allowed bg-gray-500/10 text-gray-400'
                            : isLight
                            ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                            : 'bg-white/10 hover:bg-white/20 text-gray-300'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
