// 🎨 TEAM D.D MAIN APPLICATION ROOT
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';

// Configuration & Fixtures
import { DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_KEY } from './config/constants.js';
import { DEFAULT_SUPPLIERS, INITIAL_SUPPLIERS_LIST, DEMO_CUSTOMERS, DEMO_PARTS, DEMO_SCHEDULES } from './config/defaults.js';
import { getLocalItem, setLocalItem, getDraftDocuments, saveDraftDocument, deleteDraftDocument, clearAllDrafts } from './api/storage.js';
import { sbTestConnection, dbFetch, dbSave, dbDelete } from './api/supabaseClient.js';
import { areSupplierKeysEquivalent, normalizePartners } from './utils/validation.js';
import { generateNextDocNo } from './utils/numbering.js';

// Services
import { fetchDocuments, saveDocument as dbSaveDocument, deleteDocument as dbDeleteDocument, updateDocumentPaid as dbUpdateDocumentPaid, updateDocumentSettlement as dbUpdateDocumentSettlement } from './services/documentService.js';
import { syncCustomersFromDocuments } from './services/customerService.js';

// Components
import Header from './components/Header.jsx';
import Sidebar from './components/Sidebar.jsx';
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
import DocConvertModal from './modals/DocConvertModal.jsx';
import ExitConfirmModal from './modals/ExitConfirmModal.jsx';

// Navigation Manager
import {
  initNavigationManager,
  pushTabHistory,
  popTabHistory,
  canGoBackTab,
  triggerBackAction,
  registerBackHandler,
  performExitApp
} from './utils/navigationManager.js';

// Pages
import DashboardTab from './pages/DashboardTab.jsx';
import StatementTab from './pages/StatementTab.jsx';
import AccountingTab from './pages/AccountingTab.jsx';
import ScheduleTab from './pages/ScheduleTab.jsx';
import CustomerTab from './pages/CustomerTab.jsx';
import SupplierTab from './pages/SupplierTab.jsx';
import PartsTab from './pages/PartsTab.jsx';
import DocHistoryTab from './pages/DocHistoryTab.jsx';
import SettingsTab from './pages/SettingsTab.jsx';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [openAddCustomerModal, setOpenAddCustomerModal] = useState(false);
  const [editingDocId, setEditingDocId] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!sessionStorage.getItem('dd_logged_in'));
  const [userRole, setUserRole] = useState(() => sessionStorage.getItem('dd_user_role') || 'supplier');

  // Preview & Drafts State
  const [previewDoc, setPreviewDoc] = useState(null);
  const [isDraftsModalOpen, setIsDraftsModalOpen] = useState(false);
  const [draftsList, setDraftsList] = useState(() => getDraftDocuments());

  // Supabase Connection State
  const [supabaseUrl, setSupabaseUrl] = useState(() => {
    const saved = localStorage.getItem('supabase_url');
    return (saved && saved.trim()) ? saved.trim() : DEFAULT_SUPABASE_URL;
  });
  const [supabaseKey, setSupabaseKey] = useState(() => {
    const saved = localStorage.getItem('supabase_anon_key');
    return (saved && saved.trim()) ? saved.trim() : DEFAULT_SUPABASE_KEY;
  });
  const [isConnected, setIsConnected] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [connectionMessage, setConnectionMessage] = useState('');

  // Primary Data State
  const [suppliersList, setSuppliersList] = useState(() => getLocalItem('dd_suppliers_list_v1', INITIAL_SUPPLIERS_LIST));
  const [loggedInSupplierKey, setLoggedInSupplierKey] = useState(() => sessionStorage.getItem('selected_supplier_key') || localStorage.getItem('selected_supplier_key') || 'sejin');
  const [selectedSupplierKey, setSelectedSupplierKey] = useState(() => sessionStorage.getItem('selected_supplier_key') || localStorage.getItem('selected_supplier_key') || 'sejin');
  const [currentSupplier, setCurrentSupplier] = useState(DEFAULT_SUPPLIERS.sejin);

  // 🌟 로그인된 사용자 공급자 정보 (사이드바 프로필 및 회계/일정/히스토리 뷰 기준 - 문서 로드 시에도 절대 바뀌지 않음)
  const loggedInSupplier = useMemo(() => {
    const key = loggedInSupplierKey || sessionStorage.getItem('selected_supplier_key') || 'sejin';
    const found = suppliersList.find(s => areSupplierKeysEquivalent(s.id, key));
    if (found) {
      return {
        ...found,
        company: found.name || found.company,
        name: found.name || found.company,
        person: found.person || found.owner || '',
        tel: found.phone || found.tel || '',
        email: found.email || '',
        bank: found.bank || '',
        hasStamp: areSupplierKeysEquivalent(found.id, 'sejin')
      };
    }
    return DEFAULT_SUPPLIERS[key] || DEFAULT_SUPPLIERS.sejin;
  }, [loggedInSupplierKey, suppliersList]);
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
  const [collaborativePartners, setCollaborativePartners] = useState([]);
  const [partnerKey, setPartnerKey] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [settlementAmount, setSettlementAmount] = useState(0);
  const [settlementMemo, setSettlementMemo] = useState('');

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
  const [isDocConvertModalOpen, setIsDocConvertModalOpen] = useState(false);
  const [isExitConfirmModalOpen, setIsExitConfirmModalOpen] = useState(false);
  const [canGoBack, setCanGoBack] = useState(() => canGoBackTab());
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

  const [scheduleSubView, setScheduleSubView] = useState('calendar');

  const handleDocTypeChange = (targetType) => {
    if (docType === targetType && activeTab === 'doc') return;
    
    // 1. 현재 작성 중인 내용을 현재 docType의 draft에 즉시 저장
    setDocDrafts(prev => ({
      ...prev,
      [docType]: {
        customer, docNo, docDate, docTime, items, vatIncluded, vat, paid, paymentStatus, paymentMethod, paymentDate, validityPeriod, deliveryDate, deliveryLocation, paymentTerms, bankAccount, dueDate, receiverName, receiveDate, remark, isDocShared, collaborativePartners, partnerKey, partnerName, settlementAmount, settlementMemo, editingDocId
      }
    }));

    setDocType(targetType);
    handleRequestTabChange('doc');

    // 2. 변경할 targetType의 draft가 있으면 완벽 복원
    const draft = docDrafts[targetType];
    if (draft) {
      setCustomer(draft.customer || { name: '', person: '', phone: '', addr: '' });
      setDocNo(draft.docNo || '');
      setDocDate(draft.docDate || new Date().toISOString().split('T')[0]);
      setDocTime(draft.docTime || '10:00');
      setItems(draft.items && draft.items.length > 0 ? draft.items : [{ id: '1', code: '', name: '', unit: 'EA', qty: 1, price: 0 }]);
      setVatIncluded(draft.vatIncluded !== false);
      setVat(draft.vat || 0);
      setPaid(draft.paid || 0);
      setPaymentStatus(draft.paymentStatus || '미수금');
      setPaymentMethod(draft.paymentMethod || '계좌이체');
      setPaymentDate(draft.paymentDate || new Date().toISOString().split('T')[0]);
      setValidityPeriod(draft.validityPeriod || '');
      setDeliveryDate(draft.deliveryDate || '');
      setDeliveryLocation(draft.deliveryLocation || '');
      setPaymentTerms(draft.paymentTerms || '');
      setBankAccount(draft.bankAccount || '');
      setDueDate(draft.dueDate || '');
      setReceiverName(draft.receiverName || '');
      setReceiveDate(draft.receiveDate || '');
      setRemark(draft.remark || '');
      setIsDocShared(draft.isDocShared || false);
      setCollaborativePartners(draft.collaborativePartners || []);
      setPartnerKey(draft.partnerKey || '');
      setPartnerName(draft.partnerName || '');
      setSettlementAmount(draft.settlementAmount || 0);
      setSettlementMemo(draft.settlementMemo || '');
      setEditingDocId(draft.editingDocId || null);
    } else {
      // 3. 없으면 새 양식의 초기값 생성
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
      setIsDocShared(false);
      setCollaborativePartners([]);
      setPartnerKey('');
      setPartnerName('');
      setSettlementAmount(0);
      setSettlementMemo('');
      setEditingDocId(null);
    }
  };

  const handleRequestTabChange = (newTab, targetSubView = null, recordHistory = true) => {
    // 만약 현재 명세서 작성 중이라면, 현재 내용을 draft에 자동 백업
    if (activeTab === 'doc') {
      setDocDrafts(prev => ({
        ...prev,
        [docType]: {
          customer, docNo, docDate, docTime, items, vatIncluded, vat, paid, paymentStatus, paymentMethod, paymentDate, validityPeriod, deliveryDate, deliveryLocation, paymentTerms, bankAccount, dueDate, receiverName, receiveDate, remark, editingDocId
        }
      }));
    }

    if (targetSubView) {
      setScheduleSubView(targetSubView);
    }
    if (recordHistory !== false && newTab !== activeTab) {
      pushTabHistory(newTab);
    }
    setActiveTab(newTab);
    setCanGoBack(canGoBackTab());
  };

  // 🌟 전역 모바일 내비게이션 & 뒤로가기 제어 초기화
  useEffect(() => {
    pushTabHistory('dashboard');
    initNavigationManager({
      onNavigateTab: (targetTab) => {
        handleRequestTabChange(targetTab, null, false);
      },
      onExitConfirm: () => {
        setIsExitConfirmModalOpen(true);
      }
    });
    setCanGoBack(canGoBackTab());
  }, []);

  // 🌟 모든 팝업/모달 열림 시 백버튼(뒤로가기) 등록 (LIFO 자동 닫힘)
  useEffect(() => {
    if (!previewDoc) return;
    return registerBackHandler(() => { setPreviewDoc(null); return true; }, 'DocumentPreviewModal');
  }, [previewDoc]);

  useEffect(() => {
    if (!isDraftsModalOpen) return;
    return registerBackHandler(() => { setIsDraftsModalOpen(false); return true; }, 'DraftsModal');
  }, [isDraftsModalOpen]);

  useEffect(() => {
    if (!isAggregationModalOpen) return;
    return registerBackHandler(() => { setIsAggregationModalOpen(false); return true; }, 'StatementAggregationModal');
  }, [isAggregationModalOpen]);

  useEffect(() => {
    if (!isEstimateModalOpen) return;
    return registerBackHandler(() => { setIsEstimateModalOpen(false); return true; }, 'EstimateImportModal');
  }, [isEstimateModalOpen]);

  useEffect(() => {
    if (!isPastStatementModalOpen) return;
    return registerBackHandler(() => { setIsPastStatementModalOpen(false); return true; }, 'PastStatementImportModal');
  }, [isPastStatementModalOpen]);

  useEffect(() => {
    if (!quickCustomerModalOpen) return;
    return registerBackHandler(() => { setQuickCustomerModalOpen(false); return true; }, 'QuickCustomerModal');
  }, [quickCustomerModalOpen]);

  useEffect(() => {
    if (!isOcrModalOpen) return;
    return registerBackHandler(() => { setIsOcrModalOpen(false); return true; }, 'OcrCustomerModal');
  }, [isOcrModalOpen]);

  useEffect(() => {
    if (!isDesktopShortcutModalOpen) return;
    return registerBackHandler(() => { setIsDesktopShortcutModalOpen(false); return true; }, 'DesktopShortcutModal');
  }, [isDesktopShortcutModalOpen]);

  useEffect(() => {
    if (!isDocConvertModalOpen) return;
    return registerBackHandler(() => { setIsDocConvertModalOpen(false); return true; }, 'DocConvertModal');
  }, [isDocConvertModalOpen]);

  useEffect(() => {
    if (!openAddCustomerModal) return;
    return registerBackHandler(() => { setOpenAddCustomerModal(false); return true; }, 'OpenAddCustomerModal');
  }, [openAddCustomerModal]);

  useEffect(() => {
    if (!pendingTab && !pendingReset) return;
    return registerBackHandler(() => { setPendingTab(null); setPendingReset(false); return true; }, 'PendingUnsavedModal');
  }, [pendingTab, pendingReset]);

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
      const cleanRemark = (doc.remark || '').split('---EXT---')[0].trim();
      setRemark(cleanRemark);
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
      const cleanRemark = (doc.remark || '').split('---EXT---')[0].trim();
      setRemark(cleanRemark ? `${cleanRemark} (견적서 ${doc.doc_no || doc.docNo} 기반)` : `(견적서 ${doc.doc_no || doc.docNo} 기반)`);
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
        stamp_image: found.stamp_image || found.stampUrl || found.stamp || '',
        hasStamp: found.hasStamp !== undefined ? found.hasStamp : (!!(found.stamp_image || found.stampUrl || found.stamp) || areSupplierKeysEquivalent(selectedSupplierKey, 'sejin'))
      });
    } else if (DEFAULT_SUPPLIERS[selectedSupplierKey]) {
      const def = DEFAULT_SUPPLIERS[selectedSupplierKey];
      setCurrentSupplier({
        ...def,
        person: def.person || def.name
      });
    }
  }, [selectedSupplierKey, suppliersList]);

  const handleTestConnection = async (explicitUrl, explicitKey) => {
    setIsTesting(true);
    const targetUrl = (explicitUrl || supabaseUrl || '').trim();
    const targetKey = (explicitKey || supabaseKey || '').trim();
    if (targetUrl) localStorage.setItem('supabase_url', targetUrl);
    if (targetKey) localStorage.setItem('supabase_anon_key', targetKey);
    const result = await sbTestConnection(targetUrl, targetKey);
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

  const handleUpdateScheduleStatus = async (schId, newStatus) => {
    const target = schedulesList.find(s => s.id === schId);
    if (!target) return;
    const updatedSch = { ...target, status: newStatus };
    const updatedList = await dbSave('schedules', updatedSch, true, schedulesList);
    setSchedulesList(updatedList);
  };

  const handleNavigateWorkToDoc = (work) => {
    setDocType('거래명세서');
    if (work.customer_name) {
      const foundCust = customersList.find(c => c.name === work.customer_name);
      setCustomer({
        name: work.customer_name,
        person: foundCust?.person || foundCust?.repName || '',
        phone: work.phone || work.customer_phone || foundCust?.phone || '',
        addr: foundCust?.addr || '',
        bizno: foundCust?.bizno || '',
        selectedMachine: work.machine || work.machine_info || (foundCust?.machine ? foundCust.machine.split(',')[0].trim() : '')
      });
    }
    if (work.title) {
      setItems([{
        id: Date.now().toString(),
        code: '',
        name: `${work.machine ? `[${work.machine}] ` : ''}${work.title}`,
        unit: '식',
        qty: 1,
        price: Number(work.amount) || 0
      }]);
    }
    if (work.memo) {
      setRemark(work.memo);
    }
    setActiveTab('doc');
  };

  const badgeCounts = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayWork = schedulesList.filter(s => {
      const isMine = areSupplierKeysEquivalent(s.supplier_key, selectedSupplierKey);
      const sDate = s.start_date || s.event_date;
      const eDate = s.end_date || sDate;
      return isMine && sDate <= todayStr && todayStr <= eDate && s.status !== 'completed';
    }).length;

    let unpaidCount = 0;
    documentsList.forEach(doc => {
      const isMine = areSupplierKeysEquivalent(doc.supplier_key || doc.supplierKey, selectedSupplierKey);
      if (!isMine || doc.is_deleted || (doc.doc_type || doc.docType) === '견적서') return;
      const items = doc.items || [];
      const totalSupply = items.reduce((sum, i) => sum + (Number(i.qty) || 0) * (Number(i.price) || 0), 0);
      const vat = doc.vat_included !== false ? Math.floor(totalSupply * 0.1) : (Number(doc.vat) || 0);
      const grandTotal = totalSupply + vat;
      const paid = Number(doc.paid) || 0;
      if (grandTotal - paid > 0) unpaidCount += 1;
    });

    return { todayWork, unpaidCount };
  }, [schedulesList, documentsList, selectedSupplierKey]);

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
    const targetId = s.id || (updated.find(x => x.code === s.code)?.id);
    if (targetId && s.pwd) {
      localStorage.setItem('dd_pwd_' + targetId, s.pwd);
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
      is_shared: !!isDocShared,
      partner_key: isDocShared ? (collaborativePartners[0]?.key || partnerKey) : '',
      partner_name: isDocShared ? (collaborativePartners[0]?.name || partnerName) : '',
      settlement_amount: collaborativePartners[0]?.amount || settlementAmount,
      settlement_memo: collaborativePartners[0]?.memo || settlementMemo,
      partners: isDocShared ? collaborativePartners : []
    });
    const finalSavedNo = saveRes && saveRes.docNo ? saveRes.docNo : docNo;
    setDocNo(finalSavedNo);
    setIsSavedThisSession(true);
    alert(`✓ ${docType} (번호: ${finalSavedNo}) 저장/수정 완료!`);
    handleReloadDocuments();
  };

  const handleExecuteDocConvert = async (targetType) => {
    if (!customer || !customer.name || customer.name.trim() === '') {
      alert('❌ 거래처를 입력해야 문서 변환 저장이 가능합니다.');
      return;
    }
    const validItems = items.filter(i => i.name && i.name.trim() !== '');
    if (validItems.length === 0) {
      alert('❌ 품목을 1개 이상 입력해 주세요.');
      return;
    }

    try {
      // 1. 현재 원본 문서 먼저 저장 (Save Original)
      const origType = docType;
      const saveRes = await dbSaveDocument({
        id: editingDocId,
        docType: origType,
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
      const savedOrigNo = saveRes && saveRes.docNo ? saveRes.docNo : docNo;

      // 2. 새로운 targetType 문서 번호 생성
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const newTargetDocNo = generateNextDocNo(todayStr, documentsList, selectedSupplierKey, customer, targetType, suppliersList, customersList);

      // 3. targetType으로 전환 및 새 문서 세팅 (기존 품목 및 거래처 데이터는 그대로 유지)
      setDocType(targetType);
      setDocNo(newTargetDocNo);
      setDocDate(todayStr);
      setDocTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
      setEditingDocId(null); // 신규 독립 문서
      setIsDocConvertModalOpen(false);
      handleReloadDocuments();

      alert(`✓ 원본 [${origType}] (${savedOrigNo})가 저장되었습니다.\n✓ 새로운 [${targetType}] (${newTargetDocNo})로 복사 전환되었습니다!`);
    } catch (err) {
      console.error('문서 변환 오류:', err);
      alert('문서 변환 중 오류가 발생했습니다.');
    }
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

    // 🌟 원본 문서의 공급자(supplier_key 및 supplier_data) 완벽 복원
    const rawSupplierKey = doc.supplier_key || doc.supplierKey || doc.supplier_data?.id || (doc.supplier && doc.supplier.id) || '';
    const rawSupplierName = doc.supplier_name || doc.supplier_data?.name || doc.supplier_data?.company || (doc.supplier && (doc.supplier.company || doc.supplier.name)) || '';

    const matchedSupplier = suppliersList.find(s => 
      (rawSupplierKey && areSupplierKeysEquivalent(s.id, rawSupplierKey)) ||
      (rawSupplierName && (areSupplierKeysEquivalent(s.name, rawSupplierName) || areSupplierKeysEquivalent(s.company, rawSupplierName)))
    );

    const finalSupplierKey = matchedSupplier ? matchedSupplier.id : (rawSupplierKey || selectedSupplierKey);
    setSelectedSupplierKey(finalSupplierKey);

    const docSupplierData = doc.supplier_data || doc.supplier;
    if (docSupplierData && typeof docSupplierData === 'object' && (docSupplierData.company || docSupplierData.name || docSupplierData.bizno)) {
      setCurrentSupplier({
        ...docSupplierData,
        id: finalSupplierKey,
        company: docSupplierData.company || docSupplierData.name || '',
        name: docSupplierData.name || docSupplierData.company || '',
        person: docSupplierData.person || docSupplierData.owner || '',
        tel: docSupplierData.tel || docSupplierData.phone || '',
        email: docSupplierData.email || '',
        bank: docSupplierData.bank || '',
        hasStamp: docSupplierData.hasStamp !== undefined ? docSupplierData.hasStamp : areSupplierKeysEquivalent(finalSupplierKey, 'sejin')
      });
    } else if (matchedSupplier) {
      setCurrentSupplier({
        ...matchedSupplier,
        id: matchedSupplier.id,
        company: matchedSupplier.name || matchedSupplier.company,
        name: matchedSupplier.name || matchedSupplier.company,
        person: matchedSupplier.person || matchedSupplier.owner || '',
        tel: matchedSupplier.phone || matchedSupplier.tel || '',
        email: matchedSupplier.email || '',
        bank: matchedSupplier.bank || '',
        stamp_image: matchedSupplier.stamp_image || matchedSupplier.stampUrl || matchedSupplier.stamp || '',
        hasStamp: matchedSupplier.hasStamp !== undefined ? matchedSupplier.hasStamp : (!!(matchedSupplier.stamp_image || matchedSupplier.stampUrl || matchedSupplier.stamp) || areSupplierKeysEquivalent(matchedSupplier.id, 'sejin'))
      });
    } else if (DEFAULT_SUPPLIERS[finalSupplierKey]) {
      setCurrentSupplier(DEFAULT_SUPPLIERS[finalSupplierKey]);
    }

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
    setRemark((doc.remark || '').split('---EXT---')[0].trim());

    const docPartners = normalizePartners(doc);
    setIsDocShared(doc.is_shared === true || !!doc.partner_key || docPartners.length > 0);
    setCollaborativePartners(docPartners);
    setPartnerKey(doc.partner_key || docPartners[0]?.key || '');
    setPartnerName(doc.partner_name || docPartners[0]?.name || '');
    setSettlementAmount(Number(doc.settlement_amount) || docPartners[0]?.amount || 0);
    setSettlementMemo(doc.settlement_memo || docPartners[0]?.memo || '');

    setEditingDocId(doc.id || null);
    setIsSavedThisSession(true);
    setActiveTab('doc');
  };

  const handleResetForm = () => {
    const now = new Date();
    const todayDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const emptyCust = { name: '', person: '', phone: '', addr: '' };
    
    // 신규 작성 시 현재 로그인된 사용자의 공급자로 복원
    const sessionSupplierKey = sessionStorage.getItem('selected_supplier_key') || localStorage.getItem('selected_supplier_key') || 'sejin';
    const foundSupplier = suppliersList.find(s => areSupplierKeysEquivalent(s.id, sessionSupplierKey));
    if (foundSupplier) {
      setSelectedSupplierKey(foundSupplier.id);
      setCurrentSupplier({
        ...foundSupplier,
        company: foundSupplier.name || foundSupplier.company,
        person: foundSupplier.person || foundSupplier.owner || '',
        tel: foundSupplier.phone || foundSupplier.tel || '',
        email: foundSupplier.email || '',
        bank: foundSupplier.bank || '',
        stamp_image: foundSupplier.stamp_image || foundSupplier.stampUrl || foundSupplier.stamp || '',
        hasStamp: foundSupplier.hasStamp !== undefined ? foundSupplier.hasStamp : (!!(foundSupplier.stamp_image || foundSupplier.stampUrl || foundSupplier.stamp) || areSupplierKeysEquivalent(foundSupplier.id, 'sejin'))
      });
    } else if (DEFAULT_SUPPLIERS[sessionSupplierKey]) {
      setSelectedSupplierKey(sessionSupplierKey);
      setCurrentSupplier(DEFAULT_SUPPLIERS[sessionSupplierKey]);
    }

    setDocDate(todayDateStr);
    setDocTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
    setCustomer(emptyCust);
    setDocNo(generateNextDocNo(todayDateStr, documentsList, sessionSupplierKey, emptyCust, docType, suppliersList, customersList));
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
    setCollaborativePartners([]);
    setPartnerKey('');
    setPartnerName('');
    setSettlementAmount(0);
    setSettlementMemo('');
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
          setLoggedInSupplierKey(key);
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
    <div className="app-shell">
      {/* 1. PC 고정 좌측 사이드바 & 모바일 슬라이드 드로어 */}
      <Sidebar
        activeTab={activeTab}
        docType={docType}
        onSelectTab={handleRequestTabChange}
        onSelectDocType={handleDocTypeChange}
        isOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
        userRole={userRole}
        loggedInSupplier={loggedInSupplier}
        currentSupplier={loggedInSupplier}
        selectedSupplierKey={loggedInSupplierKey}
        setSelectedSupplierKey={(newKey) => {
          setLoggedInSupplierKey(newKey);
          setSelectedSupplierKey(newKey);
          sessionStorage.setItem('selected_supplier_key', newKey);
          localStorage.setItem('selected_supplier_key', newKey);
        }}
        suppliersList={suppliersList}
        onLogout={handleLogout}
        onOpenExitModal={() => setIsExitConfirmModalOpen(true)}
        badgeCounts={badgeCounts}
      />

      {/* 2. 메인 뷰포트 영역 */}
      <div className="main-viewport">
        <Header
          activeTab={activeTab}
          setActiveTab={handleRequestTabChange}
          isConnected={isConnected}
          isTesting={isTesting}
          connectionMessage={connectionMessage}
          docType={docType}
          onSelectDocType={handleDocTypeChange}
          onOpenSidebar={() => setMobileSidebarOpen(true)}
          userRole={userRole}
          currentSupplier={currentSupplier}
          selectedSupplierKey={selectedSupplierKey}
          suppliersList={suppliersList}
          canGoBack={canGoBack}
          onBack={() => triggerBackAction({ onNavigateTab: (tab) => handleRequestTabChange(tab, null, false) })}
          onOpenExitModal={() => setIsExitConfirmModalOpen(true)}
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
          onPreviewDoc={setPreviewDoc}
        />

        <PastStatementImportModal
          isOpen={isPastStatementModalOpen}
          onClose={() => setIsPastStatementModalOpen(false)}
          initialCustomerName={customer.name || ''}
          selectedSupplierKey={selectedSupplierKey}
          onApplyStatement={handleApplyPastStatement}
          onPreviewDoc={setPreviewDoc}
        />

        <OcrCustomerModal
          isOpen={isOcrModalOpen}
          onClose={() => setIsOcrModalOpen(false)}
          customers={customersList}
          onSaveCustomer={handleSaveCustomer}
          isAdmin={userRole === 'admin'}
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

        <DocConvertModal
          isOpen={isDocConvertModalOpen}
          onClose={() => setIsDocConvertModalOpen(false)}
          currentDocType={docType}
          customerName={customer?.name || ''}
          itemCount={items.filter(i => i.name && i.name.trim() !== '').length}
          totalAmount={items.reduce((sum, i) => sum + (Number(i.qty) || 0) * (Number(i.price) || 0), 0) + (vatIncluded ? Math.floor(items.reduce((sum, i) => sum + (Number(i.qty) || 0) * (Number(i.price) || 0), 0) * 0.1) : (Number(vat) || 0))}
          onConfirmConvert={handleExecuteDocConvert}
        />

        <main className="main-content">
          {/* 1. 홈 (대시보드 탭) */}
          {activeTab === 'dashboard' && (
            <DashboardTab
              documentsList={documentsList}
              schedulesList={schedulesList}
              customersList={customersList}
              selectedSupplierKey={loggedInSupplierKey}
              currentSupplier={loggedInSupplier}
              onNavigateTab={handleRequestTabChange}
              onSelectDocType={handleDocTypeChange}
              onUpdateScheduleStatus={handleUpdateScheduleStatus}
              onSelectCustomer={(c) => {
                setCustomer(c);
              }}
              onOpenNewScheduleModal={() => {
                handleRequestTabChange('schedule', 'work_orders');
              }}
            />
          )}

          {/* 2. 명세서 작성 탭 (거래명세서, 견적서, 청구서) */}
          {activeTab === 'doc' && (
            <StatementTab
              docType={docType}
              setDocType={handleDocTypeChange}
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
              onOpenConvertModal={() => setIsDocConvertModalOpen(true)}
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
              partners={collaborativePartners}
              setPartners={setCollaborativePartners}
              partnerKey={partnerKey}
              setPartnerKey={setPartnerKey}
              partnerName={partnerName}
              setPartnerName={setPartnerName}
              settlementAmount={settlementAmount}
              setSettlementAmount={setSettlementAmount}
              settlementMemo={settlementMemo}
              setSettlementMemo={setSettlementMemo}
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

          {/* 3. 문서조회 탭 */}
          {activeTab === 'history' && (
            <DocHistoryTab
              onLoadDocument={handleLoadDocument}
              onCopyDocument={handleCopyDocument}
              onConvertToDoc={handleConvertToDocument}
              isConnected={isConnected}
              selectedSupplierKey={loggedInSupplierKey}
              onPreviewDocument={(doc) => setPreviewDoc(doc)}
            />
          )}

          {/* 4. 일정 / 예약 탭 */}
          {activeTab === 'schedule' && (
            <ScheduleTab
              schedules={schedulesList}
              documentsList={documentsList}
              selectedSupplierKey={loggedInSupplierKey}
              suppliersList={suppliersList}
              onSaveSchedule={handleSaveSchedule}
              onDeleteSchedule={handleDeleteSchedule}
              onUpdateScheduleStatus={handleUpdateScheduleStatus}
              onNavigateToDoc={handleNavigateWorkToDoc}
              onLoadDocument={handleLoadDocument}
              onPreviewDocument={(doc) => setPreviewDoc(doc)}
            />
          )}

          {/* 5. 미수금 / 회계 탭 */}
          {activeTab === 'accounting' && (
            <AccountingTab
              documents={documentsList}
              customersList={customersList}
              suppliersList={suppliersList}
              selectedSupplierKey={loggedInSupplierKey}
              currentSupplier={loggedInSupplier}
              onUpdateDocumentPaid={handleUpdateDocumentPaid}
              onDeleteDocument={dbDeleteDocument}
              onPreviewDocument={(doc) => setPreviewDoc(doc)}
              onUpdateDocumentSettlement={async (docId, settlementData) => {
                const updated = await dbUpdateDocumentSettlement(docId, settlementData);
                setDocumentsList(updated);
              }}
            />
          )}

          {/* 7. 고객관리 탭 */}
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

          {/* 8. 공급자 관리 (관리자 전용) */}
          {activeTab === 'suppliers' && userRole === 'admin' && (
            <SupplierTab
              suppliers={suppliersList}
              onSaveSupplier={handleSaveSupplier}
              onDeleteSupplier={handleDeleteSupplier}
            />
          )}

          {/* 9. 부품재고 탭 */}
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

          {/* 10. 설정 탭 */}
          {activeTab === 'settings' && (
            <SettingsTab
              currentSupplier={currentSupplier}
              selectedSupplierKey={selectedSupplierKey}
              suppliersList={suppliersList}
              onSaveSupplier={handleSaveSupplier}
              onNavigateToSuppliers={() => setActiveTab('suppliers')}
              supabaseUrl={supabaseUrl}
              setSupabaseUrl={setSupabaseUrl}
              supabaseKey={supabaseKey}
              setSupabaseKey={setSupabaseKey}
              isConnected={isConnected}
              isTesting={isTesting}
              connectionMessage={connectionMessage}
              onTestConnection={handleTestConnection}
              userRole={userRole}
              isAdmin={userRole === 'admin'}
            />
          )}
        </main>
      </div>

      {/* Pending Unsaved Changes Navigation Confirmation Modal */}
      {(pendingTab || pendingReset) && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal-content" style={{ maxWidth: '420px', textAlign: 'center', padding: '1.75rem 1.25rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>💾</div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '900', marginBottom: '0.5rem', color: 'var(--text-main)' }}>
              작성 중인 문서를 저장하시겠습니까?
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: '1.5' }}>
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
                style={{ width: '100%', minHeight: '36px', fontSize: '0.8125rem' }}
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

      {/* Global Mobile/Desktop Exit Confirmation Modal */}
      <ExitConfirmModal
        isOpen={isExitConfirmModalOpen}
        onClose={() => setIsExitConfirmModalOpen(false)}
        onLogout={handleLogout}
        onExit={performExitApp}
      />
    </div>
  );
}
