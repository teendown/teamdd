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

export function normalizePartners(doc) {
  if (!doc) return [];
  if (doc.partners && Array.isArray(doc.partners) && doc.partners.length > 0) {
    return doc.partners.map(p => ({
      id: p.id || p.key || p.supplier_key,
      key: p.key || p.id || p.supplier_key,
      name: p.name || p.company || p.key || '협력사',
      amount: Number(p.amount) || Number(p.settlement_amount) || 0,
      status: p.status || p.settlement_status || '정산대기',
      memo: p.memo || p.settlement_memo || '',
      settled_at: p.settled_at || null
    }));
  }
  if (doc.partner_key || doc.partnerKey) {
    const k = doc.partner_key || doc.partnerKey;
    return [{
      id: k,
      key: k,
      name: doc.partner_name || doc.partnerName || k,
      amount: Number(doc.settlement_amount || doc.settlementAmount) || 0,
      status: doc.settlement_status || doc.settlementStatus || '정산대기',
      memo: doc.settlement_memo || doc.settlementMemo || '',
      settled_at: doc.settled_at || doc.settledAt || null
    }];
  }
  return [];
}

export function isPartnerInDoc(doc, targetSupplierKey) {
  if (!doc || !targetSupplierKey) return false;
  if (areSupplierKeysEquivalent(doc.partner_key, targetSupplierKey)) return true;
  const partners = normalizePartners(doc);
  return partners.some(p => areSupplierKeysEquivalent(p.key, targetSupplierKey));
}

export function packRow(r, table) {
  if (table !== 'customers' && table !== 'suppliers' && table !== 'documents' && table !== 'schedules' && table !== 'parts') return { ...r };
  let standardCols = [];
  const payload = { ...r };

  if (table === 'customers') {
    standardCols = ['id', 'created_at', 'code', 'name', 'bizno', 'person', 'phone', 'addr', 'machine', 'memo'];
  } else if (table === 'suppliers') {
    standardCols = ['id', 'created_at', 'code', 'name', 'bizno', 'person', 'phone', 'tel', 'fax', 'email', 'bank', 'addr', 'memo', 'is_default'];
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
    if (table === 'documents') {
      const cleanRemark = (payload.remark || '').split('---EXT---')[0].trim();
      payload.remark = cleanRemark ? `${cleanRemark}\n---EXT---\n${JSON.stringify(extra)}` : `\n---EXT---\n${JSON.stringify(extra)}`;
    } else {
      const cleanMemo = (payload.memo || '').split('---EXT---')[0].trim();
      payload.memo = cleanMemo ? `${cleanMemo}\n---EXT---\n${JSON.stringify(extra)}` : `\n---EXT---\n${JSON.stringify(extra)}`;
    }
  }
  return payload;
}

export function unpackRow(r) {
  if (!r) return r;
  const res = { ...r };

  if (res.memo && typeof res.memo === 'string' && res.memo.includes('---EXT---')) {
    const parts = res.memo.split('---EXT---');
    res.memo = parts[0].trim();
    if (parts[1]) {
      try {
        const ext = JSON.parse(parts[1].trim());
        Object.assign(res, ext);
      } catch (e) {}
    }
  }

  if (res.remark && typeof res.remark === 'string' && res.remark.includes('---EXT---')) {
    const parts = res.remark.split('---EXT---');
    res.remark = parts[0].trim();
    if (parts[1]) {
      try {
        const ext = JSON.parse(parts[1].trim());
        Object.assign(res, ext);
      } catch (e) {}
    }
  }

  if (res.extra_data && typeof res.extra_data === 'object') {
    Object.assign(res, res.extra_data);
    delete res.extra_data;
  }

  if (res.start_date && !res.event_date) res.event_date = res.start_date;
  if (res.schedule_time && !res.event_time) res.event_time = res.schedule_time;
  if (res.phone && !res.customer_phone) res.customer_phone = res.phone;
  if (res.machine && !res.machine_info) res.machine_info = res.machine;

  return res;
}
