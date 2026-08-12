import { INITIAL_SUPPLIERS_LIST, DEMO_CUSTOMERS, DEMO_PARTS } from './defaults.js';

const STORAGE_KEYS = {
  SUPABASE_URL: 'supabase_url',
  SUPABASE_KEY: 'supabase_anon_key',
  DOC_TYPE: 'doc_type',
  SELECTED_SUPPLIER_KEY: 'selected_supplier_key',
  SUPPLIERS_CUSTOM: 'suppliers_data_v1',
  SUPPLIERS_LIST: 'dd_suppliers_list_v1',
  CUSTOMERS_LIST: 'dd_customers_list_v1',
  PARTS_LIST: 'dd_parts_list_v1',
  DOCUMENTS_LIST: 'dd_documents_history_v1'
};

export function getStoredCredentials() {
  return {
    url: localStorage.getItem(STORAGE_KEYS.SUPABASE_URL) || '',
    key: localStorage.getItem(STORAGE_KEYS.SUPABASE_KEY) || ''
  };
}

export function saveStoredCredentials(url, key) {
  localStorage.setItem(STORAGE_KEYS.SUPABASE_URL, url || '');
  localStorage.setItem(STORAGE_KEYS.SUPABASE_KEY, key || '');
}

export function getLocalItem(key, fallback = null) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch (e) {
    return fallback;
  }
}

export function setLocalItem(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('LocalStorage save error:', e);
  }
}

export function getHeaders(anonKey) {
  return {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
    'Content-Type': 'application/json'
  };
}

// Test Supabase REST connection
export async function testSupabaseConnection(url, anonKey) {
  if (!url || !anonKey) {
    return { ok: false, message: 'Supabase URL과 Anon Key가 입력되지 않았습니다.' };
  }

  // Check if running on file:// scheme
  if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
    return {
      ok: false,
      message: 'file:// 프로토콜에서는 브라우저 보안 정책(CORS)으로 인해 Supabase 연결이 차단됩니다. (http://localhost 또는 Netlify 배포 환경 추천)'
    };
  }

  try {
    const endpoint = `${url.replace(/\/$/, '')}/rest/v1/suppliers?select=id&limit=1`;
    const res = await fetch(endpoint, { headers: getHeaders(anonKey) });

    if (!res.ok) {
      const text = await res.text();
      if (text.includes('does not exist') || text.includes('PGRST205') || text.toLowerCase().includes('relation')) {
        return { ok: true, isTableMissing: true, message: '✓ Supabase 연결됨 (suppliers 테이블 미생성 - SQL 실행 필요)' };
      }
      return { ok: false, message: `연결 오류 (${res.status}): ${text.slice(0, 150)}` };
    }

    return { ok: true, isTableMissing: false, message: '✓ Supabase cloud 데이터베이스 연결 성공' };
  } catch (err) {
    return {
      ok: false,
      message: `연결 실패: ${err.message || '네트워크 오류 (로컬저장 모드로 작동합니다)'}`
    };
  }
}

// Customer Storage Adapter
export async function fetchCustomers(url, anonKey) {
  const localData = getLocalItem(STORAGE_KEYS.CUSTOMERS_LIST, null);
  
  if (!url || !anonKey || (typeof window !== 'undefined' && window.location.protocol === 'file:')) {
    if (localData && Array.isArray(localData)) return localData;
    setLocalItem(STORAGE_KEYS.CUSTOMERS_LIST, DEMO_CUSTOMERS);
    return DEMO_CUSTOMERS;
  }

  try {
    const endpoint = `${url.replace(/\/$/, '')}/rest/v1/customers?select=*&order=code.asc,name.asc`;
    const res = await fetch(endpoint, { headers: getHeaders(anonKey) });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      setLocalItem(STORAGE_KEYS.CUSTOMERS_LIST, data);
      return data;
    }
    return localData || DEMO_CUSTOMERS;
  } catch (err) {
    return localData || DEMO_CUSTOMERS;
  }
}

export async function saveCustomer(url, anonKey, customer, isEdit = false) {
  const localList = getLocalItem(STORAGE_KEYS.CUSTOMERS_LIST, DEMO_CUSTOMERS);
  let updatedList;

  if (isEdit && customer.id) {
    updatedList = localList.map(c => c.id === customer.id ? { ...c, ...customer } : c);
  } else {
    const newId = customer.id || `cust_${Date.now()}`;
    updatedList = [{ ...customer, id: newId }, ...localList];
  }
  setLocalItem(STORAGE_KEYS.CUSTOMERS_LIST, updatedList);

  if (url && anonKey && typeof window !== 'undefined' && window.location.protocol !== 'file:') {
    try {
      const isLocalId = String(customer.id).startsWith('cust_') || String(customer.id).startsWith('demo');
      if (isEdit && customer.id && !isLocalId) {
        await fetch(`${url.replace(/\/$/, '')}/rest/v1/customers?id=eq.${customer.id}`, {
          method: 'PATCH',
          headers: getHeaders(anonKey),
          body: JSON.stringify(customer)
        });
      } else {
        const { id, ...payload } = customer;
        await fetch(`${url.replace(/\/$/, '')}/rest/v1/customers`, {
          method: 'POST',
          headers: { ...getHeaders(anonKey), Prefer: 'return=representation' },
          body: JSON.stringify(payload)
        });
      }
    } catch (e) {
      console.warn('Supabase customer sync fallback to local:', e);
    }
  }

  return updatedList;
}

export async function deleteCustomer(url, anonKey, customerId) {
  const localList = getLocalItem(STORAGE_KEYS.CUSTOMERS_LIST, []);
  const updatedList = localList.filter(c => c.id !== customerId);
  setLocalItem(STORAGE_KEYS.CUSTOMERS_LIST, updatedList);

  if (url && anonKey && typeof window !== 'undefined' && window.location.protocol !== 'file:') {
    try {
      await fetch(`${url.replace(/\/$/, '')}/rest/v1/customers?id=eq.${customerId}`, {
        method: 'DELETE',
        headers: getHeaders(anonKey)
      });
    } catch (e) {
      console.warn('Supabase customer delete error:', e);
    }
  }

  return updatedList;
}

// SQL Schema code generators
export const SQL_SCHEMAS = {
  CUSTOMERS: `create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  code text,
  name text not null,
  bizno text,
  person text,
  phone text,
  addr text,
  memo text,
  created_at timestamptz default now()
);
alter table customers disable row level security;`,

  SUPPLIERS: `create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  code text,
  name text not null,
  bizno text,
  person text,
  phone text,
  addr text,
  email text,
  bank text,
  fax text,
  memo text,
  created_at timestamptz default now()
);
alter table suppliers disable row level security;`,

  PARTS: `create table if not exists parts (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  name text not null,
  category text,
  unit text default 'EA',
  price integer default 0,
  stock integer default 0,
  min_stock integer default 5,
  location text,
  memo text,
  created_at timestamptz default now()
);
alter table parts disable row level security;`,

  DOCUMENTS: `create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  doc_type text not null,
  doc_no text,
  doc_date text,
  doc_time text,
  customer_name text,
  supplier_key text,
  data jsonb,
  created_at timestamptz default now()
);
alter table documents disable row level security;`
};
