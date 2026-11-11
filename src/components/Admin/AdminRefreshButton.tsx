import React from 'react';
import { RefreshCw } from '../../lib/icons';

interface AdminRefreshButtonProps {
  onRefresh: () => void;
  loading: boolean;
  label?: string;
}

export function AdminRefreshButton({ onRefresh, loading, label = 'Refresh' }: AdminRefreshButtonProps) {
  return (
    <button type="button" onClick={onRefresh} disabled={loading} aria-busy={loading}
      aria-label={label} title={label} className="admin-refresh-button">
      <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
    </button>
  );
}
