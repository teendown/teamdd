// 🎨 TEAM D.D CUSTOMER MANAGEMENT TAB
import React, { useState, useMemo, useEffect } from 'react';
import CustomerEditModal from '../modals/CustomerEditModal.jsx';

export default function CustomerTab({
  customers = [],
  onSaveCustomer,
  onDeleteCustomer,
  onSelectCustomer,
  openAddModal,
  setOpenAddModal,
  onSyncCustomers,
  onOpenOcrModal
}) {
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [selectMachineCustomer, setSelectMachineCustomer] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const uniqueCustomers = useMemo(() => {
    const seen = new Set();
    const list = [];
    (customers || []).forEach(c => {
      if (!c || !c.name || !c.name.trim() || c.name.trim() === '미지정') return;
      const key = c.name.trim().toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        list.push(c);
      }
    });
    return list;
  }, [customers]);

  const filtered = uniqueCustomers.filter(c => {
    if (!c || !c.name) return false;
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    const cleanNum = search.trim().replace(/[^0-9]/g, '');

    const name = (c.name || '').toLowerCase();
    const person = (c.person || c.repName || '').toLowerCase();
    const phone = (c.phone || '').replace(/[^0-9]/g, '');
    const bizno = (c.bizno || '').replace(/[^0-9]/g, '');
    const addr = (c.addr || '').toLowerCase();
    const machine = (c.machine || '').toLowerCase();
    const memo = (c.memo || '').toLowerCase();

    return name.includes(q) || 
           person.includes(q) || 
           (cleanNum.length >= 1 && phone.includes(cleanNum)) || 
           (cleanNum.length >= 2 && bizno.includes(cleanNum)) || 
           addr.includes(q) || 
           machine.includes(q) || 
           memo.includes(q);
  });

  const handleOpenAdd = () => {
    setModalMode('add');
    setEditingCustomer(null);
    setShowModal(true);
  };

  const handleManualSync = async () => {
    if (!onSyncCustomers) return;
    setIsSyncing(true);
    await onSyncCustomers();
    setIsSyncing(false);
    alert('✓ 발행된 모든 문서의 거래처가 고객관리에 완벽하게 동기화되었습니다!');
  };

  useEffect(() => {
    if (openAddModal) {
      setModalMode('add');
      setEditingCustomer(null);
      setShowModal(true);
      if (setOpenAddModal) setOpenAddModal(false);
    }
  }, [openAddModal, customers.length, setOpenAddModal]);

  const handleOpenView = (c) => {
    setModalMode('view');
    setEditingCustomer(c);
    setShowModal(true);
  };

  const renderMachineDisplay = (machineStr) => {
    if (!machineStr) return '-';
    const list = machineStr.split(',').map(s => s.trim()).filter(Boolean);
    if (list.length === 0) return '-';
    if (list.length === 1) return <span style={{ fontWeight: 'bold' }}>{list[0]}</span>;
    return (
      <span style={{ fontWeight: 'bold' }}>
        {list[0]}{' '}
        <span style={{ fontSize: '0.6875rem', color: '#3b82f6' }}>
          {`(외 ${list.length - 1}대)`}
        </span>
      </span>
    );
  };

  const handleSelectInvoice = (c) => {
    const list = c.machine ? c.machine.split(',').map(s => s.trim()).filter(Boolean) : [];
    if (list.length > 1) {
      setSelectMachineCustomer({
        ...c,
        parsedMachines: list
      });
    } else {
      onSelectCustomer({
        ...c,
        selectedMachine: list[0] || ''
      });
    }
  };

  return (
    <div className="management-container">
      <div className="card-box">
        <div className="card-box-header">
          <h2 style={{ fontSize: '1.125rem', fontWeight: '900' }}>👥 고객 (거래처) 관리</h2>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              className="btn btn-outline"
              style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
              onClick={handleManualSync}
              disabled={isSyncing}
            >
              {isSyncing ? "⏳ 동기화 중..." : "🔄 문서 거래처 동기화"}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              style={{
                backgroundColor: '#7c3aed',
                borderColor: '#7c3aed',
                fontSize: '0.75rem',
                padding: '0.4rem 0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontWeight: '700',
                boxShadow: '0 2px 4px rgba(124, 58, 237, 0.25)'
              }}
              onClick={() => onOpenOcrModal && onOpenOcrModal()}
            >
              📷 명함/등록증 AI 자동등록
            </button>
            <button className="btn btn-primary" onClick={handleOpenAdd}>
              + 거래처 추가
            </button>
          </div>
        </div>

        <div style={{ padding: '0.75rem', backgroundColor: '#f9fafb' }}>
          <input
            type="text"
            className="form-input"
            placeholder="상호명, 기종, 담당자, 연락처 검색..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Mobile Cards View */}
        <div className="mobile-cards-view">
          {filtered.map(c => (
            <div key={c.id} className="mobile-data-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
                <span style={{ fontWeight: '900', fontSize: '0.9375rem' }}>{c.name}</span>
                <span style={{ fontSize: '0.6875rem', color: '#6b7280', fontFamily: 'monospace' }}>{c.code}</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#4b5563', marginBottom: '0.5rem' }}>
                <div>기종: {renderMachineDisplay(c.machine)}</div>
                <div>담당자: {c.person || '-'}</div>
                <div>연락처: {c.phone || '-'}</div>
              </div>
              <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '0.375rem' }}>
                <button
                  className="btn btn-outline"
                  style={{ flex: 1, minHeight: '32px', fontSize: '0.75rem' }}
                  onClick={() => handleOpenView(c)}
                >
                  상세조회
                </button>
              </div>
              <button
                className="btn btn-primary"
                style={{ width: '100%', minHeight: '36px', fontSize: '0.75rem' }}
                onClick={() => handleSelectInvoice(c)}
              >
                명세서에 선택
              </button>
            </div>
          ))}
        </div>

        {/* Desktop Table View */}
        <div className="desktop-table-view">
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>상호명</th>
                <th>기종</th>
                <th>담당자</th>
                <th>연락처</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id}>
                  <td style={{ fontFamily: 'monospace' }}>{c.code}</td>
                  <td style={{ fontWeight: '700' }}>{c.name}</td>
                  <td>{renderMachineDisplay(c.machine)}</td>
                  <td>{c.person || '-'}</td>
                  <td>{c.phone || '-'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        className="btn btn-primary"
                        style={{ fontSize: '10px', padding: '4px 6px' }}
                        onClick={() => handleSelectInvoice(c)}
                      >
                        명세서 선택
                      </button>
                      <button
                        className="btn btn-outline"
                        style={{ fontSize: '10px', padding: '4px 6px' }}
                        onClick={() => handleOpenView(c)}
                      >
                        상세조회
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <CustomerEditModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          modalMode={modalMode}
          initialData={editingCustomer}
          customers={customers}
          onSaveCustomer={onSaveCustomer}
          onDeleteCustomer={onDeleteCustomer}
        />
      )}

      {selectMachineCustomer && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '300px', textAlign: 'center' }}>
            <h3 style={{ marginBottom: '1rem', fontWeight: '900' }}>🚜 기종 선택</h3>
            <p style={{ fontSize: '0.875rem', color: '#4b5563', marginBottom: '1rem' }}>
              명세서를 작성할 장비를 선택해 주세요.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {selectMachineCustomer.parsedMachines.map((m, idx) => (
                <button
                  key={idx}
                  className="btn btn-outline"
                  style={{ textAlign: 'left', padding: '0.75rem', fontWeight: 'bold' }}
                  onClick={() => {
                    onSelectCustomer({
                      ...selectMachineCustomer,
                      selectedMachine: m
                    });
                    setSelectMachineCustomer(null);
                  }}
                >
                  {m}
                </button>
              ))}
              <button
                className="btn btn-red-outline"
                style={{ marginTop: '0.5rem' }}
                onClick={() => setSelectMachineCustomer(null)}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
