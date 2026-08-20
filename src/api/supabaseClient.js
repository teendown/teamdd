// 🎨 TEAM D.D SUPABASE CLIENT & CORE DATABASE LAYER
import { DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_KEY, STORAGE_KEYS } from '../config/constants.js';
import { getLocalItem, setLocalItem } from './storage.js';
import { isValidUUID, packRow, unpackRow, areSupplierKeysEquivalent } from '../utils/validation.js';

let _sbClient = null;
let _sbUrl = '';
let _sbKey = '';

export function getSupabaseClient() {
  const url = (localStorage.getItem(STORAGE_KEYS.SUPABASE_URL) || DEFAULT_SUPABASE_URL).trim();
  const key = (localStorage.getItem(STORAGE_KEYS.SUPABASE_KEY) || DEFAULT_SUPABASE_KEY).trim();
  if (!url || !key) return null;
  if (_sbClient && url === _sbUrl && key === _sbKey) return _sbClient;
  
  try {
    const supabaseLib = window.supabase;
    if (!supabaseLib || !supabaseLib.createClient) {
      console.warn('Supabase SDK not loaded on window');
      return null;
    }
    _sbClient = supabaseLib.createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
    _sbUrl = url;
    _sbKey = key;
    return _sbClient;
  } catch (e) {
    console.error('Failed to init Supabase client:', e);
    return null;
  }
}

export async function sbTestConnection(url, key) {
  if (!url || !key) {
    return {
      ok: false,
      message: 'URL과 Anon Key를 입력해 주세요.'
    };
  }

  try {
    const supabaseLib = window.supabase;
    if (!supabaseLib || !supabaseLib.createClient) {
      return { ok: false, message: 'Supabase 라이브러리를 불러올 수 없습니다.' };
    }
    const client = supabaseLib.createClient(url.trim(), key.trim(), {
      auth: { persistSession: false }
    });
    const [resCust, resDoc, resSch] = await Promise.all([
      client.from('customers').select('id').limit(1),
      client.from('documents').select('id').limit(1),
      client.from('schedules').select('id').limit(1)
    ]);
    const err = resCust.error || resDoc.error || resSch.error;
    if (err) {
      if (err.code === '42P01' || (err.message && (err.message.includes('does not exist') || err.message.includes('schema cache')))) {
        return {
          ok: true,
          isTableMissing: true,
          message: '✓ Supabase 연결 성공! (일부 테이블 미생성 - SQL Editor에서 테이블을 생성해주세요)'
        };
      }
      return {
        ok: false,
        message: '연결 오류: ' + err.message
      };
    }
    return {
      ok: true,
      isTableMissing: false,
      message: '✓ Supabase 클라우드 DB 연결 및 전체 테이블 정상!'
    };
  } catch (e) {
    return {
      ok: false,
      message: '연결 실패: ' + e.message
    };
  }
}

export async function dbFetch(table, fallback = [], customOrderCol = null) {
  const sb = getSupabaseClient();
  const userRole = sessionStorage.getItem(STORAGE_KEYS.USER_ROLE) || 'supplier';
  const selectedSupplierKey = sessionStorage.getItem(STORAGE_KEYS.SELECTED_SUPPLIER) || localStorage.getItem(STORAGE_KEYS.SELECTED_SUPPLIER) || 'sejin';

  let orderCol = customOrderCol;
  if (!orderCol) {
    if (table === 'schedules') orderCol = 'start_date';
    else if (table === 'documents') orderCol = 'doc_date';
    else orderCol = 'code';
  }

  if (sb) {
    try {
      const { data, error } = await sb.from(table).select('*').order(orderCol, { ascending: true });
      if (!error && Array.isArray(data)) {
        let unpacked = data.map(unpackRow);
        setLocalItem('dd_' + table + '_list_v1', unpacked);
        
        if (userRole === 'supplier') {
          if (table === 'parts') {
            unpacked = unpacked.filter(item => !item.supplier_key || areSupplierKeysEquivalent(item.supplier_key, selectedSupplierKey));
          } else if (table === 'schedules') {
            unpacked = unpacked.filter(item => item.is_shared === true || !item.supplier_key || areSupplierKeysEquivalent(item.supplier_key, selectedSupplierKey));
          }
        }
        return unpacked;
      } else if (error) {
        console.warn(`[Supabase 조회 경고 (${table})]:`, error.message);
      }
    } catch (e) {
      console.error(`[Supabase 조회 오류 (${table})]:`, e);
    }
  }
  
  let list = getLocalItem('dd_' + table + '_list_v1', fallback).map(unpackRow);
  if (userRole === 'supplier') {
    if (table === 'parts') {
      list = list.filter(item => !item.supplier_key || areSupplierKeysEquivalent(item.supplier_key, selectedSupplierKey));
    } else if (table === 'schedules') {
      list = list.filter(item => item.is_shared === true || !item.supplier_key || areSupplierKeysEquivalent(item.supplier_key, selectedSupplierKey));
    }
  }
  return list;
}

export async function dbSave(table, rowData, isEdit = false, currentList = []) {
  const sb = getSupabaseClient();
  const userRole = sessionStorage.getItem(STORAGE_KEYS.USER_ROLE) || 'supplier';
  const selectedSupplierKey = sessionStorage.getItem(STORAGE_KEYS.SELECTED_SUPPLIER) || localStorage.getItem(STORAGE_KEYS.SELECTED_SUPPLIER) || 'sejin';
  
  if (userRole === 'supplier') {
    if (table === 'suppliers') {
      if (!areSupplierKeysEquivalent(rowData.id, selectedSupplierKey)) {
        alert('본인의 공급자 정보만 수정할 수 있습니다.');
        return currentList;
      }
    } else if (table === 'parts') {
      rowData.supplier_key = selectedSupplierKey;
      if (isEdit && rowData.id) {
        const found = currentList.find(r => r.id === rowData.id);
        if (found && found.supplier_key && !areSupplierKeysEquivalent(found.supplier_key, selectedSupplierKey)) {
          alert('해당 데이터를 수정할 권한이 없습니다.');
          return currentList;
        }
      }
    }
  }

  let serverRow = null;
  if (sb) {
    try {
      const packedData = packRow(rowData, table);
      const isRealUUID = isValidUUID(packedData.id);

      if (isEdit && isRealUUID) {
        const { id, created_at, ...payload } = packedData;
        const { data, error } = await sb.from(table).update(payload).eq('id', id).select().single();
        if (!error && data) {
          serverRow = unpackRow(data);
        } else if (error) {
          console.warn(`[Supabase 수정 경고 (${table})]:`, error.message || error);
        }
      } else {
        const { id, created_at, ...payload } = packedData;
        const { data, error } = await sb.from(table).insert(payload).select().single();
        if (!error && data) {
          serverRow = unpackRow(data);
        } else if (error) {
          console.warn(`[Supabase 등록 경고 (${table})]:`, error.message || error);
        }
      }
    } catch (e) {
      console.error('Supabase operation exception:', e);
    }
  }

  let updated;
  if (isEdit && rowData.id) {
    updated = currentList.map(r => r.id === rowData.id ? { ...r, ...(serverRow || rowData) } : r);
  } else {
    const fallbackId = isEdit && rowData.id ? rowData.id : (table + '_' + Date.now() + Math.random().toString(36).substring(2, 6));
    const saved = serverRow || { ...rowData, id: fallbackId };
    updated = [saved, ...currentList.filter(r => r.id !== saved.id)];
  }
  setLocalItem('dd_' + table + '_list_v1', updated);
  return updated;
}

export async function dbDelete(table, rowId, currentList = []) {
  const sb = getSupabaseClient();
  const userRole = sessionStorage.getItem(STORAGE_KEYS.USER_ROLE) || 'supplier';
  const selectedSupplierKey = sessionStorage.getItem(STORAGE_KEYS.SELECTED_SUPPLIER) || localStorage.getItem(STORAGE_KEYS.SELECTED_SUPPLIER) || 'sejin';
  
  if (userRole === 'supplier') {
    if (table === 'suppliers') {
      alert('공급자 정보는 삭제할 수 없습니다.');
      return currentList;
    } else if (table === 'parts') {
      const found = currentList.find(r => r.id === rowId);
      if (found && found.supplier_key && !areSupplierKeysEquivalent(found.supplier_key, selectedSupplierKey)) {
        alert('해당 데이터를 삭제할 권한이 없습니다.');
        return currentList;
      }
    }
  }

  if (sb && isValidUUID(rowId)) {
    try {
      const { error } = await sb.from(table).delete().eq('id', rowId);
      if (error) console.warn(`[Supabase 삭제 경고 (${table})]:`, error.message || error);
    } catch (e) {
      console.error(e);
    }
  }

  const updated = currentList.filter(r => r.id !== rowId);
  setLocalItem('dd_' + table + '_list_v1', updated);
  return updated;
}
