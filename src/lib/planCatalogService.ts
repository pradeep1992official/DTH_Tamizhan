import { PlanCatalogItem, PlanAuditLog, DthOperatorId } from '../types';
import { db, auth, isFirebaseLive, sanitizePayload } from './firebase';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  serverTimestamp 
} from 'firebase/firestore';

export const INITIAL_PLAN_CATALOG: PlanCatalogItem[] = [
  // --- Sun Direct ---
  // Recommended HD (1M, 6M, 12M)
  {
    id: 'sun_hd_1m_rec',
    operator: 'sun_direct',
    pack_type: 'HD',
    duration_months: 1,
    plan_name: 'Sun Direct Prime HD',
    amount: 299,
    is_recommended: true,
    channel_list: ['Sun TV HD', 'KTV HD', 'Sun Music HD', 'Star Vijay HD', 'Zee Tamil HD', 'Jaya TV HD', 'Colors Tamil HD', 'Star Sports 1 Tamil HD', 'Star Sports 2 HD', 'Sony Sports Ten 1 HD', 'National Geographic HD', 'Discovery HD Tamil', 'Cartoon Network HD', 'Sun News', 'Thanthi TV', 'Puthiya Thalaimurai', 'Kalaignar TV', 'Captain TV'],
    updated_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    updated_by: 'admin_sys_init',
  },
  {
    id: 'sun_hd_6m_rec',
    operator: 'sun_direct',
    pack_type: 'HD',
    duration_months: 6,
    plan_name: 'Sun Direct Prime HD (6 Months Saver)',
    amount: 1650, // ₹275/mo (saves ₹24/mo vs ₹299)
    is_recommended: true,
    channel_list: ['Sun TV HD', 'KTV HD', 'Sun Music HD', 'Star Vijay HD', 'Zee Tamil HD', 'Jaya TV HD', 'Colors Tamil HD', 'Star Sports 1 Tamil HD', 'Star Sports 2 HD', 'Sony Sports Ten 1 HD', 'National Geographic HD', 'Discovery HD Tamil', 'Cartoon Network HD', 'Sun News', 'Thanthi TV', 'Puthiya Thalaimurai', 'Kalaignar TV', 'Captain TV'],
    updated_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    updated_by: 'admin_sys_init',
  },
  {
    id: 'sun_hd_12m_rec',
    operator: 'sun_direct',
    pack_type: 'HD',
    duration_months: 12,
    plan_name: 'Sun Direct Prime HD (Annual Dhamaka)',
    amount: 3100, // ₹258.33/mo (saves ₹41/mo vs ₹299)
    is_recommended: true,
    channel_list: ['Sun TV HD', 'KTV HD', 'Sun Music HD', 'Star Vijay HD', 'Zee Tamil HD', 'Jaya TV HD', 'Colors Tamil HD', 'Star Sports 1 Tamil HD', 'Star Sports 2 HD', 'Sony Sports Ten 1 HD', 'National Geographic HD', 'Discovery HD Tamil', 'Cartoon Network HD', 'Sun News', 'Thanthi TV', 'Puthiya Thalaimurai', 'Kalaignar TV', 'Captain TV'],
    updated_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    updated_by: 'admin_sys_init',
  },
  // Recommended SD (1M, 6M, 12M)
  {
    id: 'sun_sd_1m_rec',
    operator: 'sun_direct',
    pack_type: 'SD',
    duration_months: 1,
    plan_name: 'Sun Direct Tamil Super Pack',
    amount: 219,
    is_recommended: true,
    channel_list: ['Sun TV', 'KTV', 'Sun Music', 'Star Vijay', 'Zee Tamil', 'Jaya TV', 'Colors Tamil', 'Star Sports 1 Tamil', 'Discovery Tamil', 'Chutti TV', 'Sun News', 'Thanthi TV', 'Polimer News', 'Kalaignar TV', 'Raj TV', 'Mega TV'],
    updated_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    updated_by: 'admin_sys_init',
  },
  {
    id: 'sun_sd_6m_rec',
    operator: 'sun_direct',
    pack_type: 'SD',
    duration_months: 6,
    plan_name: 'Sun Direct Tamil Super Pack (6 Months Saver)',
    amount: 1199, // ₹199.83/mo (saves ₹19/mo vs ₹219)
    is_recommended: true,
    channel_list: ['Sun TV', 'KTV', 'Sun Music', 'Star Vijay', 'Zee Tamil', 'Jaya TV', 'Colors Tamil', 'Star Sports 1 Tamil', 'Discovery Tamil', 'Chutti TV', 'Sun News', 'Thanthi TV', 'Polimer News', 'Kalaignar TV', 'Raj TV', 'Mega TV'],
    updated_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    updated_by: 'admin_sys_init',
  },
  {
    id: 'sun_sd_12m_rec',
    operator: 'sun_direct',
    pack_type: 'SD',
    duration_months: 12,
    plan_name: 'Sun Direct Tamil Super Pack (Annual)',
    amount: 2250, // ₹187.50/mo (saves ₹31/mo vs ₹219)
    is_recommended: true,
    channel_list: ['Sun TV', 'KTV', 'Sun Music', 'Star Vijay', 'Zee Tamil', 'Jaya TV', 'Colors Tamil', 'Star Sports 1 Tamil', 'Discovery Tamil', 'Chutti TV', 'Sun News', 'Thanthi TV', 'Polimer News', 'Kalaignar TV', 'Raj TV', 'Mega TV'],
    updated_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    updated_by: 'admin_sys_init',
  },
  // Other Sun Direct packs (not recommended) for Change Plan tab
  {
    id: 'sun_hd_cinema_1m',
    operator: 'sun_direct',
    pack_type: 'HD',
    duration_months: 1,
    plan_name: 'Sun Direct Tamil Cinema Bonanza HD',
    amount: 349,
    is_recommended: false,
    channel_list: ['Sun TV HD', 'KTV HD', 'Sun Music HD', 'Star Vijay HD', 'Vijay Super HD', 'Zee Thirai HD', 'Colors Cineplex Tamil HD', 'Sony PIX HD', 'Star Movies HD', 'MNX HD'],
    updated_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    updated_by: 'admin_sys_init',
  },
  {
    id: 'sun_sd_sports_1m',
    operator: 'sun_direct',
    pack_type: 'SD',
    duration_months: 1,
    plan_name: 'Sun Direct Sports Power Saver',
    amount: 260,
    is_recommended: false,
    channel_list: ['Star Sports 1 Tamil', 'Star Sports 1 Hindi', 'Star Sports 2', 'Sony Sports Ten 1', 'Sony Sports Ten 2', 'Sports18 1', 'DD Sports', 'Sun TV', 'KTV'],
    updated_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    updated_by: 'admin_sys_init',
  },
  {
    id: 'sun_sd_budget_1m',
    operator: 'sun_direct',
    pack_type: 'SD',
    duration_months: 1,
    plan_name: 'Sun Direct Tamil Economy Saver',
    amount: 149,
    is_recommended: false,
    channel_list: ['Sun TV', 'KTV', 'Sun News', 'Kalaignar TV', 'Jaya TV', 'Polimer News', 'News 18 Tamil Nadu', 'DD Podhigai'],
    updated_at: new Date(Date.now() - 86400000 * 6).toISOString(),
    updated_by: 'admin_sys_init',
  },

  // --- Tata Play ---
  {
    id: 'tata_hd_1m_rec',
    operator: 'tata_play',
    pack_type: 'HD',
    duration_months: 1,
    plan_name: 'Tata Play Tamil Thalaiva HD',
    amount: 360,
    is_recommended: true,
    channel_list: ['Star Vijay HD', 'Sun TV HD', 'KTV HD', 'Zee Tamil HD', 'Colors Tamil HD', 'Jaya TV HD', 'Star Sports 1 Tamil HD', 'Sony Sports Ten 1 HD', 'National Geographic HD', 'Animal Planet HD', 'Nick HD+'],
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_by: 'admin_sys_init',
  },
  {
    id: 'tata_hd_6m_rec',
    operator: 'tata_play',
    pack_type: 'HD',
    duration_months: 6,
    plan_name: 'Tata Play Tamil Thalaiva HD (6M Super Saver)',
    amount: 1980, // ₹330/mo (saves ₹30/mo vs ₹360)
    is_recommended: true,
    channel_list: ['Star Vijay HD', 'Sun TV HD', 'KTV HD', 'Zee Tamil HD', 'Colors Tamil HD', 'Jaya TV HD', 'Star Sports 1 Tamil HD', 'Sony Sports Ten 1 HD', 'National Geographic HD', 'Animal Planet HD', 'Nick HD+'],
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_by: 'admin_sys_init',
  },
  {
    id: 'tata_hd_12m_rec',
    operator: 'tata_play',
    pack_type: 'HD',
    duration_months: 12,
    plan_name: 'Tata Play Tamil Thalaiva HD (12M Annual)',
    amount: 3720, // ₹310/mo (saves ₹50/mo vs ₹360)
    is_recommended: true,
    channel_list: ['Star Vijay HD', 'Sun TV HD', 'KTV HD', 'Zee Tamil HD', 'Colors Tamil HD', 'Jaya TV HD', 'Star Sports 1 Tamil HD', 'Sony Sports Ten 1 HD', 'National Geographic HD', 'Animal Planet HD', 'Nick HD+'],
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_by: 'admin_sys_init',
  },
  {
    id: 'tata_sd_1m_rec',
    operator: 'tata_play',
    pack_type: 'SD',
    duration_months: 1,
    plan_name: 'Tata Play Tamil Basic Starter',
    amount: 220,
    is_recommended: true,
    channel_list: ['Star Vijay', 'Sun TV', 'KTV', 'Zee Tamil', 'Colors Tamil', 'Jaya TV', 'Vijay Super', 'Star Sports 1 Tamil', 'Chutti TV', 'Sun News'],
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_by: 'admin_sys_init',
  },
  {
    id: 'tata_sd_6m_rec',
    operator: 'tata_play',
    pack_type: 'SD',
    duration_months: 6,
    plan_name: 'Tata Play Tamil Basic Starter (6M Saver)',
    amount: 1200, // ₹200/mo (saves ₹20/mo vs ₹220)
    is_recommended: true,
    channel_list: ['Star Vijay', 'Sun TV', 'KTV', 'Zee Tamil', 'Colors Tamil', 'Jaya TV', 'Vijay Super', 'Star Sports 1 Tamil', 'Chutti TV', 'Sun News'],
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_by: 'admin_sys_init',
  },
  {
    id: 'tata_sd_12m_rec',
    operator: 'tata_play',
    pack_type: 'SD',
    duration_months: 12,
    plan_name: 'Tata Play Tamil Basic Starter (Annual)',
    amount: 2280, // ₹190/mo (saves ₹30/mo vs ₹220)
    is_recommended: true,
    channel_list: ['Star Vijay', 'Sun TV', 'KTV', 'Zee Tamil', 'Colors Tamil', 'Jaya TV', 'Vijay Super', 'Star Sports 1 Tamil', 'Chutti TV', 'Sun News'],
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_by: 'admin_sys_init',
  },
  {
    id: 'tata_hd_mega_1m',
    operator: 'tata_play',
    pack_type: 'HD',
    duration_months: 1,
    plan_name: 'Tata Play Tamil & English Mega HD',
    amount: 450,
    is_recommended: false,
    channel_list: ['Star Vijay HD', 'Sun TV HD', 'KTV HD', 'Star Movies HD', 'Sony PIX HD', 'Star Sports Select 1 HD', 'Star Sports Select 2 HD', 'TLC HD', 'CNN News18'],
    updated_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    updated_by: 'admin_sys_init',
  },

  // --- Airtel Digital TV ---
  {
    id: 'airtel_hd_1m_rec',
    operator: 'airtel_dth',
    pack_type: 'HD',
    duration_months: 1,
    plan_name: 'Airtel Tamil Mega HD',
    amount: 320,
    is_recommended: true,
    channel_list: ['Sun TV HD', 'Star Vijay HD', 'KTV HD', 'Zee Tamil HD', 'Colors Tamil HD', 'Star Sports 1 Tamil HD', 'Sony Ten 1 HD', 'Discovery HD Tamil', 'Hungama TV'],
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_by: 'admin_sys_init',
  },
  {
    id: 'airtel_hd_6m_rec',
    operator: 'airtel_dth',
    pack_type: 'HD',
    duration_months: 6,
    plan_name: 'Airtel Tamil Mega HD (6 Months Saver)',
    amount: 1740, // ₹290/mo (saves ₹30/mo vs ₹320)
    is_recommended: true,
    channel_list: ['Sun TV HD', 'Star Vijay HD', 'KTV HD', 'Zee Tamil HD', 'Colors Tamil HD', 'Star Sports 1 Tamil HD', 'Sony Ten 1 HD', 'Discovery HD Tamil', 'Hungama TV'],
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_by: 'admin_sys_init',
  },
  {
    id: 'airtel_hd_12m_rec',
    operator: 'airtel_dth',
    pack_type: 'HD',
    duration_months: 12,
    plan_name: 'Airtel Tamil Mega HD (12 Months Annual)',
    amount: 3240, // ₹270/mo (saves ₹50/mo vs ₹320)
    is_recommended: true,
    channel_list: ['Sun TV HD', 'Star Vijay HD', 'KTV HD', 'Zee Tamil HD', 'Colors Tamil HD', 'Star Sports 1 Tamil HD', 'Sony Ten 1 HD', 'Discovery HD Tamil', 'Hungama TV'],
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_by: 'admin_sys_init',
  },
  {
    id: 'airtel_sd_1m_rec',
    operator: 'airtel_dth',
    pack_type: 'SD',
    duration_months: 1,
    plan_name: 'Airtel Tamil Value Pack',
    amount: 215,
    is_recommended: true,
    channel_list: ['Sun TV', 'Star Vijay', 'KTV', 'Zee Tamil', 'Colors Tamil', 'Star Sports 1 Tamil', 'Discovery Tamil', 'Chutti TV', 'Sun News', 'Thanthi TV'],
    updated_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    updated_by: 'admin_sys_init',
  },
  {
    id: 'airtel_sd_6m_rec',
    operator: 'airtel_dth',
    pack_type: 'SD',
    duration_months: 6,
    plan_name: 'Airtel Tamil Value Pack (6 Months Saver)',
    amount: 1170, // ₹195/mo (saves ₹20/mo vs ₹215)
    is_recommended: true,
    channel_list: ['Sun TV', 'Star Vijay', 'KTV', 'Zee Tamil', 'Colors Tamil', 'Star Sports 1 Tamil', 'Discovery Tamil', 'Chutti TV', 'Sun News', 'Thanthi TV'],
    updated_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    updated_by: 'admin_sys_init',
  },
  {
    id: 'airtel_sd_12m_rec',
    operator: 'airtel_dth',
    pack_type: 'SD',
    duration_months: 12,
    plan_name: 'Airtel Tamil Value Pack (Annual)',
    amount: 2160, // ₹180/mo (saves ₹35/mo vs ₹215)
    is_recommended: true,
    channel_list: ['Sun TV', 'Star Vijay', 'KTV', 'Zee Tamil', 'Colors Tamil', 'Star Sports 1 Tamil', 'Discovery Tamil', 'Chutti TV', 'Sun News', 'Thanthi TV'],
    updated_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    updated_by: 'admin_sys_init',
  },

  // --- Dish TV ---
  {
    id: 'dish_hd_1m_rec',
    operator: 'dish_tv',
    pack_type: 'HD',
    duration_months: 1,
    plan_name: 'Dish TV Tamil Royal HD',
    amount: 310,
    is_recommended: true,
    channel_list: ['Sun TV HD', 'Star Vijay HD', 'KTV HD', 'Zee Tamil HD', 'Star Sports 1 Tamil HD', 'Sony Sports 1 HD', 'National Geographic HD', 'Sun Music HD'],
    updated_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    updated_by: 'admin_sys_init',
  },
  {
    id: 'dish_hd_6m_rec',
    operator: 'dish_tv',
    pack_type: 'HD',
    duration_months: 6,
    plan_name: 'Dish TV Tamil Royal HD (6 Months Saver)',
    amount: 1680, // ₹280/mo (saves ₹30/mo vs ₹310)
    is_recommended: true,
    channel_list: ['Sun TV HD', 'Star Vijay HD', 'KTV HD', 'Zee Tamil HD', 'Star Sports 1 Tamil HD', 'Sony Sports 1 HD', 'National Geographic HD', 'Sun Music HD'],
    updated_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    updated_by: 'admin_sys_init',
  },
  {
    id: 'dish_hd_12m_rec',
    operator: 'dish_tv',
    pack_type: 'HD',
    duration_months: 12,
    plan_name: 'Dish TV Tamil Royal HD (Annual)',
    amount: 3120, // ₹260/mo (saves ₹50/mo vs ₹310)
    is_recommended: true,
    channel_list: ['Sun TV HD', 'Star Vijay HD', 'KTV HD', 'Zee Tamil HD', 'Star Sports 1 Tamil HD', 'Sony Sports 1 HD', 'National Geographic HD', 'Sun Music HD'],
    updated_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    updated_by: 'admin_sys_init',
  },
  {
    id: 'dish_sd_1m_rec',
    operator: 'dish_tv',
    pack_type: 'SD',
    duration_months: 1,
    plan_name: 'Dish TV Tamil Joy Pack',
    amount: 205,
    is_recommended: true,
    channel_list: ['Sun TV', 'Star Vijay', 'KTV', 'Zee Tamil', 'Colors Tamil', 'Star Sports 1 Tamil', 'Discovery Tamil', 'Chutti TV', 'Sun News'],
    updated_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    updated_by: 'admin_sys_init',
  },
  {
    id: 'dish_sd_6m_rec',
    operator: 'dish_tv',
    pack_type: 'SD',
    duration_months: 6,
    plan_name: 'Dish TV Tamil Joy Pack (6 Months Saver)',
    amount: 1110, // ₹185/mo (saves ₹20/mo vs ₹205)
    is_recommended: true,
    channel_list: ['Sun TV', 'Star Vijay', 'KTV', 'Zee Tamil', 'Colors Tamil', 'Star Sports 1 Tamil', 'Discovery Tamil', 'Chutti TV', 'Sun News'],
    updated_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    updated_by: 'admin_sys_init',
  },
  {
    id: 'dish_sd_12m_rec',
    operator: 'dish_tv',
    pack_type: 'SD',
    duration_months: 12,
    plan_name: 'Dish TV Tamil Joy Pack (Annual)',
    amount: 2040, // ₹170/mo (saves ₹35/mo vs ₹205)
    is_recommended: true,
    channel_list: ['Sun TV', 'Star Vijay', 'KTV', 'Zee Tamil', 'Colors Tamil', 'Star Sports 1 Tamil', 'Discovery Tamil', 'Chutti TV', 'Sun News'],
    updated_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    updated_by: 'admin_sys_init',
  },

  // --- D2H ---
  {
    id: 'd2h_hd_1m_rec',
    operator: 'd2h',
    pack_type: 'HD',
    duration_months: 1,
    plan_name: 'D2H Tamil Gold HD',
    amount: 305,
    is_recommended: true,
    channel_list: ['Sun TV HD', 'Star Vijay HD', 'KTV HD', 'Zee Tamil HD', 'Colors Tamil HD', 'Star Sports 1 Tamil HD', 'Discovery HD Tamil', 'Sun Music HD'],
    updated_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    updated_by: 'admin_sys_init',
  },
  {
    id: 'd2h_hd_6m_rec',
    operator: 'd2h',
    pack_type: 'HD',
    duration_months: 6,
    plan_name: 'D2H Tamil Gold HD (6 Months Saver)',
    amount: 1650, // ₹275/mo (saves ₹30/mo vs ₹305)
    is_recommended: true,
    channel_list: ['Sun TV HD', 'Star Vijay HD', 'KTV HD', 'Zee Tamil HD', 'Colors Tamil HD', 'Star Sports 1 Tamil HD', 'Discovery HD Tamil', 'Sun Music HD'],
    updated_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    updated_by: 'admin_sys_init',
  },
  {
    id: 'd2h_hd_12m_rec',
    operator: 'd2h',
    pack_type: 'HD',
    duration_months: 12,
    plan_name: 'D2H Tamil Gold HD (Annual)',
    amount: 3060, // ₹255/mo (saves ₹50/mo vs ₹305)
    is_recommended: true,
    channel_list: ['Sun TV HD', 'Star Vijay HD', 'KTV HD', 'Zee Tamil HD', 'Colors Tamil HD', 'Star Sports 1 Tamil HD', 'Discovery HD Tamil', 'Sun Music HD'],
    updated_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    updated_by: 'admin_sys_init',
  },
  {
    id: 'd2h_sd_1m_rec',
    operator: 'd2h',
    pack_type: 'SD',
    duration_months: 1,
    plan_name: 'D2H Tamil Silver Pack',
    amount: 200,
    is_recommended: true,
    channel_list: ['Sun TV', 'Star Vijay', 'KTV', 'Zee Tamil', 'Colors Tamil', 'Star Sports 1 Tamil', 'Discovery Tamil', 'Chutti TV', 'Sun News'],
    updated_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    updated_by: 'admin_sys_init',
  },
  {
    id: 'd2h_sd_6m_rec',
    operator: 'd2h',
    pack_type: 'SD',
    duration_months: 6,
    plan_name: 'D2H Tamil Silver Pack (6 Months Saver)',
    amount: 1080, // ₹180/mo (saves ₹20/mo vs ₹200)
    is_recommended: true,
    channel_list: ['Sun TV', 'Star Vijay', 'KTV', 'Zee Tamil', 'Colors Tamil', 'Star Sports 1 Tamil', 'Discovery Tamil', 'Chutti TV', 'Sun News'],
    updated_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    updated_by: 'admin_sys_init',
  },
  {
    id: 'd2h_sd_12m_rec',
    operator: 'd2h',
    pack_type: 'SD',
    duration_months: 12,
    plan_name: 'D2H Tamil Silver Pack (Annual)',
    amount: 1980, // ₹165/mo (saves ₹35/mo vs ₹200)
    is_recommended: true,
    channel_list: ['Sun TV', 'Star Vijay', 'KTV', 'Zee Tamil', 'Colors Tamil', 'Star Sports 1 Tamil', 'Discovery Tamil', 'Chutti TV', 'Sun News'],
    updated_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    updated_by: 'admin_sys_init',
  },
];

const LOCAL_STORAGE_CATALOG_KEY = 'dth_tamizhan_plan_catalog';
const LOCAL_STORAGE_AUDIT_KEY = 'dth_tamizhan_plan_audit_logs';
const LOCAL_STORAGE_DELETED_KEY = 'dth_tamizhan_deleted_plan_ids';

export class PlanCatalogService {
  /**
   * Retrieves persistent tombstone list of deleted plan IDs.
   * This guarantees that once a plan is deleted by an administrator,
   * it can NEVER be resurrected by initial fallback logic.
   */
  static getDeletedPlanIds(): Set<string> {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_DELETED_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) return new Set(arr);
      }
    } catch {}
    return new Set();
  }

  static async syncDeletedIdsFromServer(): Promise<Set<string>> {
    const localSet = this.getDeletedPlanIds();
    try {
      const res = await fetch('/api/admin/plans/deleted');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.deletedIds)) {
          data.deletedIds.forEach((id: string) => localSet.add(id));
          try {
            localStorage.setItem(LOCAL_STORAGE_DELETED_KEY, JSON.stringify(Array.from(localSet)));
          } catch {}
        }
      }
    } catch {}
    return localSet;
  }

  static markPlanAsDeleted(planId: string): void {
    const set = this.getDeletedPlanIds();
    set.add(planId);
    try {
      localStorage.setItem(LOCAL_STORAGE_DELETED_KEY, JSON.stringify(Array.from(set)));
    } catch {}
  }

  static unmarkPlanAsDeleted(planId: string): void {
    const set = this.getDeletedPlanIds();
    if (set.has(planId)) {
      set.delete(planId);
      try {
        localStorage.setItem(LOCAL_STORAGE_DELETED_KEY, JSON.stringify(Array.from(set)));
      } catch {}
    }
  }

  // Get all plans from Server Disk & Firestore with automatic seeding & multi-layer persistence
  static async getAllPlans(): Promise<PlanCatalogItem[]> {
    const deletedIds = await this.syncDeletedIdsFromServer();

    // 1. Authoritative Disk Persistence: Backend Server REST API (/api/admin/plans)
    try {
      const srvRes = await fetch('/api/admin/plans');
      if (srvRes.ok) {
        const srvData = await srvRes.json();
        if (srvData.success && Array.isArray(srvData.plans)) {
          const validServerPlans = srvData.plans.filter((p: PlanCatalogItem) => !deletedIds.has(p.id));
          localStorage.setItem(LOCAL_STORAGE_CATALOG_KEY, JSON.stringify(validServerPlans));

          // Asynchronously sync with Firebase Firestore if live
          if (isFirebaseLive && db) {
            getDocs(collection(db, 'plan_catalog')).then((snapshot) => {
              if (snapshot.empty && validServerPlans.length > 0) {
                validServerPlans.forEach((p: PlanCatalogItem) => {
                  setDoc(doc(db, 'plan_catalog', p.id), sanitizePayload(p)).catch(() => {});
                });
              } else {
                snapshot.forEach((snap) => {
                  if (deletedIds.has(snap.id)) {
                    deleteDoc(doc(db, 'plan_catalog', snap.id)).catch(() => {});
                  }
                });
              }
            }).catch(() => {});
          }

          return validServerPlans;
        }
      }
    } catch {}

    // 2. Secondary Source: Firebase Firestore (plan_catalog)
    if (isFirebaseLive && db) {
      try {
        const catalogRef = collection(db, 'plan_catalog');
        const snapshot = await getDocs(catalogRef);

        if (!snapshot.empty) {
          const remotePlans: PlanCatalogItem[] = [];
          snapshot.forEach((docSnap) => {
            // Filter out any plans marked as deleted
            if (!deletedIds.has(docSnap.id)) {
              const data = docSnap.data();
              remotePlans.push({
                id: docSnap.id,
                operator: data.operator,
                pack_type: data.pack_type,
                duration_months: Number(data.duration_months) as 1 | 6 | 12,
                plan_name: data.plan_name,
                amount: Number(data.amount),
                is_recommended: Boolean(data.is_recommended),
                channel_list: Array.isArray(data.channel_list) ? data.channel_list : [],
                updated_at: data.updated_at || new Date().toISOString(),
                updated_by: data.updated_by || 'system',
              });
            } else {
              deleteDoc(doc(db, 'plan_catalog', docSnap.id)).catch(() => {});
            }
          });

          localStorage.setItem(LOCAL_STORAGE_CATALOG_KEY, JSON.stringify(remotePlans));
          fetch('/api/admin/plans/sync-seed', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ plans: remotePlans }),
          }).catch(() => {});

          return remotePlans;
        } else {
          // FIRESTORE IS EMPTY: SEED ONLY NON-DELETED PLANS INTO CLOUD FIRESTORE!
          const plansToSeed = INITIAL_PLAN_CATALOG.filter((p) => !deletedIds.has(p.id));
          
          for (const item of plansToSeed) {
            try {
              const cleanPayload = sanitizePayload(item);
              await setDoc(doc(db, 'plan_catalog', item.id), cleanPayload);
            } catch (seedErr) {
              console.warn('[PlanCatalogService] Seeding plan to Firestore:', item.id, seedErr);
            }
          }

          localStorage.setItem(LOCAL_STORAGE_CATALOG_KEY, JSON.stringify(plansToSeed));
          fetch('/api/admin/plans/sync-seed', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ plans: plansToSeed }),
          }).catch(() => {});

          return plansToSeed;
        }
      } catch (err) {
        console.warn('[PlanCatalogService] Firestore fetch error, falling back to server/local:', err);
      }
    }

    // 3. Tertiary Source: Local storage cache
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_CATALOG_KEY);
      if (stored) {
        const parsed: PlanCatalogItem[] = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter((p) => !deletedIds.has(p.id));
        }
      }
    } catch {}

    // 4. Initial seed fallback filtered strictly by deleted tombstones
    const filteredInitial = INITIAL_PLAN_CATALOG.filter((p) => !deletedIds.has(p.id));
    localStorage.setItem(LOCAL_STORAGE_CATALOG_KEY, JSON.stringify(filteredInitial));
    return filteredInitial;
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
    duration_months: 1 | 6 | 12
  ): PlanCatalogItem | undefined {
    return plans.find(
      (p) => 
        p.operator === operator && 
        p.pack_type === pack_type && 
        p.duration_months === duration_months && 
        p.is_recommended === true
    );
  }

  // Calculate dynamic savings per month
  static calculateSavings(
    plans: PlanCatalogItem[],
    operator: DthOperatorId,
    pack_type: 'HD' | 'SD',
    duration_months: 1 | 6 | 12
  ): { savePerMonth: number; percentSave: number; oneMonthRate: number } {
    const plan1M = this.getRecommendedPlan(plans, operator, pack_type, 1);
    const oneMonthRate = plan1M ? plan1M.amount : 0;

    if (duration_months === 1) {
      return { savePerMonth: 0, percentSave: 0, oneMonthRate };
    }

    const planSelected = this.getRecommendedPlan(plans, operator, pack_type, duration_months);

    if (!plan1M || !planSelected) {
      return { savePerMonth: 0, percentSave: 0, oneMonthRate };
    }

    const price1M = plan1M.amount;
    const effectiveMonthly = planSelected.amount / duration_months;
    const savePerMonth = Math.round(price1M - effectiveMonthly);

    if (savePerMonth > 0) {
      const percentSave = Math.round((savePerMonth / price1M) * 100);
      return { savePerMonth, percentSave, oneMonthRate };
    }

    return { savePerMonth: 0, percentSave: 0, oneMonthRate };
  }

  // Save or update plan (admin only) with multi-layer persistence
  static async savePlan(
    plan: Omit<PlanCatalogItem, 'updated_at'> & { updated_at?: string }, 
    adminUid: string
  ): Promise<PlanCatalogItem> {
    const now = new Date().toISOString();
    const finalPlan: PlanCatalogItem = {
      ...plan,
      amount: Number(plan.amount),
      duration_months: Number(plan.duration_months) as 1 | 6 | 12,
      is_recommended: Boolean(plan.is_recommended),
      channel_list: Array.isArray(plan.channel_list) ? plan.channel_list : [],
      updated_at: now,
      updated_by: adminUid || 'admin_user',
    };

    // Remove from tombstone if it was previously deleted
    this.unmarkPlanAsDeleted(finalPlan.id);

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
    const all = await this.getAllPlans();
    const existingIndex = all.findIndex((p) => p.id === finalPlan.id);
    const isNew = existingIndex === -1;
    if (existingIndex >= 0) {
      all[existingIndex] = finalPlan;
    } else {
      all.unshift(finalPlan);
    }
    localStorage.setItem(LOCAL_STORAGE_CATALOG_KEY, JSON.stringify(all));

    // 4. Record audit log
    await this.recordAuditLog({
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      plan_id: finalPlan.id,
      plan_name: finalPlan.plan_name,
      operator: finalPlan.operator,
      action: isNew ? 'create' : 'update',
      updated_at: now,
      updated_by: adminUid || 'admin_user',
      details: `${isNew ? 'Created' : 'Updated'} ${finalPlan.pack_type} pack for ${finalPlan.duration_months}M (₹${finalPlan.amount}) in Firebase`,
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('plan_catalog_updated'));
    }

    return finalPlan;
  }

  // Permanently delete plan (admin only) from Cloud Firestore & all tiers
  static async deletePlan(planId: string, adminUid: string): Promise<boolean> {
    // 1. Mark as permanently deleted in persistent tombstone
    this.markPlanAsDeleted(planId);

    // 2. Find target plan details for audit logging
    let targetPlan: PlanCatalogItem | undefined;
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_CATALOG_KEY);
      if (stored) {
        const parsed: PlanCatalogItem[] = JSON.parse(stored);
        targetPlan = parsed.find((p) => p.id === planId);
      }
    } catch {}

    // 3. Delete from Firebase Firestore
    if (isFirebaseLive && db) {
      try {
        const planDocRef = doc(db, 'plan_catalog', planId);
        await deleteDoc(planDocRef);
      } catch (err) {
        console.error('[PlanCatalogService] Firestore delete error:', err);
      }
    }

    // 4. Delete from Backend Server API
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

    // 5. Update local storage immediately
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_CATALOG_KEY);
      if (stored) {
        const parsed: PlanCatalogItem[] = JSON.parse(stored);
        const filtered = parsed.filter((p) => p.id !== planId);
        localStorage.setItem(LOCAL_STORAGE_CATALOG_KEY, JSON.stringify(filtered));
      }
    } catch {}

    // 6. Record audit log
    await this.recordAuditLog({
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      plan_id: planId,
      plan_name: targetPlan ? targetPlan.plan_name : planId,
      operator: targetPlan ? targetPlan.operator : 'sun_direct',
      action: 'delete',
      updated_at: new Date().toISOString(),
      updated_by: adminUid || 'admin_user',
      details: `Permanently deleted plan from Firebase Firestore (plan_catalog).`,
    });

    // 7. Dispatch multi-view reactive update
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('plan_catalog_updated'));
    }

    return true;
  }

  // Get recent 20 audit logs
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

    // Initial sample audit logs
    const seedLogs: PlanAuditLog[] = [
      {
        id: 'audit-init-1',
        plan_id: 'sun_hd_6m_rec',
        plan_name: 'Sun Direct Prime HD (6 Months Saver)',
        operator: 'sun_direct',
        action: 'update',
        updated_at: new Date(Date.now() - 3600000 * 2).toISOString(),
        updated_by: 'uid_admin_tamil_01',
        details: 'Configured 6M pack price to ₹1650 with Save ₹24/mo benefit',
      },
      {
        id: 'audit-init-2',
        plan_id: 'tata_hd_12m_rec',
        plan_name: 'Tata Play Tamil Thalaiva HD (12M Annual)',
        operator: 'tata_play',
        action: 'create',
        updated_at: new Date(Date.now() - 3600000 * 18).toISOString(),
        updated_by: 'uid_admin_chennai_hq',
        details: 'Published annual HD bouquet for Tata Play subscribers',
      },
      {
        id: 'audit-init-3',
        plan_id: 'airtel_sd_6m_rec',
        plan_name: 'Airtel Tamil Value Pack (6 Months Saver)',
        operator: 'airtel_dth',
        action: 'update',
        updated_at: new Date(Date.now() - 86400000 * 1).toISOString(),
        updated_by: 'uid_admin_tamil_01',
        details: 'Adjusted duration pricing and marked as is_recommended: true',
      }
    ];
    localStorage.setItem(LOCAL_STORAGE_AUDIT_KEY, JSON.stringify(seedLogs));
    return seedLogs;
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
