// 🎨 TEAM D.D CUSTOMER SERVICE
import { dbFetch, dbSave, dbDelete, getSupabaseClient } from '../api/supabaseClient.js';
import { setLocalItem } from '../api/storage.js';
import { packRow } from '../utils/validation.js';
import { DEMO_CUSTOMERS } from '../config/defaults.js';

export async function fetchCustomers() {
  const list = await dbFetch('customers', DEMO_CUSTOMERS, 'code');
  return deduplicateCustomers(list);
}

export async function saveCustomer(customerData, isEdit = false, currentList = []) {
  return dbSave('customers', customerData, isEdit, currentList);
}

export async function deleteCustomer(customerId, currentList = []) {
  return dbDelete('customers', customerId, currentList);
}

export async function deduplicateCustomers(custList) {
  if (!custList || custList.length === 0) return custList;
  
  const map = new Map();
  const duplicateIdsToDelete = [];

  custList.forEach(c => {
    if (!c || !c.name || !c.name.trim() || c.name.trim() === '미지정') return;
    const key = c.name.trim().toLowerCase();
    
    if (!map.has(key)) {
      map.set(key, { ...c });
    } else {
      const existing = map.get(key);
      if (c.id && c.id !== existing.id) {
        duplicateIdsToDelete.push(c.id);
      }
      if (!existing.phone && c.phone) existing.phone = c.phone;
      if (!existing.person && c.person) existing.person = c.person;
      if (!existing.addr && c.addr) existing.addr = c.addr;
      if (!existing.bizno && c.bizno) existing.bizno = c.bizno;
      if (!existing.machine && c.machine) existing.machine = c.machine;
    }
  });

  const cleaned = Array.from(map.values()).map((c, idx) => ({
    ...c,
    code: `C${String(idx + 1).padStart(4, '0')}`
  }));

  setLocalItem('dd_customers_list_v1', cleaned);

  if (duplicateIdsToDelete.length > 0) {
    const sb = getSupabaseClient();
    if (sb) {
      try {
        await sb.from('customers').delete().in('id', duplicateIdsToDelete);
        console.log(`Cleaned up ${duplicateIdsToDelete.length} duplicate customers from Supabase.`);
      } catch (e) {
        console.error('Failed to clean up duplicate customers from Supabase:', e);
      }
    }
  }

  return cleaned;
}

export async function syncCustomersFromDocuments(currentCusts, currentDocs) {
  if (!currentDocs || currentDocs.length === 0) return currentCusts || [];
  
  const custMap = new Map();
  (currentCusts || []).forEach(c => {
    if (c && c.name && c.name.trim() && c.name.trim() !== '미지정') {
      custMap.set(c.name.trim().toLowerCase(), { ...c });
    }
  });

  let hasNew = false;
  const newCustsToSave = [];

  currentDocs.forEach(doc => {
    if (!doc || doc.is_deleted) return;
    const rawName = (doc.customer_name || doc.customer_data?.name || '').trim();
    if (!rawName || rawName === '미지정') return;
    
    const key = rawName.toLowerCase();
    const docCust = doc.customer_data || {};
    
    if (!custMap.has(key)) {
      const newCustomer = {
        id: 'cust_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        code: `C${String(custMap.size + 1).padStart(4, '0')}`,
        name: rawName,
        person: docCust.person || docCust.repName || '',
        phone: docCust.phone || '',
        addr: docCust.addr || '',
        bizno: docCust.bizno || '',
        repName: docCust.repName || docCust.person || '',
        machine: docCust.machine || docCust.selectedMachine || '',
        memo: '과거 발행 문서에서 자동 등록됨'
      };
      custMap.set(key, newCustomer);
      newCustsToSave.push(newCustomer);
      hasNew = true;
    } else {
      const existing = custMap.get(key);
      let updated = false;
      if (!existing.phone && docCust.phone) { existing.phone = docCust.phone; updated = true; }
      if (!existing.person && docCust.person) { existing.person = docCust.person; updated = true; }
      if (!existing.addr && docCust.addr) { existing.addr = docCust.addr; updated = true; }
      if (!existing.bizno && docCust.bizno) { existing.bizno = docCust.bizno; updated = true; }
      if (updated) hasNew = true;
    }
  });

  let mergedList = Array.from(custMap.values());
  mergedList = await deduplicateCustomers(mergedList);

  if (hasNew && newCustsToSave.length > 0) {
    const sb = getSupabaseClient();
    if (sb) {
      try {
        for (const nc of newCustsToSave) {
          const packed = packRow(nc, 'customers');
          const { id, created_at, ...payload } = packed;
          await sb.from('customers').insert(payload);
        }
      } catch (e) { console.error('Auto-sync customers insert error:', e); }
    }
  }

  return mergedList;
}
