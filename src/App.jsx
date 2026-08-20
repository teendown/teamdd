// 🎨 TEAM D.D MAIN APPLICATION ROOT
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';

// Configuration & Fixtures
import { DEFAULT_SUPPLIERS, INITIAL_SUPPLIERS_LIST, DEMO_CUSTOMERS, DEMO_PARTS, DEMO_SCHEDULES } from './config/defaults.js';
import { getLocalItem, setLocalItem, getDraftDocuments, saveDraftDocument, deleteDraftDocument, clearAllDrafts } from './api/storage.js';
import { sbTestConnection, dbFetch, dbSave, dbDelete } from './api/supabaseClient.js';
import { areSupplierKeysEquivalent } from './utils/validation.js';
import { generateNextDocNo } from './utils/numbering.js';

// Services
import { fetchDocuments, saveDocument as dbSaveDocument, deleteDocument as dbDeleteDocument, updateDocumentPaid as dbUpdateDocumentPaid } from './services/documentService.js';
import { syncCustomersFromDocuments } from './services/customerService.js';

// Components
import Header from './components/Header.jsx';
import SplashScreen from './components/SplashScreen.jsx';

// Modals
import DocumentPreviewModal from './modals/DocumentPreviewModal.jsx';
import DraftsModal from './modals/DraftsModal.jsx';
import StatementAggregationModal from './modals/StatementAggregationModal.jsx';
import EstimateImportModal from './modals/EstimateImportModal.jsx';
import PastStatementImportModal from './modals/PastStatementImportModal.jsx';
import CustomerEditModal from './modals/CustomerEditModal.jsx';
import DesktopShortcutModal from './modals/DesktopShortcutModal.jsx';
import OcrCustomerModal from './modals/OcrCustomerModal.jsx';

// Pages
import StatementTab from './pages/StatementTab.jsx';
import AccountingTab from './pages/AccountingTab.jsx';
import ScheduleTab from './pages/ScheduleTab.jsx';
import CustomerTab from './pages/CustomerTab.jsx';
import SupplierTab from './pages/SupplierTab.jsx';
import PartsTab from './pages/PartsTab.jsx';
import DocHistoryTab from './pages/DocHistoryTab.jsx';

export default function App() {
  const [activeTab, setActiveTab] = useState('doc');
  const [openAddCustomerModal, setOpenAddCustomerModal] = useState(false);
  const [editingDocId, setEditingDocId] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!sessionStorage.getItem('dd_logged_in'));
  const [userRole, setUserRole] = useState(() => sessionStorage.getItem('dd_user_role') || 'supplier');

  // Preview & Drafts State
  const [previewDoc, setPreviewDoc] = useState(null);
  const [isDraftsModalOpen, setIsDraftsModalOpen] = useState(false);
  const [draftsList, setDraftsList] = useState(() => getDraftDocuments());

  // Supabase Connection State
  const [supabaseUrl, setSupabaseUrl] = useState(() => localStorage.getItem('supabase_url') || 'https://wmrfwrsaacolkpjyrffy.supabase.co');
  const [supabaseKey, setSupabaseKey] = useState(() => localStorage.getItem('supabase_anon_key') || 'sb_publishable_nWgVPKLg5hHZqvCrOL9oUQ_GfuAGe9Y');
  const [isConnected, setIsConnected] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [connectionMessage, setConnectionMessage] = useState('');

  // Primary Data State
  const [suppliersList, setSuppliersList] = useState(() => getLocalItem('dd_suppliers_list_v1', INITIAL_SUPPLIERS_LIST));
  const [selectedSupplierKey, setSelectedSupplierKey] = useState(() => sessionStorage.getItem('selected_supplier_key') || localStorage.getItem('selected_supplier_key') || 'sejin');
  const [currentSupplier, setCurrentSupplier] = useState(DEFAULT_SUPPLIERS.sejin);
  const [customersList, setCustomersList] = useState(() => getLocalItem('dd_customers_list_v1', DEMO_CUSTOMERS));
  const [documentsList, setDocumentsList] = useState(() => getLocalItem('dd_documents_history_v1', []));
  const [schedulesList, setSchedulesList] = useState(() => getLocalItem('dd_schedules_list_v1', DEMO_SCHEDULES));
  const [partsList, setPartsList] = useState(() => getLocalItem('dd_parts_list_v1', DEMO_PARTS));
  const hasSyncedCustRef = useRef(false);

  // Form Fields State
  const [customer, setCustomer] = useState({ name: '', person: '', phone: '', addr: '' });
  const [docType, setDocType] = useState('거래명세서');
  const [docDate, setDocDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });
  const [docNo, setDocNo] = useState(() => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const localDocs = getLocalItem('dd_documents_history_v1', []);
    const suppKey = sessionStorage.getItem('selected_supplier_key') || localStorage.getItem('selected_supplier_key') || 'sejin';
    return generateNextDocNo(todayStr, localDocs, suppKey, null, '거래명세서', INITIAL_SUPPLIERS_LIST, DEMO_CUSTOMERS);
  });
  const [docTime, setDocTime] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  const [items, setItems] = useState([{ id: '1', code: '', name: '', unit: 'EA', qty: 1, price: 0 }]);
  const [vatIncluded, setVatIncluded] = useState(true);
  const [vat, setVat] = useState(0);
  const [paid, setPaid] = useState(0);
  const [paymentStatus, setPaymentStatus] = useState('미수금');
  const [paymentMethod, setPaymentMethod] = useState('계좌이체');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [validityPeriod, setValidityPeriod] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [receiveDate, setReceiveDate] = useState('');
  const [remark, setRemark] = useState('');
  const [isDocShared, setIsDocShared] = useState(false);

  // Modals & Navigation Guard State
  const [docDrafts, setDocDrafts] = useState({});
  const [isSavedThisSession, setIsSavedThisSession] = useState(true);
  const [isAggregationModalOpen, setIsAggregationModalOpen] = useState(false);
  const [isEstimateModalOpen, setIsEstimateModalOpen] = useState(false);
  const [estimateModalTargetMode, setEstimateModalTargetMode] = useState('convert_to_statement');
  const [quickCustomerModalOpen, setQuickCustomerModalOpen] = useState(false);
  const [quickCustomerInitialName, setQuickCustomerInitialName] = useState('');
  const [isPastStatementModalOpen, setIsPastStatementModalOpen] = useState(false);
  const [isOcrModalOpen, setIsOcrModalOpen] = useState(false);
  const [isDesktopShortcutModalOpen, setIsDesktopShortcutModalOpen] = useState(false);
  const [pendingTab, setPendingTab] = useState(null);
  const [pendingReset, setPendingReset] = useState(false);

  const handleReloadDocuments = useCallback(() => {
    fetchDocuments().then(data => {
      setDocumentsList(data);
    });
  }, [selectedSupplierKey]);

  useEffect(() => {
    handleReloadDocuments();
  }, [handleReloadDocuments]);

  const handleDocTypeChange = (targetType) => {
    if (docType === targetType) return;
    
    setDocDrafts(prev => ({
      ...prev,
      [docType]: {
        customer, docNo, docDate, docTime, items, vatIncluded, vat, paid, paymentStatus, paymentMethod, paymentDate, validityPeriod, deliveryDate, deliveryLocation, paymentTerms, bankAccount, dueDate, receiverName, receiveDate, remark, editingDocId
      }
    }));

    setDocType(targetType);
    const draft = docDrafts[targetType];
    if (draft) {
      setCustomer(draft.customer);
      setDocNo(draft.docNo);
      setDocDate(draft.docDate);
      setDocTime(draft.docTime);
      setItems(draft.items);
      setVatIncluded(draft.vatIncluded);
      setVat(draft.vat);
      setPaid(draft.paid);
      setPaymentStatus(draft.paymentStatus);
      setPaymentMethod(draft.paymentMethod);
      setPaymentDate(draft.paymentDate);
      setValidityPeriod(draft.validityPeriod);
      setDeliveryDate(draft.deliveryDate);
      setDeliveryLocation(draft.deliveryLocation);
      setPaymentTerms(draft.paymentTerms);
      setBankAccount(draft.bankAccount);
      setDueDate(draft.dueDate);
      setReceiverName(draft.receiverName);
      setReceiveDate(draft.receiveDate);
      setRemark(draft.remark);
      setEditingDocId(draft.editingDocId);
    } else {
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const emptyCust = { name: '', person: '', phone: '', addr: '' };
      setCustomer(emptyCust);
      setDocDate(todayStr);
      setDocTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
      setDocNo(generateNextDocNo(todayStr, documentsList, selectedSupplierKey, emptyCust, targetType, suppliersList, customersList));
      setItems([{ id: Date.now().toString(), code: '', name: '', unit: 'EA', qty: 1, price: 0 }]);
      setVatIncluded(true);
      setVat(0);
      setPaid(0);
      setPaymentStatus('미수금');
      setPaymentMethod('계좌이체');
      setPaymentDate(now.toISOString().split('T')[0]);
      setValidityPeriod('');
      setDeliveryDate('');
      setDeliveryLocation('');
      setPaymentTerms('');
      setBankAccount('');
      setDueDate('');
      setReceiverName('');
      setReceiveDate('');
      setRemark('');
      setEditingDocId(null);
    }
  };

  const handleApplyPastStatement = (doc, actionType) => {
    if (actionType === 'copy_to_new') {
      setDocType('거래명세서');
      const custData = doc.customer_data || {};
      setCustomer({
        name: doc.customer_name || custData.name || '',
        person: custData.person || '',
        phone: custData.phone || '',
        addr: custData.addr || '',
        bizno: custData.bizno || '',
        selectedMachine: custData.selectedMachine || ''
      });
      const importedItems = (doc.items || []).map(i => ({
        ...i,
        id: Date.now().toString() + Math.random().toString().slice(2, 6)
      }));
      setItems(importedItems.length > 0 ? importedItems : [{ id: Date.now().toString(), code: '', name: '', unit: 'EA', qty: 1, price: 0 }]);
      setVatIncluded(doc.vat_included !== false);
      setVat(doc.vat || 0);
      setPaid(0);
      setPaymentStatus('미수금');
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      setDocNo(generateNextDocNo(todayStr, documentsList, selectedSupplierKey, custData, '거래명세서', suppliersList, customersList));
      setDocDate(todayStr);
      setDocTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
      setRemark(doc.remark || '');
      setEditingDocId(null);
      setIsSavedThisSession(false);
      alert(`✓ 지난 명세서(${doc.doc_no || doc.docNo})의 품목과 거래처를 새 거래명세서로 성공적으로 복사했습니다.`);
    } else {
      setDocType('거래명세서');
      handleLoadDocument(doc);
      alert(`✓ 지난 명세서(${doc.doc_no || doc.docNo})를 수정 모드로 불러왔습니다.`);
    }
  };

  const handleApplyEstimate = (doc, actionType) => {
    if (actionType === 'convert_to_statement') {
      setDocType('거래명세서');
      const custData = doc.customer_data || {};
      setCustomer({
        name: doc.customer_name || custData.name || '',
        person: custData.person || '',
        phone: custData.phone || '',
        addr: custData.addr || '',
        selectedMachine: custData.selectedMachine || ''
      });
      const importedItems = (doc.items || []).map(i => ({
        ...i,
        id: Date.now().toString() + Math.random().toString().slice(2, 6)
      }));
      setItems(importedItems.length > 0 ? importedItems : [{ id: Date.now().toString(), code: '', name: '', unit: 'EA', qty: 1, price: 0 }]);
      setVatIncluded(doc.vat_included !== false);
      setVat(doc.vat || 0);
      setPaid(0);
      setPaymentStatus('미수금');
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      setDocNo(generateNextDocNo(todayStr, documentsList, selectedSupplierKey, custData, '거래명세서', suppliersList, customersList));
      setDocDate(todayStr);
      setDocTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
      setRemark(doc.remark ? `${doc.remark} (견적서 ${doc.doc_no || doc.docNo} 기반)` : `(견적서 ${doc.doc_no || doc.docNo} 기반)`);
      setEditingDocId(null);
      setIsSavedThisSession(false);
      alert(`✓ 견적서(${doc.doc_no || doc.docNo}) 내용을 거래명세서로 성공적으로 가져왔습니다.`);
    } else {
      setDocType('견적서');
      handleLoadDocument(doc);
      alert(`✓ 견적서(${doc.doc_no || doc.docNo})를 성공적으로 불러왔습니다.`);
    }
  };

  const isDocumentDirty = useMemo(() => {
    if (isSavedThisSession) return false;
    const hasCustomer = (customer.name || '').trim().length > 0;
    const hasItems = items.some(i => (i.name || '').trim().length > 0 || (i.price || 0) > 0);
    return hasCustomer || hasItems || editingDocId !== null;
  }, [customer, items, editingDocId, isSavedThisSession]);

  useEffect(() => {
    setIsSavedThisSession(false);
  }, [customer, items, docType, docNo, docDate, remark, vatIncluded]);

  useEffect(() => {
    if (!editingDocId) {
      setDocNo(generateNextDocNo(docDate, documentsList, selectedSupplierKey, customer, docType, suppliersList, customersList));
    }
  }, [customer?.name, customer?.code, customer?.id, docDate, docType, selectedSupplierKey, editingDocId, documentsList.length]);

  useEffect(() => {
    const onBeforeUnload = (e) => {
      if (activeTab === 'doc' && isDocumentDirty) {
        e.preventDefault();
        e.returnValue = '작성 중인 문서가 있습니다. 저장하지 않고 나가시겠습니까?';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [activeTab, isDocumentDirty]);

  const handleRequestTabChange = (newTab) => {
    if (newTab === activeTab) return;
    if (activeTab === 'doc' && isDocumentDirty) {
      setPendingTab(newTab);
    } else {
      setActiveTab(newTab);
    }
  };

  const handleRequestResetForm = () => {
    if (isDocumentDirty) {
      setPendingReset(true);
    } else {
      handleResetForm();
    }
  };

  useEffect(() => {
    const found = suppliersList.find(s => areSupplierKeysEquivalent(s.id, selectedSupplierKey));
    if (found) {
      setCurrentSupplier({
        ...found,
        company: found.name || found.company,
        person: found.person || found.owner || '',
        tel: found.phone || found.tel,
        email: found.email || '',
        hasStamp: areSupplierKeysEquivalent(selectedSupplierKey, 'sejin')
      });
    } else if (DEFAULT_SUPPLIERS[selectedSupplierKey]) {
      const def = DEFAULT_SUPPLIERS[selectedSupplierKey];
      setCurrentSupplier({
        ...def,
        person: def.person || def.name
      });
    }
    localStorage.setItem('selected_supplier_key', selectedSupplierKey);
  }, [selectedSupplierKey, suppliersList]);

  const handleTestConnection = async () => {
    setIsTesting(true);
    localStorage.setItem('supabase_url', supabaseUrl.trim());
    localStorage.setItem('supabase_anon_key', supabaseKey.trim());
    const result = await sbTestConnection(supabaseUrl, supabaseKey);
    setIsConnected(result.ok);
    setConnectionMessage(result.message);
    setIsTesting(false);
    if (result.ok && !result.isTableMissing) {
      const [custs, supps, parts, schs] = await Promise.all([
        dbFetch('customers', DEMO_CUSTOMERS),
        dbFetch('suppliers', INITIAL_SUPPLIERS_LIST),
        dbFetch('parts', DEMO_PARTS),
        dbFetch('schedules', DEMO_SCHEDULES)
      ]);
      setCustomersList(custs);
      if (supps.length > 0) setSuppliersList(supps);
      if (parts.length > 0) setPartsList(parts);
      if (schs.length > 0) setSchedulesList(schs);
    }
  };

  useEffect(() => {
    if (documentsList.length > 0 && !hasSyncedCustRef.current) {
      hasSyncedCustRef.current = true;
      syncCustomersFromDocuments(customersList, documentsList).then(synced => {
        if (synced && synced.length > 0 && synced.length !== customersList.length) {
          setCustomersList(synced);
        }
      });
    }
  }, [documentsList]);

  useEffect(() => {
    if (isLoggedIn) {
      dbFetch('customers', DEMO_CUSTOMERS).then(setCustomersList);
      dbFetch('suppliers', INITIAL_SUPPLIERS_LIST).then(d => { if (d.length > 0) setSuppliersList(d); });
      dbFetch('parts', DEMO_PARTS).then(setPartsList);
      dbFetch('schedules', DEMO_SCHEDULES).then(setSchedulesList);
      handleReloadDocuments();
    }
  }, [isLoggedIn, selectedSupplierKey, handleReloadDocuments]);

  useEffect(() => {
    handleTestConnection();
    dbFetch('customers', DEMO_CUSTOMERS).then(setCustomersList);
    dbFetch('suppliers', INITIAL_SUPPLIERS_LIST).then(d => { if (d.length > 0) setSuppliersList(d); });
    dbFetch('parts', DEMO_PARTS).then(setPartsList);
    dbFetch('schedules', DEMO_SCHEDULES).then(setSchedulesList);
  }, []);

  useEffect(() => {
    if (activeTab === 'accounting' || activeTab === 'doc' || activeTab === 'schedule' || activeTab === 'history') {
      handleReloadDocuments();
    }
    if (activeTab === 'schedule') dbFetch('schedules', DEMO_SCHEDULES).then(setSchedulesList);
    else if (activeTab === 'customers') dbFetch('customers', DEMO_CUSTOMERS).then(setCustomersList);
    else if (activeTab === 'suppliers') dbFetch('suppliers', INITIAL_SUPPLIERS_LIST).then(d => { if (d.length > 0) setSuppliersList(d); });
    else if (activeTab === 'parts') dbFetch('parts', DEMO_PARTS).then(d => { if (d.length > 0) setPartsList(d); });
  }, [activeTab, handleReloadDocuments]);

  const handleSaveSchedule = async (sch, isEdit) => {
    const updated = await dbSave('schedules', sch, isEdit, schedulesList);
    setSchedulesList(updated);
    alert('✓ 일정이 성공적으로 저장되었습니다.');
  };

  const handleDeleteSchedule = async (id) => {
    setSchedulesList(await dbDelete('schedules', id, schedulesList));
    alert('✓ 일정이 삭제되었습니다.');
  };

  const handleSaveCustomer = async (c, isEdit, silent = false) => {
    const updated = await dbSave('customers', c, isEdit, customersList);
    setCustomersList(updated);
    if (!silent) alert('✓ 거래처 정보가 저장되었습니다.');
  };

  const handleDeleteCustomer = async (id) => {
    if (!window.confirm('거래처를 삭제하시겠습니까?')) return;
    setCustomersList(await dbDelete('customers', id, customersList));
  };

  const handleSaveSupplier = async (s, isEdit) => {
    const updated = await dbSave('suppliers', s, isEdit, suppliersList);
    setSuppliersList(updated);
    const saved = updated.find(x => x.code === s.code);
    if (saved && s.pwd) {
      localStorage.setItem('dd_pwd_' + saved.id, s.pwd);
    }
    alert('✓ 공급자 정보가 저장되었습니다.');
  };

  const handleDeleteSupplier = async (id) => {
    if (!window.confirm('공급자를 삭제하시겠습니까?')) return;
    setSuppliersList(await dbDelete('suppliers', id, suppliersList));
  };

  const handleSavePart = async (p, isEdit) => {
    const updated = await dbSave('parts', p, isEdit, partsList);
    setPartsList(updated);
    alert('✓ 부품 정보가 저장되었습니다.');
  };

  const handleDeletePart = async (id) => {
    if (!window.confirm('부품을 삭제하시겠습니까?')) return;
    setPartsList(await dbDelete('parts', id, partsList));
  };

  const handleSaveDocument = async () => {
    if (!customer || !customer.name || customer.name.trim() === '') {
      alert('❌ 거래처(공급받는자)를 입력해 주세요.\n거래처가 비어 있으면 저장이 불가합니다.');
      return;
    }
    const validItems = items.filter(i => i.name && i.name.trim() !== '');
    if (validItems.length === 0) {
      alert('❌ 품목을 1개 이상 입력해 주세요.\n품목이 비어 있으면 저장이 불가합니다.');
      return;
    }

    const trimmedCustName = customer.name.trim();

    try {
      const existingCust = customersList.find(c => (c.name || '').trim().toLowerCase() === trimmedCustName.toLowerCase());
      let currentCustList = customersList;
      if (!existingCust) {
        const newCust = {
          code: `C${String(customersList.length + 1).padStart(4, '0')}`,
          name: trimmedCustName,
          person: customer.person || '',
          phone: customer.phone || '',
          addr: customer.addr || '',
          bizno: customer.bizno || '',
          machine: customer.selectedMachine || customer.machine || '',
          memo: '문서 작성 시 자동 등록'
        };
        currentCustList = await dbSave('customers', newCust, false, customersList);
        setCustomersList(currentCustList);
      } else {
        let needsUpdate = false;
        const updatedCust = { ...existingCust };
        if (customer.person && existingCust.person !== customer.person) { updatedCust.person = customer.person; needsUpdate = true; }
        if (customer.phone && existingCust.phone !== customer.phone) { updatedCust.phone = customer.phone; needsUpdate = true; }
        if (customer.addr && existingCust.addr !== customer.addr) { updatedCust.addr = customer.addr; needsUpdate = true; }
        if (customer.bizno && existingCust.bizno !== customer.bizno) { updatedCust.bizno = customer.bizno; needsUpdate = true; }
        if (needsUpdate) {
          currentCustList = await dbSave('customers', updatedCust, true, customersList);
          setCustomersList(currentCustList);
        }
      }
    } catch (err) {
      console.error('Customer master upsert error:', err);
    }

    const saveRes = await dbSaveDocument({
      id: editingDocId,
      docType,
      docNo,
      docDate,
      docTime,
      customer,
      supplier: currentSupplier,
      supplierKey: selectedSupplierKey,
      items,
      vat,
      vatIncluded,
      paid,
      paymentStatus,
      paymentMethod,
      paymentDate,
      validityPeriod,
      deliveryDate,
      deliveryLocation,
      paymentTerms,
      bankAccount,
      dueDate,
      receiverName,
      receiveDate,
      remark,
      is_shared: !!isDocShared
    });
    const finalSavedNo = saveRes && saveRes.docNo ? saveRes.docNo : docNo;
    setDocNo(finalSavedNo);
    setIsSavedThisSession(true);
    alert(`✓ ${docType} (번호: ${finalSavedNo}) 저장/수정 완료!`);
    handleReloadDocuments();
  };

  const handleUpdateDocumentPaid = async (docId, newPaid, newRemark) => {
    const updated = await dbUpdateDocumentPaid(docId, newPaid, newRemark);
    setDocumentsList(updated);
    alert('✓ 수금 내역이 성공적으로 저장되었습니다.');
  };

  const handleCopyDocument = (doc) => {
    handleLoadDocument(doc);
    setEditingDocId(null);
    const d = new Date();
    const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    setDocDate(todayStr);
    setDocTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
    const nextNo = generateNextDocNo(todayStr, documentsList, doc.supplier_key || selectedSupplierKey, doc.customer_data, doc.doc_type || '거래명세서', suppliersList, customersList);
    setDocNo(nextNo);
  };

  const handleConvertToDocument = (doc, targetType) => {
    handleLoadDocument(doc);
    setDocType(targetType);
    setEditingDocId(null);
    const d = new Date();
    const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    setDocDate(todayStr);
    setDocTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
    const nextNo = generateNextDocNo(todayStr, documentsList, doc.supplier_key || selectedSupplierKey, doc.customer_data, targetType, suppliersList, customersList);
    setDocNo(nextNo);
    setActiveTab('doc');
  };

  const handleLoadDocument = (doc) => {
    setDocType(doc.doc_type || doc.docType || '거래명세서');
    setDocNo(doc.doc_no || doc.docNo || '');
    setDocDate(doc.doc_date || doc.docDate || '');
    setDocTime(doc.doc_time || doc.docTime || '');
    if (doc.customer_data) setCustomer(doc.customer_data);
    else setCustomer({ name: doc.customer_name || '', person: '', phone: '', addr: '' });
    if (doc.supplier_key) setSelectedSupplierKey(doc.supplier_key);
    if (doc.items && Array.isArray(doc.items)) setItems(doc.items);
    setVatIncluded(doc.vat_included !== false);
    setVat(doc.vat || 0);
    setPaid(doc.paid || 0);
    setPaymentStatus(doc.paymentStatus || doc.payment_status || '미수금');
    setPaymentMethod(doc.paymentMethod || doc.payment_method || '계좌이체');
    setPaymentDate(doc.paymentDate || doc.payment_date || '');
    setValidityPeriod(doc.validityPeriod || doc.validity_period || '');
    setDeliveryDate(doc.deliveryDate || doc.delivery_date || '');
    setDeliveryLocation(doc.deliveryLocation || doc.delivery_location || '');
    setPaymentTerms(doc.paymentTerms || doc.payment_terms || '');
    setBankAccount(doc.bankAccount || doc.bank_account || '');
    setDueDate(doc.dueDate || doc.due_date || '');
    setReceiverName(doc.receiverName || doc.receiver_name || '');
    setReceiveDate(doc.receiveDate || doc.receive_date || '');
    setRemark(doc.remark || '');
    setIsDocShared(doc.is_shared === true);
    setEditingDocId(doc.id || null);
    setIsSavedThisSession(true);
    setActiveTab('doc');
  };

  const handleResetForm = () => {
    const now = new Date();
    const todayDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const emptyCust = { name: '', person: '', phone: '', addr: '' };
    setDocDate(todayDateStr);
    setDocTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
    setCustomer(emptyCust);
    setDocNo(generateNextDocNo(todayDateStr, documentsList, selectedSupplierKey, emptyCust, docType, suppliersList, customersList));
    setItems([{ id: Date.now().toString(), code: '', name: '', unit: 'EA', qty: 1, price: 0 }]);
    setPaid(0);
    setPaymentStatus('미수금');
    setPaymentMethod('계좌이체');
    setPaymentDate(now.toISOString().split('T')[0]);
    setValidityPeriod('');
    setDeliveryDate('');
    setDeliveryLocation('');
    setPaymentTerms('');
    setBankAccount('');
    setDueDate('');
    setReceiverName('');
    setReceiveDate('');
    setRemark('');
    setIsDocShared(false);
    setEditingDocId(null);
    setPendingReset(false);
    setPendingTab(null);
  };

  const handleLogout = () => {
    if (window.confirm('로그아웃 하시겠습니까?')) {
      sessionStorage.removeItem('dd_logged_in');
      sessionStorage.removeItem('dd_user_role');
      sessionStorage.removeItem('selected_supplier_key');
      handleResetForm();
      setIsLoggedIn(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <SplashScreen
        suppliersList={suppliersList}
        onSelect={(key) => {
          setSelectedSupplierKey(key);
          localStorage.setItem('selected_supplier_key', key);
          sessionStorage.setItem('selected_supplier_key', key);
          sessionStorage.setItem('dd_logged_in', '1');
          sessionStorage.setItem('dd_user_role', 'supplier');
          setUserRole('supplier');
          setIsLoggedIn(true);
        }}
        onSelectAdmin={() => {
          sessionStorage.setItem('dd_logged_in', '1');
          sessionStorage.setItem('dd_user_role', 'admin');
          setUserRole('admin');
          setIsLoggedIn(true);
        }}
      />
    );
  }

  return (
    <div className="app-container">
      <Header
        activeTab={activeTab}
        setActiveTab={handleRequestTabChange}
        isConnected={isConnected}
        isTesting={isTesting}
        connectionMessage={connectionMessage}
        supabaseUrl={supabaseUrl}
        setSupabaseUrl={setSupabaseUrl}
        supabaseKey={supabaseKey}
        setSupabaseKey={setSupabaseKey}
        onTestConnection={handleTestConnection}
        docType={docType}
        setDocType={handleDocTypeChange}
        userRole={userRole}
        onLogout={handleLogout}
        currentSupplier={currentSupplier}
        selectedSupplierKey={selectedSupplierKey}
        suppliersList={suppliersList}
      />

      <DesktopShortcutModal
        isOpen={isDesktopShortcutModalOpen}
        onClose={() => setIsDesktopShortcutModalOpen(false)}
      />

      <StatementAggregationModal
        isOpen={isAggregationModalOpen}
        onClose={() => setIsAggregationModalOpen(false)}
        customer={customer}
        selectedSupplierKey={selectedSupplierKey}
        onApply={(aggregatedItems) => {
          setItems(prev => {
            const filtered = prev.filter(i => (i.name && i.name.trim() !== '') || i.price > 0);
            return [...filtered, ...aggregatedItems];
          });
          setIsAggregationModalOpen(false);
        }}
      />

      <CustomerEditModal
        isOpen={quickCustomerModalOpen}
        onClose={() => setQuickCustomerModalOpen(false)}
        modalMode="add"
        initialData={{ name: quickCustomerInitialName }}
        customers={customersList}
        onSaveCustomer={handleSaveCustomer}
        onSelectAfterSave={(saved) => {
          setCustomer({
            name: saved.name,
            person: saved.person || '',
            phone: saved.phone || '',
            addr: saved.addr || '',
            selectedMachine: (saved.machine ? saved.machine.split(',')[0].trim() : '')
          });
          if (saved.machine) {
            const firstMachine = saved.machine.split(',')[0].trim();
            setItems(prev => {
              const newItems = [...prev];
              if (!newItems[0] || !newItems[0].name) {
                if (newItems[0]) newItems[0].name = firstMachine;
              }
              return newItems;
            });
            setRemark(prev => {
              const prefix = `[기종: ${firstMachine}] `;
              return prev.includes(prefix) ? prev : prefix + prev;
            });
          }
        }}
      />

      <EstimateImportModal
        isOpen={isEstimateModalOpen}
        onClose={() => setIsEstimateModalOpen(false)}
        targetMode={estimateModalTargetMode}
        initialCustomerName={customer.name || ''}
        selectedSupplierKey={selectedSupplierKey}
        onApplyEstimate={handleApplyEstimate}
      />

      <PastStatementImportModal
        isOpen={isPastStatementModalOpen}
        onClose={() => setIsPastStatementModalOpen(false)}
        initialCustomerName={customer.name || ''}
        selectedSupplierKey={selectedSupplierKey}
        onApplyStatement={handleApplyPastStatement}
      />

      <OcrCustomerModal
        isOpen={isOcrModalOpen}
        onClose={() => setIsOcrModalOpen(false)}
        customers={customersList}
        onSaveCustomer={handleSaveCustomer}
        onSelectCustomerAfterSave={(saved) => {
          setCustomer({
            name: saved.name,
            person: saved.person || saved.repName || '',
            phone: saved.phone || '',
            addr: saved.addr || '',
            bizno: saved.bizno || '',
            selectedMachine: (saved.machine ? saved.machine.split(',')[0].trim() : '')
          });
          setActiveTab('doc');
        }}
      />

      {previewDoc && (
        <DocumentPreviewModal
          doc={previewDoc}
          suppliersList={suppliersList}
          onClose={() => setPreviewDoc(null)}
          onEdit={(doc) => {
            handleLoadDocument(doc);
            setPreviewDoc(null);
          }}
          onCopy={(doc) => {
            handleCopyDocument(doc);
            setPreviewDoc(null);
          }}
        />
      )}

      {isDraftsModalOpen && (
        <DraftsModal
          isOpen={isDraftsModalOpen}
          draftsList={draftsList}
          onClose={() => setIsDraftsModalOpen(false)}
          onLoadDraft={(draft) => {
            handleLoadDocument(draft);
            setIsDraftsModalOpen(false);
          }}
          onDeleteDraft={(draftId) => {
            setDraftsList(deleteDraftDocument(draftId));
          }}
          onClearAll={() => {
            if (window.confirm('임시보관함의 모든 문서를 삭제하시겠습니까?')) {
              setDraftsList(clearAllDrafts());
            }
          }}
        />
      )}

      <main className="main-content">
        {activeTab === 'doc' && (
          <StatementTab
            docType={docType}
            setDocType={setDocType}
            docNo={docNo}
            setDocNo={setDocNo}
            docDate={docDate}
            setDocDate={setDocDate}
            docTime={docTime}
            setDocTime={setDocTime}
            selectedSupplierKey={selectedSupplierKey}
            setSelectedSupplierKey={setSelectedSupplierKey}
            suppliersList={suppliersList}
            currentSupplier={currentSupplier}
            setCurrentSupplier={setCurrentSupplier}
            customer={customer}
            setCustomer={setCustomer}
            customersList={customersList}
            items={items}
            setItems={setItems}
            onAggregateOpen={() => setIsAggregationModalOpen(true)}
            onOpenEstimateModal={mode => {
              setEstimateModalTargetMode(mode);
              setIsEstimateModalOpen(true);
            }}
            onOpenPastStatementModal={() => setIsPastStatementModalOpen(true)}
            onOpenOcrModal={() => setIsOcrModalOpen(true)}
            vat={vat}
            setVat={setVat}
            vatIncluded={vatIncluded}
            setVatIncluded={setVatIncluded}
            paid={paid}
            setPaid={setPaid}
            paymentStatus={paymentStatus}
            setPaymentStatus={setPaymentStatus}
            paymentMethod={paymentMethod}
            setPaymentMethod={setPaymentMethod}
            paymentDate={paymentDate}
            setPaymentDate={setPaymentDate}
            validityPeriod={validityPeriod}
            setValidityPeriod={setValidityPeriod}
            deliveryDate={deliveryDate}
            setDeliveryDate={setDeliveryDate}
            deliveryLocation={deliveryLocation}
            setDeliveryLocation={setDeliveryLocation}
            paymentTerms={paymentTerms}
            setPaymentTerms={setPaymentTerms}
            bankAccount={bankAccount}
            setBankAccount={setBankAccount}
            dueDate={dueDate}
            setDueDate={setDueDate}
            receiverName={receiverName}
            setReceiverName={setReceiverName}
            receiveDate={receiveDate}
            setReceiveDate={setReceiveDate}
            isDocShared={isDocShared}
            setIsDocShared={setIsDocShared}
            remark={remark}
            setRemark={setRemark}
            onResetForm={handleRequestResetForm}
            onSaveDocument={handleSaveDocument}
            onAddNewCustomer={name => {
              setQuickCustomerInitialName(name || '');
              setQuickCustomerModalOpen(true);
            }}
            editingDocId={editingDocId}
            documentsList={documentsList}
            onLoadDocument={handleLoadDocument}
            onCopyDocument={handleCopyDocument}
          />
        )}

        {activeTab === 'history' && (
          <DocHistoryTab
            onLoadDocument={handleLoadDocument}
            onCopyDocument={handleCopyDocument}
            onConvertToDoc={handleConvertToDocument}
            isConnected={isConnected}
            selectedSupplierKey={selectedSupplierKey}
            onPreviewDocument={(doc) => setPreviewDoc(doc)}
          />
        )}

        {activeTab === 'accounting' && (
          <AccountingTab
            documents={documentsList}
            customersList={customersList}
            suppliersList={suppliersList}
            onUpdateDocumentPaid={handleUpdateDocumentPaid}
            onDeleteDocument={dbDeleteDocument}
            onPreviewDocument={(doc) => setPreviewDoc(doc)}
          />
        )}

        {activeTab === 'schedule' && (
          <ScheduleTab
            schedules={schedulesList}
            documentsList={documentsList}
            selectedSupplierKey={selectedSupplierKey}
            suppliersList={suppliersList}
            onSaveSchedule={handleSaveSchedule}
            onDeleteSchedule={handleDeleteSchedule}
            onLoadDocument={handleLoadDocument}
            onPreviewDocument={(doc) => setPreviewDoc(doc)}
          />
        )}

        {activeTab === 'customers' && (
          <CustomerTab
            customers={customersList}
            openAddModal={openAddCustomerModal}
            setOpenAddModal={setOpenAddCustomerModal}
            onSaveCustomer={handleSaveCustomer}
            onDeleteCustomer={handleDeleteCustomer}
            onOpenOcrModal={() => setIsOcrModalOpen(true)}
            onSyncCustomers={async () => {
              const synced = await syncCustomersFromDocuments(customersList, documentsList);
              if (synced && synced.length > 0) setCustomersList(synced);
            }}
            onSelectCustomer={c => {
              setCustomer(c);
              if (c.selectedMachine) {
                setItems(prev => {
                  const newItems = [...prev];
                  if (!newItems[0]?.name) {
                    newItems[0].name = c.selectedMachine;
                  }
                  return newItems;
                });
                setRemark(prev => {
                  const prefix = `[기종: ${c.selectedMachine}] `;
                  return prev.includes(prefix) ? prev : prefix + prev;
                });
              }
              setActiveTab('doc');
            }}
          />
        )}

        {activeTab === 'suppliers' && userRole === 'admin' && (
          <SupplierTab
            suppliers={suppliersList}
            onSaveSupplier={handleSaveSupplier}
            onDeleteSupplier={handleDeleteSupplier}
            onSelectSupplier={s => {
              setSelectedSupplierKey(s.id);
              setActiveTab('doc');
            }}
          />
        )}

        {activeTab === 'parts' && (
          <PartsTab
            parts={partsList}
            onSavePart={handleSavePart}
            onDeletePart={handleDeletePart}
            onSelectPart={p => {
              setItems(prev => [...prev, {
                id: Date.now().toString(),
                code: p.code,
                name: p.name,
                unit: p.unit || 'EA',
                qty: 1,
                price: p.price
              }]);
              setActiveTab('doc');
            }}
          />
        )}
      </main>

      {/* Pending Unsaved Changes Navigation Confirmation Modal */}
      {(pendingTab || pendingReset) && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal-content" style={{ maxWidth: '420px', textAlign: 'center', padding: '1.75rem 1.25rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>💾</div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '900', marginBottom: '0.5rem', color: '#0f172a' }}>
              작성 중인 문서를 저장하시겠습니까?
            </h3>
            <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '1.25rem', lineHeight: '1.5' }}>
              {pendingReset
                ? '신규 문서를 작성하기 전에 현재 작성 중인 명세서를 저장하시겠습니까?'
                : `'${pendingTab === 'history' ? '문서조회' : pendingTab === 'customers' ? '고객관리' : pendingTab === 'suppliers' ? '공급자' : '부품관리'}' 페이지로 이동하기 전에 저장하시겠습니까?`}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-primary"
                style={{ width: '100%', minHeight: '44px', fontWeight: '800', backgroundColor: '#16a34a', borderColor: '#16a34a', fontSize: '0.875rem' }}
                onClick={async () => {
                  await handleSaveDocument();
                  if (pendingTab) {
                    setActiveTab(pendingTab);
                    setPendingTab(null);
                  } else if (pendingReset) {
                    handleResetForm();
                  }
                }}
              >
                💾 저장 후 진행하기
              </button>
              <button
                type="button"
                className="btn btn-outline"
                style={{ width: '100%', minHeight: '40px', fontWeight: '700', color: '#dc2626', borderColor: '#fca5a5', fontSize: '0.8125rem' }}
                onClick={() => {
                  if (pendingTab) {
                    setActiveTab(pendingTab);
                    setPendingTab(null);
                  } else if (pendingReset) {
                    handleResetForm();
                  }
                }}
              >
                🚀 저장하지 않고 진행
              </button>
              <button
                type="button"
                className="btn btn-outline"
                style={{ width: '100%', minHeight: '36px', fontSize: '0.8125rem', color: '#475569' }}
                onClick={() => {
                  setPendingTab(null);
                  setPendingReset(false);
                }}
              >
                ✕ 취소 (현재 명세서 작성 계속)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
