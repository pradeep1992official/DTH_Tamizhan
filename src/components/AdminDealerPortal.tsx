import React from 'react';
import { Language, UserProfile, DthOperatorId, AdminTabId } from '../types';
import { OperatorTheme } from '../lib/theme';
import { AdminPortal } from './AdminPortal';

export type AdminPathTab = 'plan' | 'role' | 'orders' | 'audit' | 'customers' | 'reports' | 'pending' | 'recharges' | 'packs' | 'payments' | 'approvals';

interface AdminDealerPortalProps {
  currentLang: Language;
  user: UserProfile | null;
  onOpenAuth: () => void;
  onUpdateUserRole?: (updated: UserProfile) => void;
  onTriggerRefresh: (operator: DthOperatorId, card: string) => void;
  onBackToCustomerFlow?: () => void;
  initialSubTab?: AdminPathTab;
  currentTheme: OperatorTheme;
  onPathChange?: (path: any) => void;
}

export const AdminDealerPortal: React.FC<AdminDealerPortalProps> = ({
  currentLang,
  user,
  onOpenAuth,
  onUpdateUserRole,
  onTriggerRefresh,
  onBackToCustomerFlow,
  initialSubTab,
  currentTheme,
  onPathChange,
}) => {
  // Map any legacy path to the new precise AdminTabId
  const mapLegacyTab = (tab?: string): AdminTabId => {
    if (!tab) return 'customers';
    if (tab === 'role' || tab === 'customers') return 'customers';
    if (tab === 'audit' || tab === 'reports') return 'reports';
    if (tab === 'orders' || tab === 'pending') return 'pending';
    if (tab === 'recharges' || tab === 'recharge-update') return 'recharges';
    if (tab === 'plan' || tab === 'packs') return 'packs';
    if (tab === 'payments') return 'payments';
    if (tab === 'approvals' || tab === 'admin-access') return 'approvals';
    return 'customers';
  };

  return (
    <AdminPortal
      currentLang={currentLang}
      user={user}
      onOpenAuth={onOpenAuth}
      onUpdateUserRole={onUpdateUserRole}
      onTriggerRefresh={onTriggerRefresh}
      onBackToCustomerFlow={onBackToCustomerFlow}
      initialTab={mapLegacyTab(initialSubTab)}
      currentTheme={currentTheme}
      onPathChange={onPathChange}
    />
  );
};
