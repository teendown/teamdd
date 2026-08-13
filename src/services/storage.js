import { getAutoClient } from './supabase.js';
import { INITIAL_SUPPLIERS_LIST, DEMO_CUSTOMERS, DEMO_PARTS, DEMO_DOCUMENTS } from './defaults.js';

// ─── LocalStorage 유틸 ────────────────────────────────────────────────────────

const KEYS = {
  SUPABASE_URL: 'supabase_url',
  SUPABASE_KEY: 'supabase_anon_key',
  SUPPLIERS: 'dd_suppliers_list_v1',
  CUSTOMERS: 'dd_customers_list_v1',
  PARTS: 'dd_parts_list_v1',
  DOCUMENTS: 'dd_documents_history_v1',
  SUPPLIER_KEY: 'selected_supplier_key'
};

export function getLocalItem(key, fallback = null) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

export function setLocalItem(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('LocalStorage error:', e);
  }
}

export function getStoredCredentials() {
  return {
    url: localStorage.getItem(KEYS.SUPABASE_URL) || '',
    key: localStorage.getItem(KEYS.SUPABASE_KEY) || ''
  };
}

export function saveStoredCredentials(url, key) {
  localStorage.setItem(KEYS.SUPABASE_URL, url?.trim() || '');
  localStorage.setItem(KEYS.SUPABASE_KEY, key?.trim() || '');
}

// ─── Supabase 연결 테스트 (re-export) ─────────────────────────────────────────
export { testConnection as testSupabaseConnection } from './supabase.js';

// ─── CUSTOMERS ─────────────────────────────────────────────────────────────────

export async function fetchCustomers() {
  const sb = getAutoClient();
  if (sb) {
    try {
      const { data, error } = await sb.from('customers').select('*').order('code', { ascending: true });
      if (!error && Array.isArray(data)) {
        setLocalItem(KEYS.CUSTOMERS, data);
        return data;
      }
    } catch (e) {
      console.warn('Supabase fetch customers fallback:', e);
    }
  }
  return getLocalItem(KEYS.CUSTOMERS, DEMO_CUSTOMERS);
}

export async function saveCustomer(customerData, isEdit = false) {
  const sb = getAutoClient();
  let result;

  if (sb) {
    try {
      if (isEdit && customerData.id) {
        const { id, created_at, ...payload } = customerData;
        const { data, error } = await sb.from('customers').update(payload).eq('id', id).select().single();
        if (!error) result = data;
      } else {
        const { id, ...payload } = customerData;
        const { data, error } = await sb.from('customers').insert(payload).select().single();
        if (!error) result = data;
      }
    } catch (e) {
      console.warn('Supabase save customer fallback:', e);
    }
  }

  // 로컬 동기화
  const local = getLocalItem(KEYS.CUSTOMERS, []);
  let updated;
  if (isEdit && customerData.id) {
    updated = local.map(c => c.id === customerData.id ? { ...c, ...(result || customerData) } : c);
  } else {
    const saved = result || { ...customerData, id: `cust_${Date.now()}` };
    updated = [saved, ...local.filter(c => c.id !== saved.id)];
  }
  setLocalItem(KEYS.CUSTOMERS, updated);
  return updated;
}

export async function deleteCustomer(customerId) {
  const sb = getAutoClient();
  if (sb) {
    try {
      await sb.from('customers').delete().eq('id', customerId);
    } catch (e) {
      console.warn('Supabase delete customer fallback:', e);
    }
  }
  const updated = getLocalItem(KEYS.CUSTOMERS, []).filter(c => c.id !== customerId);
  setLocalItem(KEYS.CUSTOMERS, updated);
  return updated;
}

// ─── SUPPLIERS ─────────────────────────────────────────────────────────────────

export async function fetchSuppliers() {
  const sb = getAutoClient();
  if (sb) {
    try {
      const { data, error } = await sb.from('suppliers').select('*').order('code', { ascending: true });
      if (!error && Array.isArray(data) && data.length > 0) {
        setLocalItem(KEYS.SUPPLIERS, data);
        return data;
      }
    } catch (e) {
      console.warn('Supabase fetch suppliers fallback:', e);
    }
  }
  return getLocalItem(KEYS.SUPPLIERS, INITIAL_SUPPLIERS_LIST);
}

export async function saveSupplier(supplierData, isEdit = false) {
  const sb = getAutoClient();
  let result;

  if (sb) {
    try {
      if (isEdit && supplierData.id) {
        const { id, created_at, ...payload } = supplierData;
        const { data, error } = await sb.from('suppliers').update(payload).eq('id', id).select().single();
        if (!error) result = data;
      } else {
        const { id, ...payload } = supplierData;
        const { data, error } = await sb.from('suppliers').insert(payload).select().single();
        if (!error) result = data;
      }
    } catch (e) {
      console.warn('Supabase save supplier fallback:', e);
    }
  }

  const local = getLocalItem(KEYS.SUPPLIERS, []);
  let updated;
  if (isEdit && supplierData.id) {
    updated = local.map(s => s.id === supplierData.id ? { ...s, ...(result || supplierData) } : s);
  } else {
    const saved = result || { ...supplierData, id: `supp_${Date.now()}` };
    updated = [saved, ...local.filter(s => s.id !== saved.id)];
  }
  setLocalItem(KEYS.SUPPLIERS, updated);
  return updated;
}

export async function deleteSupplier(supplierId) {
  const sb = getAutoClient();
  if (sb) {
    try {
      await sb.from('suppliers').delete().eq('id', supplierId);
    } catch (e) {
      console.warn('Supabase delete supplier fallback:', e);
    }
  }
  const updated = getLocalItem(KEYS.SUPPLIERS, []).filter(s => s.id !== supplierId);
  setLocalItem(KEYS.SUPPLIERS, updated);
  return updated;
}

// ─── PARTS ─────────────────────────────────────────────────────────────────────

export async function fetchParts() {
  const sb = getAutoClient();
  if (sb) {
    try {
      const { data, error } = await sb.from('parts').select('*').order('code', { ascending: true });
      if (!error && Array.isArray(data) && data.length > 0) {
        setLocalItem(KEYS.PARTS, data);
        return data;
      }
    } catch (e) {
      console.warn('Supabase fetch parts fallback:', e);
    }
  }
  return getLocalItem(KEYS.PARTS, DEMO_PARTS);
}

export async function savePart(partData, isEdit = false) {
  const sb = getAutoClient();
  let result;

  if (sb) {
    try {
      if (isEdit && partData.id) {
        const { id, created_at, ...payload } = partData;
        const { data, error } = await sb.from('parts').update(payload).eq('id', id).select().single();
        if (!error) result = data;
      } else {
        const { id, ...payload } = partData;
        const { data, error } = await sb.from('parts').insert(payload).select().single();
        if (!error) result = data;
      }
    } catch (e) {
      console.warn('Supabase save part fallback:', e);
    }
  }

  const local = getLocalItem(KEYS.PARTS, []);
  let updated;
  if (isEdit && partData.id) {
    updated = local.map(p => p.id === partData.id ? { ...p, ...(result || partData) } : p);
  } else {
    const saved = result || { ...partData, id: `part_${Date.now()}` };
    updated = [saved, ...local.filter(p => p.id !== saved.id)];
  }
  setLocalItem(KEYS.PARTS, updated);
  return updated;
}

export async function deletePart(partId) {
  const sb = getAutoClient();
  if (sb) {
    try {
      await sb.from('parts').delete().eq('id', partId);
    } catch (e) {
      console.warn('Supabase delete part fallback:', e);
    }
  }
  const updated = getLocalItem(KEYS.PARTS, []).filter(p => p.id !== partId);
  setLocalItem(KEYS.PARTS, updated);
  return updated;
}

// ─── DOCUMENTS ─────────────────────────────────────────────────────────────────

export async function fetchDocuments(limit = 100) {
  const sb = getAutoClient();
  if (sb) {
    try {
      const { data, error } = await sb
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (!error && Array.isArray(data) && data.length > 0) {
        setLocalItem(KEYS.DOCUMENTS, data);
        return data;
      }
    } catch (e) {
      console.warn('Supabase fetch documents fallback:', e);
    }
  }
  return getLocalItem(KEYS.DOCUMENTS, DEMO_DOCUMENTS);
}

export async function saveDocument(docData) {
  const sb = getAutoClient();
  const payload = {
    doc_type: docData.docType,
    doc_no: docData.docNo,
    doc_date: docData.docDate,
    doc_time: docData.docTime,
    customer_name: docData.customer?.name || '',
    customer_data: docData.customer || {},
    supplier_key: docData.supplierKey || '',
    supplier_data: docData.supplier || {},
    items: docData.items || [],
    vat: docData.vat || 0,
    vat_included: docData.vatIncluded !== false,
    paid: docData.paid || 0,
    remark: docData.remark || ''
  };

  let savedId = `doc_${Date.now()}`;
  if (sb) {
    try {
      const { data, error } = await sb.from('documents').insert(payload).select('id').single();
      if (!error && data?.id) savedId = data.id;
    } catch (e) {
      console.warn('Supabase save document fallback:', e);
    }
  }

  const local = getLocalItem(KEYS.DOCUMENTS, DEMO_DOCUMENTS);
  const newDoc = { ...payload, id: savedId, created_at: new Date().toISOString() };
  const updated = [newDoc, ...local];
  setLocalItem(KEYS.DOCUMENTS, updated);
  return updated;
}

export async function updateDocumentPaid(docId, paidAmount, remark) {
  const sb = getAutoClient();
  const paidNum = Number(paidAmount) || 0;
  
  if (sb) {
    try {
      const updateData = { paid: paidNum };
      if (remark !== undefined) updateData.remark = remark;
      await sb.from('documents').update(updateData).eq('id', docId);
    } catch (e) {
      console.warn('Supabase update document paid fallback:', e);
    }
  }

  const local = getLocalItem(KEYS.DOCUMENTS, DEMO_DOCUMENTS);
  const updated = local.map(d => {
    if (d.id === docId) {
      return { ...d, paid: paidNum, ...(remark !== undefined ? { remark } : {}) };
    }
    return d;
  });
  setLocalItem(KEYS.DOCUMENTS, updated);
  return updated;
}

export async function deleteDocument(docId) {
  const sb = getAutoClient();
  if (sb) {
    try {
      await sb.from('documents').delete().eq('id', docId);
    } catch (e) {
      console.warn('Supabase delete document fallback:', e);
    }
  }
  const local = getLocalItem(KEYS.DOCUMENTS, DEMO_DOCUMENTS);
  const updated = local.filter(d => d.id !== docId);
  setLocalItem(KEYS.DOCUMENTS, updated);
  return updated;
}

// ─── SQL 스키마 (앱에서 복사해 Supabase SQL Editor에 붙여넣기) ────────────────

export const SQL_SCHEMAS = {
  ALL: `-- TEAM D.D 전체 스키마 (한번에 실행)
-- Supabase SQL Editor에 붙여넣고 Run을 누르세요

create table if not exists customers (
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
alter table customers disable row level security;

create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  code text,
  name text not null,
  bizno text,
  person text,
  phone text,
  fax text,
  addr text,
  email text,
  bank text,
  memo text,
  is_default boolean default false,
  created_at timestamptz default now()
);
alter table suppliers disable row level security;

create table if not exists parts (
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
alter table parts disable row level security;

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  doc_type text not null,
  doc_no text,
  doc_date text,
  doc_time text,
  customer_name text,
  customer_data jsonb,
  supplier_key text,
  supplier_data jsonb,
  items jsonb,
  vat integer default 0,
  vat_included boolean default true,
  paid integer default 0,
  remark text,
  created_at timestamptz default now()
);
alter table documents disable row level security;`,

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
  fax text,
  addr text,
  email text,
  bank text,
  memo text,
  is_default boolean default false,
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
  customer_data jsonb,
  supplier_key text,
  supplier_data jsonb,
  items jsonb,
  vat integer default 0,
  vat_included boolean default true,
  paid integer default 0,
  remark text,
  created_at timestamptz default now()
);
alter table documents disable row level security;`
};
