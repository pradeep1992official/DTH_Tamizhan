import type { DthConnection } from '../types';
const legacyKey = 'dth_tamizhan_connections';
export const connectionCacheKey = (uid: string) => `dth_tamizhan_connections:${uid}`;
export function ownedConnections(items: DthConnection[], uid?: string | null): DthConnection[] {
  return uid ? items.filter(item => item && item.user_id === uid) : [];
}
export function readConnectionCache(storage: Storage, uid?: string | null): DthConnection[] {
  if (!uid) return [];
  try {
    // Migrate the shared cache without assigning guest or other users' boxes to this account.
    const legacy = JSON.parse(storage.getItem(legacyKey) || '[]');
    if (Array.isArray(legacy)) {
      const owners = new Set<string>(legacy.filter(item => item && typeof item.user_id === 'string' && item.user_id !== 'guest_user').map(item => item.user_id));
      for (const owner of owners) {
        const key = connectionCacheKey(owner);
        if (!storage.getItem(key)) storage.setItem(key, JSON.stringify(ownedConnections(legacy, owner)));
      }
      storage.removeItem(legacyKey);
    }
    const cached = JSON.parse(storage.getItem(connectionCacheKey(uid)) || '[]');
    return Array.isArray(cached) ? ownedConnections(cached, uid) : [];
  } catch { return []; }
}
