// 🎨 TEAM D.D DOCUMENT SERVICE
import { getSupabaseClient } from '../api/supabaseClient.js';
import { getLocalItem, setLocalItem } from '../api/storage.js';
import { STORAGE_KEYS } from '../config/constants.js';
import { DEMO_DOCUMENTS } from '../config/defaults.js';
import { packRow, unpackRow, areSupplierKeysEquivalent, normalizePartners, isPartnerInDoc } from '../utils/validation.js';
import { generateNextDocNo, deduplicateAndResequenceDocNumbers } from '../utils/numbering.js';

export async function saveDocument(docData) {
  const sb = getSupabaseClient();
  const userRole = sessionStorage.getItem(STORAGE_KEYS.USER_ROLE) || 'supplier';
  const selectedSupplierKey = sessionStorage.getItem(STORAGE_KEYS.SELECTED_SUPPLIER) || localStorage.getItem(STORAGE_KEYS.SELECTED_SUPPLIER) || 'sejin';
  const local = getLocalItem(STORAGE_KEYS.DOCUMENTS, []);

  if (docData.id) {
    const found = local.find(d => d.id === docData.id);
    if (found) {
      if (userRole === 'supplier' && found.supplier_key && !areSupplierKeysEquivalent(found.supplier_key, selectedSupplierKey) && !(found.is_shared && isPartnerInDoc(found, selectedSupplierKey))) {
        alert('해당 문서를 수정할 권한이 없습니다.');
        return local;
      }
      if (!docData.supplierKey && found.supplier_key) {
        docData.supplierKey = found.supplier_key;
        docData.supplier = found.supplier_data || docData.supplier;
      }
    }
  }
  if (!docData.supplierKey) {
    docData.supplierKey = selectedSupplierKey;
  }

  let finalDocNo = (docData.docNo || '').trim();
  const isEditing = !!docData.id;

  if (!isEditing) {
    const isDuplicate = local.some(d => d.doc_no === finalDocNo && !d.is_deleted);
    if (!finalDocNo || isDuplicate) {
      finalDocNo = generateNextDocNo(docData.docDate, local, docData.supplierKey || selectedSupplierKey, docData.customer, docData.docType);
    }
  }

  const docId = docData.id || 'doc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  
  let currentRevision = 0;
  if (isEditing) {
    const prevDoc = local.find(d => d.id === docId);
    if (prevDoc) currentRevision = (prevDoc.revision || 0) + 1;
  }

  const rawPayload = {
    doc_type: docData.docType,
    doc_no: finalDocNo,
    doc_date: docData.docDate,
    doc_time: docData.docTime,
    customer_name: (docData.customer == null ? undefined : docData.customer.name) || '',
    customer_data: docData.customer || {},
    supplier_key: docData.supplierKey || '',
    supplier_data: docData.supplier || {},
    items: docData.items || [],
    vat: docData.vat || 0,
    vat_included: docData.vatIncluded !== false,
    paid: docData.paid || 0,
    remark: (docData.remark || '').split('---EXT---')[0].trim(),
    paymentStatus: docData.paymentStatus,
    paymentMethod: docData.paymentMethod,
    paymentDate: docData.paymentDate,
    validityPeriod: docData.validityPeriod,
    deliveryDate: docData.deliveryDate,
    deliveryLocation: docData.deliveryLocation,
    paymentTerms: docData.paymentTerms,
    bankAccount: docData.bankAccount,
    dueDate: docData.dueDate,
    receiverName: docData.receiverName,
    receiveDate: docData.receiveDate,
    is_shared: !!(docData.is_shared || docData.isDocShared || (docData.partners && docData.partners.length > 0)),
    partner_key: docData.partner_key || (docData.partners && docData.partners[0]?.key) || docData.partnerKey || '',
    partner_name: docData.partner_name || (docData.partners && docData.partners[0]?.name) || docData.partnerName || '',
    settlement_amount: Number(docData.settlement_amount) || (docData.partners && Number(docData.partners[0]?.amount)) || Number(docData.settlementAmount) || 0,
    settlement_status: docData.settlement_status || (docData.partners && docData.partners[0]?.status) || docData.settlementStatus || '정산대기',
    settlement_memo: docData.settlement_memo || (docData.partners && docData.partners[0]?.memo) || docData.settlementMemo || '',
    settled_at: docData.settled_at || (docData.partners && docData.partners[0]?.settled_at) || docData.settledAt || null,
    partners: (docData.partners && Array.isArray(docData.partners) && docData.partners.length > 0)
      ? docData.partners.map(p => ({
          id: p.id || p.key,
          key: p.key || p.id,
          name: p.name || p.company || p.key || '협력사',
          amount: Number(p.amount) || Number(p.settlement_amount) || 0,
          status: p.status || p.settlement_status || '정산대기',
          memo: p.memo || p.settlement_memo || '',
          settled_at: p.settled_at || null
        }))
      : (docData.partner_key || docData.partnerKey ? [{
          id: docData.partner_key || docData.partnerKey,
          key: docData.partner_key || docData.partnerKey,
          name: docData.partner_name || docData.partnerName || '협력사',
          amount: Number(docData.settlement_amount || docData.settlementAmount) || 0,
          status: docData.settlement_status || docData.settlementStatus || '정산대기',
          memo: docData.settlement_memo || docData.settlementMemo || '',
          settled_at: docData.settled_at || docData.settledAt || null
        }] : []),
    revision: currentRevision,
    is_deleted: false,
    deleted_at: null
  };
  
  const payload = packRow(rawPayload, 'documents');
  if (sb) {
    try {
      if (docData.id && !String(docData.id).startsWith('doc_')) {
        const { error } = await sb.from('documents').update(payload).eq('id', docData.id);
        if (error) console.error('Supabase update error:', error);
      } else {
        const { error } = await sb.from('documents').insert(payload);
        if (error) console.error('Supabase insert error:', error);
      }
    } catch (e) {
      console.error(e);
    }
  }

  const existingIdx = local.findIndex(d => d.id === docId);
  let updated;
  const localPayload = unpackRow(payload);
  if (existingIdx >= 0) {
    updated = [...local];
    updated[existingIdx] = {
      ...localPayload,
      id: local[existingIdx].id,
      updated_at: new Date().toISOString()
    };
  } else {
    updated = [{
      ...localPayload,
      id: docId,
      created_at: new Date().toISOString()
    }, ...local];
  }
  setLocalItem(STORAGE_KEYS.DOCUMENTS, updated);
  return { list: updated, docNo: finalDocNo };
}

export async function fetchDocuments() {
  const sb = getSupabaseClient();
  const userRole = sessionStorage.getItem(STORAGE_KEYS.USER_ROLE) || 'supplier';
  const selectedSupplierKey = sessionStorage.getItem(STORAGE_KEYS.SELECTED_SUPPLIER) || localStorage.getItem(STORAGE_KEYS.SELECTED_SUPPLIER) || 'sejin';
  
  let list = [];
  if (sb) {
    try {
      const { data, error } = await sb.from('documents').select('*').order('created_at', { ascending: false });
      if (!error && data && data.length > 0) {
        list = data.map(unpackRow);
        setLocalItem(STORAGE_KEYS.DOCUMENTS, list);
      }
    } catch (e) {
      console.error(e);
    }
  }
  if (list.length === 0) {
    list = getLocalItem(STORAGE_KEYS.DOCUMENTS, DEMO_DOCUMENTS).map(unpackRow);
  }
  
  if (userRole === 'supplier') {
    list = list.filter(d => areSupplierKeysEquivalent(d.supplier_key, selectedSupplierKey) || (d.is_shared && isPartnerInDoc(d, selectedSupplierKey)));
  }

  list = await deduplicateAndResequenceDocNumbers(list);
  return list;
}

export async function deleteDocument(docId) {
  const sb = getSupabaseClient();
  const userRole = sessionStorage.getItem(STORAGE_KEYS.USER_ROLE) || 'supplier';
  const selectedSupplierKey = sessionStorage.getItem(STORAGE_KEYS.SELECTED_SUPPLIER) || localStorage.getItem(STORAGE_KEYS.SELECTED_SUPPLIER) || 'sejin';
  const local = getLocalItem(STORAGE_KEYS.DOCUMENTS, DEMO_DOCUMENTS);
  
  const found = local.find(d => String(d.id) === String(docId) || d.doc_no === docId);
  if (userRole === 'supplier' && found && found.supplier_key) {
    if (!areSupplierKeysEquivalent(found.supplier_key, selectedSupplierKey) && !(found.is_shared && isPartnerInDoc(found, selectedSupplierKey))) {
      alert('해당 문서를 삭제할 권한이 없습니다.');
      return local.filter(d => areSupplierKeysEquivalent(d.supplier_key, selectedSupplierKey) || (d.is_shared && isPartnerInDoc(d, selectedSupplierKey)));
    }
  }

  const deletedAt = new Date().toISOString();

  if (sb && found && found.id && !String(found.id).startsWith('doc_')) {
    try {
      const updatedFound = { ...found, is_deleted: true, deleted_at: deletedAt };
      const packed = packRow(updatedFound, 'documents');
      const { error } = await sb.from('documents').update({ remark: packed.remark }).eq('id', found.id);
      if (error) console.error('Supabase soft delete error:', error);
    } catch (e) {
      console.error('Error updating soft delete in Supabase:', e);
    }
  }

  const updated = local.map(d => {
    if (String(d.id) === String(docId) || d.doc_no === docId) {
      return { ...d, is_deleted: true, deleted_at: deletedAt };
    }
    return d;
  });
  setLocalItem(STORAGE_KEYS.DOCUMENTS, updated);

  if (userRole === 'supplier') {
    return updated.filter(d => areSupplierKeysEquivalent(d.supplier_key, selectedSupplierKey) || (d.is_shared && isPartnerInDoc(d, selectedSupplierKey)));
  }
  return updated;
}

export async function restoreDocument(docId) {
  const sb = getSupabaseClient();
  const userRole = sessionStorage.getItem(STORAGE_KEYS.USER_ROLE) || 'supplier';
  const selectedSupplierKey = sessionStorage.getItem(STORAGE_KEYS.SELECTED_SUPPLIER) || localStorage.getItem(STORAGE_KEYS.SELECTED_SUPPLIER) || 'sejin';
  const local = getLocalItem(STORAGE_KEYS.DOCUMENTS, DEMO_DOCUMENTS);

  const found = local.find(d => String(d.id) === String(docId) || d.doc_no === docId);

  if (sb && found && found.id && !String(found.id).startsWith('doc_')) {
    try {
      const updatedFound = { ...found, is_deleted: false, deleted_at: null };
      const packed = packRow(updatedFound, 'documents');
      const { error } = await sb.from('documents').update({ remark: packed.remark }).eq('id', found.id);
      if (error) console.error('Supabase restore error:', error);
    } catch (e) {
      console.error('Error restoring document in Supabase:', e);
    }
  }

  const updated = local.map(d => {
    if (String(d.id) === String(docId) || d.doc_no === docId) {
      return { ...d, is_deleted: false, deleted_at: null };
    }
    return d;
  });
  setLocalItem(STORAGE_KEYS.DOCUMENTS, updated);

  if (userRole === 'supplier') {
    return updated.filter(d => areSupplierKeysEquivalent(d.supplier_key, selectedSupplierKey) || (d.is_shared && isPartnerInDoc(d, selectedSupplierKey)));
  }
  return updated;
}

export async function permanentDeleteDocument(docId) {
  const sb = getSupabaseClient();
  const userRole = sessionStorage.getItem(STORAGE_KEYS.USER_ROLE) || 'supplier';
  const selectedSupplierKey = sessionStorage.getItem(STORAGE_KEYS.SELECTED_SUPPLIER) || localStorage.getItem(STORAGE_KEYS.SELECTED_SUPPLIER) || 'sejin';
  const local = getLocalItem(STORAGE_KEYS.DOCUMENTS, DEMO_DOCUMENTS);

  const found = local.find(d => String(d.id) === String(docId) || d.doc_no === docId);
  const targetId = found ? found.id : docId;

  if (sb && targetId && !String(targetId).startsWith('doc_')) {
    try {
      const { error } = await sb.from('documents').delete().eq('id', targetId);
      if (error) console.error('Supabase permanent delete error:', error);
    } catch (e) {
      console.error('Error permanently deleting in Supabase:', e);
    }
  }

  const updated = local.filter(d => String(d.id) !== String(docId) && d.doc_no !== docId);
  setLocalItem(STORAGE_KEYS.DOCUMENTS, updated);

  if (userRole === 'supplier') {
    return updated.filter(d => areSupplierKeysEquivalent(d.supplier_key, selectedSupplierKey) || (d.is_shared && isPartnerInDoc(d, selectedSupplierKey)));
  }
  return updated;
}

export async function updateDocumentPaid(docId, paidAmount, remark) {
  const sb = getSupabaseClient();
  const userRole = sessionStorage.getItem(STORAGE_KEYS.USER_ROLE) || 'supplier';
  const selectedSupplierKey = sessionStorage.getItem(STORAGE_KEYS.SELECTED_SUPPLIER) || localStorage.getItem(STORAGE_KEYS.SELECTED_SUPPLIER) || 'sejin';
  const paidNum = Number(paidAmount) || 0;
  const local = getLocalItem(STORAGE_KEYS.DOCUMENTS, DEMO_DOCUMENTS);
  
  if (userRole === 'supplier') {
    const found = local.find(d => d.id === docId || d.doc_no === docId);
    if (found && found.supplier_key && !areSupplierKeysEquivalent(found.supplier_key, selectedSupplierKey) && !(found.is_shared && isPartnerInDoc(found, selectedSupplierKey))) {
      alert('해당 문서의 수금을 변경할 권한이 없습니다.');
      return local.filter(unpackRow);
    }
  }

  if (sb && docId && !String(docId).startsWith('doc_')) {
    try {
      const updateObj = { paid: paidNum };
      if (remark !== undefined) updateObj.remark = remark;
      await sb.from('documents').update(updateObj).eq('id', docId);
    } catch (e) {
      console.error(e);
    }
  }
  const updated = local.map(d => {
    if (d.id === docId || d.doc_no === docId) {
      return { ...d, paid: paidNum, ...(remark !== undefined ? { remark } : {}) };
    }
    return d;
  });
  setLocalItem(STORAGE_KEYS.DOCUMENTS, updated);
  return updated;
}

export async function updateDocumentSettlement(docId, settlementData) {
  const sb = getSupabaseClient();
  const local = getLocalItem(STORAGE_KEYS.DOCUMENTS, DEMO_DOCUMENTS);
  const found = local.find(d => d.id === docId || d.doc_no === docId);
  if (!found) return local;

  const targetPartnerKey = settlementData.partner_key || settlementData.partnerKey;
  let partners = normalizePartners(found);

  if (settlementData.partners && Array.isArray(settlementData.partners)) {
    partners = settlementData.partners;
  } else if (targetPartnerKey) {
    const isCompleted = settlementData.settlement_status === '정산완료';
    partners = partners.map(p => {
      if (areSupplierKeysEquivalent(p.key, targetPartnerKey)) {
        return {
          ...p,
          amount: settlementData.settlement_amount !== undefined ? Number(settlementData.settlement_amount) : p.amount,
          status: settlementData.settlement_status || p.status,
          memo: settlementData.settlement_memo !== undefined ? settlementData.settlement_memo : p.memo,
          settled_at: isCompleted ? (p.settled_at || new Date().toISOString()) : null
        };
      }
      return p;
    });
  } else {
    const isCompleted = settlementData.settlement_status === '정산완료';
    if (partners.length > 0) {
      partners[0] = {
        ...partners[0],
        amount: settlementData.settlement_amount !== undefined ? Number(settlementData.settlement_amount) : partners[0].amount,
        status: settlementData.settlement_status || partners[0].status,
        memo: settlementData.settlement_memo !== undefined ? settlementData.settlement_memo : partners[0].memo,
        settled_at: isCompleted ? (partners[0].settled_at || new Date().toISOString()) : null
      };
    }
  }

  const primary = partners[0] || {};
  const isAllSettled = partners.length > 0 && partners.every(p => p.status === '정산완료');

  const updatedDoc = {
    ...found,
    partners,
    partner_key: primary.key || found.partner_key || '',
    partner_name: primary.name || found.partner_name || '',
    settlement_amount: primary.amount !== undefined ? primary.amount : (Number(settlementData.settlement_amount) || found.settlement_amount || 0),
    settlement_status: isAllSettled ? '정산완료' : (partners.length > 0 ? (partners.some(p => p.status === '정산완료') ? '부분완료' : '정산대기') : (settlementData.settlement_status || found.settlement_status || '정산대기')),
    settlement_memo: primary.memo !== undefined ? primary.memo : (settlementData.settlement_memo !== undefined ? settlementData.settlement_memo : (found.settlement_memo || '')),
    settled_at: isAllSettled ? (found.settled_at || new Date().toISOString()) : null
  };

  const packed = packRow(updatedDoc, 'documents');
  if (sb && found.id && !String(found.id).startsWith('doc_')) {
    try {
      await sb.from('documents').update({ remark: packed.remark }).eq('id', found.id);
    } catch (e) {
      console.error('Error updating settlement in Supabase:', e);
    }
  }

  const updatedList = local.map(d => (d.id === docId || d.doc_no === docId ? updatedDoc : d));
  setLocalItem(STORAGE_KEYS.DOCUMENTS, updatedList);
  return updatedList;
}

