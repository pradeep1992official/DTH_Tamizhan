export type DthOperatorId = 'sun_direct' | 'tata_play' | 'airtel_dth' | 'dish_tv' | 'd2h';

export interface DthOperator {
  id: DthOperatorId;
  name: string;
  shortName: string;
  tamilName: string;
  logoColor: string;
  cardName: string;
  cardPattern: string;
  cardLengthDesc: string;
  sampleId: string;
  tollFree: string;
  smsRefreshFormat: string;
  popularPacksCount: number;
}

export type PlanCategory = 'all' | 'tamil_base' | 'cinema' | 'sports_kids' | 'annual' | 'addon';

export interface DthPlan {
  id: string;
  operatorId: DthOperatorId;
  name: string;
  tamilName: string;
  category: 'tamil_base' | 'cinema' | 'sports_kids' | 'annual' | 'addon';
  price: number;
  validityDays: number;
  channelsCount: number;
  hdChannelsCount: number;
  description: string;
  tamilChannelsHighlight: string[];
  popularTag?: string;
}

export interface SubscriberDetails {
  operator: DthOperatorId;
  operatorName: string;
  smartCardNumber: string;
  customerName: string;
  registeredMobile: string;
  currentBalance: number;
  packName: string;
  packMonthlyRent: number;
  expiryDate: string;
  isExpired: boolean;
  accountStatus: string;
}

export interface DthConnection {
  id: string;
  user_id: string;
  operator: DthOperatorId;
  operatorName: string;
  smartCardNumber: string;
  nickname: string;
  registeredMobile?: string;
  customerName?: string;
  balance?: number;
  expiryDate?: string;
  monthlyPackPrice?: number;
  packName?: string;
  createdAt: string;
}

export interface RechargeOrder {
  orderId: string;
  user_id: string;
  operator: DthOperatorId;
  operatorName: string;
  smartCardNumber: string;
  registeredMobile?: string;
  amount: number;
  packId: string;
  packName: string;
  packValidity: string;
  paymentMethod: 'upi' | 'qr_code' | 'card' | 'netbanking' | 'wallet';
  paymentStatus: 'paid' | 'initiated' | 'failed';
  rechargeStatus: 'pending' | 'processing' | 'completed' | 'failed';
  operatorRefId: string;
  workerNotes?: string;
  signalRefreshRequested?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  uid: string;
  phoneNumber?: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
  is_worker: boolean;
  is_plan_admin?: boolean;
  role: 'customer' | 'worker' | 'dealer' | 'admin';
  createdAt: string;
  lastLoginAt: string;
  authProviders: string[]; // e.g. ['phone', 'google.com']
}

export interface PlanCatalogItem {
  id: string;
  operator: DthOperatorId;
  pack_type: 'HD' | 'SD';
  duration_months: 1 | 6 | 12;
  plan_name: string;
  amount: number;
  is_recommended: boolean;
  channel_list: string[];
  updated_at: string;
  updated_by: string;
}

export interface PlanAuditLog {
  id: string;
  plan_id: string;
  plan_name: string;
  operator: DthOperatorId;
  action: 'create' | 'update' | 'delete';
  updated_at: string;
  updated_by: string;
  details?: string;
}

export interface BrowsePlan {
  id: string;
  operator: DthOperatorId;
  name: string;
  tamilName?: string;
  type: 'HD' | 'SD';
  duration_months: 1 | 3 | 6 | 12;
  price: number;
  monthly_equivalent_rate: number;
  channel_count: number;
  hd_channel_count?: number;
  channels: string[];
  genre_tags: string[];
  is_recommended: boolean;
  description?: string;
  // Computed ranking metrics
  price_per_channel?: number;
  savings_pct?: number;
  is_best_value?: boolean;
  is_best_savings?: boolean;
}

export interface PlanFilters {
  operators: DthOperatorId[];
  type: 'all' | 'HD' | 'SD';
  durations: (1 | 3 | 6 | 12)[];
  priceRange: [number, number];
  channelRange: [number, number];
  genreTags: string[];
  sortBy: 'recommended' | 'price_asc' | 'price_desc' | 'price_per_channel_asc' | 'savings_pct_desc' | 'channels_desc';
  searchQuery: string;
}

export const SUPER_ADMIN_EMAIL = 'professorpradeeps@gmail.com';

export function isSuperAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
}

export function isUserAdmin(user: UserProfile | null): boolean {
  if (!user) return false;
  if (isSuperAdminEmail(user.email)) return true;
  return user.role === 'admin' || !!user.is_plan_admin;
}

export type AdminTabId = 'customers' | 'reports' | 'pending' | 'recharges' | 'packs' | 'payments' | 'approvals';

export interface AdminAccount {
  uid: string;
  email: string;
  displayName?: string;
  status: 'approved' | 'revoked' | 'pending';
  role: 'super_admin' | 'admin';
  approvedBy: string;
  approvedAt: string;
  notes?: string;
}

export interface AdminAccessRequest {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  userPhone?: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
}

export interface CustomerRecord {
  id: string;
  customerName: string;
  registeredMobile: string;
  smartCardNumber: string;
  operator: DthOperatorId;
  operatorName: string;
  activePackName: string;
  currentBalance: number;
  expiryDate: string;
  status: 'active' | 'expired' | 'due_soon';
  totalRechargesCount: number;
  totalSpent: number;
  lastRechargeDate: string;
  createdAt: string;
}

export interface PaymentReportItem {
  transactionId: string;
  orderId: string;
  customerName: string;
  registeredMobile: string;
  smartCardNumber: string;
  operator: DthOperatorId;
  operatorName: string;
  packName: string;
  amount: number;
  paymentMethod: 'upi' | 'qr_code' | 'card' | 'netbanking' | 'wallet';
  paymentStatus: 'paid' | 'initiated' | 'failed' | 'refunded';
  gatewayRef: string;
  createdAt: string;
}

export type Language = 'en' | 'ta';
