// 🎨 TEAM D.D ESTIMATE IMPORT MODAL
import React, { useState, useEffect } from 'react';
import { fetchDocuments } from '../services/documentService.js';
import { areSupplierKeysEquivalent } from '../utils/validation.js';

export default function EstimateImportModal({
  isOpen,
  onClose,
  targetMode = 'convert_to_statement',
  initialCustomerName = '',
  selectedSupplierKey = '',
  onApplyEstimate,
  onPreviewDoc
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCustomerOnly, setFilterCustomerOnly] = useState(true);
  const [estimates, setEstimates] = useState([]);
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
      loadEstimates();
    }
  }, [isOpen, initialCustomerName]);

  const loadEstimates = async () => {
    setIsLoading(true);
    try {
      const allDocs = await fetchDocuments();
      const filtered = allDocs.filter(d => 
        (d.doc_type === '견적서' || d.docType === '견적서') &&
        areSupplierKeysEquivalent(d.supplier_key || d.supplierKey, selectedSupplierKey) &&
        !d.is_deleted
      );
      filtered.sort((a, b) => new Date(b.doc_date || b.docDate || b.created_at) - new Date(a.doc_date || a.docDate || a.created_at));
      setEstimates(filtered);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const displayedEstimates = estimates.filter(doc => {
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

  const isConverting = targetMode === 'convert_to_statement';

  return (
    <div className="modal-overlay" style={{ zIndex: 1050 }}>
      <div className="modal-content" style={{ maxWidth: '700px', width: '95%', maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '2px solid #3b82f6', paddingBottom: '0.75rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: '900', color: '#1e293b' }}>
            {isConverting ? '📑 견적서 선택 ➡️ 거래명세서로 가져오기' : '📂 과거 견적서 목록 / 불러오기'}
          </h3>
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
              placeholder="🔍 거래처명, 문서번호, 품목 검색..."
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

        <div style={{ flex: 1, overflowY: 'auto', minHeight: '200px', maxHeight: '55vh', paddingRight: '4px' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>견적서 내역을 불러오는 중...</div>
          ) : displayedEstimates.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📄</div>
              조건에 일치하는 견적서가 없습니다.
            </div>
          ) : (
            displayedEstimates.map(doc => {
              const items = doc.items || [];
              const validItems = items.filter(i => (i.name && i.name.trim() !== '') || (i.price || 0) > 0);
              const totalSupply = items.reduce((sum, item) => sum + (Number(item.qty) || 0) * (Number(item.price) || 0), 0);
              const vat = doc.vat_included !== false ? Math.floor(totalSupply * 0.1) : 0;
              const grandTotal = totalSupply + vat;
              const custName = doc.customer_name || (doc.customer_data ? doc.customer_data.name : '') || (doc.customer ? doc.customer.name : '-') || '-';
              const docDate = doc.doc_date || doc.docDate || (doc.created_at ? doc.created_at.split('T')[0] : '-');

              return (
                <div
                  key={doc.id || doc.doc_no}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '0.85rem 1rem',
                    marginBottom: '0.75rem',
                    backgroundColor: '#ffffff',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    if (onPreviewDoc) onPreviewDoc(doc);
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontWeight: '900', fontSize: '0.9375rem', color: '#0f172a' }}>{custName}</span>
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
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>{doc.doc_no || doc.docNo}</span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{`📅 견적일자: ${docDate}`}</span>
                  </div>

                  <div style={{ backgroundColor: '#f8fafc', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.75rem', color: '#475569', marginBottom: '0.5rem' }}>
                    <div style={{ fontWeight: '700', marginBottom: '2px' }}>{`품목 (${validItems.length}건):`}</div>
                    <div style={{ color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {validItems.map(i => `${i.name || '품목'}(${i.qty || 1}${i.unit || 'EA'})`).join(', ') || '등록된 품목 없음'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ fontSize: '0.8125rem' }}>
                      <span style={{ color: '#64748b' }}>견적합계: </span>
                      <span style={{ fontWeight: '800', color: '#1d4ed8' }}>{`${grandTotal.toLocaleString()} 원`}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }} onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        className="btn btn-outline"
                        style={{ fontSize: '0.75rem', padding: '0.35rem 0.6rem', color: '#2563eb', borderColor: '#bfdbfe', backgroundColor: '#eff6ff', fontWeight: '700' }}
                        onClick={() => {
                          if (onPreviewDoc) onPreviewDoc(doc);
                        }}
                      >
                        🔍 미리보기
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', backgroundColor: '#059669', borderColor: '#059669' }}
                        onClick={() => {
                          onApplyEstimate(doc, 'convert_to_statement');
                          onClose();
                        }}
                      >
                        📋 거래명세서로 작성
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline"
                        style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', color: '#4338ca', borderColor: '#c7d2fe' }}
                        onClick={() => {
                          onApplyEstimate(doc, 'load_as_estimate');
                          onClose();
                        }}
                      >
                        📂 견적서 불러오기
                      </button>
                    </div>
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
