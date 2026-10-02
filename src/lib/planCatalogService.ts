import { PlanCatalogItem, PlanAuditLog, DthOperatorId, BrowsePlan } from '../types';
import { db, auth, isFirebaseLive, sanitizePayload } from './firebase';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  limit,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';

/**
 * Single Unified Master Plan Catalog
 * Canonical source of truth for pricing, durations, channel counts, and highlights across all screens.
 */
export const INITIAL_PLAN_CATALOG: PlanCatalogItem[] = [
  // =========================================================================
  // 1. SUN DIRECT (சன் டைரக்ட்)
  // =========================================================================
  {
    id: 'sun_hd_1m_rec',
    operator: 'sun_direct',
    pack_type: 'HD',
    duration_months: 1,
    plan_name: 'Sun Direct Prime HD',
    tamilName: 'சன் பிரைம் எச்டி',
    amount: 299,
    is_recommended: true,
    channel_count: 210,
    hd_channel_count: 32,
    channel_list: ['Sun TV HD', 'KTV HD', 'Sun Music HD', 'Star Vijay HD', 'Zee Tamil HD', 'Jaya TV HD', 'Colors Tamil HD', 'Star Sports 1 Tamil HD', 'Star Sports 2 HD', 'Sony Sports Ten 1 HD', 'National Geographic HD', 'Discovery HD Tamil', 'Cartoon Network HD', 'Sun News', 'Thanthi TV', 'Puthiya Thalaimurai', 'Kalaignar TV', 'Captain TV'],
    genre_tags: ['tamil', 'entertainment', 'movies', 'sports', 'news', 'kids'],
    description: 'Premier Tamil HD family bouquet with 32 crystal clear HD channels and complete sports package.',
    updated_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    updated_by: 'admin_sys_init',
  },
  {
    id: 'sun_hd_3m_rec',
    operator: 'sun_direct',
    pack_type: 'HD',
    duration_months: 3,
    plan_name: 'Sun Direct Prime HD (Quarterly Saver)',
    tamilName: 'சன் பிரைம் எச்டி (3 மாதங்கள்)',
    amount: 849, // ₹283/mo (saves ₹16/mo vs ₹299)
    is_recommended: false,
    channel_count: 210,
    hd_channel_count: 32,
    channel_list: ['Sun TV HD', 'KTV HD', 'Sun Music HD', 'Star Vijay HD', 'Zee Tamil HD', 'Colors Tamil HD', 'Star Sports 1 Tamil HD', 'Discovery HD Tamil', 'Sun News', 'Thanthi TV'],
    genre_tags: ['tamil', 'entertainment', 'movies', 'sports', 'news'],
    description: 'Quarterly saver pack for Sun Direct Prime HD with high picture clarity and sports.',
    updated_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    updated_by: 'admin_sys_init',
  },
  {
    id: 'sun_hd_6m_rec',
    operator: 'sun_direct',
    pack_type: 'HD',
    duration_months: 6,
    plan_name: 'Sun Direct Prime HD (6 Months Saver)',
    tamilName: 'சன் பிரைம் எச்டி (6 மாதங்கள்)',
    amount: 1650, // ₹275/mo (saves ₹24/mo vs ₹299)
    is_recommended: true,
    channel_count: 210,
    hd_channel_count: 32,
    channel_list: ['Sun TV HD', 'KTV HD', 'Sun Music HD', 'Star Vijay HD', 'Zee Tamil HD', 'Jaya TV HD', 'Colors Tamil HD', 'Star Sports 1 Tamil HD', 'Star Sports 2 HD', 'Sony Sports Ten 1 HD', 'National Geographic HD', 'Discovery HD Tamil', 'Cartoon Network HD', 'Sun News', 'Thanthi TV', 'Puthiya Thalaimurai', 'Kalaignar TV', 'Captain TV'],
    genre_tags: ['tamil', 'entertainment', 'movies', 'sports', 'news', 'kids'],
    description: 'Save big with 6 months upfront recharge. Zero interruptions for half a year.',
    updated_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    updated_by: 'admin_sys_init',
  },
  {
    id: 'sun_hd_12m_rec',
    operator: 'sun_direct',
    pack_type: 'HD',
    duration_months: 12,
    plan_name: 'Sun Direct Prime HD (Annual Dhamaka)',
    tamilName: 'சன் பிரைம் எச்டி (வருடாந்திர தமக்கா)',
    amount: 3100, // ₹258.33/mo (saves ₹41/mo vs ₹299)
    is_recommended: true,
    channel_count: 210,
    hd_channel_count: 32,
    channel_list: ['Sun TV HD', 'KTV HD', 'Sun Music HD', 'Star Vijay HD', 'Zee Tamil HD', 'Jaya TV HD', 'Colors Tamil HD', 'Star Sports 1 Tamil HD', 'Star Sports 2 HD', 'Sony Sports Ten 1 HD', 'National Geographic HD', 'Discovery HD Tamil', 'Cartoon Network HD', 'Sun News', 'Thanthi TV', 'Puthiya Thalaimurai', 'Kalaignar TV', 'Captain TV'],
    genre_tags: ['tamil', 'entertainment', 'movies', 'sports', 'news', 'kids'],
    description: 'Highest annual discount with unlimited Tamil HD entertainment and complete sports.',
    updated_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    updated_by: 'admin_sys_init',
  },
  {
    id: 'sun_sd_1m_rec',
    operator: 'sun_direct',
    pack_type: 'SD',
    duration_months: 1,
    plan_name: 'Sun Direct Tamil Super Pack',
    tamilName: 'சன் டைரக்ட் தமிழ் சூப்பர் பேக்',
    amount: 219,
    is_recommended: true,
    channel_count: 145,
    hd_channel_count: 0,
    channel_list: ['Sun TV', 'KTV', 'Sun Music', 'Star Vijay', 'Zee Tamil', 'Jaya TV', 'Colors Tamil', 'Star Sports 1 Tamil', 'Discovery Tamil', 'Chutti TV', 'Sun News', 'Thanthi TV', 'Polimer News', 'Kalaignar TV', 'Raj TV', 'Mega TV'],
    genre_tags: ['tamil', 'entertainment', 'movies', 'music', 'news'],
    description: 'The definitive budget pack for every Tamil household with all major entertainment and news.',
    updated_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    updated_by: 'admin_sys_init',
  },
  {
    id: 'sun_sd_3m_rec',
    operator: 'sun_direct',
    pack_type: 'SD',
    duration_months: 3,
    plan_name: 'Sun Direct Tamil Super Pack (3 Months)',
    tamilName: 'சன் டைரக்ட் தமிழ் சூப்பர் (3 மாதங்கள்)',
    amount: 620, // ₹206.67/mo (saves ₹12/mo vs ₹219)
    is_recommended: false,
    channel_count: 145,
    hd_channel_count: 0,
    channel_list: ['Sun TV', 'KTV', 'Sun Music', 'Star Vijay', 'Zee Tamil', 'Jaya TV', 'Colors Tamil', 'Star Sports 1 Tamil', 'Discovery Tamil', 'Chutti TV', 'Sun News', 'Thanthi TV'],
    genre_tags: ['tamil', 'entertainment', 'movies', 'news'],
    description: '3 months advance pack for the popular Tamil Super Pack at an economical rate.',
    updated_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    updated_by: 'admin_sys_init',
  },
  {
    id: 'sun_sd_6m_rec',
    operator: 'sun_direct',
    pack_type: 'SD',
    duration_months: 6,
    plan_name: 'Sun Direct Tamil Super Pack (6 Months Saver)',
    tamilName: 'சன் டைரக்ட் தமிழ் சூப்பர் (6 மாதங்கள்)',
    amount: 1199, // ₹199.83/mo (saves ₹19/mo vs ₹219)
    is_recommended: true,
    channel_count: 145,
    hd_channel_count: 0,
    channel_list: ['Sun TV', 'KTV', 'Sun Music', 'Star Vijay', 'Zee Tamil', 'Jaya TV', 'Colors Tamil', 'Star Sports 1 Tamil', 'Discovery Tamil', 'Chutti TV', 'Sun News', 'Thanthi TV', 'Polimer News', 'Kalaignar TV', 'Raj TV', 'Mega TV'],
    genre_tags: ['tamil', 'entertainment', 'movies', 'news'],
    description: '6 months advance pack for the popular Tamil Super Pack at an economical rate.',
    updated_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    updated_by: 'admin_sys_init',
  },
  {
    id: 'sun_sd_12m_rec',
    operator: 'sun_direct',
    pack_type: 'SD',
    duration_months: 12,
    plan_name: 'Sun Direct Tamil Super Pack (Annual)',
    tamilName: 'சன் டைரக்ட் தமிழ் சூப்பர் (வருடாந்திரம்)',
    amount: 2250, // ₹187.50/mo (saves ₹31/mo vs ₹219)
    is_recommended: true,
    channel_count: 145,
    hd_channel_count: 0,
    channel_list: ['Sun TV', 'KTV', 'Sun Music', 'Star Vijay', 'Zee Tamil', 'Jaya TV', 'Colors Tamil', 'Star Sports 1 Tamil', 'Discovery Tamil', 'Chutti TV', 'Sun News', 'Thanthi TV', 'Polimer News', 'Kalaignar TV', 'Raj TV', 'Mega TV'],
    genre_tags: ['tamil', 'entertainment', 'movies', 'news', 'sports'],
    description: 'Full 365 days of nonstop Tamil family television at less than ₹188 per month.',
    updated_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    updated_by: 'admin_sys_init',
  },
  {
    id: 'sun_hd_cinema_1m',
    operator: 'sun_direct',
    pack_type: 'HD',
    duration_months: 1,
    plan_name: 'Sun Direct Tamil Cinema Bonanza HD',
    tamilName: 'சன் தமிழ் சினிமா போனான்ஸா எச்டி',
    amount: 349,
    is_recommended: false,
    channel_count: 185,
    hd_channel_count: 26,
    channel_list: ['Sun TV HD', 'KTV HD', 'Sun Music HD', 'Star Vijay HD', 'Vijay Super HD', 'Zee Thirai HD', 'Colors Cineplex Tamil HD', 'Sony PIX HD', 'Star Movies HD', 'MNX HD'],
    genre_tags: ['tamil', 'movies', 'entertainment'],
    description: 'Dedicated blockbuster movie pack with premier regional & international cinema in HD.',
    updated_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    updated_by: 'admin_sys_init',
  },
  {
    id: 'sun_sd_sports_1m',
    operator: 'sun_direct',
    pack_type: 'SD',
    duration_months: 1,
    plan_name: 'Sun Direct Sports Power Saver',
    tamilName: 'சன் ஸ்போர்ட்ஸ் பவர் சேவர்',
    amount: 260,
    is_recommended: false,
    channel_count: 130,
    hd_channel_count: 0,
    channel_list: ['Star Sports 1 Tamil', 'Star Sports 1 Hindi', 'Star Sports 2', 'Sony Sports Ten 1', 'Sony Sports Ten 2', 'Sports18 1', 'DD Sports', 'Sun TV', 'KTV'],
    genre_tags: ['sports', 'tamil', 'entertainment'],
    description: 'Comprehensive sports & Tamil entertainment pack covering cricket, football and regional news.',
    updated_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    updated_by: 'admin_sys_init',
  },
  {
    id: 'sun_sd_budget_1m',
    operator: 'sun_direct',
    pack_type: 'SD',
    duration_months: 1,
    plan_name: 'Sun Direct Tamil Economy Saver',
    tamilName: 'சன் தமிழ் எகானமி சேவர்',
    amount: 149,
    is_recommended: false,
    channel_count: 95,
    hd_channel_count: 0,
    channel_list: ['Sun TV', 'KTV', 'Sun News', 'Kalaignar TV', 'Jaya TV', 'Polimer News', 'News 18 Tamil Nadu', 'DD Podhigai'],
    genre_tags: ['tamil', 'news', 'entertainment'],
    description: 'Ultra low-cost base bouquet covering core Tamil broadcast and FTA news channels.',
    updated_at: new Date(Date.now() - 86400000 * 6).toISOString(),
    updated_by: 'admin_sys_init',
  },

  // =========================================================================
  // 2. TATA PLAY (டாடா பிளே)
  // =========================================================================
  {
    id: 'tata_hd_1m_rec',
    operator: 'tata_play',
    pack_type: 'HD',
    duration_months: 1,
    plan_name: 'Tata Play Tamil Thalaiva HD',
    tamilName: 'டாடா பிளே தமிழ் தலைவா எச்டி',
    amount: 360,
    is_recommended: true,
    channel_count: 220,
    hd_channel_count: 36,
    channel_list: ['Star Vijay HD', 'Sun TV HD', 'KTV HD', 'Zee Tamil HD', 'Colors Tamil HD', 'Jaya TV HD', 'Star Sports 1 Tamil HD', 'Sony Sports Ten 1 HD', 'National Geographic HD', 'Animal Planet HD', 'Nick HD+'],
    genre_tags: ['tamil', 'entertainment', 'movies', 'sports', 'kids'],
    description: 'Premier Tamil entertainment pack with Dolby Atmos 5.1 audio support and 36 crystal-clear HD channels.',
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_by: 'admin_sys_init',
  },
  {
    id: 'tata_hd_3m_rec',
    operator: 'tata_play',
    pack_type: 'HD',
    duration_months: 3,
    plan_name: 'Tata Play Tamil Thalaiva HD (3 Months)',
    tamilName: 'டாடா பிளே தமிழ் தலைவா எச்டி (3 மாதங்கள்)',
    amount: 1020, // ₹340/mo (saves ₹20/mo vs ₹360)
    is_recommended: false,
    channel_count: 220,
    hd_channel_count: 36,
    channel_list: ['Star Vijay HD', 'Sun TV HD', 'KTV HD', 'Zee Tamil HD', 'Colors Tamil HD', 'Star Sports 1 Tamil HD', 'Sony Sports Ten 1 HD'],
    genre_tags: ['tamil', 'entertainment', 'movies', 'sports'],
    description: 'Quarterly HD pack with high picture clarity and sports coverage.',
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_by: 'admin_sys_init',
  },
  {
    id: 'tata_hd_6m_rec',
    operator: 'tata_play',
    pack_type: 'HD',
    duration_months: 6,
    plan_name: 'Tata Play Tamil Thalaiva HD (6M Super Saver)',
    tamilName: 'டாடா பிளே தமிழ் தலைவா எச்டி (6 மாதங்கள்)',
    amount: 1980, // ₹330/mo (saves ₹30/mo vs ₹360)
    is_recommended: true,
    channel_count: 220,
    hd_channel_count: 36,
    channel_list: ['Star Vijay HD', 'Sun TV HD', 'KTV HD', 'Zee Tamil HD', 'Colors Tamil HD', 'Jaya TV HD', 'Star Sports 1 Tamil HD', 'Sony Sports Ten 1 HD', 'National Geographic HD', 'Animal Planet HD', 'Nick HD+'],
    genre_tags: ['tamil', 'entertainment', 'movies', 'sports', 'kids'],
    description: '6 Months advance saver with significant monthly discount and continuous Tata Play Binge features.',
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_by: 'admin_sys_init',
  },
  {
    id: 'tata_hd_12m_rec',
    operator: 'tata_play',
    pack_type: 'HD',
    duration_months: 12,
    plan_name: 'Tata Play Tamil Thalaiva HD (12M Annual)',
    tamilName: 'டாடா பிளே தமிழ் தலைவா எச்டி (வருடாந்திரம்)',
    amount: 3720, // ₹310/mo (saves ₹50/mo vs ₹360)
    is_recommended: true,
    channel_count: 220,
    hd_channel_count: 36,
    channel_list: ['Star Vijay HD', 'Sun TV HD', 'KTV HD', 'Zee Tamil HD', 'Colors Tamil HD', 'Jaya TV HD', 'Star Sports 1 Tamil HD', 'Sony Sports Ten 1 HD', 'National Geographic HD', 'Animal Planet HD', 'Nick HD+'],
    genre_tags: ['tamil', 'entertainment', 'movies', 'sports', 'kids'],
    description: 'Maximum yearly savings with complete Tamil HD bouquet and Tata Play priority technician coverage.',
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_by: 'admin_sys_init',
  },
  {
    id: 'tata_sd_1m_rec',
    operator: 'tata_play',
    pack_type: 'SD',
    duration_months: 1,
    plan_name: 'Tata Play Tamil Basic Starter',
    tamilName: 'டாடா பிளே தமிழ் பேசிக் ஸ்டார்ட்டர்',
    amount: 220,
    is_recommended: true,
    channel_count: 150,
    hd_channel_count: 0,
    channel_list: ['Star Vijay', 'Sun TV', 'KTV', 'Zee Tamil', 'Colors Tamil', 'Jaya TV', 'Vijay Super', 'Star Sports 1 Tamil', 'Chutti TV', 'Sun News'],
    genre_tags: ['tamil', 'entertainment', 'movies', 'news'],
    description: 'Core family entertainment pack featuring all leading regional channels at an accessible price.',
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_by: 'admin_sys_init',
  },
  {
    id: 'tata_sd_3m_rec',
    operator: 'tata_play',
    pack_type: 'SD',
    duration_months: 3,
    plan_name: 'Tata Play Tamil Basic Starter (3M)',
    tamilName: 'டாடா பிளே தமிழ் பேசிக் (3 மாதங்கள்)',
    amount: 625, // ₹208.33/mo (saves ₹12/mo vs ₹220)
    is_recommended: false,
    channel_count: 150,
    hd_channel_count: 0,
    channel_list: ['Star Vijay', 'Sun TV', 'KTV', 'Zee Tamil', 'Colors Tamil', 'Jaya TV', 'Vijay Super', 'Star Sports 1 Tamil', 'Chutti TV', 'Sun News'],
    genre_tags: ['tamil', 'entertainment', 'movies', 'news'],
    description: 'Quarterly starter pack for uninterrupted Tamil television.',
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_by: 'admin_sys_init',
  },
  {
    id: 'tata_sd_6m_rec',
    operator: 'tata_play',
    pack_type: 'SD',
    duration_months: 6,
    plan_name: 'Tata Play Tamil Basic Starter (6M Saver)',
    tamilName: 'டாடா பிளே தமிழ் பேசிக் (6 மாதங்கள்)',
    amount: 1200, // ₹200/mo (saves ₹20/mo vs ₹220)
    is_recommended: true,
    channel_count: 150,
    hd_channel_count: 0,
    channel_list: ['Star Vijay', 'Sun TV', 'KTV', 'Zee Tamil', 'Colors Tamil', 'Jaya TV', 'Vijay Super', 'Star Sports 1 Tamil', 'Chutti TV', 'Sun News'],
    genre_tags: ['tamil', 'entertainment', 'movies', 'news'],
    description: '6 Months advance saver with reduced monthly expense and zero hassle.',
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_by: 'admin_sys_init',
  },
  {
    id: 'tata_sd_12m_rec',
    operator: 'tata_play',
    pack_type: 'SD',
    duration_months: 12,
    plan_name: 'Tata Play Tamil Basic Starter (Annual)',
    tamilName: 'டாடா பிளே தமிழ் பேசிக் (வருடாந்திரம்)',
    amount: 2280, // ₹190/mo (saves ₹30/mo vs ₹220)
    is_recommended: true,
    channel_count: 150,
    hd_channel_count: 0,
    channel_list: ['Star Vijay', 'Sun TV', 'KTV', 'Zee Tamil', 'Colors Tamil', 'Jaya TV', 'Vijay Super', 'Star Sports 1 Tamil', 'Chutti TV', 'Sun News'],
    genre_tags: ['tamil', 'entertainment', 'movies', 'news'],
    description: 'Yearly package giving best value with total peace of mind for the whole year.',
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_by: 'admin_sys_init',
  },
  {
    id: 'tata_hd_mega_1m',
    operator: 'tata_play',
    pack_type: 'HD',
    duration_months: 1,
    plan_name: 'Tata Play Tamil & English Mega HD',
    tamilName: 'டாடா பிளே தமிழ் & இங்கிலீஷ் மெகா எச்டி',
    amount: 450,
    is_recommended: false,
    channel_count: 250,
    hd_channel_count: 45,
    channel_list: ['Star Vijay HD', 'Sun TV HD', 'KTV HD', 'Star Movies HD', 'Sony PIX HD', 'Star Sports Select 1 HD', 'Star Sports Select 2 HD', 'TLC HD', 'CNN News18'],
    genre_tags: ['tamil', 'movies', 'sports', 'entertainment'],
    description: 'The ultimate premium tier with international cinema, sports select and lifestyle in HD.',
    updated_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    updated_by: 'admin_sys_init',
  },

  // =========================================================================
  // 3. AIRTEL DIGITAL TV (ஏர்டெல் டிவி)
  // =========================================================================
  {
    id: 'airtel_hd_1m_rec',
    operator: 'airtel_dth',
    pack_type: 'HD',
    duration_months: 1,
    plan_name: 'Airtel Tamil Mega HD',
    tamilName: 'ஏர்டெல் தமிழ் மெகா எச்டி',
    amount: 320,
    is_recommended: true,
    channel_count: 215,
    hd_channel_count: 34,
    channel_list: ['Sun TV HD', 'Star Vijay HD', 'KTV HD', 'Zee Tamil HD', 'Colors Tamil HD', 'Star Sports 1 Tamil HD', 'Sony Ten 1 HD', 'Discovery HD Tamil', 'Hungama TV'],
    genre_tags: ['tamil', 'entertainment', 'movies', 'sports', 'kids'],
    description: 'High-clarity Tamil broadcast with top-tier sports and kids entertainment from Airtel Digital TV.',
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_by: 'admin_sys_init',
  },
  {
    id: 'airtel_hd_3m_rec',
    operator: 'airtel_dth',
    pack_type: 'HD',
    duration_months: 3,
    plan_name: 'Airtel Tamil Mega HD (3 Months)',
    tamilName: 'ஏர்டெல் தமிழ் மெகா எச்டி (3 மாதங்கள்)',
    amount: 910, // ₹303.33/mo (saves ₹17/mo vs ₹320)
    is_recommended: false,
    channel_count: 215,
    hd_channel_count: 34,
    channel_list: ['Sun TV HD', 'Star Vijay HD', 'KTV HD', 'Zee Tamil HD', 'Colors Tamil HD', 'Star Sports 1 Tamil HD', 'Discovery HD Tamil'],
    genre_tags: ['tamil', 'entertainment', 'movies', 'sports'],
    description: 'Quarterly pack for Airtel Tamil Mega HD with reduced monthly bill.',
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_by: 'admin_sys_init',
  },
  {
    id: 'airtel_hd_6m_rec',
    operator: 'airtel_dth',
    pack_type: 'HD',
    duration_months: 6,
    plan_name: 'Airtel Tamil Mega HD (6 Months Saver)',
    tamilName: 'ஏர்டெல் தமிழ் மெகா எச்டி (6 மாதங்கள்)',
    amount: 1740, // ₹290/mo (saves ₹30/mo vs ₹320)
    is_recommended: true,
    channel_count: 215,
    hd_channel_count: 34,
    channel_list: ['Sun TV HD', 'Star Vijay HD', 'KTV HD', 'Zee Tamil HD', 'Colors Tamil HD', 'Star Sports 1 Tamil HD', 'Sony Ten 1 HD', 'Discovery HD Tamil', 'Hungama TV'],
    genre_tags: ['tamil', 'entertainment', 'movies', 'sports', 'kids'],
    description: 'Half-yearly mega HD saver with 6 months continuous high definition service.',
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_by: 'admin_sys_init',
  },
  {
    id: 'airtel_hd_12m_rec',
    operator: 'airtel_dth',
    pack_type: 'HD',
    duration_months: 12,
    plan_name: 'Airtel Tamil Mega HD (12 Months Annual)',
    tamilName: 'ஏர்டெல் தமிழ் மெகா எச்டி (வருடாந்திரம்)',
    amount: 3240, // ₹270/mo (saves ₹50/mo vs ₹320)
    is_recommended: true,
    channel_count: 215,
    hd_channel_count: 34,
    channel_list: ['Sun TV HD', 'Star Vijay HD', 'KTV HD', 'Zee Tamil HD', 'Colors Tamil HD', 'Star Sports 1 Tamil HD', 'Sony Ten 1 HD', 'Discovery HD Tamil', 'Hungama TV'],
    genre_tags: ['tamil', 'entertainment', 'movies', 'sports', 'kids'],
    description: 'Best annual HD price with free dish maintenance and priority Airtel customer care.',
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_by: 'admin_sys_init',
  },
  {
    id: 'airtel_sd_1m_rec',
    operator: 'airtel_dth',
    pack_type: 'SD',
    duration_months: 1,
    plan_name: 'Airtel Tamil Value Pack',
    tamilName: 'ஏர்டெல் தமிழ் வேல்யூ பேக்',
    amount: 215,
    is_recommended: true,
    channel_count: 140,
    hd_channel_count: 0,
    channel_list: ['Sun TV', 'Star Vijay', 'KTV', 'Zee Tamil', 'Colors Tamil', 'Star Sports 1 Tamil', 'Discovery Tamil', 'Chutti TV', 'Sun News', 'Thanthi TV'],
    genre_tags: ['tamil', 'entertainment', 'movies', 'news'],
    description: 'Value pack with popular regional channels, movies and news for budget-conscious families.',
    updated_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    updated_by: 'admin_sys_init',
  },
  {
    id: 'airtel_sd_3m_rec',
    operator: 'airtel_dth',
    pack_type: 'SD',
    duration_months: 3,
    plan_name: 'Airtel Tamil Value Pack (3 Months)',
    tamilName: 'ஏர்டெல் தமிழ் வேல்யூ (3 மாதங்கள்)',
    amount: 610, // ₹203.33/mo (saves ₹12/mo vs ₹215)
    is_recommended: false,
    channel_count: 140,
    hd_channel_count: 0,
    channel_list: ['Sun TV', 'Star Vijay', 'KTV', 'Zee Tamil', 'Colors Tamil', 'Star Sports 1 Tamil', 'Discovery Tamil', 'Chutti TV'],
    genre_tags: ['tamil', 'entertainment', 'movies', 'news'],
    description: '3 months advance payment with uninterrupted daily television.',
    updated_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    updated_by: 'admin_sys_init',
  },
  {
    id: 'airtel_sd_6m_rec',
    operator: 'airtel_dth',
    pack_type: 'SD',
    duration_months: 6,
    plan_name: 'Airtel Tamil Value Pack (6 Months Saver)',
    tamilName: 'ஏர்டெல் தமிழ் வேல்யூ (6 மாதங்கள்)',
    amount: 1170, // ₹195/mo (saves ₹20/mo vs ₹215)
    is_recommended: true,
    channel_count: 140,
    hd_channel_count: 0,
    channel_list: ['Sun TV', 'Star Vijay', 'KTV', 'Zee Tamil', 'Colors Tamil', 'Star Sports 1 Tamil', 'Discovery Tamil', 'Chutti TV', 'Sun News', 'Thanthi TV'],
    genre_tags: ['tamil', 'entertainment', 'movies', 'news'],
    description: '6 Months value advance recharge with ₹20 discount every month.',
    updated_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    updated_by: 'admin_sys_init',
  },
  {
    id: 'airtel_sd_12m_rec',
    operator: 'airtel_dth',
    pack_type: 'SD',
    duration_months: 12,
    plan_name: 'Airtel Tamil Value Pack (Annual)',
    tamilName: 'ஏர்டெல் தமிழ் வேல்யூ (வருடாந்திரம்)',
    amount: 2160, // ₹180/mo (saves ₹35/mo vs ₹215)
    is_recommended: true,
    channel_count: 140,
    hd_channel_count: 0,
    channel_list: ['Sun TV', 'Star Vijay', 'KTV', 'Zee Tamil', 'Colors Tamil', 'Star Sports 1 Tamil', 'Discovery Tamil', 'Chutti TV', 'Sun News', 'Thanthi TV'],
    genre_tags: ['tamil', 'entertainment', 'movies', 'news'],
    description: 'Annual value pack at only ₹180 per month with zero recharge hassle for 365 days.',
    updated_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    updated_by: 'admin_sys_init',
  },

  // =========================================================================
  // 4. DISH TV (டிஷ் டிவி)
  // =========================================================================
  {
    id: 'dish_hd_1m_rec',
    operator: 'dish_tv',
    pack_type: 'HD',
    duration_months: 1,
    plan_name: 'Dish TV Tamil Royal HD',
    tamilName: 'டிஷ் டிவி தமிழ் ராயல் எச்டி',
    amount: 310,
    is_recommended: true,
    channel_count: 205,
    hd_channel_count: 30,
    channel_list: ['Sun TV HD', 'KTV HD', 'Star Vijay HD', 'Zee Tamil HD', 'Colors Tamil HD', 'Star Sports 1 Tamil HD', 'Sony Sports Ten 1 HD', 'Discovery HD Tamil'],
    genre_tags: ['tamil', 'entertainment', 'movies', 'sports'],
    description: 'Crystal-clear Dish TV HD experience with complete Tamil drama, cinema and sports.',
    updated_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    updated_by: 'admin_sys_init',
  },
  {
    id: 'dish_hd_3m_rec',
    operator: 'dish_tv',
    pack_type: 'HD',
    duration_months: 3,
    plan_name: 'Dish TV Tamil Royal HD (3 Months)',
    tamilName: 'டிஷ் டிவி தமிழ் ராயல் (3 மாதங்கள்)',
    amount: 880, // ₹293.33/mo (saves ₹17/mo vs ₹310)
    is_recommended: false,
    channel_count: 205,
    hd_channel_count: 30,
    channel_list: ['Sun TV HD', 'KTV HD', 'Star Vijay HD', 'Zee Tamil HD', 'Colors Tamil HD', 'Star Sports 1 Tamil HD'],
    genre_tags: ['tamil', 'entertainment', 'movies', 'sports'],
    description: 'Quarterly HD pack with high clarity regional entertainment.',
    updated_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    updated_by: 'admin_sys_init',
  },
  {
    id: 'dish_hd_6m_rec',
    operator: 'dish_tv',
    pack_type: 'HD',
    duration_months: 6,
    plan_name: 'Dish TV Tamil Royal HD (6 Months)',
    tamilName: 'டிஷ் டிவி தமிழ் ராயல் (6 மாதங்கள்)',
    amount: 1680, // ₹280/mo (saves ₹30/mo vs ₹310)
    is_recommended: true,
    channel_count: 205,
    hd_channel_count: 30,
    channel_list: ['Sun TV HD', 'KTV HD', 'Star Vijay HD', 'Zee Tamil HD', 'Colors Tamil HD', 'Star Sports 1 Tamil HD', 'Sony Sports Ten 1 HD', 'Discovery HD Tamil'],
    genre_tags: ['tamil', 'entertainment', 'movies', 'sports'],
    description: '6 Months saver pack with ₹30 per month discount for Dish TV HD customers.',
    updated_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    updated_by: 'admin_sys_init',
  },
  {
    id: 'dish_hd_12m_rec',
    operator: 'dish_tv',
    pack_type: 'HD',
    duration_months: 12,
    plan_name: 'Dish TV Tamil Royal HD (Annual)',
    tamilName: 'டிஷ் டிவி தமிழ் ராயல் (வருடாந்திரம்)',
    amount: 3150, // ₹262.50/mo (saves ₹48/mo vs ₹310)
    is_recommended: true,
    channel_count: 205,
    hd_channel_count: 30,
    channel_list: ['Sun TV HD', 'KTV HD', 'Star Vijay HD', 'Zee Tamil HD', 'Colors Tamil HD', 'Star Sports 1 Tamil HD', 'Sony Sports Ten 1 HD', 'Discovery HD Tamil'],
    genre_tags: ['tamil', 'entertainment', 'movies', 'sports'],
    description: 'Yearly high definition plan with highest cost savings and complimentary dish service.',
    updated_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    updated_by: 'admin_sys_init',
  },
  {
    id: 'dish_sd_1m_rec',
    operator: 'dish_tv',
    pack_type: 'SD',
    duration_months: 1,
    plan_name: 'Dish TV Tamil Super SD',
    tamilName: 'டிஷ் டிவி தமிழ் சூப்பர் எஸ்.டி',
    amount: 210,
    is_recommended: true,
    channel_count: 140,
    hd_channel_count: 0,
    channel_list: ['Sun TV', 'KTV', 'Star Vijay', 'Zee Tamil', 'Colors Tamil', 'Star Sports 1 Tamil', 'Discovery Tamil', 'Sun News', 'Thanthi TV'],
    genre_tags: ['tamil', 'entertainment', 'movies', 'news'],
    description: 'Economical family standard pack with all prominent regional Tamil broadcast channels.',
    updated_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    updated_by: 'admin_sys_init',
  },
  {
    id: 'dish_sd_3m_rec',
    operator: 'dish_tv',
    pack_type: 'SD',
    duration_months: 3,
    plan_name: 'Dish TV Tamil Super SD (3 Months)',
    tamilName: 'டிஷ் டிவி தமிழ் சூப்பர் (3 மாதங்கள்)',
    amount: 595, // ₹198.33/mo (saves ₹12/mo vs ₹210)
    is_recommended: false,
    channel_count: 140,
    hd_channel_count: 0,
    channel_list: ['Sun TV', 'KTV', 'Star Vijay', 'Zee Tamil', 'Colors Tamil', 'Star Sports 1 Tamil', 'Discovery Tamil', 'Sun News'],
    genre_tags: ['tamil', 'entertainment', 'movies', 'news'],
    description: 'Quarterly SD saver pack for Dish TV Tamil subscribers.',
    updated_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    updated_by: 'admin_sys_init',
  },
  {
    id: 'dish_sd_6m_rec',
    operator: 'dish_tv',
    pack_type: 'SD',
    duration_months: 6,
    plan_name: 'Dish TV Tamil Super SD (6 Months)',
    tamilName: 'டிஷ் டிவி தமிழ் சூப்பர் (6 மாதங்கள்)',
    amount: 1140, // ₹190/mo (saves ₹20/mo vs ₹210)
    is_recommended: true,
    channel_count: 140,
    hd_channel_count: 0,
    channel_list: ['Sun TV', 'KTV', 'Star Vijay', 'Zee Tamil', 'Colors Tamil', 'Star Sports 1 Tamil', 'Discovery Tamil', 'Sun News', 'Thanthi TV'],
    genre_tags: ['tamil', 'entertainment', 'movies', 'news'],
    description: '6 Months pack saving ₹20 every month on standard definition television.',
    updated_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    updated_by: 'admin_sys_init',
  },
  {
    id: 'dish_sd_12m_rec',
    operator: 'dish_tv',
    pack_type: 'SD',
    duration_months: 12,
    plan_name: 'Dish TV Tamil Super SD (Annual)',
    tamilName: 'டிஷ் டிவி தமிழ் சூப்பர் (வருடாந்திரம்)',
    amount: 2100, // ₹175/mo (saves ₹35/mo vs ₹210)
    is_recommended: true,
    channel_count: 140,
    hd_channel_count: 0,
    channel_list: ['Sun TV', 'KTV', 'Star Vijay', 'Zee Tamil', 'Colors Tamil', 'Star Sports 1 Tamil', 'Discovery Tamil', 'Sun News', 'Thanthi TV'],
    genre_tags: ['tamil', 'entertainment', 'movies', 'news'],
    description: 'Full year of nonstop Tamil family television for just ₹175 per month.',
    updated_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    updated_by: 'admin_sys_init',
  },

  // =========================================================================
  // 5. D2H (டி2எச்)
  // =========================================================================
  {
    id: 'd2h_hd_1m_rec',
    operator: 'd2h',
    pack_type: 'HD',
    duration_months: 1,
    plan_name: 'D2H Tamil King HD',
    tamilName: 'டி2எச் தமிழ் கிங் எச்டி',
    amount: 315,
    is_recommended: true,
    channel_count: 200,
    hd_channel_count: 28,
    channel_list: ['Sun TV HD', 'KTV HD', 'Star Vijay HD', 'Zee Tamil HD', 'Colors Tamil HD', 'Star Sports 1 Tamil HD', 'Sony Ten 1 HD', 'Discovery HD Tamil'],
    genre_tags: ['tamil', 'entertainment', 'movies', 'sports'],
    description: 'High definition Tamil entertainment bouquet with leading movie, sports and music channels.',
    updated_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    updated_by: 'admin_sys_init',
  },
  {
    id: 'd2h_hd_3m_rec',
    operator: 'd2h',
    pack_type: 'HD',
    duration_months: 3,
    plan_name: 'D2H Tamil King HD (3 Months)',
    tamilName: 'டி2எச் தமிழ் கிங் (3 மாதங்கள்)',
    amount: 895, // ₹298.33/mo (saves ₹17/mo vs ₹315)
    is_recommended: false,
    channel_count: 200,
    hd_channel_count: 28,
    channel_list: ['Sun TV HD', 'KTV HD', 'Star Vijay HD', 'Zee Tamil HD', 'Colors Tamil HD', 'Star Sports 1 Tamil HD'],
    genre_tags: ['tamil', 'entertainment', 'movies', 'sports'],
    description: 'Quarterly HD pack with great picture clarity.',
    updated_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    updated_by: 'admin_sys_init',
  },
  {
    id: 'd2h_hd_6m_rec',
    operator: 'd2h',
    pack_type: 'HD',
    duration_months: 6,
    plan_name: 'D2H Tamil King HD (6 Months)',
    tamilName: 'டி2எச் தமிழ் கிங் (6 மாதங்கள்)',
    amount: 1710, // ₹285/mo (saves ₹30/mo vs ₹315)
    is_recommended: true,
    channel_count: 200,
    hd_channel_count: 28,
    channel_list: ['Sun TV HD', 'KTV HD', 'Star Vijay HD', 'Zee Tamil HD', 'Colors Tamil HD', 'Star Sports 1 Tamil HD', 'Sony Ten 1 HD', 'Discovery HD Tamil'],
    genre_tags: ['tamil', 'entertainment', 'movies', 'sports'],
    description: '6 Months advance saver with reduced monthly expense for D2H HD subscribers.',
    updated_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    updated_by: 'admin_sys_init',
  },
  {
    id: 'd2h_hd_12m_rec',
    operator: 'd2h',
    pack_type: 'HD',
    duration_months: 12,
    plan_name: 'D2H Tamil King HD (Annual)',
    tamilName: 'டி2எச் தமிழ் கிங் (வருடாந்திரம்)',
    amount: 3190, // ₹265.83/mo (saves ₹49/mo vs ₹315)
    is_recommended: true,
    channel_count: 200,
    hd_channel_count: 28,
    channel_list: ['Sun TV HD', 'KTV HD', 'Star Vijay HD', 'Zee Tamil HD', 'Colors Tamil HD', 'Star Sports 1 Tamil HD', 'Sony Ten 1 HD', 'Discovery HD Tamil'],
    genre_tags: ['tamil', 'entertainment', 'movies', 'sports'],
    description: 'Maximum yearly savings on D2H HD television with zero monthly recharge friction.',
    updated_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    updated_by: 'admin_sys_init',
  },
  {
    id: 'd2h_sd_1m_rec',
    operator: 'd2h',
    pack_type: 'SD',
    duration_months: 1,
    plan_name: 'D2H Tamil Joy SD',
    tamilName: 'டி2எச் தமிழ் ஜாய் எஸ்.டி',
    amount: 205,
    is_recommended: true,
    channel_count: 135,
    hd_channel_count: 0,
    channel_list: ['Sun TV', 'KTV', 'Vijay Super', 'Zee Tamil', 'Sun Music', 'Star Sports 1 Tamil', 'Discovery Tamil', 'Sun News', 'Thanthi TV'],
    genre_tags: ['tamil', 'entertainment', 'movies', 'music', 'news'],
    description: 'Economical SD plan with all leading regional Tamil channels.',
    updated_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    updated_by: 'admin_sys_init',
  },
  {
    id: 'd2h_sd_3m_rec',
    operator: 'd2h',
    pack_type: 'SD',
    duration_months: 3,
    plan_name: 'D2H Tamil Joy SD (3 Months)',
    tamilName: 'டி2எச் தமிழ் ஜாய் (3 மாதங்கள்)',
    amount: 580, // ₹193.33/mo (saves ₹12/mo vs ₹205)
    is_recommended: false,
    channel_count: 135,
    hd_channel_count: 0,
    channel_list: ['Sun TV', 'KTV', 'Vijay Super', 'Zee Tamil', 'Sun Music', 'Star Sports 1 Tamil', 'Discovery Tamil'],
    genre_tags: ['tamil', 'entertainment', 'movies', 'news'],
    description: 'Quarterly SD plan with complete regional channels.',
    updated_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    updated_by: 'admin_sys_init',
  },
  {
    id: 'd2h_sd_6m_rec',
    operator: 'd2h',
    pack_type: 'SD',
    duration_months: 6,
    plan_name: 'D2H Tamil Joy SD (6 Months)',
    tamilName: 'டி2எச் தமிழ் ஜாய் (6 மாதங்கள்)',
    amount: 1110, // ₹185/mo (saves ₹20/mo vs ₹205)
    is_recommended: true,
    channel_count: 135,
    hd_channel_count: 0,
    channel_list: ['Sun TV', 'KTV', 'Vijay Super', 'Zee Tamil', 'Sun Music', 'Star Sports 1 Tamil', 'Discovery Tamil', 'Sun News', 'Thanthi TV'],
    genre_tags: ['tamil', 'entertainment', 'movies', 'music', 'news'],
    description: '6 Months SD advance recharge pack saving ₹20 per month.',
    updated_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    updated_by: 'admin_sys_init',
  },
  {
    id: 'd2h_sd_12m_rec',
    operator: 'd2h',
    pack_type: 'SD',
    duration_months: 12,
    plan_name: 'D2H Tamil Joy SD (Annual)',
    tamilName: 'டி2எச் தமிழ் ஜாய் எஸ்.டி (வருடாந்திரம்)',
    amount: 2050, // ₹170.83/mo (saves ₹34/mo vs ₹205)
    is_recommended: true,
    channel_count: 135,
    hd_channel_count: 0,
    channel_list: ['Sun TV', 'KTV', 'Vijay Super', 'Zee Tamil', 'Sun Music', 'Star Sports 1 Tamil', 'Discovery Tamil', 'Sun News', 'Thanthi TV'],
    genre_tags: ['tamil', 'entertainment', 'movies', 'music', 'news'],
    description: 'Yearly standard definition package with zero monthly recharge friction.',
    updated_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    updated_by: 'admin_sys_init',
  },
];

const LOCAL_STORAGE_CATALOG_KEY = 'dth_plan_catalog_cache_v2';
const LOCAL_STORAGE_AUDIT_KEY = 'dth_plan_audit_logs_cache_v2';

export class PlanCatalogService {
  /**
   * Realtime Live Subscription to Firestore (Single Source of Truth)
   * Automatically synchronizes across all tabs and UI components via onSnapshot.
   */
  static subscribeToPlans(callback: (plans: PlanCatalogItem[]) => void): Unsubscribe {
    if (isFirebaseLive && db) {
      try {
        const catalogRef = collection(db, 'plan_catalog');
        return onSnapshot(
          catalogRef,
          (snapshot) => {
            if (snapshot.empty) {
              // Firestore is live but empty: Auto-seed initial catalog
              this.seedInitialCatalogToFirestore().then((seeded) => {
                callback(seeded);
              });
            } else {
              const plans: PlanCatalogItem[] = [];
              snapshot.forEach((docSnap) => {
                const data = docSnap.data();
                plans.push({
                  id: docSnap.id,
                  operator: data.operator,
                  pack_type: data.pack_type || data.type || 'HD',
                  duration_months: (Number(data.duration_months) || 1) as 1 | 3 | 6 | 12,
                  plan_name: data.plan_name || data.name || 'DTH Pack',
                  tamilName: data.tamilName,
                  amount: Number(data.amount || data.price) || 299,
                  price: Number(data.amount || data.price) || 299,
                  is_recommended: Boolean(data.is_recommended),
                  channel_count: Number(data.channel_count) || (data.pack_type === 'HD' ? 210 : 145),
                  hd_channel_count: data.hd_channel_count !== undefined ? Number(data.hd_channel_count) : (data.pack_type === 'HD' ? 32 : 0),
                  channel_list: Array.isArray(data.channel_list) ? data.channel_list : (Array.isArray(data.channels) ? data.channels : []),
                  channels: Array.isArray(data.channel_list) ? data.channel_list : (Array.isArray(data.channels) ? data.channels : []),
                  genre_tags: Array.isArray(data.genre_tags) ? data.genre_tags : ['tamil', 'entertainment'],
                  description: data.description,
                  updated_at: data.updated_at || new Date().toISOString(),
                  updated_by: data.updated_by || 'system',
                });
              });

              try {
                localStorage.setItem(LOCAL_STORAGE_CATALOG_KEY, JSON.stringify(plans));
              } catch {}

              callback(plans);
            }
          },
          (err) => {
            console.warn('[PlanCatalogService] onSnapshot listener error, falling back to cached plans:', err);
            this.getAllPlans().then(callback);
          }
        );
      } catch (err) {
        console.warn('[PlanCatalogService] Failed to establish onSnapshot listener:', err);
      }
    }

    // Fallback if Firebase not live or snapshot unavailable
    this.getAllPlans().then(callback);
    return () => {};
  }

  /**
   * Helper to seed initial catalog into Cloud Firestore
   */
  static async seedInitialCatalogToFirestore(): Promise<PlanCatalogItem[]> {
    if (isFirebaseLive && db) {
      for (const item of INITIAL_PLAN_CATALOG) {
        try {
          const cleanPayload = sanitizePayload(item);
          await setDoc(doc(db, 'plan_catalog', item.id), cleanPayload);
        } catch (seedErr) {
          console.warn('[PlanCatalogService] Seeding plan to Firestore:', item.id, seedErr);
        }
      }
    }
    return INITIAL_PLAN_CATALOG;
  }

  /**
   * Get all plans from Cloud Firestore (authoritative source of truth)
   */
  static async getAllPlans(): Promise<PlanCatalogItem[]> {
    // 1. Primary Source: Cloud Firestore
    if (isFirebaseLive && db) {
      try {
        const catalogRef = collection(db, 'plan_catalog');
        const snapshot = await getDocs(catalogRef);

        if (!snapshot.empty) {
          const remotePlans: PlanCatalogItem[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            remotePlans.push({
              id: docSnap.id,
              operator: data.operator,
              pack_type: data.pack_type || data.type || 'HD',
              duration_months: (Number(data.duration_months) || 1) as 1 | 3 | 6 | 12,
              plan_name: data.plan_name || data.name || 'DTH Pack',
              tamilName: data.tamilName,
              amount: Number(data.amount || data.price) || 299,
              price: Number(data.amount || data.price) || 299,
              is_recommended: Boolean(data.is_recommended),
              channel_count: Number(data.channel_count) || (data.pack_type === 'HD' ? 210 : 145),
              hd_channel_count: data.hd_channel_count !== undefined ? Number(data.hd_channel_count) : (data.pack_type === 'HD' ? 32 : 0),
              channel_list: Array.isArray(data.channel_list) ? data.channel_list : (Array.isArray(data.channels) ? data.channels : []),
              channels: Array.isArray(data.channel_list) ? data.channel_list : (Array.isArray(data.channels) ? data.channels : []),
              genre_tags: Array.isArray(data.genre_tags) ? data.genre_tags : ['tamil', 'entertainment'],
              description: data.description,
              updated_at: data.updated_at || new Date().toISOString(),
              updated_by: data.updated_by || 'system',
            });
          });

          try {
            localStorage.setItem(LOCAL_STORAGE_CATALOG_KEY, JSON.stringify(remotePlans));
          } catch {}

          return remotePlans;
        } else {
          // FIRESTORE IS EMPTY: Seed initial catalog
          const seeded = await this.seedInitialCatalogToFirestore();
          try {
            localStorage.setItem(LOCAL_STORAGE_CATALOG_KEY, JSON.stringify(seeded));
          } catch {}
          return seeded;
        }
      } catch (err) {
        console.warn('[PlanCatalogService] Firestore fetch error, checking backend server / cache:', err);
      }
    }

    // 2. Secondary Source: Backend Server REST API (/api/admin/plans)
    try {
      const srvRes = await fetch('/api/admin/plans');
      if (srvRes.ok) {
        const srvData = await srvRes.json();
        if (srvData.success && Array.isArray(srvData.plans) && srvData.plans.length > 0) {
          try {
            localStorage.setItem(LOCAL_STORAGE_CATALOG_KEY, JSON.stringify(srvData.plans));
          } catch {}
          return srvData.plans;
        }
      }
    } catch {}

    // 3. Fallback: Local storage cache
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_CATALOG_KEY);
      if (stored) {
        const parsed: PlanCatalogItem[] = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {}

    // 4. Fallback: Unified Seed Catalog
    return INITIAL_PLAN_CATALOG;
  }

  // Get plans for a specific operator
  static async getPlansByOperator(operator: DthOperatorId): Promise<PlanCatalogItem[]> {
    const all = await this.getAllPlans();
    return all.filter((p) => p.operator === operator);
  }

  // Get recommended pack for operator and pack_type
  static getRecommendedPlan(
    plans: PlanCatalogItem[], 
    operator: DthOperatorId, 
    pack_type: 'HD' | 'SD', 
    duration_months: 1 | 3 | 6 | 12
  ): PlanCatalogItem | undefined {
    return plans.find(
      (p) => 
        p.operator === operator && 
        p.pack_type === pack_type && 
        p.duration_months === duration_months && 
        p.is_recommended === true
    );
  }

  /**
   * Calculate dynamic savings per month against the 1-month baseline rate of the same pack family
   */
  static calculateSavings(
    plans: PlanCatalogItem[],
    operator: DthOperatorId,
    pack_type: 'HD' | 'SD',
    duration_months: 1 | 3 | 6 | 12
  ): { savePerMonth: number; percentSave: number; oneMonthRate: number } {
    const plan1M = this.getRecommendedPlan(plans, operator, pack_type, 1) ||
      plans.find((p) => p.operator === operator && p.pack_type === pack_type && p.duration_months === 1);

    const oneMonthRate = plan1M ? plan1M.amount : 0;

    if (duration_months === 1 || oneMonthRate <= 0) {
      return { savePerMonth: 0, percentSave: 0, oneMonthRate };
    }

    const planSelected = this.getRecommendedPlan(plans, operator, pack_type, duration_months) ||
      plans.find((p) => p.operator === operator && p.pack_type === pack_type && p.duration_months === duration_months);

    if (!planSelected) {
      return { savePerMonth: 0, percentSave: 0, oneMonthRate };
    }

    const price1M = oneMonthRate;
    const effectiveMonthly = planSelected.amount / duration_months;
    const savePerMonth = Math.round(price1M - effectiveMonthly);

    if (savePerMonth > 0) {
      const percentSave = Math.round((savePerMonth / price1M) * 100);
      return { savePerMonth, percentSave, oneMonthRate };
    }

    return { savePerMonth: 0, percentSave: 0, oneMonthRate };
  }

  // Save or update plan (admin only)
  static async savePlan(
    plan: Omit<PlanCatalogItem, 'updated_at'> & { updated_at?: string }, 
    adminUid: string
  ): Promise<PlanCatalogItem> {
    const now = new Date().toISOString();
    const finalPlan: PlanCatalogItem = {
      ...plan,
      amount: Number(plan.amount),
      price: Number(plan.amount),
      duration_months: Number(plan.duration_months) as 1 | 3 | 6 | 12,
      is_recommended: Boolean(plan.is_recommended),
      channel_count: Number(plan.channel_count) || (plan.pack_type === 'HD' ? 210 : 145),
      hd_channel_count: plan.hd_channel_count !== undefined ? Number(plan.hd_channel_count) : (plan.pack_type === 'HD' ? 32 : 0),
      channel_list: Array.isArray(plan.channel_list) ? plan.channel_list : [],
      channels: Array.isArray(plan.channel_list) ? plan.channel_list : [],
      genre_tags: Array.isArray(plan.genre_tags) ? plan.genre_tags : ['tamil', 'entertainment'],
      description: plan.description,
      updated_at: now,
      updated_by: adminUid || 'admin_user',
    };

    // 1. Save to Cloud Firestore
    if (isFirebaseLive && db) {
      try {
        const cleanPayload = sanitizePayload(finalPlan);
        const planDocRef = doc(db, 'plan_catalog', finalPlan.id);
        await setDoc(planDocRef, cleanPayload, { merge: true });
      } catch (err) {
        console.error('[PlanCatalogService] Firestore save error:', err);
      }
    }

    // 2. Save to Backend Server API
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (auth && auth.currentUser) {
        try {
          const token = await auth.currentUser.getIdToken();
          if (token) headers['Authorization'] = `Bearer ${token}`;
        } catch {}
      }
      await fetch('/api/admin/plans/save', {
        method: 'POST',
        headers,
        body: JSON.stringify({ plan: finalPlan, callerEmail: adminUid }),
      });
    } catch (e) {
      console.warn('[PlanCatalogService] Backend save error:', e);
    }

    // 3. Save to local storage
    try {
      const all = await this.getAllPlans();
      const existingIndex = all.findIndex((p) => p.id === finalPlan.id);
      const isNew = existingIndex === -1;
      if (existingIndex >= 0) {
        all[existingIndex] = finalPlan;
      } else {
        all.unshift(finalPlan);
      }
      localStorage.setItem(LOCAL_STORAGE_CATALOG_KEY, JSON.stringify(all));
    } catch {}

    // 4. Record audit log
    await this.recordAuditLog({
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      plan_id: finalPlan.id,
      plan_name: finalPlan.plan_name,
      operator: finalPlan.operator,
      action: 'update',
      updated_at: now,
      updated_by: adminUid || 'admin_user',
      details: `Saved ${finalPlan.pack_type} pack for ${finalPlan.duration_months}M (₹${finalPlan.amount}) in Firestore`,
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('plan_catalog_updated'));
    }

    return finalPlan;
  }

  // Permanently delete plan (admin only) from Cloud Firestore
  static async deletePlan(planId: string, adminUid: string): Promise<boolean> {
    // 1. Delete from Firebase Firestore
    if (isFirebaseLive && db) {
      try {
        const planDocRef = doc(db, 'plan_catalog', planId);
        await deleteDoc(planDocRef);
      } catch (err) {
        console.error('[PlanCatalogService] Firestore delete error:', err);
      }
    }

    // 2. Delete from Backend Server API
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (auth && auth.currentUser) {
        try {
          const token = await auth.currentUser.getIdToken();
          if (token) headers['Authorization'] = `Bearer ${token}`;
        } catch {}
      }
      await fetch('/api/admin/plans/delete', {
        method: 'POST',
        headers,
        body: JSON.stringify({ planId, callerEmail: adminUid }),
      });
    } catch (e) {
      console.warn('[PlanCatalogService] Backend delete error:', e);
    }

    // 3. Update local storage cache
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_CATALOG_KEY);
      if (stored) {
        const parsed: PlanCatalogItem[] = JSON.parse(stored);
        const filtered = parsed.filter((p) => p.id !== planId);
        localStorage.setItem(LOCAL_STORAGE_CATALOG_KEY, JSON.stringify(filtered));
      }
    } catch {}

    // 4. Record audit log
    await this.recordAuditLog({
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      plan_id: planId,
      plan_name: planId,
      operator: 'sun_direct',
      action: 'delete',
      updated_at: new Date().toISOString(),
      updated_by: adminUid || 'admin_user',
      details: `Permanently deleted plan ${planId} from Firebase Firestore.`,
    });

    // 5. Dispatch update event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('plan_catalog_updated'));
    }

    return true;
  }

  // Get recent audit logs
  static async getRecentAuditLogs(): Promise<PlanAuditLog[]> {
    if (isFirebaseLive && db) {
      try {
        const auditRef = collection(db, 'plan_audit_logs');
        const q = query(auditRef, orderBy('updated_at', 'desc'), limit(20));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const logs: PlanAuditLog[] = [];
          snapshot.forEach((d) => logs.push(d.data() as PlanAuditLog));
          return logs;
        }
      } catch (err) {
        console.warn('[PlanCatalogService] Error loading audit logs from Firestore, using local fallback:', err);
      }
    }

    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_AUDIT_KEY);
      if (stored) {
        return JSON.parse(stored).slice(0, 20);
      }
    } catch {}

    return [];
  }

  // Record audit log
  static async recordAuditLog(log: PlanAuditLog): Promise<void> {
    if (isFirebaseLive && db) {
      try {
        const auditDocRef = doc(db, 'plan_audit_logs', log.id);
        await setDoc(auditDocRef, sanitizePayload(log));
      } catch (err) {
        console.error('[PlanCatalogService] Failed to write Firestore audit log:', err);
      }
    }

    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_AUDIT_KEY);
      const existing: PlanAuditLog[] = stored ? JSON.parse(stored) : [];
      existing.unshift(log);
      localStorage.setItem(LOCAL_STORAGE_AUDIT_KEY, JSON.stringify(existing.slice(0, 50)));
    } catch {}
  }
}
