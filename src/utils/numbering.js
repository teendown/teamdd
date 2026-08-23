// 🎨 TEAM D.D DOCUMENT NUMBERING UTILITIES
import { areSupplierKeysEquivalent } from './validation.js';
import { getSupabaseClient } from '../api/supabaseClient.js';
import { setLocalItem } from '../api/storage.js';

export function getDocTypeNumericCode(docType) {
  if (!docType) return '01';
  const cleanType = String(docType).trim();
  if (cleanType === '거래명세서' || cleanType.includes('명세')) return '01';
  if (cleanType === '견적서' || cleanType.includes('견적')) return '02';
  if (cleanType === '청구서' || cleanType.includes('청구')) return '03';
  return '01';
}

export function getSupplierNumericCode(supplierKey, suppliersList = []) {
  if (!supplierKey) return '01';
  const cleanKey = String(supplierKey).toLowerCase().trim();
  if (cleanKey === 'sejin' || cleanKey.includes('세진')) return '01';
  if (cleanKey === 'ds' || cleanKey.includes('디에스')) return '02';
  if (cleanKey === 'daeseong' || cleanKey.includes('대성')) return '03';
  
  const idx = (suppliersList || []).findIndex(s => areSupplierKeysEquivalent(s.id, supplierKey) || s.code === supplierKey);
  if (idx >= 0) return String(idx + 1).padStart(2, '0');
  return '01';
}

export function getCustomerNumericCode(customer, customersList = []) {
  if (!customer) return '0000';
  let rawCode = customer.code || '';
  if (!rawCode && customer.name && Array.isArray(customersList)) {
    const found = customersList.find(c => c.name === customer.name || c.id === customer.id);
    if (found) rawCode = found.code || '';
  }
  const numsOnly = String(rawCode).replace(/[^0-9]/g, '');
  if (numsOnly) return numsOnly.slice(-4).padStart(4, '0');
  
  if (customer.id) {
    const idNums = String(customer.id).replace(/[^0-9]/g, '');
    if (idNums) return idNums.slice(-4).padStart(4, '0');
  }
  return '0000';
}

export function generateNextDocNo(
  targetDate,
  docList = [],
  supplierKey = 'sejin',
  customer = null,
  docType = '거래명세서',
  suppliersList = [],
  customersList = []
) {
  const d = targetDate ? new Date(targetDate) : new Date();
  const dateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const typeCode = getDocTypeNumericCode(docType);
  const dateTypeBlock = `${dateStr}${typeCode}`;
  const suppCode = getSupplierNumericCode(supplierKey, suppliersList);
  const custCode = getCustomerNumericCode(customer, customersList);

  let maxSeq = 0;
  const prefixMain = `${dateTypeBlock}-${suppCode}-`;
  const prefix5Part = `${dateStr}-${typeCode}-${suppCode}-`;
  const prefix4Part = `${dateStr}-${suppCode}-`;

  (docList || []).forEach(doc => {
    if (!doc || !doc.doc_no || doc.is_deleted) return;
    const cleanNo = String(doc.doc_no).trim();
    const docItemType = doc.doc_type || doc.docType || '거래명세서';

    if (cleanNo.startsWith(prefixMain)) {
      const parts = cleanNo.split('-');
      if (parts.length >= 4) {
        const seq = parseInt(parts[3], 10);
        if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
      }
    } else if (cleanNo.startsWith(prefix5Part)) {
      const parts = cleanNo.split('-');
      if (parts.length >= 5) {
        const seq = parseInt(parts[4], 10);
        if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
      }
    } else if (docItemType === docType) {
      if (cleanNo.startsWith(prefix4Part)) {
        const parts = cleanNo.split('-');
        if (parts.length >= 4) {
          const seq = parseInt(parts[3], 10);
          if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
        }
      } else if (cleanNo.startsWith(dateStr)) {
        const parts = cleanNo.split('-');
        if (parts.length === 2) {
          const seq = parseInt(parts[1], 10);
          if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
        }
      }
    }
  });

  const nextSeq = String(maxSeq + 1).padStart(2, '0');
  return `${dateTypeBlock}-${suppCode}-${custCode}-${nextSeq}`;
}

export async function deduplicateAndResequenceDocNumbers(docList = []) {
  if (!docList || docList.length === 0) return docList;

  const seenNos = new Set();
  let hasChange = false;
  const updatedList = [];

  for (const doc of docList) {
    if (!doc) continue;
    let docNo = (doc.doc_no || doc.docNo || '').trim();
    if (!docNo || seenNos.has(docNo)) {
      const rawDate = doc.doc_date || doc.docDate || (doc.created_at ? doc.created_at.split('T')[0] : '') || new Date().toISOString().split('T')[0];
      docNo = generateNextDocNo(rawDate, updatedList, doc.supplier_key || 'sejin', doc.customer_data || { name: doc.customer_name }, doc.doc_type || '거래명세서');
      doc.doc_no = docNo;
      hasChange = true;
    }
    seenNos.add(docNo);
    updatedList.push(doc);
  }

  if (hasChange) {
    setLocalItem('dd_documents_history_v1', updatedList);
    const sb = getSupabaseClient();
    if (sb) {
      try {
        for (const d of updatedList) {
          if (d.id && !String(d.id).startsWith('doc_')) {
            await sb.from('documents').update({ doc_no: d.doc_no }).eq('id', d.id);
          }
        }
      } catch (e) { console.error('Error syncing resequenced doc numbers:', e); }
    }
  }

  return updatedList;
}
