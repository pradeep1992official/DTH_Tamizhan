import path from 'path';
import fs from 'fs';
import { DthOperator, DthPlan, CustomerRecord, RechargeOrder, PlanCatalogItem } from '../src/types';
import { INITIAL_PLAN_CATALOG } from '../src/lib/planCatalogService';
import { INITIAL_BROWSE_PLANS, catalogItemToBrowsePlan } from '../src/lib/browsePlansData';
import { getSuperAdminEmail } from './middleware/auth';

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
    cardName: 'Smart Card Number',
    cardPattern: '^[0-9]{11}$',
    cardLengthDesc: '11 digits starting with 4 or 7',
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
    cardName: 'Subscriber ID',
    cardPattern: '^[0-9]{10}$',
    cardLengthDesc: '10 digits starting with 1',
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
    cardName: 'Customer ID',
    cardPattern: '^[0-9]{10}$',
    cardLengthDesc: '10 digits starting with 3',
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
    cardName: 'Viewing Card (VC)',
    cardPattern: '^[0-9]{11}$',
    cardLengthDesc: '11 digits starting with 025 or 015',
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
    cardName: 'Customer ID',
    cardPattern: '^[0-9]{8,11}$',
    cardLengthDesc: '8 to 11 digits',
    sampleId: '89456123',
    tollFree: '1800 137 7777',
    smsRefreshFormat: 'SMS "RT <CustID>" to 566777',
    popularPacksCount: 11,
    isEnabled: true,
  }
];

export const SAMPLE_PLANS: DthPlan[] = [
  {
    id: 'sd-tam-super',
    operatorId: 'sun_direct',
    name: 'Sun Direct Tamil Super Pack',
    tamilName: 'தமிழ் சூப்பர் பேக்',
    category: 'tamil_base',
    price: 219,
    validityDays: 30,
    channelsCount: 145,
    hdChannelsCount: 0,
    description: 'All Sun Network channels, Vijay, Zee Tamil, News 7, Puthiyathalaimurai & Free-To-Air channels',
    tamilChannelsHighlight: ['Sun TV', 'KTV', 'Sun Music', 'Star Vijay', 'Zee Tamil', 'Kalaignar TV', 'Chithiram TV'],
    popularTag: 'Most Popular in TN',
  },
  {
    id: 'sd-tam-hd-prime',
    operatorId: 'sun_direct',
    name: 'Sun Direct Prime HD',
    tamilName: 'சன் பிரைம் எச்டி',
    category: 'tamil_base',
    price: 299,
    validityDays: 30,
    channelsCount: 210,
    hdChannelsCount: 32,
    description: 'Premier Tamil HD family bouquet with 32 crystal clear HD channels and complete sports package.',
    tamilChannelsHighlight: ['Sun TV HD', 'KTV HD', 'Sun Music HD', 'Star Vijay HD', 'Zee Tamil HD', 'Star Sports 1 Tamil HD'],
    popularTag: 'Crystal Clear HD',
  },
  {
    id: 'sd-tam-cinema',
    operatorId: 'sun_direct',
    name: 'Sun Direct Tamil Cinema Bonanza HD',
    tamilName: 'தமிழ் சினிமா போனான்ஸா எச்டி',
    category: 'cinema',
    price: 349,
    validityDays: 30,
    channelsCount: 185,
    hdChannelsCount: 26,
    description: 'Complete Tamil movies, entertainment, serials and premium music bouquet with HD cinema',
    tamilChannelsHighlight: ['KTV HD', 'Vijay Super HD', 'Zee Thirai HD', 'Sony PIX HD', 'Star Movies HD'],
    popularTag: 'Best for Movies',
  },
  {
    id: 'sd-tam-annual',
    operatorId: 'sun_direct',
    name: 'Sun Direct Prime HD (Annual Dhamaka)',
    tamilName: '12 மாத பிரைம் எச்டி சேவர்',
    category: 'annual',
    price: 3100,
    validityDays: 365,
    channelsCount: 210,
    hdChannelsCount: 32,
    description: 'Pay for 10 months and get 2 months free with complete HD entertainment and sports for 1 year',
    tamilChannelsHighlight: ['All Tamil HD', 'Sports HD Tamil', 'Movies HD', 'News Channels'],
    popularTag: 'Save ₹488 / Year',
  },
  {
    id: 'tp-tam-basic',
    operatorId: 'tata_play',
    name: 'Tata Play Tamil Basic Starter',
    tamilName: 'டாடா பிளே தமிழ் பேசிக்',
    category: 'tamil_base',
    price: 220,
    validityDays: 30,
    channelsCount: 150,
    hdChannelsCount: 0,
    description: 'Core family entertainment pack featuring all leading regional channels at an accessible price.',
    tamilChannelsHighlight: ['Sun TV', 'Star Vijay', 'Zee Tamil', 'Colors Tamil', 'KTV', 'Thanthi TV'],
    popularTag: 'Top Value',
  },
  {
    id: 'tp-tam-thalaiva-hd',
    operatorId: 'tata_play',
    name: 'Tata Play Tamil Thalaiva HD',
    tamilName: 'டாடா பிளே தமிழ் தலைவா எச்டி',
    category: 'tamil_base',
    price: 360,
    validityDays: 30,
    channelsCount: 220,
    hdChannelsCount: 36,
    description: 'True HD clarity for movies, drama serials, news and Star Sports Tamil in 1080i with Tata Play Binge support',
    tamilChannelsHighlight: ['Sun TV HD', 'Star Vijay HD', 'Zee Tamil HD', 'KTV HD', 'Star Sports 1 Tamil HD'],
    popularTag: 'HD Excellence',
  },
  {
    id: 'at-tam-value',
    operatorId: 'airtel_dth',
    name: 'Airtel Tamil Value Pack',
    tamilName: 'ஏர்டெல் தமிழ் வேல்யூ',
    category: 'tamil_base',
    price: 215,
    validityDays: 30,
    channelsCount: 140,
    hdChannelsCount: 0,
    description: 'Comprehensive Tamil pack with Sun TV, KTV, Vijay, Zee Tamil, news, devotional and cartoon channels',
    tamilChannelsHighlight: ['Sun TV', 'KTV', 'Star Vijay', 'Zee Tamil', 'Sathiyam TV', 'Chithiram'],
    popularTag: 'Airtel Favorite',
  },
  {
    id: 'at-tam-hd',
    operatorId: 'airtel_dth',
    name: 'Airtel Tamil Mega HD',
    tamilName: 'ஏர்டெல் தமிழ் மெகா எச்டி',
    category: 'tamil_base',
    price: 320,
    validityDays: 30,
    channelsCount: 215,
    hdChannelsCount: 34,
    description: 'High definition channels with Dolby sound, Airtel Xstream Smart Stick compatibility and instant recharge credit',
    tamilChannelsHighlight: ['Sun TV HD', 'Star Vijay HD', 'Zee Tamil HD', 'Star Sports 1 Tamil HD'],
    popularTag: 'Top Seller',
  },
  {
    id: 'dt-tam-super',
    operatorId: 'dish_tv',
    name: 'Dish TV Tamil Super SD',
    tamilName: 'டிஷ் டிவி தமிழ் சூப்பர்',
    category: 'tamil_base',
    price: 210,
    validityDays: 30,
    channelsCount: 140,
    hdChannelsCount: 0,
    description: 'Budget-friendly Tamil entertainment covering top family serials, movie channels, comedy and music',
    tamilChannelsHighlight: ['Sun TV', 'KTV', 'Star Vijay', 'Zee Tamil', 'Polimer News'],
    popularTag: 'Value King',
  },
  {
    id: 'd2h-tam-joy',
    operatorId: 'd2h',
    name: 'D2H Tamil Joy SD',
    tamilName: 'டி2எச் தமிழ் ஜாய்',
    category: 'tamil_base',
    price: 205,
    validityDays: 30,
    channelsCount: 135,
    hdChannelsCount: 0,
    description: 'All leading Tamil language general entertainment, spiritual, movie and regional music stations',
    tamilChannelsHighlight: ['Sun TV', 'KTV', 'Vijay Super', 'Zee Tamil', 'Sun Music'],
    popularTag: 'Economical',
  }
];

export const MEMORY_RECHARGE_ORDERS: RechargeOrder[] = [
  {
    orderId: 'ORD-TN-894102',
    user_id: 'cust-101',
    operator: 'sun_direct',
    operatorName: 'Sun Direct',
    smartCardNumber: '41289456123',
    customerName: 'Senthil Nathan',
    registeredMobile: '9840123456',
    amount: 219,
    packId: 'sd-tam-super',
    packName: 'Tamil Super Pack',
    packValidity: '30 Days',
    paymentMethod: 'upi',
    paymentStatus: 'paid',
    rechargeStatus: 'completed',
    operatorRefId: 'SUN-REF-99214',
    workerNotes: 'Auto-credited via Sun Direct Gateway',
    signalRefreshRequested: true,
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 1.9).toISOString(),
  },
  {
    orderId: 'ORD-TN-894103',
    user_id: 'cust-102',
    operator: 'tata_play',
    operatorName: 'Tata Play',
    smartCardNumber: '1029384756',
    customerName: 'Anitha Rajendran',
    registeredMobile: '9444198765',
    amount: 360,
    packId: 'tp-tam-thalaiva-hd',
    packName: 'Tata Play Tamil Thalaiva HD',
    packValidity: '30 Days',
    paymentMethod: 'qr_code',
    paymentStatus: 'paid',
    rechargeStatus: 'pending',
    operatorRefId: 'UPI-TXN-481920',
    workerNotes: 'Awaiting operator batch verification',
    signalRefreshRequested: false,
    createdAt: new Date(Date.now() - 1800000).toISOString(),
    updatedAt: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    orderId: 'ORD-TN-894105',
    user_id: 'cust-104',
    operator: 'sun_direct',
    operatorName: 'Sun Direct',
    smartCardNumber: '70281944501',
    customerName: 'Ramesh Kumar',
    registeredMobile: '9790812345',
    amount: 1650,
    packId: 'sun_hd_6m_rec',
    packName: 'Sun Direct Prime HD (6 Months Saver)',
    packValidity: '180 Days',
    paymentMethod: 'netbanking',
    paymentStatus: 'paid',
    rechargeStatus: 'completed',
    operatorRefId: 'SUN-REF-104882',
    workerNotes: '6 Months pack credited successfully with bonus days',
    signalRefreshRequested: false,
    createdAt: new Date(Date.now() - 86400000 * 1.2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 1.1).toISOString(),
  }
];

export const MEMORY_CUSTOMERS: CustomerRecord[] = [
  {
    id: 'cust_01',
    customerName: 'Karthik Subramanian',
    registeredMobile: '9840123456',
    smartCardNumber: '41289456123',
    operator: 'sun_direct',
    operatorName: 'Sun Direct',
    activePackName: 'Sun Direct Prime HD (6M Saver)',
    currentBalance: 145.50,
    expiryDate: '2026-11-15',
    accountStatus: 'Active',
    planQuality: 'HD',
    registeredCity: 'Madurai, TN',
    registeredPincode: '625001',
    lastRechargeAmount: 1650,
    lastRechargeDate: '2026-05-15',
  },
  {
    id: 'cust_02',
    customerName: 'Meenakshi Sundaram',
    registeredMobile: '9444198765',
    smartCardNumber: '1029384756',
    operator: 'tata_play',
    operatorName: 'Tata Play',
    activePackName: 'Tata Play Tamil Thalaiva HD',
    currentBalance: 8.00,
    expiryDate: '2026-10-04',
    accountStatus: 'Expiring Soon',
    planQuality: 'HD',
    registeredCity: 'Coimbatore, TN',
    registeredPincode: '641002',
    lastRechargeAmount: 360,
    lastRechargeDate: '2026-09-04',
  }
];

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

export const MEMORY_ADMINS: AdminAccountRecord[] = [
  {
    uid: 'super_admin_root',
    email: getSuperAdminEmail(),
    displayName: 'Professor Pradeep S',
    role: 'super_admin',
    status: 'approved',
    approvedBy: 'System Super Admin (Root Owner)',
    approvedAt: new Date(Date.now() - 86400000 * 30).toISOString(),
    notes: 'Root Super Administrator and Access Approver',
  }
];

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

export const MEMORY_ADMIN_REQUESTS: AdminRequestRecord[] = [
  {
    id: 'req_001',
    userId: 'usr_dealer_madurai_01',
    userEmail: 'madurai_dealer@dthtamizhan.in',
    userName: 'Madurai Central DTH Dealer',
    userPhone: '9840199887',
    reason: 'Authorized distributor requiring access to process customer box resets and pack updates',
    status: 'pending',
    requestedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
  }
];

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

    refreshApprovedAdminEmails();
  } catch (err) {
    console.warn('[Server Store] Error initializing store from disk:', err);
  }
}

export function saveCustomersToDisk(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(CUSTOMERS_FILE, JSON.stringify(MEMORY_CUSTOMERS, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Failed to save customers to disk:', err);
  }
}

export function saveOrdersToDisk(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(RECHARGE_ORDERS_FILE, JSON.stringify(MEMORY_RECHARGE_ORDERS, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Failed to save orders to disk:', err);
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
