// 🎨 TEAM D.D PAST STATEMENT IMPORT MODAL
import React, { useState, useEffect } from 'react';
import { fetchDocuments } from '../services/documentService.js';
import { areSupplierKeysEquivalent } from '../utils/validation.js';

export default function PastStatementImportModal({
  isOpen,
  onClose,
  initialCustomerName = '',
  selectedSupplierKey = '',
  onApplyStatement,
  onPreviewDoc
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCustomerOnly, setFilterCustomerOnly] = useState(true);
  const [statements, setStatements] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialCustomerName && initialCustomerName.trim() !== '') {
        setSearchQuery(initialCustomerName.trim());
        setFilterCustomerOnly(true);
      } else {
        setSearchQuery('');
        setFilterCustomerOnly(false);
      }
      loadStatements();
    }
  }, [isOpen, initialCustomerName]);

  const loadStatements = async () => {
    setIsLoading(true);
    try {
      const allDocs = await fetchDocuments();
      const filtered = allDocs.filter(d => 
        (d.doc_type === '거래명세서' || d.docType === '거래명세서') &&
        areSupplierKeysEquivalent(d.supplier_key || d.supplierKey, selectedSupplierKey) &&
        !d.is_deleted
      );
      filtered.sort((a, b) => new Date(b.doc_date || b.docDate || b.created_at) - new Date(a.doc_date || a.docDate || a.created_at));
      setStatements(filtered);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const displayedStatements = statements.filter(doc => {
    const custName = (doc.customer_name || doc.customer_data?.name || doc.customer?.name || '').toLowerCase();
    const docNo = (doc.doc_no || doc.docNo || '').toLowerCase();
    const itemsText = (doc.items || []).map(i => i.name || '').join(' ').toLowerCase();
    const q = searchQuery.trim().toLowerCase();

    if (filterCustomerOnly && initialCustomerName && initialCustomerName.trim() !== '') {
      if (!custName.includes(initialCustomerName.trim().toLowerCase())) return false;
    }

    if (!q) return true;
    return custName.includes(q) || docNo.includes(q) || itemsText.includes(q);
  });

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1rem'
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '700px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
          padding: '1.25rem'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.25rem' }}>📂</span>
            <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: '900', color: '#1e293b' }}>
              지난 거래명세서 검색 및 불러오기
            </h3>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#94a3b8' }}>
            ✕
          </button>
        </div>

        <div style={{ backgroundColor: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              className="form-input"
              style={{ flex: 1, minWidth: '180px' }}
              placeholder="🔍 거래처명, 품목명, 문서번호 검색..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {initialCustomerName && initialCustomerName.trim() !== '' && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: '700', color: '#334155', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <input
                  type="checkbox"
                  checked={filterCustomerOnly}
                  onChange={e => setFilterCustomerOnly(e.target.checked)}
                />
                {`"${initialCustomerName}" 거래처만 보기`}
              </label>
            )}
            <button
              type="button"
              className="btn btn-outline"
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.6rem' }}
              onClick={() => { setSearchQuery(''); setFilterCustomerOnly(false); }}
            >
              전체보기
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', minHeight: '200px', maxHeight: '52vh', paddingRight: '4px' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>명세서 내역을 불러오는 중...</div>
          ) : displayedStatements.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📦</div>
              조건에 일치하는 지난 거래명세서가 없습니다.
              {initialCustomerName && filterCustomerOnly && (
                <div style={{ marginTop: '8px' }}>
                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{ fontSize: '11px' }}
                    onClick={() => setFilterCustomerOnly(false)}
                  >
                    타 거래처 명세서 전체 보기
                  </button>
                </div>
              )}
            </div>
          ) : (
            displayedStatements.map(doc => {
              const items = doc.items || [];
              const validItems = items.filter(i => (i.name && i.name.trim() !== '') || (i.price || 0) > 0);
              const totalSupply = items.reduce((sum, item) => sum + (Number(item.qty) || 0) * (Number(item.price) || 0), 0);
              const vat = doc.vat_included !== false ? Math.floor(totalSupply * 0.1) : 0;
              const grandTotal = totalSupply + vat;
              const custName = doc.customer_name || (doc.customer_data ? doc.customer_data.name : '') || (doc.customer ? doc.customer.name : '-') || '-';
              const custMachine = (doc.customer_data && doc.customer_data.selectedMachine) ? ` (${doc.customer_data.selectedMachine})` : '';

              return (
                <div
                  key={doc.id || doc.doc_no}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '0.85rem 1rem',
                    marginBottom: '0.75rem',
                    backgroundColor: '#ffffff',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '1rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    transition: 'all 0.15s ease-in-out',
                    cursor: 'pointer'
                  }}
                  className="hover:border-blue-400 hover:bg-blue-50/20"
                  onClick={() => {
                    if (onPreviewDoc) onPreviewDoc(doc);
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: '800', fontSize: '0.9375rem', color: '#0f172a' }}>{custName}</span>
                      {custMachine && <span style={{ fontSize: '11px', color: '#1d6bf3', fontWeight: '700' }}>{custMachine}</span>}
                      <span style={{
                        fontSize: '10px',
                        backgroundColor: '#eff6ff',
                        color: '#2563eb',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        fontWeight: '700',
                        border: '1px solid #bfdbfe'
                      }}>
                        🔍 클릭 시 미리보기
                      </span>
                      <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace', marginLeft: 'auto' }}>
                        {`일자: ${doc.doc_date || doc.docDate || '-'} | 번호: ${doc.doc_no || doc.docNo || '-'}`}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '4px' }}>
                      {`품목(${validItems.length}건): ${validItems.map(i => i.name).join(', ')}`}
                    </div>
                    <div style={{ fontSize: '0.875rem', fontWeight: '900', color: '#1d6bf3' }}>
                      {`합계금액: ${grandTotal.toLocaleString()}원`}
                    </div>
                  </div>

                  <div
                    style={{ display: 'flex', flexDirection: 'column', gap: '5px', flexShrink: 0 }}
                    onClick={e => e.stopPropagation()} // 버튼 클릭 시 행 클릭 중복 방지
                  >
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        type="button"
                        className="btn btn-outline"
                        style={{
                          fontSize: '0.75rem',
                          padding: '5px 8px',
                          color: '#2563eb',
                          borderColor: '#bfdbfe',
                          backgroundColor: '#eff6ff',
                          fontWeight: '700'
                        }}
                        onClick={() => {
                          if (onPreviewDoc) onPreviewDoc(doc);
                        }}
                      >
                        🔍 미리보기
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{
                          fontSize: '0.75rem',
                          padding: '5px 10px',
                          backgroundColor: '#10b981',
                          borderColor: '#10b981',
                          fontWeight: '700',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}
                        onClick={() => {
                          onApplyStatement(doc, 'copy_to_new');
                          onClose();
                        }}
                      >
                        ✨ 새 명세서로 복사
                      </button>
                    </div>

                    <button
                      type="button"
                      className="btn btn-outline"
                      style={{
                        fontSize: '0.75rem',
                        padding: '4px 8px',
                        color: '#475569',
                        width: '100%',
                        textAlign: 'center'
                      }}
                      onClick={() => {
                        onApplyStatement(doc, 'edit_original');
                        onClose();
                      }}
                    >
                      ✏️ 원본 수정
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0' }}>
          <button type="button" className="btn btn-outline" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
