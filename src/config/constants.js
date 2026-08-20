// 🎨 TEAM D.D CONSTANTS CONFIGURATION
export const DEFAULT_SUPABASE_URL = 'https://wmrfwrsaacolkpjyrffy.supabase.co';
export const DEFAULT_SUPABASE_KEY = 'sb_publishable_nWgVPKLg5hHZqvCrOL9oUQ_GfuAGe9Y';

export const DOC_TYPES = ["거래명세서", "견적서", "청구서", "영수증", "발주서"];
export const PART_CATEGORIES = ["전체", "필터/오일", "유압부품", "전기부품", "엔진부품", "기타"];
export const PAYMENT_METHODS = ["계좌이체", "현금", "카드", "어음", "기타"];
export const PAYMENT_STATUSES = ["미수금", "부분입금", "입금완료"];

export const STORAGE_KEYS = {
  SUPABASE_URL: 'supabase_url',
  SUPABASE_KEY: 'supabase_anon_key',
  CUSTOMERS: 'dd_customers_list_v1',
  SUPPLIERS: 'dd_suppliers_list_v1',
  PARTS: 'dd_parts_list_v1',
  DOCUMENTS: 'dd_documents_history_v1',
  SCHEDULES: 'dd_schedules_list_v1',
  DRAFTS: 'dd_drafts_store_v1',
  SELECTED_SUPPLIER: 'selected_supplier_key',
  LOGGED_IN: 'dd_logged_in',
  USER_ROLE: 'dd_user_role'
};

export const SQL_ALL = `-- TEAM D.D 전체 스키마 (한번에 실행)
-- Supabase SQL Editor에 붙여넣기 후 Run(실행) 클릭

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  code text, name text not null,
  bizno text, person text, phone text, addr text, machine text, memo text,
  created_at timestamptz default now()
);
alter table customers disable row level security;

create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  code text, name text not null,
  bizno text, person text, phone text, fax text, addr text,
  email text, bank text, memo text,
  is_default boolean default false,
  created_at timestamptz default now()
);
alter table suppliers disable row level security;

create table if not exists parts (
  id uuid primary key default gen_random_uuid(),
  code text unique, name text not null,
  category text, unit text default 'EA',
  price integer default 0,
  stock integer default 0,
  min_stock integer default 5,
  location text, memo text,
  supplier_key text,
  created_at timestamptz default now()
);
alter table parts disable row level security;

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  doc_type text not null, doc_no text, doc_date text, doc_time text,
  customer_name text, customer_data jsonb,
  supplier_key text, supplier_data jsonb,
  items jsonb, vat integer default 0,
  vat_included boolean default true,
  paid integer default 0, remark text,
  is_shared boolean default false,
  created_at timestamptz default now()
);
alter table documents disable row level security;

create table if not exists schedules (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  start_date text not null,
  end_date text,
  schedule_time text,
  category text,
  customer_name text,
  phone text,
  machine text,
  amount integer default 0,
  memo text,
  is_shared boolean default false,
  supplier_key text,
  created_at timestamptz default now()
);
alter table schedules disable row level security;`;
