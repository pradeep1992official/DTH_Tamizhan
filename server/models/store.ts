import { SUBSCRIBER_RULES, subscriberHelp } from '../../src/lib/subscriberValidation';
import path from 'path';
import fs from 'fs';
import { DthOperator, DthPlan, CustomerRecord, RechargeOrder, PlanCatalogItem } from '../../src/types';
import { getSuperAdminEmail } from '../middleware/auth';

export const DATA_DIR = path.join(process.cwd(), 'data');
export const PLANS_FILE = path.join(DATA_DIR, 'plan_catalog.json');
export const DELETED_PLANS_FILE = path.join(DATA_DIR, 'deleted_plan_ids.json');
export const CUSTOMERS_FILE = path.join(DATA_DIR, 'customers.json');
export const RECHARGE_ORDERS_FILE = path.join(DATA_DIR, 'recharge_orders.json');
export const OPERATOR_SETTINGS_FILE = path.join(DATA_DIR, 'operator_settings.json');
export const ADMINS_FILE = path.join(DATA_DIR, 'admins.json');

export const OPERATORS: DthOperator[] = [
  {
    id: 'sun_direct',
    name: 'Sun Direct',
    shortName: 'Sun Direct',
    tamilName: 'சன் டைரக்ட்',
    logoColor: '#F97316',
    cardName: SUBSCRIBER_RULES.sun_direct.label,

    cardLengthDesc: subscriberHelp('sun_direct'),
    sampleId: '41289456123',
    tollFree: '1800 123 7575',
    smsRefreshFormat: 'SMS "SUN <SmartCard>" to 58585',
    popularPacksCount: 14,
    isEnabled: true,
  },
  {
    id: 'tata_play',
    name: 'Tata Play',
    shortName: 'Tata Play',
    tamilName: 'டாடா பிளே',
    logoColor: '#EC4899',
    cardName: SUBSCRIBER_RULES.tata_play.label,

    cardLengthDesc: subscriberHelp('tata_play'),
    sampleId: '1029384756',
    tollFree: '1800 208 6633',
    smsRefreshFormat: 'SMS "HR <SubID>" to 56633',
    popularPacksCount: 18,
    isEnabled: true,
  },
  {
    id: 'airtel_dth',
    name: 'Airtel Digital TV',
    shortName: 'Airtel DTH',
    tamilName: 'ஏர்டெல் டிவி',
    logoColor: '#EF4444',
    cardName: SUBSCRIBER_RULES.airtel_dth.label,

    cardLengthDesc: subscriberHelp('airtel_dth'),
    sampleId: '3009482715',
    tollFree: '1800 103 6065',
    smsRefreshFormat: 'SMS "HR <CustID>" to 54325',
    popularPacksCount: 16,
    isEnabled: true,
  },
  {
    id: 'dish_tv',
    name: 'Dish TV',
    shortName: 'Dish TV',
    tamilName: 'டிஷ் டிவி',
    logoColor: '#EB5B26',
    cardName: SUBSCRIBER_RULES.dish_tv.label,

    cardLengthDesc: subscriberHelp('dish_tv'),
    sampleId: '02589412356',
    tollFree: '1800 258 3474',
    smsRefreshFormat: 'SMS "DISHTV RESEND <VC>" to 57575',
    popularPacksCount: 12,
    isEnabled: true,
  },
  {
    id: 'd2h',
    name: 'D2H Videocon',
    shortName: 'D2H',
    tamilName: 'டி2எச்',
    logoColor: '#8B5CF6',
    cardName: SUBSCRIBER_RULES.d2h.label,

    cardLengthDesc: subscriberHelp('d2h'),
    sampleId: '89456123',
    tollFree: '1800 137 7777',
    smsRefreshFormat: 'SMS "RT <CustID>" to 566777',
    popularPacksCount: 11,
    isEnabled: true,
  }
];

export const MEMORY_RECHARGE_ORDERS: RechargeOrder[] = [];

export const MEMORY_CUSTOMERS: CustomerRecord[] = [];

export interface AdminAccountRecord {
  uid: string;
  email: string;
  displayName: string;
  role: 'super_admin' | 'admin';
  status: 'approved' | 'revoked';
  approvedBy: string;
  approvedAt: string;
  notes?: string;
}

export const MEMORY_ADMINS: AdminAccountRecord[] = [];

export interface AdminRequestRecord {
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

export const MEMORY_ADMIN_REQUESTS: AdminRequestRecord[] = [];

export const APPROVED_ADMIN_EMAILS = new Set<string>([
  getSuperAdminEmail()
]);

// Helper to refresh approved emails set
export function refreshApprovedAdminEmails(): void {
  APPROVED_ADMIN_EMAILS.clear();
  APPROVED_ADMIN_EMAILS.add(getSuperAdminEmail());
  MEMORY_ADMINS.forEach((adm) => {
    if (adm.status === 'approved' && adm.email) {
      APPROVED_ADMIN_EMAILS.add(adm.email.trim().toLowerCase());
    }
  });
}

// Disk loader & saver utilities
export function initStoreFromDisk(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(CUSTOMERS_FILE)) {
      const raw = fs.readFileSync(CUSTOMERS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        MEMORY_CUSTOMERS.length = 0;
        MEMORY_CUSTOMERS.push(...parsed);
      }
    }

    if (fs.existsSync(RECHARGE_ORDERS_FILE)) {
      const raw = fs.readFileSync(RECHARGE_ORDERS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        MEMORY_RECHARGE_ORDERS.length = 0;
        MEMORY_RECHARGE_ORDERS.push(...parsed);
      }
    }

    if (fs.existsSync(ADMINS_FILE)) {
      const raw = fs.readFileSync(ADMINS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        MEMORY_ADMINS.length = 0;
        MEMORY_ADMINS.push(...parsed);
      }
    }

    if (fs.existsSync(OPERATOR_SETTINGS_FILE)) {
      const raw = fs.readFileSync(OPERATOR_SETTINGS_FILE, 'utf-8');
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        throw new Error('Operator settings must be a JSON array.');
      }

      for (const setting of parsed) {
        if (!setting || typeof setting !== 'object' || !('id' in setting)) continue;
        const operator = OPERATORS.find((item) => item.id === setting.id);
        if (!operator) continue;

        const saved = setting as Partial<DthOperator>;
        if (typeof saved.isEnabled === 'boolean') operator.isEnabled = saved.isEnabled;
        operator.condition = saved.condition;
        operator.conditionLabel = saved.conditionLabel;
        operator.disableReason = saved.conditionLabel || saved.disableReason;
        operator.maintenanceMessage = saved.maintenanceMessage;
        operator.expectedRestoration = saved.expectedRestoration;
        operator.updatedAt = saved.updatedAt;
        operator.updatedBy = saved.updatedBy;
      }
    }

    refreshApprovedAdminEmails();
  } catch (err) {
    console.warn('[Server Store] Error initializing store from disk:', err);
  }
}

export function saveOperatorSettingsToDisk(): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const settings = OPERATORS.map((operator) => ({
    id: operator.id,
    isEnabled: operator.isEnabled !== false,
    condition: operator.condition,
    conditionLabel: operator.conditionLabel,
    maintenanceMessage: operator.maintenanceMessage,
    expectedRestoration: operator.expectedRestoration,
    updatedAt: operator.updatedAt,
    updatedBy: operator.updatedBy,
  }));
  fs.writeFileSync(OPERATOR_SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
}

export function saveCustomersToDisk(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(CUSTOMERS_FILE, JSON.stringify(MEMORY_CUSTOMERS, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Failed to save customers to disk:', err);
  }
}

export function saveAdminsToDisk(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(ADMINS_FILE, JSON.stringify(MEMORY_ADMINS, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Failed to save admins to disk:', err);
  }
}
