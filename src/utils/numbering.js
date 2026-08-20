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
  
  const dateGroups = new Map();
  docList.forEach(doc => {
    const rawDate = doc.doc_date || (doc.created_at ? doc.created_at.split('T')[0] : '') || new Date().toISOString().split('T')[0];
    const d = new Date(rawDate);
    const dateKey = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    if (!dateGroups.has(dateKey)) dateGroups.set(dateKey, []);
    dateGroups.get(dateKey).push(doc);
  });

  let hasChange = false;
  const updatedList = [];

  dateGroups.forEach((docs, dateKey) => {
    docs.sort((a, b) => {
      const timeA = (a.doc_date || '') + ' ' + (a.doc_time || a.created_at || '');
      const timeB = (b.doc_date || '') + ' ' + (b.doc_time || b.created_at || '');
      return timeA.localeCompare(timeB);
    });

    const usedSeqs = new Set();
    docs.forEach((doc) => {
      let currentSeq = null;
      if (doc.doc_no && doc.doc_no.startsWith(dateKey)) {
        const parts = doc.doc_no.split('-');
        if (parts.length >= 2) {
          const num = parseInt(parts[1], 10);
          if (!isNaN(num) && !usedSeqs.has(num)) {
            currentSeq = num;
          }
        }
      }
      
      if (currentSeq === null) {
        let nextSeq = 1;
        while (usedSeqs.has(nextSeq)) nextSeq++;
        currentSeq = nextSeq;
        hasChange = true;
      }
      
      usedSeqs.add(currentSeq);
      const uniqueDocNo = `${dateKey}-${String(currentSeq).padStart(3, '0')}`;
      if (doc.doc_no !== uniqueDocNo) {
        doc.doc_no = uniqueDocNo;
        hasChange = true;
      }
      updatedList.push(doc);
    });
  });

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
