import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header.jsx';
import StatementTab from './components/StatementTab.jsx';
import AccountingTab from './components/AccountingTab.jsx';
import CustomerTab from './components/CustomerTab.jsx';
import SupplierTab from './components/SupplierTab.jsx';
import PartsTab from './components/PartsTab.jsx';

import {
  DEFAULT_SUPPLIERS,
  INITIAL_SUPPLIERS_LIST,
  DEMO_CUSTOMERS,
  DEMO_PARTS
} from './services/defaults.js';

import {
  getStoredCredentials,
  saveStoredCredentials,
  getLocalItem,
  setLocalItem,
  testSupabaseConnection,
  fetchCustomers,
  saveCustomer,
  deleteCustomer,
  fetchSuppliers,
  saveSupplier,
  deleteSupplier,
  fetchParts,
  savePart,
  deletePart,
  saveDocument,
  fetchDocuments,
  updateDocumentPaid,
  deleteDocument
} from './services/storage.js';

export default function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState('doc');

  // Supabase state
  const creds = getStoredCredentials();
  const [supabaseUrl, setSupabaseUrl] = useState(creds.url);
  const [supabaseKey, setSupabaseKey] = useState(creds.key);
  const [isConnected, setIsConnected] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [connectionMessage, setConnectionMessage] = useState('');

  // Suppliers dataset & Active supplier
  const [suppliersList, setSuppliersList] = useState(() => getLocalItem('dd_suppliers_list_v1', INITIAL_SUPPLIERS_LIST));
  const [selectedSupplierKey, setSelectedSupplierKey] = useState(() => localStorage.getItem('selected_supplier_key') || 'sejin');
  const [currentSupplier, setCurrentSupplier] = useState(() => DEFAULT_SUPPLIERS[selectedSupplierKey] || DEFAULT_SUPPLIERS.sejin);

  // Customers dataset & Active Customer
  const [customersList, setCustomersList] = useState(() => getLocalItem('dd_customers_list_v1', DEMO_CUSTOMERS));
  const [customer, setCustomer] = useState({ name: '', person: '', phone: '', addr: '' });

  // Parts dataset
  const [partsList, setPartsList] = useState(() => getLocalItem('dd_parts_list_v1', DEMO_PARTS));

  // Document metadata & items
  const [docType, setDocType] = useState('거래명세서');
  const [docNo, setDocNo] = useState('');
  const [docDate, setDocDate] = useState('');
  const [docTime, setDocTime] = useState('');
  const [items, setItems] = useState([
    { id: '1', code: 'P0001', name: '엔진오일 필터', unit: 'EA', qty: 2, price: 25000 },
    { id: '2', code: 'P0002', name: '유압유 20L', unit: 'CAN', qty: 1, price: 85000 }
  ]);
  const [vat, setVat] = useState(0);
  const [vatIncluded, setVatIncluded] = useState(true);
  const [paid, setPaid] = useState(0);
  const [remark, setRemark] = useState('');

  // Initialize date & time defaults
  useEffect(() => {
    const now = new Date();
    const pad = (num) => String(num).padStart(2, '0');
    setDocDate(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`);
    setDocTime(`${pad(now.getHours())}:${pad(now.getMinutes())}`);
    setDocNo(`${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-001`);
  }, []);

  // Update active supplier whenever key or list changes
  useEffect(() => {
    localStorage.setItem('selected_supplier_key', selectedSupplierKey);
    const found = suppliersList.find(s => s.id === selectedSupplierKey);
    if (found) {
      setCurrentSupplier({
        ...found,
        company: found.name,
        tel: found.phone || found.tel,
        hasStamp: selectedSupplierKey === 'sejin'
      });
    } else if (DEFAULT_SUPPLIERS[selectedSupplierKey]) {
      setCurrentSupplier(DEFAULT_SUPPLIERS[selectedSupplierKey]);
    }
  }, [selectedSupplierKey, suppliersList]);

  // ── 연결 테스트 & 클라우드 데이터 로드 ─────────────────────────────────────
  const handleTestConnection = useCallback(async () => {
    setIsTesting(true);
    saveStoredCredentials(supabaseUrl, supabaseKey);

    const result = await testSupabaseConnection(supabaseUrl, supabaseKey);
    setIsConnected(result.ok);
    setConnectionMessage(result.message);
    setIsTesting(false);

    if (result.ok && !result.isTableMissing) {
      // 클라우드에서 모든 데이터 새로고침
      const [cloudCusts, cloudSupps, cloudParts] = await Promise.all([
        fetchCustomers(),
        fetchSuppliers(),
        fetchParts()
      ]);
      setCustomersList(cloudCusts);
      setSuppliersList(cloudSupps.length > 0 ? cloudSupps : suppliersList);
      setPartsList(cloudParts.length > 0 ? cloudParts : partsList);
    }
  }, [supabaseUrl, supabaseKey]);

  // 초기 로드 시 저장된 크리덴셜로 자동 연결 시도
  useEffect(() => {
    if (supabaseUrl && supabaseKey) {
      handleTestConnection();
    }
  }, []);

  // Documents dataset
  const [documentsList, setDocumentsList] = useState([]);

  // Load documents initially & on tab change
  useEffect(() => {
    fetchDocuments().then(data => setDocumentsList(data));
  }, []);

  // 탭 전환 시 해당 탭 데이터 새로고침
  useEffect(() => {
    if (activeTab === 'accounting' || activeTab === 'doc') {
      fetchDocuments().then(data => setDocumentsList(data));
    }
    if (!isConnected) return;
    if (activeTab === 'customers') {
      fetchCustomers().then(data => setCustomersList(data));
    } else if (activeTab === 'suppliers') {
      fetchSuppliers().then(data => { if (data.length > 0) setSuppliersList(data); });
    } else if (activeTab === 'parts') {
      fetchParts().then(data => { if (data.length > 0) setPartsList(data); });
    }
  }, [activeTab, isConnected]);

  // ── Customer Management Handlers ────────────────────────────────────────────
  const handleSaveCustomer = async (custData, isEdit) => {
    const updated = await saveCustomer(custData, isEdit);
    setCustomersList(updated);
    alert('✓ 거래처 정보가 저장되었습니다.');
  };

  const handleDeleteCustomer = async (id) => {
    if (!window.confirm('거래처를 삭제하시겠습니까?')) return;
    const updated = await deleteCustomer(id);
    setCustomersList(updated);
  };

  const handleSelectCustomer = (cust) => {
    setCustomer({
      name: cust.name || '',
      person: cust.person || '',
      phone: cust.phone || '',
      addr: cust.addr || ''
    });
    setActiveTab('doc');
  };

  // ── Supplier Management Handlers ────────────────────────────────────────────
  const handleSaveSupplier = async (supplierData, isEdit) => {
    const updated = await saveSupplier(supplierData, isEdit);
    setSuppliersList(updated);
    alert('✓ 공급자 정보가 저장되었습니다.');
  };

  const handleDeleteSupplier = async (id) => {
    if (!window.confirm('공급자를 삭제하시겠습니까?')) return;
    const updated = await deleteSupplier(id);
    setSuppliersList(updated);
  };

  const handleSelectSupplier = (supplier) => {
    setSelectedSupplierKey(supplier.id);
    setActiveTab('doc');
  };

  // ── Parts Management Handlers ────────────────────────────────────────────────
  const handleSavePart = async (partData, isEdit) => {
    const updated = await savePart(partData, isEdit);
    setPartsList(updated);
    alert('✓ 부품 정보가 저장되었습니다.');
  };

  const handleDeletePart = async (id) => {
    if (!window.confirm('부품을 삭제하시겠습니까?')) return;
    const updated = await deletePart(id);
    setPartsList(updated);
  };

  const handleSelectPart = (part) => {
    const newItem = {
      id: Date.now().toString(),
      code: part.code || '',
      name: part.name || '',
      unit: part.unit || 'EA',
      qty: 1,
      price: Number(part.price) || 0
    };
    if (items.length === 1 && !items[0].name.trim()) {
      setItems([newItem]);
    } else {
      setItems([...items, newItem]);
    }
    setActiveTab('doc');
  };

  // ── Document Handlers ────────────────────────────────────────────────────────
  const handleResetForm = () => {
    if (window.confirm('명세서 내용을 초기화하시겠습니까?')) {
      const now = new Date();
      const pad = (num) => String(num).padStart(2, '0');
      setDocNo(`${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${String(Math.floor(Math.random() * 100)).padStart(3, '0')}`);
      setCustomer({ name: '', person: '', phone: '', addr: '' });
      setItems([{ id: Date.now().toString(), code: '', name: '', unit: 'EA', qty: 1, price: 0 }]);
      setPaid(0);
      setRemark('');
    }
  };

  const handleSaveDocument = async () => {
    const docData = {
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
      remark
    };
    const updatedDocs = await saveDocument(docData);
    if (Array.isArray(updatedDocs)) setDocumentsList(updatedDocs);
    alert(`✓ ${docType} (번호: ${docNo}) 문서가 저장되었습니다!`);
  };

  const handleUpdateDocumentPaid = async (docId, newPaidAmount, newRemark) => {
    const updatedDocs = await updateDocumentPaid(docId, newPaidAmount, newRemark);
    setDocumentsList(updatedDocs);
    alert('✓ 수금 내역이 성공적으로 업데이트되었습니다.');
  };

  const handleDeleteDocument = async (docId) => {
    if (!window.confirm('해당 문서/거래내역을 삭제하시겠습니까?')) return;
    const updatedDocs = await deleteDocument(docId);
    setDocumentsList(updatedDocs);
  };

  return (
    <div className="app-container">
      {/* Navigation & Connection Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isConnected={isConnected}
        isTesting={isTesting}
        connectionMessage={connectionMessage}
        supabaseUrl={supabaseUrl}
        setSupabaseUrl={setSupabaseUrl}
        supabaseKey={supabaseKey}
        setSupabaseKey={setSupabaseKey}
        onTestConnection={handleTestConnection}
      />

      {/* Main Content Area based on Active Tab */}
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
            vat={vat}
            setVat={setVat}
            vatIncluded={vatIncluded}
            setVatIncluded={setVatIncluded}
            paid={paid}
            setPaid={setPaid}
            remark={remark}
            setRemark={setRemark}
            onResetForm={handleResetForm}
            onSaveDocument={handleSaveDocument}
          />
        )}

        {activeTab === 'accounting' && (
          <AccountingTab
            documents={documentsList}
            customersList={customersList}
            suppliersList={suppliersList}
            onUpdateDocumentPaid={handleUpdateDocumentPaid}
            onDeleteDocument={handleDeleteDocument}
          />
        )}

        {activeTab === 'customers' && (
          <CustomerTab
            customers={customersList}
            onSaveCustomer={handleSaveCustomer}
            onDeleteCustomer={handleDeleteCustomer}
            onSelectCustomer={handleSelectCustomer}
          />
        )}

        {activeTab === 'suppliers' && (
          <SupplierTab
            suppliers={suppliersList}
            onSaveSupplier={handleSaveSupplier}
            onDeleteSupplier={handleDeleteSupplier}
            onSelectSupplier={handleSelectSupplier}
          />
        )}

        {activeTab === 'parts' && (
          <PartsTab
            parts={partsList}
            onSavePart={handleSavePart}
            onDeletePart={handleDeletePart}
            onSelectPart={handleSelectPart}
          />
        )}
      </main>
    </div>
  );
}
