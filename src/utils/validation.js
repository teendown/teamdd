// 🎨 TEAM D.D VALIDATION & ROW PACKING UTILITIES

export function isValidUUID(str) {
  return typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

export function areSupplierKeysEquivalent(key1, key2) {
  if (key1 === key2) return true;
  const k1 = (key1 || '').toLowerCase();
  const k2 = (key2 || '').toLowerCase();
  if ((k1 === 'sejin' || k1 === 's0001' || k1.includes('세진')) && 
      (k2 === 'sejin' || k2 === 's0001' || k2.includes('세진'))) return true;
  if ((k1 === 'ds_gimje' || k1 === 's0002' || k1.includes('디에스')) && 
      (k2 === 'ds_gimje' || k2 === 's0002' || k2.includes('디에스'))) return true;
  return false;
}

export function packRow(r, table) {
  if (table !== 'customers' && table !== 'suppliers' && table !== 'documents' && table !== 'schedules' && table !== 'parts') return { ...r };
  let standardCols = [];
  const payload = { ...r };

  if (table === 'customers') {
    standardCols = ['id', 'created_at', 'code', 'name', 'bizno', 'person', 'phone', 'addr', 'machine', 'memo'];
  } else if (table === 'suppliers') {
    standardCols = ['id', 'created_at', 'code', 'name', 'bizno', 'person', 'phone', 'tel', 'bank', 'addr', 'memo', 'is_default'];
  } else if (table === 'documents') {
    standardCols = ['id', 'created_at', 'doc_type', 'doc_no', 'doc_date', 'doc_time', 'customer_name', 'customer_data', 'supplier_key', 'supplier_data', 'items', 'vat', 'vat_included', 'paid', 'remark', 'is_shared'];
  } else if (table === 'schedules') {
    standardCols = ['id', 'created_at', 'title', 'start_date', 'end_date', 'schedule_time', 'category', 'customer_name', 'phone', 'machine', 'amount', 'memo', 'is_shared', 'supplier_key'];
    if (!payload.start_date && payload.event_date) payload.start_date = payload.event_date;
    if (!payload.end_date && (payload.event_date || payload.start_date)) payload.end_date = payload.start_date || payload.event_date;
    if (!payload.schedule_time && payload.event_time) payload.schedule_time = payload.event_time;
    if (!payload.phone && payload.customer_phone) payload.phone = payload.customer_phone;
    if (!payload.machine && payload.machine_info) payload.machine = payload.machine_info;
  } else if (table === 'parts') {
    standardCols = ['id', 'created_at', 'code', 'name', 'category', 'unit', 'price', 'stock', 'min_stock', 'location', 'memo', 'supplier_key'];
  }

  const extra = {};
  for (const k of Object.keys(payload)) {
    if (!standardCols.includes(k) && k !== 'extra_data') {
      extra[k] = payload[k];
      delete payload[k];
    }
  }
  if (Object.keys(extra).length > 0) {
    payload.extra_data = { ...(payload.extra_data || {}), ...extra };
  }
  return payload;
}

export function unpackRow(r) {
  if (!r) return r;
  const extra = r.extra_data;
  if (extra && typeof extra === 'object') {
    const { extra_data, ...rest } = r;
    return { ...extra, ...rest };
  }
  return r;
}
