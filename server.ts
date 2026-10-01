import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import firebaseConfig from './firebase-applet-config.json' with { type: 'json' };
import { INITIAL_BROWSE_PLANS, computePlanMetrics, filterAndSortPlans } from './src/lib/browsePlansData.js';

dotenv.config();

// Initialize Firebase Admin SDK for server-side cryptographic token verification
if (!getApps().length) {
  try {
    initializeApp({
      projectId: firebaseConfig.projectId,
    });
  } catch (initErr) {
    console.warn('[firebase-admin] init error:', initErr);
  }
}

// Define port strictly according to container environment rules
const PORT = 3000;

interface DthOperator {
  id: string;
  name: string;
  shortName: string;
  tamilName: string;
  logoColor: string;
  cardName: string; // e.g. "Smart Card Number", "Subscriber ID"
  cardPattern: string; // regex string
  cardLengthDesc: string;
  sampleId: string;
  tollFree: string;
  smsRefreshFormat: string;
  popularPacksCount: number;
  isEnabled?: boolean;
  condition?: string;
  conditionLabel?: string;
  maintenanceMessage?: string;
  expectedRestoration?: string;
  disabledAt?: string;
  updatedAt?: string;
  updatedBy?: string;
}

const OPERATORS: DthOperator[] = [
  {
    id: 'sun_direct',
    name: 'Sun Direct',
    shortName: 'Sun',
    tamilName: 'சன் டைரக்ட்',
    logoColor: '#F97316', // Orange / Sun
    cardName: 'Smart Card / CDSN Number',
    cardPattern: '^[0-9]{11,12}$',
    cardLengthDesc: '11 or 12 digits (starts with 4 or 7)',
    sampleId: '41289456123',
    tollFree: '1800 123 7575',
    smsRefreshFormat: 'SMS "REFRESH <SmartCardNo>" to 9600058585',
    popularPacksCount: 18,
    isEnabled: true,
  },
  {
    id: 'tata_play',
    name: 'Tata Play',
    shortName: 'Tata',
    tamilName: 'டாடா பிளே',
    logoColor: '#EC4899', // Pink / Magenta
    cardName: 'Subscriber ID',
    cardPattern: '^[0-9]{10}$',
    cardLengthDesc: '10 digits (starts with 1)',
    sampleId: '1029384756',
    tollFree: '1800 208 6633',
    smsRefreshFormat: 'Send "HR" to 56633 from registered mobile',
    popularPacksCount: 22,
    isEnabled: true,
  },
  {
    id: 'airtel_dth',
    name: 'Airtel Digital TV',
    shortName: 'Airtel',
    tamilName: 'ஏர்டெல் டிஜிட்டல் டிவி',
    logoColor: '#EF4444', // Red
    cardName: 'Customer ID',
    cardPattern: '^[0-9]{10}$',
    cardLengthDesc: '10 digits (starts with 3)',
    sampleId: '3009482715',
    tollFree: '1800 103 6065',
    smsRefreshFormat: 'Send "HR" to 54325 from registered mobile',
    popularPacksCount: 16,
    isEnabled: true,
  },
  {
    id: 'dish_tv',
    name: 'Dish TV',
    shortName: 'Dish TV',
    tamilName: 'டிஷ் டிவி',
    logoColor: '#EB5B26', // Flame Orange
    cardName: 'VC Number / RMN / Customer ID',
    cardPattern: '^[0-9]{8,11}$',
    cardLengthDesc: '8 to 11 digits (Dish TV)',
    sampleId: '02589412356',
    tollFree: '1800 258 3474',
    smsRefreshFormat: 'SMS "DISHTV REFRESH <VC>" to 57575',
    popularPacksCount: 26,
    isEnabled: true,
  },
  {
    id: 'd2h',
    name: 'D2H Videocon',
    shortName: 'D2H',
    tamilName: 'டி2எச் வீடியோகான்',
    logoColor: '#8B5CF6', // Purple
    cardName: 'Customer ID / Smart Card',
    cardPattern: '^[0-9]{8,11}$',
    cardLengthDesc: '8 to 11 digits (D2H)',
    sampleId: '01894561234',
    tollFree: '1800 137 0111',
    smsRefreshFormat: 'SMS "D2H REFRESH" to 566777',
    popularPacksCount: 20,
    isEnabled: true,
  }
];

export interface DthPlan {
  id: string;
  operatorId: string;
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

const SAMPLE_PLANS: DthPlan[] = [
  // Sun Direct
  {
    id: 'sd-tam-super',
    operatorId: 'sun_direct',
    name: 'Tamil Super Pack',
    tamilName: 'தமிழ் சூப்பர் பேக்',
    category: 'tamil_base',
    price: 219,
    validityDays: 30,
    channelsCount: 78,
    hdChannelsCount: 0,
    description: 'All Sun Network channels, Vijay, Zee Tamil, News 7, Puthiyathalaimurai & Free-To-Air channels',
    tamilChannelsHighlight: ['Sun TV', 'KTV', 'Sun Music', 'Star Vijay', 'Zee Tamil', 'Kalaignar TV', 'Chithiram TV'],
    popularTag: 'Most Popular in TN',
  },
  {
    id: 'sd-tam-cinema',
    operatorId: 'sun_direct',
    name: 'Tamil Cinema & Music Plus',
    tamilName: 'தமிழ் சினிமா & மியூசிக்',
    category: 'cinema',
    price: 269,
    validityDays: 30,
    channelsCount: 95,
    hdChannelsCount: 0,
    description: 'Complete Tamil movies, entertainment, serials and premium music bouquet with sports channels',
    tamilChannelsHighlight: ['KTV', 'Vijay Super', 'Zee Thirai', 'J Movies', 'Sun Life', 'Star Sports 1 Tamil'],
    popularTag: 'Best for Movies',
  },
  {
    id: 'sd-tam-hd-mega',
    operatorId: 'sun_direct',
    name: 'Tamil HD Mega Bouquet',
    tamilName: 'தமிழ் எச்டி மெகா',
    category: 'tamil_base',
    price: 349,
    validityDays: 30,
    channelsCount: 110,
    hdChannelsCount: 28,
    description: 'Crystal-clear Dolby 5.1 & Full HD experience featuring Sun TV HD, Vijay HD, Zee Tamil HD and HD Sports',
    tamilChannelsHighlight: ['Sun TV HD', 'KTV HD', 'Sun Music HD', 'Star Vijay HD', 'Zee Tamil HD', 'Star Sports HD1 Tamil'],
    popularTag: 'Crystal Clear HD',
  },
  {
    id: 'sd-tam-annual',
    operatorId: 'sun_direct',
    name: 'Tamil Annual Thalaiva Saver (12 Months)',
    tamilName: '12 மாத தலைவா சேவர் பேக்',
    category: 'annual',
    price: 2399,
    validityDays: 365,
    channelsCount: 85,
    hdChannelsCount: 10,
    description: 'Pay for 10 months and get 2 months free with free dish inspection and zero service fee for 1 year',
    tamilChannelsHighlight: ['All Tamil GEC', 'News Channels', 'Sports Tamil', 'Music & Kids'],
    popularTag: 'Save ₹600 / Year',
  },
  {
    id: 'sd-addon-sports',
    operatorId: 'sun_direct',
    name: 'Tamil Cricket & IPL Sports Booster',
    tamilName: 'கிரிக்கெட் & ஐபிஎல் பூஸ்டர்',
    category: 'sports_kids',
    price: 65,
    validityDays: 30,
    channelsCount: 6,
    hdChannelsCount: 2,
    description: 'Star Sports 1 Tamil, Sports18 1, and DD Sports for live bilateral series, IPL & World Cups',
    tamilChannelsHighlight: ['Star Sports 1 Tamil', 'Sports18 Tamil', 'Sony Ten 4 Tamil'],
  },

  // Tata Play
  {
    id: 'tp-tam-thalaiva',
    operatorId: 'tata_play',
    name: 'Tata Play Tamil Thalaiva Pack',
    tamilName: 'தமிழ் தலைவா பேக்',
    category: 'tamil_base',
    price: 245,
    validityDays: 30,
    channelsCount: 82,
    hdChannelsCount: 0,
    description: 'Premier Tamil entertainment pack with Sun TV, Vijay TV, Zee Tamil, Colors Tamil and top news channels',
    tamilChannelsHighlight: ['Sun TV', 'Star Vijay', 'Zee Tamil', 'Colors Tamil', 'KTV', 'Thanthi TV'],
    popularTag: 'Top Value',
  },
  {
    id: 'tp-tam-hd-premium',
    operatorId: 'tata_play',
    name: 'Tamil Thalaiva HD Premium',
    tamilName: 'தமிழ் தலைவா எச்டி பிரீமியம்',
    category: 'tamil_base',
    price: 360,
    validityDays: 30,
    channelsCount: 115,
    hdChannelsCount: 32,
    description: 'True HD clarity for movies, drama serials, news and Star Sports Tamil in 1080i with Tata Play Binge support',
    tamilChannelsHighlight: ['Sun TV HD', 'Star Vijay HD', 'Zee Tamil HD', 'KTV HD', 'Star Sports 1 Tamil HD'],
    popularTag: 'HD Excellence',
  },
  {
    id: 'tp-tam-semi-annual',
    operatorId: 'tata_play',
    name: 'Tamil 6-Month Super Saver',
    tamilName: '6 மாத சேவர் பேக்',
    category: 'annual',
    price: 1350,
    validityDays: 180,
    channelsCount: 88,
    hdChannelsCount: 12,
    description: 'Half-yearly uninterrupted entertainment with 15 days bonus validity added directly to your smart account',
    tamilChannelsHighlight: ['Sun Network', 'Vijay', 'Zee', 'Tamil Cinema', 'Sports'],
    popularTag: 'Save ₹150',
  },

  // Airtel DTH
  {
    id: 'at-tam-mega',
    operatorId: 'airtel_dth',
    name: 'Airtel Tamil Mega Pack',
    tamilName: 'ஏர்டெல் தமிழ் மெகா',
    category: 'tamil_base',
    price: 235,
    validityDays: 30,
    channelsCount: 80,
    hdChannelsCount: 0,
    description: 'Comprehensive Tamil pack with Sun TV, KTV, Vijay, Zee Tamil, news, devotional and cartoon channels',
    tamilChannelsHighlight: ['Sun TV', 'KTV', 'Star Vijay', 'Zee Tamil', 'Sathiyam TV', 'Chithiram'],
    popularTag: 'Airtel Favorite',
  },
  {
    id: 'at-tam-hd',
    operatorId: 'airtel_dth',
    name: 'Airtel Tamil HD Entertainment',
    tamilName: 'ஏர்டெல் தமிழ் எச்டி',
    category: 'tamil_base',
    price: 339,
    validityDays: 30,
    channelsCount: 104,
    hdChannelsCount: 26,
    description: 'High definition channels with Dolby sound, Airtel Xstream Smart Stick compatibility and instant recharge credit',
    tamilChannelsHighlight: ['Sun TV HD', 'Star Vijay HD', 'Zee Tamil HD', 'Star Sports HD Tamil'],
    popularTag: 'Top Seller',
  },

  // Dish TV & D2H
  {
    id: 'dt-tam-swag',
    operatorId: 'dish_tv',
    name: 'Dish TV Tamil Swag Pack',
    tamilName: 'டிஷ் டிவி தமிழ் ஸ்வாக்',
    category: 'tamil_base',
    price: 215,
    validityDays: 30,
    channelsCount: 76,
    hdChannelsCount: 0,
    description: 'Budget-friendly Tamil entertainment covering top family serials, movie channels, comedy and music',
    tamilChannelsHighlight: ['Sun TV', 'KTV', 'Star Vijay', 'Zee Tamil', 'Polimer News'],
    popularTag: 'Value King',
  },
  {
    id: 'd2h-tam-joy',
    operatorId: 'd2h',
    name: 'D2H Tamil Joy Pack',
    tamilName: 'டி2எச் தமிழ் ஜாய்',
    category: 'tamil_base',
    price: 220,
    validityDays: 30,
    channelsCount: 79,
    hdChannelsCount: 0,
    description: 'All leading Tamil language general entertainment, spiritual, movie and regional music stations',
    tamilChannelsHighlight: ['Sun TV', 'KTV', 'Vijay Super', 'Zee Tamil', 'Sun Music'],
    popularTag: 'Economical',
  }
];

// In-memory persistent queue for simulation / demo when Firebase isn't yet configured
interface RechargeOrder {
  orderId: string;
  user_id: string;
  operator: string;
  operatorName: string;
  smartCardNumber: string;
  customerName?: string;
  registeredMobile: string;
  amount: number;
  packId: string;
  packName: string;
  packValidity: string;
  paymentMethod: string;
  paymentStatus: 'paid' | 'initiated' | 'failed';
  rechargeStatus: 'pending' | 'processing' | 'completed' | 'failed';
  operatorRefId: string;
  workerNotes?: string;
  signalRefreshRequested?: boolean;
  createdAt: string;
  updatedAt: string;
}

const MEMORY_RECHARGE_ORDERS: RechargeOrder[] = [
  {
    orderId: 'ORD-TN-894102',
    user_id: 'cust-101',
    operator: 'sun_direct',
    operatorName: 'Sun Direct',
    smartCardNumber: '41289456123',
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
    registeredMobile: '9444198765',
    amount: 360,
    packId: 'tp-tam-hd-premium',
    packName: 'Tamil Thalaiva HD Premium',
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
    orderId: 'ORD-TN-894104',
    user_id: 'cust-103',
    operator: 'airtel_dth',
    operatorName: 'Airtel Digital TV',
    smartCardNumber: '3009482715',
    registeredMobile: '9884012984',
    amount: 310,
    packId: 'air-tam-mega',
    packName: 'Tamil Mega HD Bouquet',
    packValidity: '30 Days',
    paymentMethod: 'card',
    paymentStatus: 'paid',
    rechargeStatus: 'pending',
    operatorRefId: 'AIR-TXN-771239',
    workerNotes: 'Card payment verified via Razorpay PG, pending operator dispatch',
    signalRefreshRequested: false,
    createdAt: new Date(Date.now() - 4200000).toISOString(),
    updatedAt: new Date(Date.now() - 4200000).toISOString(),
  },
  {
    orderId: 'ORD-TN-894105',
    user_id: 'cust-104',
    operator: 'sun_direct',
    operatorName: 'Sun Direct',
    smartCardNumber: '70281944501',
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
  },
  {
    orderId: 'ORD-TN-894106',
    user_id: 'cust-105',
    operator: 'dish_tv',
    operatorName: 'Dish TV',
    smartCardNumber: '02589412356',
    registeredMobile: '9176543210',
    amount: 215,
    packId: 'dish-tam-swag',
    packName: 'Dish TV Tamil Swag Pack',
    packValidity: '30 Days',
    paymentMethod: 'upi',
    paymentStatus: 'paid',
    rechargeStatus: 'processing',
    operatorRefId: 'DISH-TRANS-48201',
    workerNotes: 'Transponder handshake underway',
    signalRefreshRequested: true,
    createdAt: new Date(Date.now() - 900000).toISOString(),
    updatedAt: new Date(Date.now() - 300000).toISOString(),
  },
  {
    orderId: 'ORD-TN-894107',
    user_id: 'cust-106',
    operator: 'tata_play',
    operatorName: 'Tata Play',
    smartCardNumber: '1098765432',
    registeredMobile: '9841122334',
    amount: 240,
    packId: 'tp-tam-super',
    packName: 'Tamil Super Saver Pack',
    packValidity: '30 Days',
    paymentMethod: 'upi',
    paymentStatus: 'paid',
    rechargeStatus: 'completed',
    operatorRefId: 'TP-REF-884912',
    workerNotes: 'Instant confirmation via Tata API',
    signalRefreshRequested: false,
    createdAt: new Date(Date.now() - 86400000 * 2.5).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2.5).toISOString(),
  }
];

// In-memory Customer Directory for Admin inspection
interface CustomerRecord {
  id: string;
  customerName: string;
  registeredMobile: string;
  smartCardNumber: string;
  operator: string;
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

const MEMORY_CUSTOMERS: CustomerRecord[] = [
  {
    id: 'cust-101',
    customerName: 'Ramesh Krishnan',
    registeredMobile: '9840123456',
    smartCardNumber: '41289456123',
    operator: 'sun_direct',
    operatorName: 'Sun Direct',
    activePackName: 'Tamil Super Pack',
    currentBalance: 42.50,
    expiryDate: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
    status: 'due_soon',
    totalRechargesCount: 8,
    totalSpent: 1752,
    lastRechargeDate: new Date(Date.now() - 86400000 * 25).toISOString().split('T')[0],
    createdAt: new Date(Date.now() - 86400000 * 240).toISOString(),
  },
  {
    id: 'cust-102',
    customerName: 'Priya Rajendran',
    registeredMobile: '9444198765',
    smartCardNumber: '1029384756',
    operator: 'tata_play',
    operatorName: 'Tata Play',
    activePackName: 'Tamil Thalaiva HD Premium',
    currentBalance: 110.00,
    expiryDate: new Date(Date.now() + 86400000 * 22).toISOString().split('T')[0],
    status: 'active',
    totalRechargesCount: 6,
    totalSpent: 2160,
    lastRechargeDate: new Date(Date.now() - 86400000 * 8).toISOString().split('T')[0],
    createdAt: new Date(Date.now() - 86400000 * 180).toISOString(),
  },
  {
    id: 'cust-103',
    customerName: 'Selvam Murugan',
    registeredMobile: '9884012984',
    smartCardNumber: '3009482715',
    operator: 'airtel_dth',
    operatorName: 'Airtel Digital TV',
    activePackName: 'Tamil Mega HD Bouquet',
    currentBalance: 8.00,
    expiryDate: new Date(Date.now() - 86400000 * 1).toISOString().split('T')[0],
    status: 'expired',
    totalRechargesCount: 11,
    totalSpent: 3410,
    lastRechargeDate: new Date(Date.now() - 86400000 * 31).toISOString().split('T')[0],
    createdAt: new Date(Date.now() - 86400000 * 365).toISOString(),
  },
  {
    id: 'cust-104',
    customerName: 'Anitha Govindasamy',
    registeredMobile: '9790812345',
    smartCardNumber: '70281944501',
    operator: 'sun_direct',
    operatorName: 'Sun Direct',
    activePackName: 'Sun Direct Prime HD (6 Months)',
    currentBalance: 1650.00,
    expiryDate: new Date(Date.now() + 86400000 * 175).toISOString().split('T')[0],
    status: 'active',
    totalRechargesCount: 4,
    totalSpent: 4950,
    lastRechargeDate: new Date(Date.now() - 86400000 * 1).toISOString().split('T')[0],
    createdAt: new Date(Date.now() - 86400000 * 400).toISOString(),
  },
  {
    id: 'cust-105',
    customerName: 'Karthik Vasanth',
    registeredMobile: '9176543210',
    smartCardNumber: '02589412356',
    operator: 'dish_tv',
    operatorName: 'Dish TV',
    activePackName: 'Dish TV Tamil Swag Pack',
    currentBalance: 12.00,
    expiryDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    status: 'due_soon',
    totalRechargesCount: 3,
    totalSpent: 645,
    lastRechargeDate: new Date(Date.now() - 86400000 * 28).toISOString().split('T')[0],
    createdAt: new Date(Date.now() - 86400000 * 90).toISOString(),
  },
  {
    id: 'cust-106',
    customerName: 'Senthil Nathan K',
    registeredMobile: '9841122334',
    smartCardNumber: '1098765432',
    operator: 'tata_play',
    operatorName: 'Tata Play',
    activePackName: 'Tamil Super Saver Pack',
    currentBalance: 240.00,
    expiryDate: new Date(Date.now() + 86400000 * 26).toISOString().split('T')[0],
    status: 'active',
    totalRechargesCount: 5,
    totalSpent: 1200,
    lastRechargeDate: new Date(Date.now() - 86400000 * 4).toISOString().split('T')[0],
    createdAt: new Date(Date.now() - 86400000 * 150).toISOString(),
  }
];

// Helper to strip undefined values strictly from payloads
function stripUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  const clean: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    if (obj[key] !== undefined) {
      clean[key] = obj[key];
    }
  }
  return clean as Partial<T>;
}

async function startServer() {
  const app = express();

  // 1. Mandatory Top-Level Request Deserialization (MUST be before any routes)
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  // Request logger for security audit
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      if (req.path.startsWith('/api')) {
        console.log(`[API ${req.method}] ${req.path} -> ${res.statusCode} (${duration}ms)`);
      }
    });
    next();
  });

  // --- API ROUTES ---

  // Health check endpoint
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'DTH Tamizhan Core Service',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    });
  });

  // Operators list
  app.get('/api/operators', (req: Request, res: Response) => {
    res.json({
      success: true,
      operators: OPERATORS,
    });
  });

  // Recharge packs list & Browse Plans Query Filter Endpoint
  app.get('/api/plans', (req: Request, res: Response) => {
    try {
      const {
        operatorId,
        operators,
        category,
        type,
        durations,
        minPrice,
        maxPrice,
        minChannels,
        maxChannels,
        genres,
        sort,
        q
      } = req.query;

      // Backward compatibility: If legacy RechargeFlow requests single operatorId without advanced filters
      const isLegacyQuery = (operatorId && !operators && !type && !durations && !genres && !minPrice && !maxPrice);

      if (isLegacyQuery) {
        let legacyPlans = [...SAMPLE_PLANS];
        if (operatorId) {
          legacyPlans = legacyPlans.filter((p) => p.operatorId === operatorId);
        }
        if (category && category !== 'all') {
          legacyPlans = legacyPlans.filter((p) => p.category === category);
        }
        res.json({
          success: true,
          count: legacyPlans.length,
          plans: legacyPlans,
        });
        return;
      }

      // Parse operators array (e.g. operators=sun_direct,tata_play or single operatorId)
      let parsedOperators: string[] = [];
      if (typeof operators === 'string' && operators.trim()) {
        parsedOperators = operators.split(',').map((s) => s.trim().toLowerCase());
      } else if (typeof operatorId === 'string' && operatorId.trim()) {
        parsedOperators = [operatorId.trim().toLowerCase()];
      }

      // Parse durations array (e.g. durations=1,3,6,12)
      let parsedDurations: (1 | 3 | 6 | 12)[] = [];
      if (typeof durations === 'string' && durations.trim()) {
        parsedDurations = durations
          .split(',')
          .map((d) => parseInt(d.trim(), 10))
          .filter((d): d is 1 | 3 | 6 | 12 => [1, 3, 6, 12].includes(d));
      }

      // Parse genre tags
      let parsedGenres: string[] = [];
      if (typeof genres === 'string' && genres.trim()) {
        parsedGenres = genres.split(',').map((g) => g.trim().toLowerCase());
      }

      // Parse price & channel boundaries with defensive numerical sanitization
      const parsedMinPrice = typeof minPrice === 'string' ? Math.max(0, parseFloat(minPrice) || 0) : 0;
      const parsedMaxPrice = typeof maxPrice === 'string' ? Math.max(parsedMinPrice, parseFloat(maxPrice) || 10000) : 10000;
      const parsedMinChannels = typeof minChannels === 'string' ? Math.max(0, parseInt(minChannels, 10) || 0) : 0;
      const parsedMaxChannels = typeof maxChannels === 'string' ? Math.max(parsedMinChannels, parseInt(maxChannels, 10) || 500) : 500;

      const parsedType = (type === 'HD' || type === 'SD') ? type : 'all';
      const parsedSort = (
        sort === 'price_asc' || 
        sort === 'price_desc' || 
        sort === 'price_per_channel_asc' || 
        sort === 'savings_pct_desc' || 
        sort === 'channels_desc'
      ) ? sort : 'recommended';

      const results = filterAndSortPlans(INITIAL_BROWSE_PLANS, {
        operators: parsedOperators as any,
        type: parsedType,
        durations: parsedDurations,
        priceRange: [parsedMinPrice, parsedMaxPrice],
        channelRange: [parsedMinChannels, parsedMaxChannels],
        genreTags: parsedGenres,
        sortBy: parsedSort as any,
        searchQuery: typeof q === 'string' ? q.slice(0, 100) : '',
      });

      res.json({
        success: true,
        count: results.length,
        plans: results,
      });
    } catch (err: any) {
      console.error('[API Error] /api/plans failed:', err);
      res.status(500).json({ success: false, error: 'Internal error processing plan query' });
    }
  });

  // -----------------------------------------------------------------
  // Plan Catalog Admin CRUD Endpoints (Cloud & Disk Multi-Tier Persistence)
  // -----------------------------------------------------------------
  const DATA_DIR = path.join(process.cwd(), 'data');
  const PLANS_FILE = path.join(DATA_DIR, 'plan_catalog.json');
  const DELETED_PLANS_FILE = path.join(DATA_DIR, 'deleted_plan_ids.json');
  const CUSTOMERS_FILE = path.join(DATA_DIR, 'customers.json');
  const RECHARGE_ORDERS_FILE = path.join(DATA_DIR, 'recharge_orders.json');
  const OPERATOR_SETTINGS_FILE = path.join(DATA_DIR, 'operator_settings.json');

  function saveOperatorSettingsToDisk() {
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      const opState = OPERATORS.map((op) => ({
        operatorId: op.id,
        name: op.name,
        isEnabled: op.isEnabled !== false,
        condition: op.condition || null,
        conditionLabel: op.conditionLabel || null,
        maintenanceMessage: op.maintenanceMessage || null,
        expectedRestoration: op.expectedRestoration || null,
        disabledAt: op.disabledAt || null,
        updatedAt: op.updatedAt || new Date().toISOString(),
        updatedBy: op.updatedBy || 'admin',
      }));
      fs.writeFileSync(OPERATOR_SETTINGS_FILE, JSON.stringify(opState, null, 2), 'utf-8');
    } catch (err) {
      console.warn('Failed to save operator settings to disk:', err);
    }
  }

  function loadOperatorSettingsFromDisk() {
    try {
      if (fs.existsSync(OPERATOR_SETTINGS_FILE)) {
        const raw = fs.readFileSync(OPERATOR_SETTINGS_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          parsed.forEach((saved: any) => {
            const match = OPERATORS.find((op) => op.id === saved.operatorId);
            if (match) {
              match.isEnabled = saved.isEnabled !== false;
              match.condition = saved.condition || undefined;
              match.conditionLabel = saved.conditionLabel || undefined;
              match.maintenanceMessage = saved.maintenanceMessage || undefined;
              match.expectedRestoration = saved.expectedRestoration || undefined;
              match.disabledAt = saved.disabledAt || undefined;
              match.updatedAt = saved.updatedAt || undefined;
              match.updatedBy = saved.updatedBy || undefined;
            }
          });
        }
      } else {
        saveOperatorSettingsToDisk();
      }
    } catch (err) {
      console.warn('Failed to load operator settings from disk:', err);
    }
  }
  loadOperatorSettingsFromDisk();

  function saveCustomersToDisk() {
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(CUSTOMERS_FILE, JSON.stringify(MEMORY_CUSTOMERS, null, 2), 'utf-8');
    } catch (err) {
      console.warn('Failed to save customers to disk:', err);
    }
  }

  function loadCustomersFromDisk() {
    try {
      if (fs.existsSync(CUSTOMERS_FILE)) {
        const raw = fs.readFileSync(CUSTOMERS_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          MEMORY_CUSTOMERS.length = 0;
          MEMORY_CUSTOMERS.push(...parsed);
        }
      } else {
        saveCustomersToDisk();
      }
    } catch (err) {
      console.warn('Failed to load customers from disk:', err);
    }
  }
  loadCustomersFromDisk();

  function saveOrdersToDisk() {
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(RECHARGE_ORDERS_FILE, JSON.stringify(MEMORY_RECHARGE_ORDERS, null, 2), 'utf-8');
    } catch (err) {
      console.warn('Failed to save orders to disk:', err);
    }
  }

  function loadOrdersFromDisk() {
    try {
      if (fs.existsSync(RECHARGE_ORDERS_FILE)) {
        const raw = fs.readFileSync(RECHARGE_ORDERS_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          MEMORY_RECHARGE_ORDERS.length = 0;
          MEMORY_RECHARGE_ORDERS.push(...parsed);
        }
      } else {
        saveOrdersToDisk();
      }
    } catch (err) {
      console.warn('Failed to load orders from disk:', err);
    }
  }
  loadOrdersFromDisk();

  function browsePlanToCatalogItem(bp: any): any {
    return {
      id: bp.id,
      operator: bp.operator,
      pack_type: bp.type || 'HD',
      duration_months: bp.duration_months || 1,
      plan_name: bp.name || 'DTH Pack',
      amount: bp.price || 299,
      is_recommended: Boolean(bp.is_recommended),
      channel_list: bp.channels || [],
      updated_at: new Date().toISOString(),
      updated_by: 'system_init',
    };
  }

  function loadDiskPlans(): { plans: any[]; deletedIds: string[] } {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      let deletedIds: string[] = [];
      if (fs.existsSync(DELETED_PLANS_FILE)) {
        try {
          const rawDel = fs.readFileSync(DELETED_PLANS_FILE, 'utf-8');
          deletedIds = JSON.parse(rawDel);
          if (!Array.isArray(deletedIds)) deletedIds = [];
        } catch {}
      }

      let plans: any[] = [];
      if (fs.existsSync(PLANS_FILE)) {
        try {
          const rawPlans = fs.readFileSync(PLANS_FILE, 'utf-8');
          plans = JSON.parse(rawPlans);
          if (!Array.isArray(plans)) plans = [];
        } catch {}
      } else {
        plans = INITIAL_BROWSE_PLANS.map(browsePlanToCatalogItem);
        try {
          fs.writeFileSync(PLANS_FILE, JSON.stringify(plans, null, 2), 'utf-8');
        } catch {}
      }

      const deletedSet = new Set(deletedIds);
      plans = plans.filter((p) => !deletedSet.has(p.id));

      return { plans, deletedIds };
    } catch (err) {
      console.error('[Server Persistence] Error loading disk plans:', err);
      return { plans: INITIAL_BROWSE_PLANS.map(browsePlanToCatalogItem), deletedIds: [] };
    }
  }

  function saveDiskPlans(plans: any[], deletedIds?: string[]) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(PLANS_FILE, JSON.stringify(plans, null, 2), 'utf-8');
      if (deletedIds) {
        fs.writeFileSync(DELETED_PLANS_FILE, JSON.stringify(deletedIds, null, 2), 'utf-8');
      }
    } catch (err) {
      console.error('[Server Persistence] Error saving disk plans:', err);
    }
  }

  const diskState = loadDiskPlans();
  let MEMORY_ADMIN_PLANS: any[] = diskState.plans;
  let DELETED_PLAN_IDS: string[] = diskState.deletedIds;

  // --- DEDICATED ADMIN SUITE DEFINITIONS & AUTHENTICATION HELPER ---
  const SUPER_ADMIN_EMAIL = 'professorpradeeps@gmail.com';

  const MEMORY_ADMINS: Array<{
    uid: string;
    email: string;
    displayName: string;
    role: 'super_admin' | 'admin';
    status: 'approved' | 'revoked';
    approvedBy: string;
    approvedAt: string;
    notes?: string;
  }> = [
    {
      uid: 'super_admin_pradeep',
      email: SUPER_ADMIN_EMAIL,
      displayName: 'Professor Pradeep S',
      role: 'super_admin',
      status: 'approved',
      approvedBy: 'System Super Admin (Root Owner)',
      approvedAt: new Date(Date.now() - 86400000 * 30).toISOString(),
      notes: 'Root Super Administrator and Access Approver',
    }
  ];

  const MEMORY_ADMIN_REQUESTS: Array<{
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
  }> = [
    {
      id: 'req-adm-101',
      userId: 'cust-102',
      userEmail: 'kavitha.ramesh@gmail.com',
      userName: 'Kavitha Ramesh',
      userPhone: '+919840234567',
      reason: 'DTH recharge operator in Madurai branch requesting access to fulfill orders and update pack prices.',
      status: 'pending',
      requestedAt: new Date(Date.now() - 86400000 * 1.5).toISOString(),
    },
    {
      id: 'req-adm-102',
      userId: 'cust-105',
      userEmail: 'suresh.dealer@outlook.com',
      userName: 'Suresh Kumar',
      userPhone: '+919840567890',
      reason: 'Regional coordinator handling customer transponder refreshes and pending queue reconciliations.',
      status: 'pending',
      requestedAt: new Date(Date.now() - 86400000 * 0.5).toISOString(),
    }
  ];

  const ADMIN_ACCOUNTS_FILE = path.join(DATA_DIR, 'admin_accounts.json');
  const ADMIN_REQUESTS_FILE = path.join(DATA_DIR, 'admin_requests.json');

  function saveAdminsToDisk() {
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(ADMIN_ACCOUNTS_FILE, JSON.stringify(MEMORY_ADMINS, null, 2), 'utf-8');
    } catch (err) {
      console.warn('Failed to save admins to disk:', err);
    }
  }

  function loadAdminsFromDisk() {
    try {
      if (fs.existsSync(ADMIN_ACCOUNTS_FILE)) {
        const raw = fs.readFileSync(ADMIN_ACCOUNTS_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          MEMORY_ADMINS.length = 0;
          MEMORY_ADMINS.push(...parsed);
        }
      } else {
        saveAdminsToDisk();
      }
    } catch (err) {
      console.warn('Failed to load admins from disk:', err);
    }
  }
  loadAdminsFromDisk();

  function saveAdminRequestsToDisk() {
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(ADMIN_REQUESTS_FILE, JSON.stringify(MEMORY_ADMIN_REQUESTS, null, 2), 'utf-8');
    } catch (err) {
      console.warn('Failed to save admin requests to disk:', err);
    }
  }

  function loadAdminRequestsFromDisk() {
    try {
      if (fs.existsSync(ADMIN_REQUESTS_FILE)) {
        const raw = fs.readFileSync(ADMIN_REQUESTS_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          MEMORY_ADMIN_REQUESTS.length = 0;
          MEMORY_ADMIN_REQUESTS.push(...parsed);
        }
      } else {
        saveAdminRequestsToDisk();
      }
    } catch (err) {
      console.warn('Failed to load admin requests from disk:', err);
    }
  }
  loadAdminRequestsFromDisk();

  interface AuthContext {
    uid: string;
    email: string | null;
    emailVerified: boolean;
    isAdmin: boolean;
    isSuperAdmin: boolean;
  }

  /**
   * Cryptographic Firebase ID Token Verification Middleware / Helper.
   * Extracts 'Authorization: Bearer <token>', verifies signature & claims via Firebase Admin SDK.
   * Strictly FAILS CLOSED on missing, invalid, or expired tokens.
   */
  async function verifyAuthToken(req: Request): Promise<AuthContext | null> {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
        return null;
      }
      const token = authHeader.slice(7).trim();
      if (!token) return null;

      const decoded = await getAuth().verifyIdToken(token);
      const email = decoded.email ? decoded.email.trim().toLowerCase() : null;
      const isSuperAdmin = email === SUPER_ADMIN_EMAIL.toLowerCase();
      const isAdmin = isSuperAdmin || (email ? MEMORY_ADMINS.some((a) => a.email.toLowerCase() === email && a.status === 'approved') : false);

      return {
        uid: decoded.uid,
        email,
        emailVerified: Boolean(decoded.email_verified),
        isAdmin,
        isSuperAdmin,
      };
    } catch (err) {
      return null;
    }
  }

  // Token Verification Diagnostic Endpoint
  app.get('/api/admin/verify-token', async (req: Request, res: Response) => {
    const authCtx = await verifyAuthToken(req);
    if (!authCtx) {
      res.status(401).json({ success: false, error: 'Unauthenticated: Invalid or missing Firebase Bearer token.' });
      return;
    }
    res.json({
      success: true,
      uid: authCtx.uid,
      email: authCtx.email,
      isAdmin: authCtx.isAdmin,
      isSuperAdmin: authCtx.isSuperAdmin,
    });
  });

  // Public Plans Catalog Read Endpoint
  app.get('/api/admin/plans', (req: Request, res: Response) => {
    res.json({
      success: true,
      count: MEMORY_ADMIN_PLANS.length,
      plans: MEMORY_ADMIN_PLANS,
    });
  });

  app.get('/api/admin/plans/deleted', (req: Request, res: Response) => {
    res.json({
      success: true,
      deletedIds: DELETED_PLAN_IDS,
    });
  });

  // Protected: Save / Update Plan Item (Strictly requires Admin token)
  app.post('/api/admin/plans/save', async (req: Request, res: Response) => {
    const authCtx = await verifyAuthToken(req);
    if (!authCtx || !authCtx.isAdmin) {
      res.status(403).json({ success: false, error: 'Unauthorized: Administrator authentication required via Bearer token.' });
      return;
    }
    try {
      const plan = req.body?.plan;
      if (!plan || !plan.id) {
        res.status(400).json({ success: false, error: 'Valid plan object with id is required.' });
        return;
      }
      const existingIdx = MEMORY_ADMIN_PLANS.findIndex((p) => p.id === plan.id);
      const planRecord = {
        ...plan,
        updated_at: new Date().toISOString(),
        updated_by: authCtx.email || authCtx.uid,
      };
      if (existingIdx !== -1) {
        MEMORY_ADMIN_PLANS[existingIdx] = planRecord;
      } else {
        MEMORY_ADMIN_PLANS.unshift(planRecord);
      }
      DELETED_PLAN_IDS = DELETED_PLAN_IDS.filter((id) => id !== plan.id);
      saveDiskPlans(MEMORY_ADMIN_PLANS, DELETED_PLAN_IDS);
      res.json({
        success: true,
        message: `Plan ${plan.id} saved successfully to persistent catalog.`,
        plans: MEMORY_ADMIN_PLANS,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Protected: Delete Plan Item (Strictly requires Admin token)
  app.post('/api/admin/plans/delete', async (req: Request, res: Response) => {
    const authCtx = await verifyAuthToken(req);
    if (!authCtx || !authCtx.isAdmin) {
      res.status(403).json({ success: false, error: 'Unauthorized: Administrator authentication required via Bearer token.' });
      return;
    }
    try {
      const { planId } = req.body || {};
      if (!planId) {
        res.status(400).json({ success: false, error: 'planId is required.' });
        return;
      }
      MEMORY_ADMIN_PLANS = MEMORY_ADMIN_PLANS.filter((p) => p.id !== planId);
      if (!DELETED_PLAN_IDS.includes(planId)) {
        DELETED_PLAN_IDS.push(planId);
      }
      saveDiskPlans(MEMORY_ADMIN_PLANS, DELETED_PLAN_IDS);
      res.json({
        success: true,
        message: `Plan ${planId} permanently deleted from persistent catalog.`,
        deletedPlanId: planId,
        plans: MEMORY_ADMIN_PLANS,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Protected: Sync Seed Catalog (Strictly restricted to Admin token)
  app.post('/api/admin/plans/sync-seed', async (req: Request, res: Response) => {
    const authCtx = await verifyAuthToken(req);
    if (!authCtx || !authCtx.isAdmin) {
      res.status(403).json({ success: false, error: 'Unauthorized: Administrator privileges required.' });
      return;
    }
    try {
      const { plans } = req.body || {};
      if (Array.isArray(plans) && plans.length > 0) {
        const deletedSet = new Set(DELETED_PLAN_IDS);
        MEMORY_ADMIN_PLANS = plans.filter((p: any) => !deletedSet.has(p.id));
        saveDiskPlans(MEMORY_ADMIN_PLANS, DELETED_PLAN_IDS);
      }
      res.json({
        success: true,
        count: MEMORY_ADMIN_PLANS.length,
        plans: MEMORY_ADMIN_PLANS,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Subscriber Verification API (Simulates / validates VC Number against provider format)
  app.post('/api/verify-subscriber', (req: Request, res: Response) => {
    // Defensive payload ingestion
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const { operator, smartCardNumber } = body;

    if (!operator || typeof operator !== 'string') {
      res.status(400).json({ success: false, error: 'Operator identifier is required' });
      return;
    }

    if (!smartCardNumber || typeof smartCardNumber !== 'string') {
      res.status(400).json({ success: false, error: 'Smart Card or Subscriber ID is required' });
      return;
    }

    const cleanCard = smartCardNumber.trim().replace(/\s+/g, '');
    const foundOp = OPERATORS.find((o) => o.id === operator);

    if (!foundOp) {
      res.status(400).json({ success: false, error: 'Unsupported DTH operator' });
      return;
    }

    // Check regex pattern
    const regex = new RegExp(foundOp.cardPattern);
    if (!regex.test(cleanCard)) {
      res.status(400).json({
        success: false,
        error: `Invalid ${foundOp.cardName} format for ${foundOp.name}. Expected: ${foundOp.cardLengthDesc}. Example: ${foundOp.sampleId}`,
      });
      return;
    }

    // Simulated subscriber profiles for realistic demo
    const lastDigit = parseInt(cleanCard.slice(-1), 10) || 5;
    const sampleNames = [
      'Murugan K',
      'Selvi R',
      'Arun Kumar S',
      'Praveen Raj',
      'Anitha G',
      'Senthil Nathan',
      'Karthik V',
      'Mani Maran',
      'Lakshmi Narayanan',
      'Dinesh Babu'
    ];
    const customerName = sampleNames[lastDigit % sampleNames.length];
    const balance = (lastDigit * 18.5).toFixed(2);
    
    // Calculate expiry (some expired, some active)
    const isExpired = lastDigit % 3 === 0;
    const expiryDate = new Date(
      Date.now() + (isExpired ? -86400000 * 2 : 86400000 * (lastDigit * 3 + 2))
    ).toISOString().split('T')[0];

    const activePack = foundOp.id === 'sun_direct' ? 'Tamil Super Pack' : 'Tamil Entertainment Bouquet';

    res.json({
      success: true,
      subscriber: {
        operator: foundOp.id,
        operatorName: foundOp.name,
        smartCardNumber: cleanCard,
        customerName,
        registeredMobile: `9840${cleanCard.slice(-6)}`,
        currentBalance: parseFloat(balance),
        packName: activePack,
        packMonthlyRent: 219,
        expiryDate,
        isExpired,
        accountStatus: isExpired ? 'Deactive / Recharge Due' : 'Active',
      },
    });
  });

  // Create Recharge Order Endpoint
  app.post('/api/recharge/create', (req: Request, res: Response) => {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const {
      operator,
      smartCardNumber,
      amount,
      packId,
      packName,
      packValidity,
      paymentMethod,
      registeredMobile,
      customerName,
      userId,
    } = body;

    // Strict validation
    if (!operator || !smartCardNumber || !amount) {
      res.status(400).json({
        success: false,
        error: 'Missing mandatory recharge parameters: operator, smartCardNumber, amount are required.',
      });
      return;
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount < 10 || numAmount > 50000) {
      res.status(400).json({
        success: false,
        error: 'Recharge amount must be a valid number between ₹10 and ₹50,000.',
      });
      return;
    }

    const foundOp = OPERATORS.find((o) => o.id === operator);
    if (foundOp && foundOp.isEnabled === false) {
      res.status(400).json({
        success: false,
        error: `${foundOp.name} is temporarily disabled for recharges: ${foundOp.maintenanceMessage || foundOp.conditionLabel || 'Under maintenance'}. Expected restoration: ${foundOp.expectedRestoration || 'Shortly'}.`,
      });
      return;
    }
    const orderId = `ORD-TN-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 100)}`;
    const operatorRefId = `DTH-${operator.slice(0, 3).toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`;

    const cardStr = String(smartCardNumber).trim();
    const cleanMobile = (registeredMobile && typeof registeredMobile === 'string') ? registeredMobile.trim().replace(/\D/g, '') : '';
    const cleanName = (customerName && typeof customerName === 'string') ? customerName.trim() : '';

    const newOrder: RechargeOrder = {
      orderId,
      user_id: (userId && typeof userId === 'string') ? userId : 'anonymous_guest',
      operator,
      operatorName: foundOp ? foundOp.name : operator,
      smartCardNumber: cardStr,
      customerName: cleanName || undefined,
      registeredMobile: cleanMobile,
      amount: numAmount,
      packId: (packId && typeof packId === 'string') ? packId : 'custom_amount',
      packName: (packName && typeof packName === 'string') ? packName : `Top-up ₹${numAmount}`,
      packValidity: (packValidity && typeof packValidity === 'string') ? packValidity : 'As per plan',
      paymentMethod: (paymentMethod && typeof paymentMethod === 'string') ? paymentMethod : 'upi',
      paymentStatus: 'paid', // Sandboxed payment confirmation
      rechargeStatus: 'completed', // Direct execution or queue
      operatorRefId,
      workerNotes: 'Directly confirmed via Tamizhan gateway fast-track',
      signalRefreshRequested: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Strip undefined to respect payload integrity rule
    const cleanPayload = stripUndefined(newOrder);
    MEMORY_RECHARGE_ORDERS.unshift(cleanPayload as RechargeOrder);

    // Auto-update or create customer record in live customer ledger
    const existingCust = MEMORY_CUSTOMERS.find((c) => c.smartCardNumber === cardStr);

    const valStr = String(packValidity || '').toLowerCase();
    const durationDays = valStr.includes('12') || valStr.includes('year') ? 365
      : valStr.includes('6') ? 180
      : valStr.includes('3') ? 90
      : 30;

    if (existingCust) {
      if (cleanName) existingCust.customerName = cleanName;
      if (cleanMobile) existingCust.registeredMobile = cleanMobile;
      existingCust.totalRechargesCount += 1;
      existingCust.totalSpent += numAmount;
      existingCust.lastRechargeDate = new Date().toISOString().split('T')[0];
      if (packName) existingCust.activePackName = String(packName);

      const currentExp = new Date(existingCust.expiryDate).getTime();
      const baseTime = !isNaN(currentExp) && currentExp > Date.now() ? currentExp : Date.now();
      existingCust.expiryDate = new Date(baseTime + durationDays * 86400000).toISOString().split('T')[0];
      existingCust.status = 'active';
      existingCust.currentBalance = Math.round((existingCust.currentBalance + numAmount) * 100) / 100;
    } else {
      MEMORY_CUSTOMERS.unshift({
        id: `cust-${Date.now().toString().slice(-4)}`,
        customerName: cleanName || (cleanMobile ? `Subscriber ${cardStr.slice(-4)}` : 'Valued Subscriber'),
        registeredMobile: cleanMobile || '9840123456',
        smartCardNumber: cardStr,
        operator,
        operatorName: foundOp ? foundOp.name : operator,
        activePackName: (packName && typeof packName === 'string') ? packName : 'Tamil Standard Pack',
        currentBalance: numAmount,
        expiryDate: new Date(Date.now() + durationDays * 86400000).toISOString().split('T')[0],
        status: 'active',
        totalRechargesCount: 1,
        totalSpent: numAmount,
        lastRechargeDate: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
      });
    }

    saveCustomersToDisk();
    saveOrdersToDisk();

    res.json({
      success: true,
      message: 'Recharge submitted successfully!',
      order: cleanPayload,
    });
  });

  // Trigger Heavy Refresh / E16 Error Signal Clear
  app.post('/api/recharge/signal-refresh', (req: Request, res: Response) => {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const { operator, smartCardNumber } = body;

    if (!operator || !smartCardNumber) {
      res.status(400).json({ success: false, error: 'Operator and Smart Card number are required for signal refresh.' });
      return;
    }

    const foundOp = OPERATORS.find((o) => o.id === operator);
    const refreshBatchId = `SIG-TN-${Math.floor(100000 + Math.random() * 900000)}`;

    res.json({
      success: true,
      batchId: refreshBatchId,
      message: `Heavy Refresh command transmitted to ${foundOp ? foundOp.name : 'operator'} satellite transponder. Please keep your Set-Top Box turned ON on Channel 100 for 5 minutes.`,
      instructions: [
        'Keep Set-Top Box ON on Channel 100 (Sun TV / Promo Channel).',
        'Do not turn off power or switch off inverter during signal transmission.',
        'Signals re-synchronize within 3 to 5 minutes.',
        'If Error E16 or E101 still persists, dial toll-free: ' + (foundOp?.tollFree || '1800 123 7575'),
      ],
    });
  });

  // --- SECURE AUTHENTICATED ORDERS & ADMIN ENDPOINTS ---

  // Get orders list (Strict IDOR protection: non-admins only receive their own orders)
  app.get('/api/orders', async (req: Request, res: Response) => {
    const authCtx = await verifyAuthToken(req);
    if (!authCtx) {
      res.status(401).json({ success: false, error: 'Unauthorized: Firebase Bearer token is required.', orders: [] });
      return;
    }

    const isWorker = req.query.isWorker === 'true';

    // If caller is an authorized admin/worker and requests worker queue or all orders
    if (authCtx.isAdmin) {
      if (isWorker || req.query.all === 'true') {
        res.json({ success: true, count: MEMORY_RECHARGE_ORDERS.length, orders: MEMORY_RECHARGE_ORDERS });
        return;
      }
      const targetUserId = req.query.userId as string | undefined;
      if (targetUserId) {
        const userOrders = MEMORY_RECHARGE_ORDERS.filter((o) => o.user_id === targetUserId);
        res.json({ success: true, count: userOrders.length, orders: userOrders });
        return;
      }
      const adminOrders = MEMORY_RECHARGE_ORDERS.filter((o) => o.user_id === authCtx.uid || (authCtx.email && o.user_id === authCtx.email));
      res.json({ success: true, count: adminOrders.length, orders: adminOrders });
      return;
    }

    // Authenticated regular subscriber: Strictly derive user ID from verified token (Prevents IDOR)
    const userOrders = MEMORY_RECHARGE_ORDERS.filter((o) => o.user_id === authCtx.uid || (authCtx.email && o.user_id === authCtx.email));
    res.json({ success: true, count: userOrders.length, orders: userOrders });
  });

  // Direct alias for admin orders queue (Strictly Admin Bearer token required)
  app.get('/api/admin/orders', async (req: Request, res: Response) => {
    const authCtx = await verifyAuthToken(req);
    if (!authCtx || !authCtx.isAdmin) {
      res.status(403).json({ success: false, error: 'Unauthorized: Administrator authentication required via Bearer token.', orders: [] });
      return;
    }
    res.json({ success: true, count: MEMORY_RECHARGE_ORDERS.length, orders: MEMORY_RECHARGE_ORDERS });
  });

  // Worker order update endpoint (Strictly Admin Bearer token required)
  app.post('/api/worker/update-order', async (req: Request, res: Response) => {
    const authCtx = await verifyAuthToken(req);
    if (!authCtx || !authCtx.isAdmin) {
      res.status(403).json({ success: false, error: 'Unauthorized: Administrator authentication required via Bearer token.' });
      return;
    }
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const { orderId, rechargeStatus, workerNotes, operatorRefId } = body;

    if (!orderId || !rechargeStatus) {
      res.status(400).json({ success: false, error: 'OrderId and rechargeStatus are required' });
      return;
    }

    const targetOrder = MEMORY_RECHARGE_ORDERS.find((o) => o.orderId === orderId);
    if (!targetOrder) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }

    if (['pending', 'processing', 'completed', 'failed'].includes(rechargeStatus)) {
      targetOrder.rechargeStatus = rechargeStatus as any;
    }
    if (workerNotes) targetOrder.workerNotes = String(workerNotes);
    if (operatorRefId) targetOrder.operatorRefId = String(operatorRefId);
    targetOrder.updatedAt = new Date().toISOString();
    saveOrdersToDisk();

    res.json({
      success: true,
      message: `Order ${orderId} updated to ${rechargeStatus}`,
      order: targetOrder,
    });
  });

  // 1. Admin: Customer Details (Protected by Admin Token)
  app.get('/api/admin/customers', async (req: Request, res: Response) => {
    const authCtx = await verifyAuthToken(req);
    if (!authCtx || !authCtx.isAdmin) {
      res.status(403).json({
        success: false,
        error: 'Access Denied: Administrator authentication required via Bearer token.',
        customers: [],
      });
      return;
    }

    const q = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';
    const operator = typeof req.query.operator === 'string' ? req.query.operator.trim().toLowerCase() : '';
    const status = typeof req.query.status === 'string' ? req.query.status.trim().toLowerCase() : '';

    let list = [...MEMORY_CUSTOMERS];

    if (operator && operator !== 'all') {
      list = list.filter((c) => c.operator === operator);
    }
    if (status && status !== 'all') {
      list = list.filter((c) => c.status === status);
    }
    if (q) {
      list = list.filter((c) => 
        c.customerName.toLowerCase().includes(q) ||
        c.registeredMobile.includes(q) ||
        c.smartCardNumber.includes(q) ||
        c.activePackName.toLowerCase().includes(q)
      );
    }

    res.json({
      success: true,
      count: list.length,
      totalCustomers: MEMORY_CUSTOMERS.length,
      customers: list,
    });
  });

  // Admin: Create / Register Customer Record (Dealer Book)
  app.post('/api/admin/customers/create', async (req: Request, res: Response) => {
    const authCtx = await verifyAuthToken(req);
    if (!authCtx || !authCtx.isAdmin) {
      res.status(403).json({ success: false, error: 'Unauthorized: Administrator authentication required via Bearer token.' });
      return;
    }
    const { customerName, registeredMobile, smartCardNumber, operator } = req.body || {};
    if (!customerName || !registeredMobile || !smartCardNumber || !operator) {
      res.status(400).json({ success: false, error: 'Customer Name, Mobile, Smart Card, and Operator are required.' });
      return;
    }
    const cleanCard = String(smartCardNumber).trim();
    const cleanMobile = String(registeredMobile).trim();
    const foundOp = OPERATORS.find((o) => o.id === operator);

    const existingIdx = MEMORY_CUSTOMERS.findIndex((c) => c.smartCardNumber === cleanCard);
    if (existingIdx !== -1) {
      MEMORY_CUSTOMERS[existingIdx].customerName = String(customerName).trim();
      MEMORY_CUSTOMERS[existingIdx].registeredMobile = cleanMobile;
      MEMORY_CUSTOMERS[existingIdx].operator = operator;
      MEMORY_CUSTOMERS[existingIdx].operatorName = foundOp ? foundOp.name : operator;
      saveCustomersToDisk();
      res.json({ success: true, message: 'Customer record updated successfully!', customer: MEMORY_CUSTOMERS[existingIdx] });
      return;
    }

    const newCust: CustomerRecord = {
      id: `cust-${Date.now().toString().slice(-4)}`,
      customerName: String(customerName).trim(),
      registeredMobile: cleanMobile,
      smartCardNumber: cleanCard,
      operator,
      operatorName: foundOp ? foundOp.name : operator,
      activePackName: 'New Subscriber',
      currentBalance: 0,
      expiryDate: new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0],
      status: 'active',
      totalRechargesCount: 0,
      totalSpent: 0,
      lastRechargeDate: 'No orders yet',
      createdAt: new Date().toISOString(),
    };
    MEMORY_CUSTOMERS.unshift(newCust);
    saveCustomersToDisk();
    res.json({ success: true, message: 'New customer saved successfully!', customer: newCust });
  });

  // Admin: Delete Customer Record
  app.post('/api/admin/customers/delete', async (req: Request, res: Response) => {
    const authCtx = await verifyAuthToken(req);
    if (!authCtx || !authCtx.isAdmin) {
      res.status(403).json({ success: false, error: 'Unauthorized: Administrator authentication required via Bearer token.' });
      return;
    }
    const { id, smartCardNumber } = req.body || {};
    const idx = MEMORY_CUSTOMERS.findIndex((c) => c.id === id || (smartCardNumber && c.smartCardNumber === smartCardNumber));
    if (idx !== -1) {
      MEMORY_CUSTOMERS.splice(idx, 1);
      saveCustomersToDisk();
      res.json({ success: true, message: 'Customer record removed successfully!' });
      return;
    }
    res.status(404).json({ success: false, error: 'Customer record not found.' });
  });

  // Admin: Ingest / Sync Customer Records from Firestore into Server Disk Storage
  app.post('/api/admin/customers/sync', async (req: Request, res: Response) => {
    const authCtx = await verifyAuthToken(req);
    if (!authCtx || !authCtx.isAdmin) {
      res.status(403).json({ success: false, error: 'Unauthorized: Administrator authentication required via Bearer token.' });
      return;
    }
    try {
      const { customers } = req.body || {};
      if (Array.isArray(customers) && customers.length > 0) {
        customers.forEach((remoteCust: any) => {
          if (!remoteCust || !remoteCust.smartCardNumber) return;
          const cleanCard = String(remoteCust.smartCardNumber).trim();
          const existingIdx = MEMORY_CUSTOMERS.findIndex((c) => c.smartCardNumber === cleanCard);
          if (existingIdx !== -1) {
            MEMORY_CUSTOMERS[existingIdx] = {
              ...MEMORY_CUSTOMERS[existingIdx],
              ...remoteCust,
            };
          } else {
            MEMORY_CUSTOMERS.unshift(remoteCust);
          }
        });
        saveCustomersToDisk();
      }
      res.json({ success: true, count: MEMORY_CUSTOMERS.length, customers: MEMORY_CUSTOMERS });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Sync / Ingest Recharge Orders from Firestore into Server Disk Storage
  app.post('/api/orders/sync', async (req: Request, res: Response) => {
    const authCtx = await verifyAuthToken(req);
    if (!authCtx || !authCtx.isAdmin) {
      res.status(403).json({ success: false, error: 'Unauthorized: Administrator authentication required via Bearer token.' });
      return;
    }
    try {
      const { orders } = req.body || {};
      if (Array.isArray(orders) && orders.length > 0) {
        orders.forEach((remoteOrd: any) => {
          if (!remoteOrd || !remoteOrd.orderId) return;
          const existingIdx = MEMORY_RECHARGE_ORDERS.findIndex((o) => o.orderId === remoteOrd.orderId);
          if (existingIdx !== -1) {
            MEMORY_RECHARGE_ORDERS[existingIdx] = {
              ...MEMORY_RECHARGE_ORDERS[existingIdx],
              ...remoteOrd,
            };
          } else {
            MEMORY_RECHARGE_ORDERS.unshift(remoteOrd);
          }
        });
        saveOrdersToDisk();
      }
      res.json({ success: true, count: MEMORY_RECHARGE_ORDERS.length, orders: MEMORY_RECHARGE_ORDERS });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 2. Admin: Comprehensive Reports & Analytics (Protected by Admin Token)
  app.get('/api/admin/reports', async (req: Request, res: Response) => {
    const authCtx = await verifyAuthToken(req);
    if (!authCtx || !authCtx.isAdmin) {
      res.status(403).json({
        success: false,
        error: 'Access Denied: Administrator authentication required via Bearer token.',
      });
      return;
    }

    const totalOrders = MEMORY_RECHARGE_ORDERS.length;
    const completedOrders = MEMORY_RECHARGE_ORDERS.filter((o) => o.rechargeStatus === 'completed');
    const pendingOrders = MEMORY_RECHARGE_ORDERS.filter((o) => o.rechargeStatus === 'pending' || o.rechargeStatus === 'processing');
    const failedOrders = MEMORY_RECHARGE_ORDERS.filter((o) => o.rechargeStatus === 'failed');

    const totalRevenue = completedOrders.reduce((sum, o) => sum + (o.amount || 0), 0);
    
    // Today's revenue calculation
    const todayStr = new Date().toISOString().split('T')[0];
    const todayOrders = completedOrders.filter((o) => o.createdAt.startsWith(todayStr));
    const todayRevenue = todayOrders.reduce((sum, o) => sum + (o.amount || 0), 0);

    // Operator revenue breakdown
    const opStats: Record<string, { count: number; revenue: number; name: string }> = {
      sun_direct: { count: 0, revenue: 0, name: 'Sun Direct' },
      tata_play: { count: 0, revenue: 0, name: 'Tata Play' },
      airtel_dth: { count: 0, revenue: 0, name: 'Airtel Digital TV' },
      dish_tv: { count: 0, revenue: 0, name: 'Dish TV' },
      d2h: { count: 0, revenue: 0, name: 'D2H Videocon' },
    };

    completedOrders.forEach((o) => {
      const op = o.operator in opStats ? o.operator : 'sun_direct';
      opStats[op].count += 1;
      opStats[op].revenue += o.amount || 0;
    });

    const operatorBreakdown = Object.entries(opStats).map(([opId, data]) => ({
      operatorId: opId,
      name: data.name,
      ordersCount: data.count,
      revenue: data.revenue,
      sharePercentage: totalRevenue > 0 ? Math.round((data.revenue / totalRevenue) * 100) : 0,
    }));

    // Payment methods distribution
    const methodCounts: Record<string, { count: number; total: number }> = {
      upi: { count: 0, total: 0 },
      qr_code: { count: 0, total: 0 },
      card: { count: 0, total: 0 },
      netbanking: { count: 0, total: 0 },
    };

    MEMORY_RECHARGE_ORDERS.forEach((o) => {
      const m = o.paymentMethod || 'upi';
      if (!methodCounts[m]) methodCounts[m] = { count: 0, total: 0 };
      methodCounts[m].count += 1;
      methodCounts[m].total += o.amount || 0;
    });

    const successRate = totalOrders > 0 
      ? Math.round((completedOrders.length / (totalOrders - pendingOrders.length || 1)) * 100) 
      : 100;

    res.json({
      success: true,
      metrics: {
        totalRevenue,
        todayRevenue,
        totalOrders,
        completedOrdersCount: completedOrders.length,
        pendingOrdersCount: pendingOrders.length,
        failedOrdersCount: failedOrders.length,
        successRate: Math.min(100, Math.max(0, successRate)),
        averageOrderValue: completedOrders.length > 0 ? Math.round(totalRevenue / completedOrders.length) : 0,
        activeSubscribers: MEMORY_CUSTOMERS.length,
      },
      operatorBreakdown,
      paymentMethodBreakdown: methodCounts,
      generatedAt: new Date().toISOString(),
    });
  });

  // 3. Admin: Payment Reports & Financial Ledger (Protected by Admin Token)
  app.get('/api/admin/payments', async (req: Request, res: Response) => {
    const authCtx = await verifyAuthToken(req);
    if (!authCtx || !authCtx.isAdmin) {
      res.status(403).json({
        success: false,
        error: 'Access Denied: Administrator authentication required via Bearer token.',
        payments: [],
      });
      return;
    }

    const q = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';
    const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';
    const operator = typeof req.query.operator === 'string' ? req.query.operator.trim() : '';

    let payments = MEMORY_RECHARGE_ORDERS.map((o, idx) => {
      const cust = MEMORY_CUSTOMERS.find((c) => c.id === o.user_id || c.smartCardNumber === o.smartCardNumber);
      return {
        transactionId: `TXN-PAY-${o.orderId.replace('ORD-', '')}-${idx + 10}`,
        orderId: o.orderId,
        customerName: cust ? cust.customerName : 'Subscriber',
        registeredMobile: o.registeredMobile || (cust ? cust.registeredMobile : '9840123456'),
        smartCardNumber: o.smartCardNumber,
        operator: o.operator,
        operatorName: o.operatorName,
        packName: o.packName,
        amount: o.amount,
        paymentMethod: o.paymentMethod,
        paymentStatus: o.paymentStatus || 'paid',
        rechargeStatus: o.rechargeStatus,
        gatewayRef: o.operatorRefId || `PG-REF-${Math.floor(100000 + Math.random() * 900000)}`,
        createdAt: o.createdAt,
      };
    });

    if (operator && operator !== 'all') {
      payments = payments.filter((p) => p.operator === operator);
    }
    if (status && status !== 'all') {
      payments = payments.filter((p) => p.paymentStatus === status);
    }
    if (q) {
      payments = payments.filter((p) => 
        p.transactionId.toLowerCase().includes(q) ||
        p.orderId.toLowerCase().includes(q) ||
        p.customerName.toLowerCase().includes(q) ||
        p.smartCardNumber.includes(q) ||
        p.registeredMobile.includes(q)
      );
    }

    const totalCollected = payments.reduce((sum, p) => p.paymentStatus === 'paid' ? sum + p.amount : sum, 0);

    res.json({
      success: true,
      count: payments.length,
      totalCollected,
      payments,
    });
  });

  // 4. Admin: Recharge Updation & Transponder Dispatch (Protected by Admin Token)
  app.post('/api/admin/orders/update', async (req: Request, res: Response) => {
    const authCtx = await verifyAuthToken(req);
    if (!authCtx || !authCtx.isAdmin) {
      res.status(403).json({
        success: false,
        error: 'Access Denied: Administrator authorization required via Bearer token.',
      });
      return;
    }

    const body = (req.body && typeof req.body === 'object') ? req.body : {};
    const { orderId, rechargeStatus, operatorRefId, workerNotes, triggerSignalRefresh } = body;

    if (!orderId || !rechargeStatus) {
      res.status(400).json({ success: false, error: 'orderId and rechargeStatus are required.' });
      return;
    }

    const target = MEMORY_RECHARGE_ORDERS.find((o) => o.orderId === orderId);
    if (!target) {
      res.status(404).json({ success: false, error: 'Recharge order not found.' });
      return;
    }

    if (['pending', 'processing', 'completed', 'failed'].includes(rechargeStatus)) {
      target.rechargeStatus = rechargeStatus as any;
    }
    if (operatorRefId !== undefined) {
      target.operatorRefId = String(operatorRefId).trim();
    }
    if (workerNotes !== undefined) {
      target.workerNotes = String(workerNotes).trim();
    }
    if (triggerSignalRefresh === true) {
      target.signalRefreshRequested = true;
    }
    target.updatedAt = new Date().toISOString();
    saveOrdersToDisk();

    res.json({
      success: true,
      message: `Recharge Order ${orderId} successfully updated to "${rechargeStatus}"`,
      order: target,
    });
  });

  // 5. Get Admin Access Accounts & Pending Requests
  app.get('/api/admin/access-list', async (req: Request, res: Response) => {
    const authCtx = await verifyAuthToken(req);
    if (!authCtx) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized: Firebase Bearer token is required.',
        admins: [],
        requests: [],
      });
      return;
    }

    if (authCtx.isSuperAdmin || authCtx.isAdmin) {
      res.json({
        success: true,
        superAdminEmail: SUPER_ADMIN_EMAIL,
        isCallerSuperAdmin: authCtx.isSuperAdmin,
        isCallerAdmin: true,
        admins: MEMORY_ADMINS,
        requests: MEMORY_ADMIN_REQUESTS,
      });
      return;
    }

    // For non-admin registered users, only return their own request status if any (never leak other admin emails)
    const userRequests = authCtx.email ? MEMORY_ADMIN_REQUESTS.filter((r) => r.userEmail.toLowerCase() === authCtx.email) : [];

    res.json({
      success: true,
      superAdminEmail: SUPER_ADMIN_EMAIL,
      isCallerSuperAdmin: false,
      isCallerAdmin: false,
      admins: [],
      requests: userRequests,
    });
  });

  // Submit Request for Admin Access (Authenticated user only)
  app.post('/api/admin/request-access', async (req: Request, res: Response) => {
    const authCtx = await verifyAuthToken(req);
    if (!authCtx || !authCtx.email) {
      res.status(401).json({ success: false, error: 'Authentication required via Firebase Bearer token.' });
      return;
    }

    const body = (req.body && typeof req.body === 'object') ? req.body : {};
    const { userName, userPhone, reason } = body;

    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      res.status(400).json({ success: false, error: 'Reason is required.' });
      return;
    }

    const cleanEmail = authCtx.email.trim().toLowerCase();
    
    // Check if already super admin
    if (cleanEmail === SUPER_ADMIN_EMAIL.toLowerCase()) {
      res.json({ success: true, message: 'You are the Super Admin.', status: 'approved' });
      return;
    }

    // Check if already approved
    const existingApproved = MEMORY_ADMINS.find((a) => a.email.toLowerCase() === cleanEmail && a.status === 'approved');
    if (existingApproved) {
      res.json({ success: true, message: 'You are already an approved Administrator.', status: 'approved' });
      return;
    }

    // Check if already requested
    const existingReq = MEMORY_ADMIN_REQUESTS.find((r) => r.userEmail.toLowerCase() === cleanEmail && r.status === 'pending');
    if (existingReq) {
      res.json({ success: true, message: 'Admin access request already pending review by Professor Pradeep.', request: existingReq });
      return;
    }

    const newReq = {
      id: `req-adm-${Date.now().toString().slice(-6)}`,
      userId: authCtx.uid,
      userEmail: cleanEmail,
      userName: String(userName || cleanEmail.split('@')[0]),
      userPhone: userPhone ? String(userPhone) : undefined,
      reason: String(reason).trim(),
      status: 'pending' as const,
      requestedAt: new Date().toISOString(),
    };

    MEMORY_ADMIN_REQUESTS.unshift(newReq);
    saveAdminRequestsToDisk();

    res.json({
      success: true,
      message: 'Admin access request submitted to Professor Pradeep for approval.',
      request: newReq,
    });
  });

  // Approve Admin Role (Strictly restricted to professorpradeeps@gmail.com verified via token)
  app.post('/api/admin/approve-user', async (req: Request, res: Response) => {
    const authCtx = await verifyAuthToken(req);
    if (!authCtx || !authCtx.isSuperAdmin) {
      res.status(403).json({
        success: false,
        error: `Unauthorized: Only Super Administrator (${SUPER_ADMIN_EMAIL}) can approve or create administrators. Valid cryptographic token required.`,
      });
      return;
    }

    const body = (req.body && typeof req.body === 'object') ? req.body : {};
    const { targetEmail, targetName, targetUid, requestId, notes } = body;

    if (!targetEmail) {
      res.status(400).json({ success: false, error: 'Target email is required.' });
      return;
    }

    const cleanTargetEmail = String(targetEmail).trim().toLowerCase();

    // If there is a matching request, mark it approved
    if (requestId) {
      const reqItem = MEMORY_ADMIN_REQUESTS.find((r) => r.id === requestId);
      if (reqItem) {
        reqItem.status = 'approved';
        reqItem.reviewedBy = SUPER_ADMIN_EMAIL;
        reqItem.reviewedAt = new Date().toISOString();
        reqItem.reviewNotes = notes ? String(notes) : 'Approved by Super Admin Professor Pradeep';
      }
    } else {
      const matchReq = MEMORY_ADMIN_REQUESTS.find((r) => r.userEmail.toLowerCase() === cleanTargetEmail);
      if (matchReq) {
        matchReq.status = 'approved';
        matchReq.reviewedBy = SUPER_ADMIN_EMAIL;
        matchReq.reviewedAt = new Date().toISOString();
      }
    }

    // Add or update admin record
    const existing = MEMORY_ADMINS.find((a) => a.email.toLowerCase() === cleanTargetEmail);
    if (existing) {
      existing.status = 'approved';
      existing.approvedBy = SUPER_ADMIN_EMAIL;
      existing.approvedAt = new Date().toISOString();
      if (notes) existing.notes = String(notes);
    } else {
      MEMORY_ADMINS.push({
        uid: String(targetUid || `usr_adm_${Date.now().toString().slice(-5)}`),
        email: cleanTargetEmail,
        displayName: String(targetName || cleanTargetEmail.split('@')[0]),
        role: 'admin',
        status: 'approved',
        approvedBy: SUPER_ADMIN_EMAIL,
        approvedAt: new Date().toISOString(),
        notes: notes ? String(notes) : 'Approved by Professor Pradeep',
      });
    }

    saveAdminsToDisk();
    saveAdminRequestsToDisk();

    res.json({
      success: true,
      message: `Successfully approved admin privileges for ${cleanTargetEmail}.`,
      admins: MEMORY_ADMINS,
      requests: MEMORY_ADMIN_REQUESTS,
    });
  });

  // Revoke Admin Role (Strictly restricted to professorpradeeps@gmail.com verified via token)
  app.post('/api/admin/revoke-user', async (req: Request, res: Response) => {
    const authCtx = await verifyAuthToken(req);
    if (!authCtx || !authCtx.isSuperAdmin) {
      res.status(403).json({
        success: false,
        error: `Unauthorized: Only Super Administrator (${SUPER_ADMIN_EMAIL}) can revoke administrator privileges. Valid cryptographic token required.`,
      });
      return;
    }

    const body = (req.body && typeof req.body === 'object') ? req.body : {};
    const { targetEmail, notes } = body;

    const cleanTargetEmail = String(targetEmail).trim().toLowerCase();
    if (cleanTargetEmail === SUPER_ADMIN_EMAIL.toLowerCase()) {
      res.status(400).json({ success: false, error: 'Cannot revoke Super Admin root ownership.' });
      return;
    }

    const existingIdx = MEMORY_ADMINS.findIndex((a) => a.email.toLowerCase() === cleanTargetEmail);
    if (existingIdx !== -1) {
      MEMORY_ADMINS[existingIdx].status = 'revoked';
      MEMORY_ADMINS[existingIdx].notes = notes ? String(notes) : 'Revoked by Super Admin Professor Pradeep';
    }

    saveAdminsToDisk();

    res.json({
      success: true,
      message: `Admin privileges revoked for ${cleanTargetEmail}.`,
      admins: MEMORY_ADMINS,
    });
  });

  // Sync / Ingest Admin Records from Firestore into Server Disk Storage (Admin Token required)
  app.post('/api/admin/sync-admins', async (req: Request, res: Response) => {
    const authCtx = await verifyAuthToken(req);
    if (!authCtx || !authCtx.isAdmin) {
      res.status(403).json({ success: false, error: 'Unauthorized: Administrator authentication required via Bearer token.' });
      return;
    }
    try {
      const { admins } = req.body || {};
      if (Array.isArray(admins) && admins.length > 0) {
        admins.forEach((remoteAdm: any) => {
          if (!remoteAdm || !remoteAdm.email) return;
          const cleanEmail = String(remoteAdm.email).trim().toLowerCase();
          const existingIdx = MEMORY_ADMINS.findIndex((a) => a.email.toLowerCase() === cleanEmail);
          if (existingIdx !== -1) {
            MEMORY_ADMINS[existingIdx] = {
              ...MEMORY_ADMINS[existingIdx],
              ...remoteAdm,
              email: cleanEmail,
            };
          } else {
            MEMORY_ADMINS.push({
              uid: String(remoteAdm.uid || `usr_adm_${Date.now()}`),
              email: cleanEmail,
              displayName: String(remoteAdm.displayName || cleanEmail.split('@')[0]),
              role: remoteAdm.role || 'admin',
              status: remoteAdm.status || 'approved',
              approvedBy: remoteAdm.approvedBy || SUPER_ADMIN_EMAIL,
              approvedAt: remoteAdm.approvedAt || new Date().toISOString(),
              notes: remoteAdm.notes || 'Synced from Firestore',
            });
          }
        });
        saveAdminsToDisk();
      }
      res.json({ success: true, count: MEMORY_ADMINS.length, admins: MEMORY_ADMINS });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 6. Get Operator Status & Availability Settings (Admin Token required)
  app.get('/api/admin/operators', async (req: Request, res: Response) => {
    const authCtx = await verifyAuthToken(req);
    if (!authCtx || !authCtx.isAdmin) {
      res.status(403).json({ success: false, error: 'Unauthorized: Administrator authentication required via Bearer token.' });
      return;
    }
    res.json({
      success: true,
      operators: OPERATORS,
    });
  });

  // 7. Toggle Operator Status with Conditional Controls (Active / Maintenance / Disabled)
  app.post('/api/admin/operators/toggle', async (req: Request, res: Response) => {
    const authCtx = await verifyAuthToken(req);
    if (!authCtx || !authCtx.isAdmin) {
      res.status(403).json({ success: false, error: 'Unauthorized: Administrator authentication required via Bearer token.' });
      return;
    }
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const { operatorId, isEnabled, condition, conditionLabel, maintenanceMessage, expectedRestoration } = body;

    if (!operatorId) {
      res.status(400).json({ success: false, error: 'operatorId is required' });
      return;
    }

    const op = OPERATORS.find((o) => o.id === operatorId);
    if (!op) {
      res.status(404).json({ success: false, error: `Operator ${operatorId} not found` });
      return;
    }

    const caller = authCtx.email || 'admin@dthtamizhan.com';
    const active = isEnabled !== false;

    op.isEnabled = active;
    if (active) {
      op.condition = undefined;
      op.conditionLabel = undefined;
      op.maintenanceMessage = undefined;
      op.expectedRestoration = undefined;
      op.disabledAt = undefined;
    } else {
      op.condition = condition || 'custom';
      op.conditionLabel = conditionLabel || 'Operator Maintenance';
      op.maintenanceMessage = maintenanceMessage || `${op.name} is temporarily offline for maintenance.`;
      op.expectedRestoration = expectedRestoration || 'Shortly';
      op.disabledAt = new Date().toISOString();
    }
    op.updatedAt = new Date().toISOString();
    op.updatedBy = caller;

    saveOperatorSettingsToDisk();

    res.json({
      success: true,
      message: active 
        ? `${op.name} is now ACTIVE and accepting recharges.` 
        : `${op.name} is now DISABLED (${op.conditionLabel || 'Maintenance'}).`,
      operator: op,
      operators: OPERATORS,
    });
  });

  // Admin: Sync Operator Settings from Firestore
  app.post('/api/admin/operators/sync', async (req: Request, res: Response) => {
    const authCtx = await verifyAuthToken(req);
    if (!authCtx || !authCtx.isAdmin) {
      res.status(403).json({ success: false, error: 'Unauthorized: Administrator authentication required via Bearer token.' });
      return;
    }
    try {
      const { operators } = req.body || {};
      if (Array.isArray(operators) && operators.length > 0) {
        operators.forEach((remoteOp: any) => {
          if (!remoteOp || !remoteOp.id) return;
          const target = OPERATORS.find((o) => o.id === remoteOp.id);
          if (target) {
            Object.assign(target, remoteOp);
          }
        });
        saveOperatorSettingsToDisk();
      }
      res.json({ success: true, operators: OPERATORS });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Guaranteed JSON 404 handler for all /api/* routes - NEVER return HTML for API requests
  app.all('/api/*', (req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: `API route not found: ${req.method} ${req.path}`,
    });
  });

  // 3. Vite middleware for development / static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[DTH Tamizhan] Server running securely on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[DTH Tamizhan] Failed to start server:', err);
});
