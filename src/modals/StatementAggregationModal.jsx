// 🎨 TEAM D.D STATEMENT AGGREGATION MODAL
import React, { useState, useEffect } from 'react';
import { fetchDocuments } from '../services/documentService.js';
import { areSupplierKeysEquivalent } from '../utils/validation.js';

export default function StatementAggregationModal({
  isOpen,
  onClose,
  customer,
  selectedSupplierKey,
  onApply
}) {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [statements, setStatements] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && customer && customer.name) {
      loadStatements();
    }
  }, [isOpen, startDate, endDate, selectedSupplierKey, customer]);

  const loadStatements = async () => {
    setIsLoading(true);
    try {
      const docs = await fetchDocuments();
      const filtered = docs.filter(d => 
        (d.doc_type === '거래명세서' || d.docType === '거래명세서') && 
        (d.customer_name === customer.name || d.customer?.name === customer.name) &&
        areSupplierKeysEquivalent(d.supplier_key || d.supplierKey, selectedSupplierKey) &&
        !d.is_deleted
      );
      
      const inDateRange = filtered.filter(d => {
        const dDate = d.doc_date || d.docDate || '';
        return (!startDate || dDate >= startDate) && (!endDate || dDate <= endDate);
      });

      inDateRange.sort((a, b) => new Date(a.doc_date || a.docDate) - new Date(b.doc_date || b.docDate));
      setStatements(inDateRange);
      setSelectedIds(new Set(inDateRange.map(d => d.id)));
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleApply = () => {
    const selectedDocs = statements.filter(d => selectedIds.has(d.id));
    let aggregatedItems = [];
    selectedDocs.forEach(doc => {
      if (doc.items && Array.isArray(doc.items)) {
        doc.items.forEach(item => {
          if (item.name || item.price > 0) {
            aggregatedItems.push({
              ...item,
              id: Date.now().toString() + Math.random().toString().slice(2, 6),
              date: doc.doc_date || doc.docDate
            });
          }
        });
      }
    });
    onApply(aggregatedItems);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}
    >
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '12px',
          width: '90%',
          maxWidth: '500px',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}
      >
        <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>기간별 거래명세서 취합</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ padding: '16px', display: 'flex', gap: '8px', alignItems: 'center', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <input type="date" className="form-input" value={startDate} onChange={e => setStartDate(e.target.value)} />
          <span>~</span>
          <input type="date" className="form-input" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>조회 중...</div>
          ) : statements.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>해당 기간에 발행된 거래명세서가 없습니다.</div>
          ) : (
            statements.map(doc => {
              const items = doc.items || [];
              const supply = items.reduce((sum, i) => sum + (Number(i.qty) || 0) * (Number(i.price) || 0), 0);
              const vat = doc.vat_included !== false ? Math.floor(supply * 0.1) : (Number(doc.vat) || 0);
              const total = supply + vat;

              return (
                <div
                  key={doc.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    marginBottom: '8px',
                    backgroundColor: selectedIds.has(doc.id) ? '#f0f9ff' : '#fff',
                    cursor: 'pointer'
                  }}
                  onClick={() => handleToggle(doc.id)}
                >
                  <input type="checkbox" checked={selectedIds.has(doc.id)} readOnly style={{ marginTop: '4px' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '4px' }}>
                      {`${doc.doc_date || doc.docDate} (문서번호: ${doc.doc_no || doc.docNo})`}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      {`품목: ${items.filter(i => i.name).map(i => i.name).join(', ')}`}
                    </div>
                    <div style={{ fontSize: '13px', color: '#0f172a', marginTop: '4px', textAlign: 'right' }}>
                      {`총액: ${total.toLocaleString()}원`}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div style={{ padding: '16px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button className="btn btn-outline" onClick={onClose}>취소</button>
          <button className="btn btn-primary" onClick={handleApply} disabled={selectedIds.size === 0}>
            {`선택한 ${selectedIds.size}건 취합하기`}
          </button>
        </div>
      </div>
    </div>
  );
}
