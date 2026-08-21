// 🎨 TEAM D.D DOCUMENT HISTORY & TRASH TAB
import React, { useState, useEffect } from 'react';
import {
  fetchDocuments,
  deleteDocument,
  restoreDocument,
  permanentDeleteDocument
} from '../services/documentService.js';
import { calculateTotalAmount } from '../utils/formatters.js';

export default function DocHistoryTab({
  onLoadDocument,
  onCopyDocument,
  onConvertToDoc,
  isConnected,
  selectedSupplierKey,
  onPreviewDocument
}) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('all'); // all, statement, estimate, invoice, trash
  const [searchCustomer, setSearchCustomer] = useState('');
  const [searchItem, setSearchItem] = useState('');
  const [searchDocNo, setSearchDocNo] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('전체');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  const calculateTotal = (doc) => {
    const items = doc.items || [];
    const supply = items.reduce((sum, i) => sum + (Number(i.qty) || 0) * (Number(i.price) || 0), 0);
    const vat = doc.vat_included !== false ? Math.floor(supply * 0.1) : Number(doc.vat) || 0;
    return supply + vat;
  };

  const getEffectivePaymentStatus = (doc) => {
    const ps = doc.paymentStatus || doc.payment_status || '미수금';
    const total = calculateTotal(doc);
    const paidAmt = Number(doc.paid) || 0;
    if (ps !== '입금완료' && paidAmt > 0) {
      if (paidAmt >= total && total > 0) {
        return '입금완료';
      } else {
        return '부분입금';
      }
    }
    return ps;
  };

  const loadDocs = async () => {
    setLoading(true);
    const data = await fetchDocuments();
    setDocuments(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadDocs();
  }, [isConnected, selectedSupplierKey]);

  const setPresetDate = (type) => {
    const today = new Date();
    const endStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    setEndDate(endStr);
    if (type === 'today') {
      setStartDate(endStr);
    } else if (type === 'month') {
      setStartDate(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`);
    } else if (type === 'last_month') {
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
      setStartDate(`${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}-01`);
      setEndDate(`${lastMonthEnd.getFullYear()}-${String(lastMonthEnd.getMonth() + 1).padStart(2, '0')}-${String(lastMonthEnd.getDate()).padStart(2, '0')}`);
    } else if (type === 'all') {
      setStartDate('');
      setEndDate('');
    }
  };

  const handleSoftDelete = async (doc) => {
    const paidAmt = Number(doc.paid) || 0;
    let confirmMsg = `[${doc.doc_no || doc.docNo || doc.doc_type}] 문서를 휴지통으로 이동하시겠습니까?\n(휴지통에서 언제든 복원할 수 있습니다.)`;
    if (paidAmt > 0) {
      confirmMsg = `⚠️ 경고: 본 문서는 이미 ${paidAmt.toLocaleString()}원이 입금 처리된 문서입니다!\n휴지통으로 이동 시 거래처별 미수금 및 입금 잔액이 재계산됩니다.\n\n계속 진행하시겠습니까?`;
    }
    if (!window.confirm(confirmMsg)) return;

    await deleteDocument(doc.id);
    await loadDocs();
    alert('✓ 문서가 휴지통으로 안전하게 이동되었습니다.');
  };

  const handleRestore = async (doc) => {
    if (!window.confirm(`[${doc.doc_no || doc.docNo || doc.doc_type}] 문서를 원래 목록으로 복원하시겠습니까?`)) return;
    await restoreDocument(doc.id);
    await loadDocs();
    alert('✓ 문서가 성공적으로 복원되었습니다.');
  };

  const handlePermanentDelete = async (doc) => {
    if (!window.confirm(`⚠️ 경고: [${doc.doc_no || doc.docNo || doc.doc_type}] 문서를 완전히 영구 삭제하시겠습니까?\n영구 삭제 후에는 절대 복구할 수 없습니다!`)) return;
    await permanentDeleteDocument(doc.id);
    await loadDocs();
    alert('✓ 문서가 완전히 영구 삭제되었습니다.');
  };

  const nonDeletedDocs = documents.filter(d => !d.is_deleted);
  const trashDocs = documents.filter(d => d.is_deleted);

  const statementDocs = nonDeletedDocs.filter(d => (d.doc_type || d.docType || '거래명세서') === '거래명세서');
  const estimateDocs = nonDeletedDocs.filter(d => (d.doc_type || d.docType || '거래명세서') === '견적서');
  const invoiceDocs = nonDeletedDocs.filter(d => (d.doc_type || d.docType || '거래명세서') === '청구서');

  const totalAllSum = nonDeletedDocs.filter(d => (d.doc_type || d.docType || '거래명세서') !== '견적서').reduce((sum, d) => sum + calculateTotal(d), 0);
  const totalStatementSum = statementDocs.reduce((sum, d) => sum + calculateTotal(d), 0);
  const totalEstimateSum = estimateDocs.reduce((sum, d) => sum + calculateTotal(d), 0);
  const totalInvoiceSum = invoiceDocs.reduce((sum, d) => sum + calculateTotal(d), 0);

  let baseTabDocs = nonDeletedDocs;
  if (activeSubTab === 'statement') baseTabDocs = statementDocs;
  else if (activeSubTab === 'estimate') baseTabDocs = estimateDocs;
  else if (activeSubTab === 'invoice') baseTabDocs = invoiceDocs;
  else if (activeSubTab === 'trash') baseTabDocs = trashDocs;

  const filtered = baseTabDocs.filter(doc => {
    const date = doc.doc_date || doc.docDate || (doc.created_at ? doc.created_at.split('T')[0] : '');
    if (startDate && date < startDate) return false;
    if (endDate && date > endDate) return false;
    if (searchCustomer.trim()) {
      const custName = (doc.customer_name || doc.customer_data?.name || doc.customer?.name || '').toLowerCase();
      if (!custName.includes(searchCustomer.toLowerCase())) return false;
    }
    if (searchItem.trim()) {
      const itemsStr = JSON.stringify(doc.items || []).toLowerCase();
      if (!itemsStr.includes(searchItem.toLowerCase())) return false;
    }
    if (searchDocNo.trim()) {
      const docNo = (doc.doc_no || doc.docNo || '').toLowerCase();
      if (!docNo.includes(searchDocNo.toLowerCase())) return false;
    }
    if (paymentFilter !== '전체') {
      const ps = getEffectivePaymentStatus(doc);
      if (ps !== paymentFilter) return false;
    }
    return true;
  });

  const tabRealSales = filtered.filter(d => (d.doc_type || d.docType || '거래명세서') !== '견적서');
  const tabSalesSum = tabRealSales.reduce((sum, d) => sum + calculateTotal(d), 0);
  const tabPaidSum = tabRealSales.reduce((sum, d) => sum + (getEffectivePaymentStatus(d) === '입금완료' ? calculateTotal(d) : Number(d.paid) || 0), 0);
  const tabUnpaidSum = Math.max(0, tabSalesSum - tabPaidSum);

  const getPayBadge = (doc) => {
    if ((doc.doc_type || doc.docType) === '견적서') {
      return (
        <span
          style={{
            display: 'inline-block',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: '700',
            backgroundColor: '#f3e8ff',
            color: '#6b21a8',
            border: '1px solid #ddd6fe'
          }}
        >
          📋 견적제안
        </span>
      );
    }
    const ps = getEffectivePaymentStatus(doc);
    const cls = ps === '입금완료' ? 'paid' : ps === '부분입금' ? 'partial' : 'unpaid';
    const icon = ps === '입금완료' ? '✅' : ps === '부분입금' ? '🟡' : '🔴';
    return <span className={`pay-badge ${cls}`}>{`${icon} ${ps}`}</span>;
  };

  const sessionRole = sessionStorage.getItem('dd_user_role') || 'supplier';
  const sessionKey = sessionStorage.getItem('selected_supplier_key') || localStorage.getItem('selected_supplier_key') || 'sejin';
  const sessionName = sessionRole === 'admin' ? '통합 관리자' : (sessionKey === 'ds_gimje' || sessionKey === '767fd9c8-d5e9-46b0-a7c4-713dac601ae4' ? '디에스건설기계 김제점' : '세진건설기계');

  return (
    <div className="management-container">
      <div className="card-box">
        {/* 헤더 바 */}
        <div className="card-box-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: '900', margin: 0 }}>
              📁 문서 발행 및 조회 관리
            </h2>
            <span style={{ fontSize: '11px', color: '#1e40af', backgroundColor: '#dbeafe', padding: '2px 8px', borderRadius: '12px', fontWeight: '700' }}>
              {`접속: ${sessionName}`}
            </span>
          </div>
          <button className="btn btn-outline" style={{ fontSize: '0.75rem' }} onClick={loadDocs}>
            🔄 새로고침
          </button>
        </div>

        {/* 서브 탭 바 */}
        <div
          style={{
            display: 'flex',
            backgroundColor: '#f1f5f9',
            padding: '6px',
            gap: '6px',
            borderBottom: '1px solid #e2e8f0',
            overflowX: 'auto',
            flexWrap: 'nowrap'
          }}
        >
          {[
            { key: 'all', icon: '📑', label: '전체 문서', count: nonDeletedDocs.length, sum: totalAllSum, color: '#1d6bf3' },
            { key: 'statement', icon: '📦', label: '거래명세서', count: statementDocs.length, sum: totalStatementSum, color: '#059669' },
            { key: 'estimate', icon: '📋', label: '견적서', count: estimateDocs.length, sum: totalEstimateSum, color: '#6b21a8' },
            { key: 'invoice', icon: '🧾', label: '청구서', count: invoiceDocs.length, sum: totalInvoiceSum, color: '#2563eb' },
            { key: 'trash', icon: '🗑️', label: '휴지통', count: trashDocs.length, sum: null, color: '#dc2626' }
          ].map(tab => {
            const isActive = activeSubTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                style={{
                  flex: '1 0 auto',
                  minWidth: '130px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: isActive ? `2px solid ${tab.color}` : '1px solid #cbd5e1',
                  backgroundColor: isActive ? '#ffffff' : '#f8fafc',
                  boxShadow: isActive ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease'
                }}
                onClick={() => setActiveSubTab(tab.key)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                  <span style={{ fontWeight: isActive ? '900' : '700', fontSize: '0.875rem', color: isActive ? tab.color : '#334155' }}>
                    {`${tab.icon} ${tab.label}`}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      padding: '1px 6px',
                      borderRadius: '9999px',
                      backgroundColor: isActive ? tab.color : '#e2e8f0',
                      color: isActive ? '#ffffff' : '#64748b',
                      fontWeight: '800'
                    }}
                  >
                    {tab.count}
                  </span>
                </div>
                {tab.sum !== null && (
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>
                    {`${(tab.sum / 10000).toLocaleString(undefined, { maximumFractionDigits: 1 })}만원`}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* 검색 및 기간 필터 영역 */}
        <div
          style={{
            padding: '0.875rem 1rem',
            backgroundColor: activeSubTab === 'trash' ? '#fef2f2' : '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.625rem'
          }}
        >
          {activeSubTab === 'trash' && (
            <div style={{ padding: '6px 12px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '6px', fontSize: '0.8125rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
              🗑️ 휴지통에 보관된 삭제 문서 목록입니다. 언제든 [원클릭 복원]을 통해 정상 목록으로 되살릴 수 있습니다.
            </div>
          )}

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: '700', color: '#334155' }}>📅 기간:</span>
            <input
              type="date"
              className="form-input"
              style={{ width: '130px', fontSize: '0.75rem' }}
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
            <span>~</span>
            <input
              type="date"
              className="form-input"
              style={{ width: '130px', fontSize: '0.75rem' }}
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
            />
            <div style={{ display: 'flex', gap: '4px' }}>
              <button className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.2rem 0.4rem' }} onClick={() => setPresetDate('today')}>오늘</button>
              <button className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.2rem 0.4rem' }} onClick={() => setPresetDate('month')}>이번달</button>
              <button className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.2rem 0.4rem' }} onClick={() => setPresetDate('last_month')}>지난달</button>
              <button className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '0.2rem 0.4rem' }} onClick={() => setPresetDate('all')}>전체</button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '6px' }}>
            {activeSubTab !== 'estimate' && activeSubTab !== 'trash' && (
              <select
                className="form-select"
                value={paymentFilter}
                onChange={e => setPaymentFilter(e.target.value)}
              >
                <option value="전체">모든 입금상태</option>
                {['미수금', '부분입금', '입금완료'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            )}
            <input
              type="text"
              className="form-input"
              placeholder="🔍 거래처명 검색..."
              value={searchCustomer}
              onChange={e => setSearchCustomer(e.target.value)}
            />
            <input
              type="text"
              className="form-input"
              placeholder="🔍 품목명 검색..."
              value={searchItem}
              onChange={e => setSearchItem(e.target.value)}
            />
            <input
              type="text"
              className="form-input"
              placeholder="🔍 문서번호 검색..."
              value={searchDocNo}
              onChange={e => setSearchDocNo(e.target.value)}
            />
          </div>
        </div>

        {/* 통계 요약 바 */}
        {activeSubTab !== 'trash' && (
          <div
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: '#eff6ff',
              borderBottom: '1px solid #bfdbfe',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.8125rem',
              color: '#1e3a8a',
              fontWeight: '700',
              flexWrap: 'wrap',
              gap: '8px'
            }}
          >
            <span>{`📊 현재 탭 조회: ${filtered.length}건`}</span>
            {activeSubTab === 'estimate' ? (
              <span>
                📋 견적 합계: <strong style={{ color: '#6b21a8' }}>{`${filtered.reduce((s, d) => s + calculateTotal(d), 0).toLocaleString()}원`}</strong>
              </span>
            ) : (
              <div style={{ display: 'flex', gap: '12px' }}>
                <span>매출: <strong style={{ color: '#1d6bf3' }}>{`${tabSalesSum.toLocaleString()}원`}</strong></span>
                <span>입금: <strong style={{ color: '#15803d' }}>{`${tabPaidSum.toLocaleString()}원`}</strong></span>
                <span>미수: <strong style={{ color: '#b91c1c' }}>{`${tabUnpaidSum.toLocaleString()}원`}</strong></span>
              </div>
            )}
          </div>
        )}

        {/* 데이터 테이블 / 카드 목록 */}
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>문서를 불러오는 중입니다...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{activeSubTab === 'trash' ? '🗑️' : '📄'}</div>
            {activeSubTab === 'trash' ? '휴지통이 비어 있습니다.' : '해당 조건의 저장된 문서가 없습니다.'}
          </div>
        ) : (
          <>
            {/* 데스크톱 테이블 뷰 */}
            <div className="desktop-table-view">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>발행일자 / 번호</th>
                    <th>종류</th>
                    <th>공급받는자 (거래처)</th>
                    <th>품목 요약</th>
                    <th>합계금액</th>
                    <th>작업</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(doc => {
                    const items = doc.items || [];
                    const firstItemName = items[0]?.name || '품목 없음';
                    const itemSummary = items.length > 1 ? `${firstItemName} 외 ${items.length - 1}건` : firstItemName;
                    const total = calculateTotal(doc);
                    const custName = doc.customer_name || doc.customer_data?.name || doc.customer?.name || '-';
                    const custMachine = doc.customer_data?.selectedMachine ? ` (${doc.customer_data.selectedMachine})` : '';
                    const currentDocType = doc.doc_type || doc.docType || '거래명세서';

                    return (
                      <tr
                        key={doc.id || doc.doc_no}
                        style={{
                          backgroundColor: doc.is_deleted ? '#fff1f2' : undefined,
                          cursor: doc.is_deleted ? 'default' : 'pointer'
                        }}
                        title={doc.is_deleted ? '' : '클릭하여 문서 미리보기'}
                        onClick={() => {
                          if (doc.is_deleted) return;
                          if (onPreviewDocument) onPreviewDocument(doc);
                          else onLoadDocument(doc);
                        }}
                      >
                        <td>
                          <div style={{ fontWeight: '700' }}>{doc.doc_date || doc.docDate || '-'}</div>
                          <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>{doc.doc_no || doc.docNo}</div>
                          {doc.revision > 0 && <span style={{ fontSize: '10px', color: '#2563eb', backgroundColor: '#eff6ff', padding: '1px 4px', borderRadius: '4px' }}>{`Rev.${doc.revision}`}</span>}
                        </td>
                        <td>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              backgroundColor: currentDocType === '견적서' ? '#f3e8ff' : (currentDocType === '청구서' ? '#eff6ff' : '#f1f5f9'),
                              color: currentDocType === '견적서' ? '#6b21a8' : (currentDocType === '청구서' ? '#1d4ed8' : '#334155'),
                              fontWeight: '700',
                              fontSize: '11px'
                            }}
                          >
                            {currentDocType}
                          </span>
                        </td>
                        <td style={{ fontWeight: '700', color: '#0f172a' }}>
                          {custName}
                          {custMachine && <span style={{ color: '#1d6bf3', fontSize: '11px' }}>{custMachine}</span>}
                        </td>
                        <td style={{ fontSize: '12px', color: '#475569' }}>{itemSummary}</td>
                        <td style={{ fontWeight: '900', fontFamily: 'monospace', color: '#1d6bf3' }}>
                          {`${total.toLocaleString()}원`}
                          {!doc.is_deleted && <br />}
                          {!doc.is_deleted && getPayBadge(doc)}
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          {doc.is_deleted ? (
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button
                                className="btn btn-primary"
                                style={{ padding: '4px 10px', fontSize: '11px', backgroundColor: '#10b981', borderColor: '#10b981' }}
                                onClick={(e) => { e.stopPropagation(); handleRestore(doc); }}
                              >
                                🔄 복원하기
                              </button>
                              <button
                                className="btn btn-red-outline"
                                style={{ padding: '4px 8px', fontSize: '11px' }}
                                onClick={(e) => { e.stopPropagation(); handlePermanentDelete(doc); }}
                              >
                                ❌ 영구삭제
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                              <button
                                type="button"
                                className="btn btn-outline"
                                style={{ padding: '3px 7px', fontSize: '11px', fontWeight: '800', backgroundColor: '#eff6ff', borderColor: '#bfdbfe', color: '#1d4ed8' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onPreviewDocument) onPreviewDocument(doc);
                                  else onLoadDocument(doc);
                                }}
                              >
                                👁️ 보기
                              </button>
                              <button
                                className="btn btn-primary"
                                style={{ padding: '3px 7px', fontSize: '11px' }}
                                onClick={(e) => { e.stopPropagation(); onLoadDocument(doc); }}
                              >
                                📥 불러오기
                              </button>
                              {currentDocType === '견적서' ? (
                                <button
                                  className="btn btn-primary"
                                  style={{ padding: '3px 7px', fontSize: '11px', backgroundColor: '#059669', borderColor: '#059669' }}
                                  onClick={(e) => { e.stopPropagation(); onConvertToDoc && onConvertToDoc(doc, '거래명세서'); }}
                                >
                                  📦 명세서로
                                </button>
                              ) : (
                                <button
                                  className="btn btn-primary"
                                  style={{ padding: '3px 7px', fontSize: '11px', backgroundColor: '#4f46e5', borderColor: '#4f46e5' }}
                                  onClick={(e) => { e.stopPropagation(); onConvertToDoc && onConvertToDoc(doc, '견적서'); }}
                                >
                                  📋 견적서로
                                </button>
                              )}
                              <button
                                className="btn btn-primary"
                                style={{ padding: '3px 7px', fontSize: '11px', backgroundColor: '#10b981', borderColor: '#10b981' }}
                                onClick={(e) => { e.stopPropagation(); onCopyDocument(doc); }}
                              >
                                📋 복사
                              </button>
                              <button
                                className="btn btn-red-outline"
                                style={{ padding: '3px 7px', fontSize: '11px' }}
                                onClick={(e) => { e.stopPropagation(); handleSoftDelete(doc); }}
                              >
                                🗑️
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 모바일 카드 뷰 */}
            <div className="mobile-cards-view">
              {filtered.map(doc => {
                const items = doc.items || [];
                const firstItemName = items[0]?.name || '품목 없음';
                const itemSummary = items.length > 1 ? `${firstItemName} 외 ${items.length - 1}건` : firstItemName;
                const total = calculateTotal(doc);
                const custName = doc.customer_name || doc.customer_data?.name || doc.customer?.name || '-';
                const custMachine = doc.customer_data?.selectedMachine ? ` (${doc.customer_data.selectedMachine})` : '';
                const currentDocType = doc.doc_type || doc.docType || '거래명세서';

                return (
                  <div
                    key={doc.id || doc.doc_no}
                    className="mobile-data-card"
                    style={{
                      borderLeft: doc.is_deleted ? '4px solid #ef4444' : '4px solid #2563eb',
                      cursor: doc.is_deleted ? 'default' : 'pointer',
                      boxShadow: '0 2px 6px rgba(0, 27, 72, 0.06)',
                      transition: 'all 0.15s ease'
                    }}
                    onClick={() => {
                      if (doc.is_deleted) return;
                      if (onPreviewDocument) onPreviewDocument(doc);
                      else onLoadDocument(doc);
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span
                          style={{
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: currentDocType === '견적서' ? '#f3e8ff' : (currentDocType === '청구서' ? '#eff6ff' : '#f1f5f9'),
                            color: currentDocType === '견적서' ? '#6b21a8' : (currentDocType === '청구서' ? '#1d4ed8' : '#334155'),
                            fontWeight: '800',
                            fontSize: '10px'
                          }}
                        >
                          {currentDocType}
                        </span>
                        {!doc.is_deleted && getPayBadge(doc)}
                      </div>
                      <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
                        {doc.doc_no || doc.docNo}{doc.revision > 0 && ` (Rev.${doc.revision})`}
                      </span>
                    </div>
                    <div style={{ fontWeight: '800', fontSize: '0.9375rem', marginBottom: '2px', color: '#0f172a' }}>
                      {custName}{custMachine && <span style={{ color: '#1d6bf3', fontSize: '11px' }}>{custMachine}</span>}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '8px' }}>
                      <div>{`일자: ${doc.doc_date || doc.docDate || '-'} | 품목: ${itemSummary}`}</div>
                      <div style={{ fontSize: '0.9375rem', fontWeight: '900', color: '#1d6bf3', marginTop: '2px' }}>
                        {`합계: ${total.toLocaleString()}원`}
                      </div>
                    </div>
                    <div
                      style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {doc.is_deleted ? (
                        <>
                          <button
                            className="btn btn-primary"
                            style={{ flex: 1, minHeight: '34px', fontSize: '0.75rem', backgroundColor: '#10b981', borderColor: '#10b981' }}
                            onClick={(e) => { e.stopPropagation(); handleRestore(doc); }}
                          >
                            🔄 복원하기
                          </button>
                          <button
                            className="btn btn-red-outline"
                            style={{ minHeight: '34px', fontSize: '0.75rem', padding: '0 10px' }}
                            onClick={(e) => { e.stopPropagation(); handlePermanentDelete(doc); }}
                          >
                            ❌ 영구삭제
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="btn btn-outline"
                            style={{
                              flex: 1,
                              minHeight: '34px',
                              fontSize: '0.75rem',
                              fontWeight: '800',
                              borderColor: '#3b82f6',
                              color: '#1d4ed8',
                              backgroundColor: '#eff6ff'
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onPreviewDocument) onPreviewDocument(doc);
                              else onLoadDocument(doc);
                            }}
                          >
                            👁️ 미리보기
                          </button>
                          <button
                            className="btn btn-primary"
                            style={{ flex: 1, minHeight: '34px', fontSize: '0.75rem' }}
                            onClick={(e) => { e.stopPropagation(); onLoadDocument(doc); }}
                          >
                            📥 불러오기
                          </button>
                          {currentDocType === '견적서' ? (
                            <button
                              className="btn btn-primary"
                              style={{ flex: 1, minHeight: '34px', fontSize: '0.75rem', backgroundColor: '#059669', borderColor: '#059669' }}
                              onClick={(e) => { e.stopPropagation(); onConvertToDoc && onConvertToDoc(doc, '거래명세서'); }}
                            >
                              📦 명세서로
                            </button>
                          ) : (
                            <button
                              className="btn btn-primary"
                              style={{ flex: 1, minHeight: '34px', fontSize: '0.75rem', backgroundColor: '#4f46e5', borderColor: '#4f46e5' }}
                              onClick={(e) => { e.stopPropagation(); onConvertToDoc && onConvertToDoc(doc, '견적서'); }}
                            >
                              📋 견적서로
                            </button>
                          )}
                          <button
                            className="btn btn-primary"
                            style={{ padding: '3px 8px', minHeight: '34px', fontSize: '11px', backgroundColor: '#10b981', borderColor: '#10b981' }}
                            onClick={(e) => { e.stopPropagation(); onCopyDocument(doc); }}
                          >
                            📋 복사
                          </button>
                          <button
                            className="btn btn-red-outline"
                            style={{ padding: '3px 8px', minHeight: '34px', fontSize: '11px' }}
                            onClick={(e) => { e.stopPropagation(); handleSoftDelete(doc); }}
                          >
                            🗑️
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
