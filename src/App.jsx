import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header.jsx';
import StatementTab from './components/StatementTab.jsx';
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
  deleteCustomer
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

  // Test connection helper
  const handleTestConnection = useCallback(async () => {
    setIsTesting(true);
    saveStoredCredentials(supabaseUrl, supabaseKey);
    const result = await testSupabaseConnection(supabaseUrl, supabaseKey);
    setIsConnected(result.ok);
    setConnectionMessage(result.message);
    setIsTesting(false);

    if (result.ok) {
      // Refresh customers list from cloud
      const cloudCusts = await fetchCustomers(supabaseUrl, supabaseKey);
      setCustomersList(cloudCusts);
    }
  }, [supabaseUrl, supabaseKey]);

  // Auto test connection on initial load if credentials exist
  useEffect(() => {
    if (supabaseUrl && supabaseKey) {
      handleTestConnection();
    }
  }, []);

  // Customer Management Handlers
  const handleSaveCustomer = async (custData, isEdit) => {
    const updated = await saveCustomer(supabaseUrl, supabaseKey, custData, isEdit);
    setCustomersList(updated);
    alert('✓ 거래처 정보가 저장되었습니다.');
  };

  const handleDeleteCustomer = async (id) => {
    const updated = await deleteCustomer(supabaseUrl, supabaseKey, id);
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

  // Supplier Management Handlers
  const handleSaveSupplier = (supplierData, isEdit) => {
    let updated;
    if (isEdit) {
      updated = suppliersList.map(s => s.id === supplierData.id ? { ...s, ...supplierData } : s);
    } else {
      updated = [{ ...supplierData, id: supplierData.id || `supp_${Date.now()}` }, ...suppliersList];
    }
    setSuppliersList(updated);
    setLocalItem('dd_suppliers_list_v1', updated);
    alert('✓ 공급자 정보가 저장되었습니다.');
  };

  const handleDeleteSupplier = (id) => {
    const updated = suppliersList.filter(s => s.id !== id);
    setSuppliersList(updated);
    setLocalItem('dd_suppliers_list_v1', updated);
  };

  const handleSelectSupplier = (supplier) => {
    setSelectedSupplierKey(supplier.id);
    setActiveTab('doc');
  };

  // Parts Management Handlers
  const handleSavePart = (partData, isEdit) => {
    let updated;
    if (isEdit) {
      updated = partsList.map(p => p.id === partData.id ? { ...p, ...partData } : p);
    } else {
      updated = [{ ...partData, id: partData.id || `part_${Date.now()}` }, ...partsList];
    }
    setPartsList(updated);
    setLocalItem('dd_parts_list_v1', updated);
    alert('✓ 부품 정보가 저장되었습니다.');
  };

  const handleDeletePart = (id) => {
    const updated = partsList.filter(p => p.id !== id);
    setPartsList(updated);
    setLocalItem('dd_parts_list_v1', updated);
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
    // Replace first empty item or append
    if (items.length === 1 && !items[0].name.trim()) {
      setItems([newItem]);
    } else {
      setItems([...items, newItem]);
    }
    setActiveTab('doc');
  };

  // Reset form
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

  // Save document state locally / cloud
  const handleSaveDocument = () => {
    const docs = getLocalItem('dd_documents_history_v1', []);
    const newDoc = {
      id: `doc_${Date.now()}`,
      docType,
      docNo,
      docDate,
      docTime,
      supplier: currentSupplier,
      customer,
      items,
      createdAt: new Date().toISOString()
    };
    setLocalItem('dd_documents_history_v1', [newDoc, ...docs]);
    alert(`✓ ${docType} (번호: ${docNo}) 문서가 성공적으로 저장되었습니다!`);
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
