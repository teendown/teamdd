import React, { useState, useMemo } from 'react';
import { DOC_TYPES } from '../services/defaults.js';

export default function AccountingTab({
  documents = [],
  customersList = [],
  suppliersList = [],
  onUpdateDocumentPaid,
  onDeleteDocument
}) {
  const currentDate = new Date();
  const currentYearStr = String(currentDate.getFullYear());
  const currentMonthStr = String(currentDate.getMonth() + 1).padStart(2, '0');

  // Filter States
  const [selectedYear, setSelectedYear] = useState(currentYearStr);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr); // '01' ~ '12' or 'all'
  const [selectedCustomer, setSelectedCustomer] = useState('all');
  const [selectedSupplier, setSelectedSupplier] = useState('all');
  const [docTypeFilter, setDocTypeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [subTab, setSubTab] = useState('summary'); // 'summary' (거래처별 현황) or 'detailed' (상세 거래장부)

  // Payment Edit Modal State
  const [editingDoc, setEditingDoc] = useState(null);
  const [inputPaid, setInputPaid] = useState(0);
  const [inputRemark, setInputRemark] = useState('');

  // ── Helper functions for calculation ─────────────────────────────────────
  const getDocTotals = (doc) => {
    const items = doc.items || [];
    const totalSupply = items.reduce((sum, item) => sum + (Number(item.qty) || 0) * (Number(item.price) || 0), 0);
    const vatIncluded = doc.vat_included !== false;
    const vatAmount = vatIncluded ? Math.floor(totalSupply * 0.1) : (Number(doc.vat) || 0);
    const grandTotal = totalSupply + vatAmount;
    const paid = Number(doc.paid) || 0;
    const balance = grandTotal - paid;
    return { totalSupply, vatAmount, grandTotal, paid, balance };
  };

  // ── Filtered Documents ───────────────────────────────────────────────────
  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      // Date filter
      if (doc.doc_date) {
        const [y, m] = doc.doc_date.split('-');
        if (selectedYear !== 'all' && y !== selectedYear) return false;
        if (selectedMonth !== 'all' && m !== selectedMonth) return false;
      }

      // Customer filter
      if (selectedCustomer !== 'all') {
        const custName = doc.customer_name || doc.customer_data?.name || '';
        if (custName !== selectedCustomer) return false;
      }

      // Supplier filter
      if (selectedSupplier !== 'all') {
        const suppKey = doc.supplier_key || '';
        if (suppKey !== selectedSupplier) return false;
      }

      // Doc Type filter
      if (docTypeFilter !== 'all' && doc.doc_type !== docTypeFilter) return false;

      // Search Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const docNo = (doc.doc_no || '').toLowerCase();
        const custName = (doc.customer_name || doc.customer_data?.name || '').toLowerCase();
        const remark = (doc.remark || '').toLowerCase();
        const itemNames = (doc.items || []).map(i => i.name || '').join(' ').toLowerCase();
        
        if (!docNo.includes(q) && !custName.includes(q) && !remark.includes(q) && !itemNames.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [documents, selectedYear, selectedMonth, selectedCustomer, selectedSupplier, docTypeFilter, searchQuery]);

  // ── Overall Summary Statistics for Filtered Documents ────────────────────
  const statistics = useMemo(() => {
    let totalSales = 0;
    let totalPaid = 0;
    let totalUnpaid = 0;
    let totalDocsCount = filteredDocuments.length;

    filteredDocuments.forEach(doc => {
      const { grandTotal, paid, balance } = getDocTotals(doc);
      totalSales += grandTotal;
      totalPaid += paid;
      totalUnpaid += balance;
    });

    return { totalSales, totalPaid, totalUnpaid, totalDocsCount };
  }, [filteredDocuments]);

  // ── Customer Summary Table Data ──────────────────────────────────────────
  const customerSummaries = useMemo(() => {
    // Unique customers from both customer list & documents
    const map = new Map();

    // Pre-populate registered customers
    customersList.forEach(c => {
      if (c.name) {
        map.set(c.name, {
          name: c.name,
          person: c.person || c.repName || '-',
          phone: c.phone || '-',
          bizno: c.bizno || '-',
          monthlySales: 0,
          monthlyPaid: 0,
          monthlyUnpaid: 0,
          allTimeUnpaid: 0,
          docCount: 0
        });
      }
    });

    // Aggregate from ALL documents for all-time unpaid & filtered docs for monthly
    documents.forEach(doc => {
      const rawName = (doc.customer_name || doc.customer_data?.name || '').trim();
      if (!rawName || rawName === '미지정') return; // Skip unassigned or empty customer entries

      const custName = rawName;
      if (!map.has(custName)) {
        map.set(custName, {
          name: custName,
          person: doc.customer_data?.person || '-',
          phone: doc.customer_data?.phone || '-',
          bizno: doc.customer_data?.bizno || '-',
          monthlySales: 0,
          monthlyPaid: 0,
          monthlyUnpaid: 0,
          allTimeUnpaid: 0,
          docCount: 0
        });
      }

      const entry = map.get(custName);
      const { grandTotal, paid, balance } = getDocTotals(doc);

      // All-time unpaid accumulation
      entry.allTimeUnpaid += balance;

      // Check if doc matches selected period & filters
      let matchesPeriod = true;
      if (doc.doc_date) {
        const [y, m] = doc.doc_date.split('-');
        if (selectedYear !== 'all' && y !== selectedYear) matchesPeriod = false;
        if (selectedMonth !== 'all' && m !== selectedMonth) matchesPeriod = false;
      }
      if (selectedSupplier !== 'all' && doc.supplier_key !== selectedSupplier) matchesPeriod = false;

      if (matchesPeriod) {
        entry.monthlySales += grandTotal;
        entry.monthlyPaid += paid;
        entry.monthlyUnpaid += balance;
        entry.docCount += 1;
      }
    });

    let list = Array.from(map.values()).filter(c => c.name && c.name !== '미지정');
    
    // Search query filter for customer summary tab
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.person.toLowerCase().includes(q));
    }

    // Sort by monthly sales desc
    list.sort((a, b) => b.monthlySales - a.monthlySales || b.allTimeUnpaid - a.allTimeUnpaid);
    return list;
  }, [customersList, documents, selectedYear, selectedMonth, selectedSupplier, searchQuery]);

  // ── Handlers for Month Navigation ────────────────────────────────────────
  const handlePrevMonth = () => {
    if (selectedMonth === 'all') {
      setSelectedMonth('12');
      return;
    }
    const m = parseInt(selectedMonth, 10);
    if (m === 1) {
      setSelectedYear(String(parseInt(selectedYear, 10) - 1));
      setSelectedMonth('12');
    } else {
      setSelectedMonth(String(m - 1).padStart(2, '0'));
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 'all') {
      setSelectedMonth('01');
      return;
    }
    const m = parseInt(selectedMonth, 10);
    if (m === 12) {
      setSelectedYear(String(parseInt(selectedYear, 10) + 1));
      setSelectedMonth('01');
    } else {
      setSelectedMonth(String(m + 1).padStart(2, '0'));
    }
  };

  const handleCurrentMonth = () => {
    setSelectedYear(currentYearStr);
    setSelectedMonth(currentMonthStr);
  };

  // ── Open Payment Edit Modal ──────────────────────────────────────────────
  const handleOpenEditPaid = (doc) => {
    setEditingDoc(doc);
    setInputPaid(Number(doc.paid) || 0);
    setInputRemark(doc.remark || '');
  };

  const handleSavePaidModal = async () => {
    if (!editingDoc) return;
    await onUpdateDocumentPaid(editingDoc.id, inputPaid, inputRemark);
    setEditingDoc(null);
  };

  // ── CSV Export Functionality ──────────────────────────────────────────────
  const handleExportCSV = () => {
    if (filteredDocuments.length === 0) {
      alert('다운로드할 회계 내역이 없습니다.');
      return;
    }

    const headers = ['날짜', '문서번호', '구분', '거래처명', '공급자', '공급가액', '부가세', '총금액', '수금액', '미수금액', '수금상태', '비고'];
    const rows = filteredDocuments.map(doc => {
      const { totalSupply, vatAmount, grandTotal, paid, balance } = getDocTotals(doc);
      const status = balance <= 0 ? '완납' : (paid > 0 ? '부분납' : '미수');
      const custName = doc.customer_name || doc.customer_data?.name || '-';
      const suppName = doc.supplier_data?.company || doc.supplier_data?.name || doc.supplier_key || '-';

      return [
        `"${doc.doc_date || ''}"`,
        `"${doc.doc_no || ''}"`,
        `"${doc.doc_type || ''}"`,
        `"${custName.replace(/"/g, '""')}"`,
        `"${suppName.replace(/"/g, '""')}"`,
        totalSupply,
        vatAmount,
        grandTotal,
        paid,
        balance,
        `"${status}"`,
        `"${(doc.remark || '').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const filename = `거래처별_월별_회계장부_${selectedYear}년_${selectedMonth === 'all' ? '전체' : selectedMonth + '월'}.csv`;
    
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  // ── Print Functionality ──────────────────────────────────────────────────
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="tab-content print-container">
      {/* Top Title & Quick Actions */}
      <div className="section-header no-print">
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#111827', margin: 0 }}>
            📊 거래처별 회계 관리 (월별 회계장부)
          </h2>
          <p style={{ fontSize: '0.8125rem', color: '#6b7280', margin: '0.25rem 0 0 0' }}>
            발행된 명세서/청구서 기준 월별 매출, 수금, 미수금 현황을 통합 관리합니다.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button onClick={handleExportCSV} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            📥 엑셀(CSV) 저장
          </button>
          <button onClick={handlePrint} className="btn btn-green" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            🖨️ 회계장부 인쇄
          </button>
        </div>
      </div>

      {/* Filter Control Box */}
      <div className="card no-print" style={{ marginBottom: '1.25rem', padding: '1rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
          
          {/* Year & Month Stepper Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button className="btn btn-outline" onClick={handlePrevMonth} title="이전 달">◀ 이전</button>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <select
                className="form-input"
                style={{ width: '100px', fontWeight: '700' }}
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
              >
                <option value="all">전체 연도</option>
                <option value="2024">2024년</option>
                <option value="2025">2025년</option>
                <option value="2026">2026년</option>
                <option value="2027">2027년</option>
              </select>

              <select
                className="form-input"
                style={{ width: '100px', fontWeight: '700' }}
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              >
                <option value="all">전체 (월)</option>
                {Array.from({ length: 12 }, (_, i) => {
                  const mStr = String(i + 1).padStart(2, '0');
                  return <option key={mStr} value={mStr}>{i + 1}월</option>;
                })}
              </select>
            </div>

            <button className="btn btn-outline" onClick={handleNextMonth} title="다음 달">다음 ▶</button>
            <button className="btn btn-green" style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem' }} onClick={handleCurrentMonth}>
              이번달
            </button>
          </div>

          {/* Customer / Supplier / DocType Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <div>
              <select
                className="form-input"
                style={{ width: '150px' }}
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
              >
                <option value="all">🏢 전체 거래처</option>
                {customersList.map(c => (
                  <option key={c.id || c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <select
                className="form-input"
                style={{ width: '140px' }}
                value={selectedSupplier}
                onChange={(e) => setSelectedSupplier(e.target.value)}
              >
                <option value="all">🏪 전체 공급자</option>
                <option value="sejin">세진건설기계</option>
                <option value="ds_gimje">디에스김제점</option>
              </select>
            </div>

            <div>
              <select
                className="form-input"
                style={{ width: '120px' }}
                value={docTypeFilter}
                onChange={(e) => setDocTypeFilter(e.target.value)}
              >
                <option value="all">📄 전체 문서</option>
                {DOC_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Live Search Input */}
            <div style={{ position: 'relative', width: '180px' }}>
              <input
                type="text"
                className="form-input"
                placeholder="🔍 거래처/문서 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

        </div>
      </div>

      {/* Summary Cards Dashboard */}
      <div className="accounting-summary-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        {/* Total Sales Card */}
        <div className="card" style={{
          padding: '1.25rem',
          borderLeft: '4px solid #10b981',
          background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)'
        }}>
          <div style={{ fontSize: '0.8125rem', fontWeight: '700', color: '#047857', marginBottom: '0.375rem' }}>
            💵 총 거래금액 (매출액)
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#064e3b' }}>
            {statistics.totalSales.toLocaleString()} 원
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.375rem' }}>
            {selectedYear !== 'all' ? `${selectedYear}년` : ''} {selectedMonth !== 'all' ? `${selectedMonth}월` : '전체'} 기준
          </div>
        </div>

        {/* Total Paid Card */}
        <div className="card" style={{
          padding: '1.25rem',
          borderLeft: '4px solid #3b82f6',
          background: 'linear-gradient(135deg, #ffffff 0%, #eff6ff 100%)'
        }}>
          <div style={{ fontSize: '0.8125rem', fontWeight: '700', color: '#1d4ed8', marginBottom: '0.375rem' }}>
            💳 수금 / 입금 완료액
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#1e3a8a' }}>
            {statistics.totalPaid.toLocaleString()} 원
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.375rem' }}>
            수금률: {statistics.totalSales > 0 ? ((statistics.totalPaid / statistics.totalSales) * 100).toFixed(1) : 0}%
          </div>
        </div>

        {/* Total Unpaid Card */}
        <div className="card" style={{
          padding: '1.25rem',
          borderLeft: `4px solid ${statistics.totalUnpaid > 0 ? '#ef4444' : '#10b981'}`,
          background: statistics.totalUnpaid > 0 ? 'linear-gradient(135deg, #ffffff 0%, #fef2f2 100%)' : 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)'
        }}>
          <div style={{ fontSize: '0.8125rem', fontWeight: '700', color: statistics.totalUnpaid > 0 ? '#b91c1c' : '#047857', marginBottom: '0.375rem' }}>
            ⚠️ 미수금액 (잔액)
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '900', color: statistics.totalUnpaid > 0 ? '#991b1b' : '#064e3b' }}>
            {statistics.totalUnpaid.toLocaleString()} 원
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.375rem' }}>
            미수건 처리 및 결제 관리 대상
          </div>
        </div>

        {/* Doc Count Card */}
        <div className="card" style={{
          padding: '1.25rem',
          borderLeft: '4px solid #8b5cf6',
          background: 'linear-gradient(135deg, #ffffff 0%, #f5f3ff 100%)'
        }}>
          <div style={{ fontSize: '0.8125rem', fontWeight: '700', color: '#6d28d9', marginBottom: '0.375rem' }}>
            📑 발행 문서 건수
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#4c1d95' }}>
            {statistics.totalDocsCount} 건
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.375rem' }}>
            검색 조건에 맞는 내역 수
          </div>
        </div>
      </div>

      {/* Sub-tab Navigation (View Mode Switcher) */}
      <div className="no-print" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', borderBottom: '2px solid #e5e7eb', paddingBottom: '0.5rem' }}>
        <button
          className={`btn ${subTab === 'summary' ? 'btn-green' : 'btn-outline'}`}
          style={{ borderRadius: '20px', fontSize: '0.875rem' }}
          onClick={() => setSubTab('summary')}
        >
          🏢 거래처별 현황 요약 ({customerSummaries.length})
        </button>
        <button
          className={`btn ${subTab === 'detailed' ? 'btn-green' : 'btn-outline'}`}
          style={{ borderRadius: '20px', fontSize: '0.875rem' }}
          onClick={() => setSubTab('detailed')}
        >
          📋 상세 거래장부 (문서 내역 {filteredDocuments.length})
        </button>
      </div>

      {/* Printable Title Block for Print Mode */}
      <div className="print-only-header" style={{ display: 'none', marginBottom: '1.5rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
          거래처별 월별 회계 장부 ({selectedYear}년 {selectedMonth === 'all' ? '전체' : selectedMonth + '월'})
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#555' }}>
          TEAM D.D (세진건설기계 / 디에스건설기계 김제점) | 출력일: {new Date().toLocaleDateString('ko-KR')}
        </p>
      </div>

      {/* VIEW 1: 거래처별 현황 요약 (Customer Summary View) */}
      {subTab === 'summary' && (
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="parts-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: '0.75rem 1rem', textTransform: 'none', width: '180px' }}>거래처명</th>
                  <th style={{ padding: '0.75rem 1rem', textTransform: 'none' }}>담당자 / 사업자번호</th>
                  <th style={{ padding: '0.75rem 1rem', textTransform: 'none' }}>연락처</th>
                  <th style={{ padding: '0.75rem 1rem', textTransform: 'none', textAlign: 'right' }}>선택월 매출액</th>
                  <th style={{ padding: '0.75rem 1rem', textTransform: 'none', textAlign: 'right' }}>선택월 수금액</th>
                  <th style={{ padding: '0.75rem 1rem', textTransform: 'none', textAlign: 'right' }}>선택월 미수금</th>
                  <th style={{ padding: '0.75rem 1rem', textTransform: 'none', textAlign: 'right' }}>누적 미수금액</th>
                  <th style={{ padding: '0.75rem 1rem', textTransform: 'none', textAlign: 'center', width: '100px' }}>상태</th>
                  <th className="no-print" style={{ padding: '0.75rem 1rem', textTransform: 'none', textAlign: 'center', width: '100px' }}>관리</th>
                </tr>
              </thead>
              <tbody>
                {customerSummaries.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
                      조건에 해당하는 거래처 회계 데이터가 없습니다.
                    </td>
                  </tr>
                ) : (
                  customerSummaries.map(c => {
                    const hasUnpaid = c.monthlyUnpaid > 0 || c.allTimeUnpaid > 0;
                    return (
                      <tr key={c.name} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: '700', color: '#111827' }}>
                          {c.name}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: '#4b5563', fontSize: '0.8125rem' }}>
                          <div>{c.person !== '-' ? `👤 ${c.person}` : '-'}</div>
                          <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{c.bizno !== '-' ? c.bizno : ''}</div>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: '#4b5563', fontSize: '0.8125rem' }}>
                          {c.phone}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: '700', color: '#111827' }}>
                          {c.monthlySales.toLocaleString()} 원
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: '700', color: '#2563eb' }}>
                          {c.monthlyPaid.toLocaleString()} 원
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: '800', color: c.monthlyUnpaid > 0 ? '#dc2626' : '#059669' }}>
                          {c.monthlyUnpaid.toLocaleString()} 원
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: '800', color: c.allTimeUnpaid > 0 ? '#b91c1c' : '#047857' }}>
                          {c.allTimeUnpaid.toLocaleString()} 원
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                          {hasUnpaid ? (
                            <span style={{
                              backgroundColor: '#fee2e2',
                              color: '#991b1b',
                              fontSize: '0.75rem',
                              fontWeight: '700',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '12px',
                              border: '1px solid #fca5a5'
                            }}>
                              미수금
                            </span>
                          ) : (
                            <span style={{
                              backgroundColor: '#d1fae5',
                              color: '#065f46',
                              fontSize: '0.75rem',
                              fontWeight: '700',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '12px',
                              border: '1px solid #6ee7b7'
                            }}>
                              완납
                            </span>
                          )}
                        </td>
                        <td className="no-print" style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                          <button
                            className="btn btn-outline"
                            style={{ fontSize: '0.75rem', padding: '0.25rem 0.625rem' }}
                            onClick={() => {
                              setSelectedCustomer(c.name);
                              setSubTab('detailed');
                            }}
                          >
                            장부보기 🔍
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: 상세 거래장부 (Detailed Transactions View) */}
      {subTab === 'detailed' && (
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="parts-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: '0.75rem 0.75rem', textTransform: 'none', width: '90px' }}>날짜</th>
                  <th style={{ padding: '0.75rem 0.75rem', textTransform: 'none', width: '110px' }}>구분/번호</th>
                  <th style={{ padding: '0.75rem 0.75rem', textTransform: 'none', width: '130px' }}>거래처</th>
                  <th style={{ padding: '0.75rem 0.75rem', textTransform: 'none' }}>품목 및 내역 요약</th>
                  <th style={{ padding: '0.75rem 0.75rem', textTransform: 'none', textAlign: 'right', width: '95px' }}>공급가액</th>
                  <th style={{ padding: '0.75rem 0.75rem', textTransform: 'none', textAlign: 'right', width: '85px' }}>부가세</th>
                  <th style={{ padding: '0.75rem 0.75rem', textTransform: 'none', textAlign: 'right', width: '105px' }}>합계금액</th>
                  <th style={{ padding: '0.75rem 0.75rem', textTransform: 'none', textAlign: 'right', width: '100px' }}>수금/입금액</th>
                  <th style={{ padding: '0.75rem 0.75rem', textTransform: 'none', textAlign: 'right', width: '100px' }}>미수금(잔액)</th>
                  <th style={{ padding: '0.75rem 0.75rem', textTransform: 'none', textAlign: 'center', width: '75px' }}>상태</th>
                  <th style={{ padding: '0.75rem 0.75rem', textTransform: 'none', width: '110px' }}>비고</th>
                  <th className="no-print" style={{ padding: '0.75rem 0.75rem', textTransform: 'none', textAlign: 'center', width: '95px' }}>수금 관리</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocuments.length === 0 ? (
                  <tr>
                    <td colSpan="12" style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
                      조건에 맞는 상세 거래명세/회계 내역이 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredDocuments.map(doc => {
                    const { totalSupply, vatAmount, grandTotal, paid, balance } = getDocTotals(doc);
                    const rawCustName = (doc.customer_name || doc.customer_data?.name || '').trim();
                    const custName = (!rawCustName || rawCustName === '미지정') ? '-' : rawCustName;
                    const itemsSummary = (doc.items || []).map(i => `${i.name || '품목'}(${i.qty || 1})`).join(', ');

                    let statusBadge;
                    if (balance <= 0) {
                      statusBadge = (
                        <span style={{ backgroundColor: '#d1fae5', color: '#065f46', fontSize: '0.6875rem', fontWeight: '700', padding: '0.15rem 0.4rem', borderRadius: '8px' }}>
                          완납
                        </span>
                      );
                    } else if (paid > 0) {
                      statusBadge = (
                        <span style={{ backgroundColor: '#fef3c7', color: '#92400e', fontSize: '0.6875rem', fontWeight: '700', padding: '0.15rem 0.4rem', borderRadius: '8px' }}>
                          부분납
                        </span>
                      );
                    } else {
                      statusBadge = (
                        <span style={{ backgroundColor: '#fee2e2', color: '#991b1b', fontSize: '0.6875rem', fontWeight: '700', padding: '0.15rem 0.4rem', borderRadius: '8px' }}>
                          미수
                        </span>
                      );
                    }

                    return (
                      <tr key={doc.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '0.625rem 0.75rem', fontSize: '0.8125rem', color: '#374151' }}>
                          {doc.doc_date || '-'}
                        </td>
                        <td style={{ padding: '0.625rem 0.75rem', fontSize: '0.8125rem' }}>
                          <span style={{ fontWeight: '700', color: '#1f2937' }}>{doc.doc_type}</span>
                          <div style={{ fontSize: '0.6875rem', color: '#6b7280' }}>{doc.doc_no}</div>
                        </td>
                        <td style={{ padding: '0.625rem 0.75rem', fontWeight: '700', color: '#111827', fontSize: '0.8125rem' }}>
                          {custName}
                        </td>
                        <td style={{ padding: '0.625rem 0.75rem', fontSize: '0.8125rem', color: '#4b5563', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={itemsSummary}>
                          {itemsSummary || '-'}
                        </td>
                        <td style={{ padding: '0.625rem 0.75rem', textAlign: 'right', fontSize: '0.8125rem', color: '#374151' }}>
                          {totalSupply.toLocaleString()}
                        </td>
                        <td style={{ padding: '0.625rem 0.75rem', textAlign: 'right', fontSize: '0.8125rem', color: '#6b7280' }}>
                          {vatAmount.toLocaleString()}
                        </td>
                        <td style={{ padding: '0.625rem 0.75rem', textAlign: 'right', fontWeight: '800', fontSize: '0.8125rem', color: '#111827' }}>
                          {grandTotal.toLocaleString()}
                        </td>
                        <td style={{ padding: '0.625rem 0.75rem', textAlign: 'right', fontWeight: '700', fontSize: '0.8125rem', color: '#2563eb' }}>
                          {paid.toLocaleString()}
                        </td>
                        <td style={{ padding: '0.625rem 0.75rem', textAlign: 'right', fontWeight: '800', fontSize: '0.8125rem', color: balance > 0 ? '#dc2626' : '#059669' }}>
                          {balance.toLocaleString()}
                        </td>
                        <td style={{ padding: '0.625rem 0.75rem', textAlign: 'center' }}>
                          {statusBadge}
                        </td>
                        <td style={{ padding: '0.625rem 0.75rem', fontSize: '0.75rem', color: '#6b7280', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {doc.remark || '-'}
                        </td>
                        <td className="no-print" style={{ padding: '0.625rem 0.75rem', textAlign: 'center' }}>
                          <button
                            className="btn btn-green"
                            style={{ fontSize: '0.6875rem', padding: '0.2rem 0.5rem' }}
                            onClick={() => handleOpenEditPaid(doc)}
                          >
                            💳 수금등록
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payment Edit Modal (수금 / 입금 등록 팝업 모달) */}
      {editingDoc && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            maxWidth: '480px',
            width: '100%',
            padding: '1.5rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #e5e7eb', pb: '0.75rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '800', color: '#111827', margin: 0 }}>
                💳 수금 / 입금액 등록
              </h3>
              <button
                onClick={() => setEditingDoc(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#9ca3af' }}
              >
                ✕
              </button>
            </div>

            {/* Target Document Meta Info */}
            <div style={{ backgroundColor: '#f9fafb', padding: '0.875rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.8125rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span style={{ color: '#6b7280' }}>거래처:</span>
                <span style={{ fontWeight: '700', color: '#111827' }}>{editingDoc.customer_name || editingDoc.customer_data?.name || '-'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span style={{ color: '#6b7280' }}>문서번호 / 일자:</span>
                <span>{editingDoc.doc_no} ({editingDoc.doc_date})</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span style={{ color: '#6b7280' }}>총 청구금액:</span>
                <span style={{ fontWeight: '800', color: '#111827' }}>{getDocTotals(editingDoc).grandTotal.toLocaleString()} 원</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6b7280' }}>현재 미수잔액:</span>
                <span style={{ fontWeight: '800', color: '#dc2626' }}>{getDocTotals(editingDoc).balance.toLocaleString()} 원</span>
              </div>
            </div>

            {/* Quick Action Preset Buttons */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <button
                type="button"
                className="btn btn-green"
                style={{ flex: 1, fontSize: '0.75rem', padding: '0.4rem' }}
                onClick={() => setInputPaid(getDocTotals(editingDoc).grandTotal)}
              >
                ✓ 전액 완납 ({getDocTotals(editingDoc).grandTotal.toLocaleString()}원)
              </button>
              <button
                type="button"
                className="btn btn-outline"
                style={{ flex: 1, fontSize: '0.75rem', padding: '0.4rem', color: '#dc2626', borderColor: '#fca5a5' }}
                onClick={() => setInputPaid(0)}
              >
                ✕ 전액 미수 (0원)
              </button>
            </div>

            {/* Input Form */}
            <div style={{ marginBottom: '1rem' }}>
              <label className="form-label">수금 / 입금액 (원)</label>
              <input
                type="number"
                className="form-input"
                style={{ fontSize: '1.125rem', fontWeight: '700', textAlign: 'right' }}
                value={inputPaid}
                onChange={(e) => setInputPaid(Number(e.target.value))}
              />
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem', textAlign: 'right' }}>
                변경 후 미수잔액: {(getDocTotals(editingDoc).grandTotal - inputPaid).toLocaleString()} 원
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label className="form-label">수금 관련 비고 / 메모</label>
              <input
                type="text"
                className="form-input"
                placeholder="예: 8/13 계좌이체 완납, 현금 수금 등"
                value={inputRemark}
                onChange={(e) => setInputRemark(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={() => setEditingDoc(null)}>
                취소
              </button>
              <button className="btn btn-green" onClick={handleSavePaidModal}>
                💾 수금 내역 저장
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
