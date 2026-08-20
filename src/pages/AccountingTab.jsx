// 🎨 TEAM D.D ACCOUNTING & LEDGER TAB (NAVER PAY STYLE METRIC DASHBOARD)
import React, { useState, useMemo } from 'react';
import { areSupplierKeysEquivalent } from '../utils/validation.js';
import { DOC_TYPES } from '../config/constants.js';

export default function AccountingTab({
  documents = [],
  customersList = [],
  suppliersList = [],
  onUpdateDocumentPaid,
  onDeleteDocument,
  onPreviewDocument
}) {
  const currentDate = new Date();
  const currentYearStr = String(currentDate.getFullYear());
  const currentMonthStr = String(currentDate.getMonth() + 1).padStart(2, '0');

  const [selectedYear, setSelectedYear] = useState(currentYearStr);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [selectedCustomer, setSelectedCustomer] = useState('all');
  const [selectedSupplier, setSelectedSupplier] = useState('all');
  const [docTypeFilter, setDocTypeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [subTab, setSubTab] = useState('summary');

  const [editingDoc, setEditingDoc] = useState(null);
  const [inputPaid, setInputPaid] = useState(0);
  const [inputRemark, setInputRemark] = useState('');

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

  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      if (doc.is_deleted) return false;
      const dDate = doc.doc_date || doc.docDate;
      if (dDate) {
        const [y, m] = dDate.split('-');
        if (selectedYear !== 'all' && y !== selectedYear) return false;
        if (selectedMonth !== 'all' && m !== selectedMonth) return false;
      }
      if (selectedCustomer !== 'all') {
        const custName = doc.customer_name || doc.customer_data?.name || doc.customer?.name || '';
        if (custName !== selectedCustomer) return false;
      }
      if (selectedSupplier !== 'all') {
        const suppKey = doc.supplier_key || doc.supplierKey || '';
        if (!areSupplierKeysEquivalent(suppKey, selectedSupplier)) return false;
      }
      const dType = doc.doc_type || doc.docType;
      if (docTypeFilter !== 'all' && dType !== docTypeFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const docNo = (doc.doc_no || doc.docNo || '').toLowerCase();
        const custName = (doc.customer_name || doc.customer_data?.name || doc.customer?.name || '').toLowerCase();
        const remark = (doc.remark || '').toLowerCase();
        const itemNames = (doc.items || []).map(i => i.name || '').join(' ').toLowerCase();
        if (!docNo.includes(q) && !custName.includes(q) && !remark.includes(q) && !itemNames.includes(q)) return false;
      }
      return true;
    });
  }, [documents, selectedYear, selectedMonth, selectedCustomer, selectedSupplier, docTypeFilter, searchQuery]);

  const statistics = useMemo(() => {
    let totalSales = 0, totalPaid = 0, totalUnpaid = 0, totalDocsCount = 0;
    let totalEstimate = 0, estimateDocsCount = 0;
    filteredDocuments.forEach(doc => {
      const isEstimate = (doc.doc_type || doc.docType) === '견적서';
      const { grandTotal, paid, balance } = getDocTotals(doc);
      if (isEstimate) {
        totalEstimate += grandTotal;
        estimateDocsCount += 1;
      } else {
        totalSales += grandTotal;
        totalPaid += paid;
        totalUnpaid += balance;
        totalDocsCount += 1;
      }
    });
    return { totalSales, totalPaid, totalUnpaid, totalDocsCount, totalEstimate, estimateDocsCount };
  }, [filteredDocuments]);

  const customerSummaries = useMemo(() => {
    const map = new Map();
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

    documents.forEach(doc => {
      if ((doc.doc_type || doc.docType) === '견적서') return;

      const rawName = (doc.customer_name || doc.customer_data?.name || doc.customer?.name || '').trim();
      if (!rawName || rawName === '미지정') return;

      const custName = rawName;
      if (!map.has(custName)) {
        map.set(custName, {
          name: custName,
          person: doc.customer_data?.person || doc.customer?.person || '-',
          phone: doc.customer_data?.phone || doc.customer?.phone || '-',
          bizno: doc.customer_data?.bizno || doc.customer?.bizno || '-',
          monthlySales: 0,
          monthlyPaid: 0,
          monthlyUnpaid: 0,
          allTimeUnpaid: 0,
          docCount: 0
        });
      }
      const entry = map.get(custName);
      const { grandTotal, paid, balance } = getDocTotals(doc);
      entry.allTimeUnpaid += balance;

      let matchesPeriod = true;
      const dDate = doc.doc_date || doc.docDate;
      if (dDate) {
        const [y, m] = dDate.split('-');
        if (selectedYear !== 'all' && y !== selectedYear) matchesPeriod = false;
        if (selectedMonth !== 'all' && m !== selectedMonth) matchesPeriod = false;
      }
      const sKey = doc.supplier_key || doc.supplierKey;
      if (selectedSupplier !== 'all' && !areSupplierKeysEquivalent(sKey, selectedSupplier)) matchesPeriod = false;

      if (matchesPeriod) {
        entry.monthlySales += grandTotal;
        entry.monthlyPaid += paid;
        entry.monthlyUnpaid += balance;
        entry.docCount += 1;
      }
    });

    let list = Array.from(map.values()).filter(c => c.name && c.name !== '미지정');
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.person.toLowerCase().includes(q));
    }
    list.sort((a, b) => b.monthlySales - a.monthlySales || b.allTimeUnpaid - a.allTimeUnpaid);
    return list;
  }, [customersList, documents, selectedYear, selectedMonth, selectedSupplier, searchQuery]);

  const handlePrevMonth = () => {
    if (selectedMonth === 'all') { setSelectedMonth('12'); return; }
    const m = parseInt(selectedMonth, 10);
    if (m === 1) {
      setSelectedYear(String(parseInt(selectedYear, 10) - 1));
      setSelectedMonth('12');
    } else {
      setSelectedMonth(String(m - 1).padStart(2, '0'));
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 'all') { setSelectedMonth('01'); return; }
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

  const handleExportCSV = () => {
    if (filteredDocuments.length === 0) {
      alert('다운로드할 회계 내역이 없습니다.');
      return;
    }
    const headers = ['날짜', '문서번호', '구분', '거래처명', '공급자', '공급가액', '부가세', '총금액', '수금액', '미수금액', '수금상태', '비고'];
    const rows = filteredDocuments.map(doc => {
      const { totalSupply, vatAmount, grandTotal, paid, balance } = getDocTotals(doc);
      const status = balance <= 0 ? '완납' : (paid > 0 ? '부분납' : '미수');
      const custName = doc.customer_name || doc.customer_data?.name || doc.customer?.name || '-';
      const suppName = doc.supplier_data?.company || doc.supplier_data?.name || doc.supplier_key || doc.supplierKey || '-';
      return [
        `"${doc.doc_date || doc.docDate || ''}"`,
        `"${doc.doc_no || doc.docNo || ''}"`,
        `"${doc.doc_type || doc.docType || ''}"`,
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
    link.href = url;
    link.download = `거래처별_월별_회계장부_${selectedYear}년_${selectedMonth === 'all' ? '전체' : selectedMonth + '월'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  const paidPercent = statistics.totalSales > 0 ? ((statistics.totalPaid / statistics.totalSales) * 100).toFixed(1) : 0;

  return (
    <div className="management-container print-container" style={{ padding: '0.75rem', maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
      {/* Header Card */}
      <div className="card-box no-print" style={{ marginBottom: '0.75rem', padding: '0.875rem 1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '900', color: '#191F28', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>📊</span> 거래처별 회계 관리 (월별 회계장부)
            </h2>
            <p style={{ fontSize: '0.8125rem', color: '#6B7684', margin: '0.25rem 0 0 0' }}>
              발행된 거래명세서/청구서 기준 월별 매출, 수금, 미수금 현황을 통합 관리합니다.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button onClick={handleExportCSV} className="btn btn-outline" style={{ fontSize: '0.8125rem', padding: '6px 12px', minHeight: '34px' }}>
              📥 엑셀(CSV) 저장
            </button>
            <button onClick={handlePrint} className="btn btn-primary" style={{ fontSize: '0.8125rem', padding: '6px 12px', minHeight: '34px' }}>
              🖨️ 회계장부 인쇄
            </button>
          </div>
        </div>
      </div>

      {/* Filters Card */}
      <div className="card-box no-print" style={{ marginBottom: '0.75rem', padding: '0.75rem 1rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Date Navigation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap' }}>
            <button className="btn btn-outline" style={{ padding: '4px 8px', fontSize: '11px', minHeight: '32px' }} onClick={handlePrevMonth} title="이전 달">
              ◀ 이전
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <select className="form-select" style={{ width: '105px', fontWeight: '700', minHeight: '34px', padding: '4px 8px', fontSize: '0.8125rem' }} value={selectedYear} onChange={e => setSelectedYear(e.target.value)}>
                <option value="all">전체 연도</option>
                <option value="2024">2024년</option>
                <option value="2025">2025년</option>
                <option value="2026">2026년</option>
                <option value="2027">2027년</option>
              </select>
              <select className="form-select" style={{ width: '95px', fontWeight: '700', minHeight: '34px', padding: '4px 8px', fontSize: '0.8125rem' }} value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
                <option value="all">전체 (월)</option>
                {Array.from({ length: 12 }, (_, i) => {
                  const mStr = String(i + 1).padStart(2, '0');
                  return <option key={mStr} value={mStr}>{i + 1}월</option>;
                })}
              </select>
            </div>
            <button className="btn btn-outline" style={{ padding: '4px 8px', fontSize: '11px', minHeight: '32px' }} onClick={handleNextMonth} title="다음 달">
              다음 ▶
            </button>
            <button className="btn btn-green" style={{ fontSize: '0.75rem', padding: '4px 10px', minHeight: '32px', fontWeight: '800' }} onClick={handleCurrentMonth}>
              이번달
            </button>
          </div>

          {/* Search & Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap' }}>
            <select className="form-select" style={{ width: '140px', minHeight: '34px', padding: '4px 8px', fontSize: '0.8125rem' }} value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)}>
              <option value="all">🏢 전체 거래처</option>
              {customersList.map(c => <option key={c.id || c.name} value={c.name}>{c.name}</option>)}
            </select>
            {sessionStorage.getItem('dd_user_role') === 'admin' && (
              <select className="form-select" style={{ width: '130px', minHeight: '34px', padding: '4px 8px', fontSize: '0.8125rem' }} value={selectedSupplier} onChange={e => setSelectedSupplier(e.target.value)}>
                <option value="all">🏪 전체 공급자</option>
                {suppliersList.map(s => <option key={s.id} value={s.id}>{s.name || s.company}</option>)}
              </select>
            )}
            <select className="form-select" style={{ width: '115px', minHeight: '34px', padding: '4px 8px', fontSize: '0.8125rem' }} value={docTypeFilter} onChange={e => setDocTypeFilter(e.target.value)}>
              <option value="all">📄 전체 문서</option>
              {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input type="text" className="form-input" style={{ width: '170px', minHeight: '34px', padding: '4px 8px', fontSize: '0.8125rem' }} placeholder="🔍 거래처/품목 검색..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
        </div>
      </div>

      {/* 4 Summary Metric Cards */}
      <div className="accounting-summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
        {/* Total Sales */}
        <div className="card-box" style={{ padding: '1rem', borderTop: '3px solid #03C75A', backgroundColor: '#ffffff' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: '800', color: '#028A3E' }}>총 거래금액 (매출액)</span>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#E8F8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem' }}>💵</div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#191F28', letterSpacing: '-0.03em' }}>
            {statistics.totalSales.toLocaleString()}
            <span style={{ fontSize: '0.9375rem', fontWeight: '700', color: '#4E5968' }}> 원</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#8B95A1', marginTop: '0.25rem' }}>
            {`${selectedYear !== 'all' ? selectedYear + "년 " : ''}${selectedMonth !== 'all' ? selectedMonth + "월" : '전체'} 기준`}
          </div>
        </div>

        {/* Total Paid */}
        <div className="card-box" style={{ padding: '1rem', borderTop: '3px solid #3182F6', backgroundColor: '#ffffff' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: '800', color: '#1B64DA' }}>수금 / 입금 완료액</span>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#EFF4FE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem' }}>💳</div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#191F28', letterSpacing: '-0.03em' }}>
            {statistics.totalPaid.toLocaleString()}
            <span style={{ fontSize: '0.9375rem', fontWeight: '700', color: '#4E5968' }}> 원</span>
          </div>
          <div style={{ marginTop: '0.375rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#1B64DA', fontWeight: '700', marginBottom: '0.2rem' }}>
              <span>수금률</span>
              <span>{paidPercent}%</span>
            </div>
            <div style={{ height: '4px', backgroundColor: '#EFF4FE', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(paidPercent, 100)}%`, height: '100%', backgroundColor: '#3182F6', transition: 'width 0.3s' }} />
            </div>
          </div>
        </div>

        {/* Unpaid Balance */}
        <div className="card-box" style={{ padding: '1rem', borderTop: `3px solid ${statistics.totalUnpaid > 0 ? '#F04438' : '#03C75A'}`, backgroundColor: '#ffffff' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: '800', color: statistics.totalUnpaid > 0 ? '#D92D20' : '#028A3E' }}>미수금액 (잔액)</span>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: statistics.totalUnpaid > 0 ? '#FEF3F2' : '#E8F8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem' }}>⚠️</div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '900', color: statistics.totalUnpaid > 0 ? '#D92D20' : '#191F28', letterSpacing: '-0.03em' }}>
            {statistics.totalUnpaid.toLocaleString()}
            <span style={{ fontSize: '0.9375rem', fontWeight: '700', color: '#4E5968' }}> 원</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: statistics.totalUnpaid > 0 ? '#D92D20' : '#03C75A', marginTop: '0.25rem', fontWeight: '700' }}>
            {statistics.totalUnpaid > 0 ? '⚠️ 미수 잔액 관리 필요' : '✓ 전액 완납 완료'}
          </div>
        </div>

        {/* Document Count */}
        <div className="card-box" style={{ padding: '1rem', borderTop: '3px solid #6366F1', backgroundColor: '#ffffff' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: '800', color: '#4F46E5' }}>발행 문서 건수</span>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem' }}>📑</div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#191F28', letterSpacing: '-0.03em' }}>
            {statistics.totalDocsCount}
            <span style={{ fontSize: '0.9375rem', fontWeight: '700', color: '#4E5968' }}> 건</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#8B95A1', marginTop: '0.25rem' }}>조회 조건 기준 내역 수</div>
        </div>
      </div>

      {/* Sub-tabs Capsule Navigation */}
      <div className="no-print" style={{ display: 'inline-flex', backgroundColor: '#EEF2F5', padding: '3px', borderRadius: '10px', marginBottom: '0.75rem', border: '1px solid #E5E8EB' }}>
        <button
          type="button"
          style={{
            borderRadius: '8px',
            fontSize: '0.8125rem',
            fontWeight: '800',
            padding: '0.35rem 1rem',
            backgroundColor: subTab === 'summary' ? '#ffffff' : 'transparent',
            color: subTab === 'summary' ? '#028A3E' : '#6B7684',
            boxShadow: subTab === 'summary' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.15s'
          }}
          onClick={() => setSubTab('summary')}
        >
          {`🏢 거래처별 현황 요약 (${customerSummaries.length})`}
        </button>
        <button
          type="button"
          style={{
            borderRadius: '8px',
            fontSize: '0.8125rem',
            fontWeight: '800',
            padding: '0.35rem 1rem',
            backgroundColor: subTab === 'detailed' ? '#ffffff' : 'transparent',
            color: subTab === 'detailed' ? '#028A3E' : '#6B7684',
            boxShadow: subTab === 'detailed' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.15s'
          }}
          onClick={() => setSubTab('detailed')}
        >
          {`📋 상세 거래장부 (문서 내역 ${filteredDocuments.length})`}
        </button>
      </div>

      {/* Main Data View */}
      <div className="card-box" style={{ padding: '0', overflow: 'hidden' }}>
        {subTab === 'summary' ? (
          /* Summary Table */
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
              <thead style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #E5E8EB', color: '#4E5968', fontWeight: '800' }}>
                <tr>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>거래처명</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>담당/연락처</th>
                  <th style={{ padding: '0.75rem 0.75rem', textAlign: 'right' }}>해당기간 매출</th>
                  <th style={{ padding: '0.75rem 0.75rem', textAlign: 'right' }}>해당기간 수금</th>
                  <th style={{ padding: '0.75rem 0.75rem', textAlign: 'right' }}>해당기간 미수</th>
                  <th style={{ padding: '0.75rem 0.75rem', textAlign: 'right' }}>누적 총 미수금</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>상태 / 건수</th>
                </tr>
              </thead>
              <tbody>
                {customerSummaries.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#8B95A1' }}>
                      조회 조건에 해당하는 거래처 내역이 없습니다.
                    </td>
                  </tr>
                ) : (
                  customerSummaries.map((c, idx) => {
                    const hasUnpaid = c.allTimeUnpaid > 0;
                    return (
                      <tr
                        key={c.name + idx}
                        style={{ borderBottom: '1px solid #E5E8EB', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#F9FAFB' }}
                      >
                        <td style={{ padding: '0.75rem 1rem', fontWeight: '800', color: '#191F28' }}>{c.name}</td>
                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', color: '#6B7684', fontSize: '0.75rem' }}>{`${c.person} (${c.phone})`}</td>
                        <td style={{ padding: '0.75rem 0.75rem', textAlign: 'right', fontWeight: '800', color: '#191F28' }}>{`${c.monthlySales.toLocaleString()} 원`}</td>
                        <td style={{ padding: '0.75rem 0.75rem', textAlign: 'right', fontWeight: '700', color: '#1B64DA' }}>{`${c.monthlyPaid.toLocaleString()} 원`}</td>
                        <td style={{ padding: '0.75rem 0.75rem', textAlign: 'right', fontWeight: '800', color: c.monthlyUnpaid > 0 ? '#D92D20' : '#03C75A' }}>{`${c.monthlyUnpaid.toLocaleString()} 원`}</td>
                        <td style={{ padding: '0.75rem 0.75rem', textAlign: 'right', fontWeight: '900', color: hasUnpaid ? '#D92D20' : '#03C75A' }}>{`${c.allTimeUnpaid.toLocaleString()} 원`}</td>
                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                          {hasUnpaid ? (
                            <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '800', backgroundColor: '#FEF3F2', color: '#D92D20', border: '1px solid #FECDCA' }}>
                              미수
                            </span>
                          ) : (
                            <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '800', backgroundColor: '#E8F8F0', color: '#028A3E', border: '1px solid #A3E9C4' }}>
                              완납
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* Detailed Transactions Table */
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
              <thead style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #E5E8EB', color: '#4E5968', fontWeight: '800' }}>
                <tr>
                  <th style={{ padding: '0.75rem 0.75rem', textAlign: 'left' }}>일자</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>구분</th>
                  <th style={{ padding: '0.75rem 0.75rem', textAlign: 'left' }}>거래처명</th>
                  <th style={{ padding: '0.75rem 0.75rem', textAlign: 'left' }}>품목 요약</th>
                  <th style={{ padding: '0.75rem 0.75rem', textAlign: 'right' }}>공급가액</th>
                  <th style={{ padding: '0.75rem 0.75rem', textAlign: 'right' }}>부가세</th>
                  <th style={{ padding: '0.75rem 0.75rem', textAlign: 'right' }}>합계금액</th>
                  <th style={{ padding: '0.75rem 0.75rem', textAlign: 'right' }}>수금액</th>
                  <th style={{ padding: '0.75rem 0.75rem', textAlign: 'right' }}>미수잔액</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>상태</th>
                  <th className="no-print" style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>관리</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocuments.length === 0 ? (
                  <tr>
                    <td colSpan={11} style={{ padding: '2rem', textAlign: 'center', color: '#8B95A1' }}>
                      조회 조건에 해당하는 문서 내역이 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredDocuments.map((doc, idx) => {
                    const { totalSupply, vatAmount, grandTotal, paid, balance } = getDocTotals(doc);
                    const isPaidComplete = balance <= 0;
                    const itemSummary = (doc.items || []).map(i => i.name).filter(Boolean).slice(0, 2).join(', ');

                    return (
                      <tr
                        key={doc.id || idx}
                        style={{ borderBottom: '1px solid #E5E8EB', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#F9FAFB', cursor: onPreviewDocument ? 'pointer' : 'default' }}
                        onClick={() => onPreviewDocument && onPreviewDocument(doc)}
                      >
                        <td style={{ padding: '0.75rem 0.75rem', color: '#6B7684', whiteSpace: 'nowrap' }}>{doc.doc_date || doc.docDate || '-'}</td>
                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                          <span style={{ fontSize: '11px', fontWeight: '800', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#EEF2F5', color: '#333D4B' }}>
                            {doc.doc_type || doc.docType || '명세서'}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 0.75rem', fontWeight: '800', color: '#191F28' }}>
                          {doc.customer_name || doc.customer_data?.name || doc.customer?.name || '-'}
                        </td>
                        <td style={{ padding: '0.75rem 0.75rem', color: '#4E5968', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {itemSummary || '-'}
                        </td>
                        <td style={{ padding: '0.75rem 0.75rem', textAlign: 'right', color: '#4E5968' }}>{totalSupply.toLocaleString()}</td>
                        <td style={{ padding: '0.75rem 0.75rem', textAlign: 'right', color: '#8B95A1' }}>{vatAmount.toLocaleString()}</td>
                        <td style={{ padding: '0.75rem 0.75rem', textAlign: 'right', fontWeight: '800', color: '#191F28' }}>{grandTotal.toLocaleString()}</td>
                        <td style={{ padding: '0.75rem 0.75rem', textAlign: 'right', fontWeight: '700', color: '#1B64DA' }}>{paid.toLocaleString()}</td>
                        <td style={{ padding: '0.75rem 0.75rem', textAlign: 'right', fontWeight: '900', color: balance > 0 ? '#D92D20' : '#03C75A' }}>{balance.toLocaleString()}</td>
                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                          {isPaidComplete ? (
                            <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: '800', backgroundColor: '#E8F8F0', color: '#028A3E' }}>
                              완납
                            </span>
                          ) : (
                            <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: '800', backgroundColor: '#FEF3F2', color: '#D92D20' }}>
                              미수
                            </span>
                          )}
                        </td>
                        <td className="no-print" style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                            <button
                              type="button"
                              className="btn btn-outline btn-sm"
                              style={{ fontSize: '11px', padding: '2px 6px', minHeight: '26px' }}
                              onClick={() => onPreviewDocument && onPreviewDocument(doc)}
                            >
                              📄 보기
                            </button>
                            <button
                              type="button"
                              className="btn btn-green btn-sm"
                              style={{ fontSize: '11px', padding: '2px 6px', minHeight: '26px' }}
                              onClick={() => handleOpenEditPaid(doc)}
                            >
                              💳 수금
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Paid Edit Modal */}
      {editingDoc && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', maxWidth: '440px', width: '100%', padding: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #E5E8EB', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '800', color: '#191F28', margin: 0 }}>💳 수금 / 입금액 등록</h3>
              <button onClick={() => setEditingDoc(null)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#8B95A1' }}>✕</button>
            </div>
            <div style={{ backgroundColor: '#F9FAFB', padding: '0.875rem', borderRadius: '10px', marginBottom: '1rem', fontSize: '0.8125rem', border: '1px solid #E5E8EB' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span style={{ color: '#6B7684' }}>거래처:</span>
                <span style={{ fontWeight: '700', color: '#191F28' }}>{editingDoc.customer_name || editingDoc.customer_data?.name || editingDoc.customer?.name || '-'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span style={{ color: '#6B7684' }}>문서번호/일자:</span>
                <span>{`${editingDoc.doc_no || editingDoc.docNo} (${editingDoc.doc_date || editingDoc.docDate})`}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span style={{ color: '#6B7684' }}>총 청구금액:</span>
                <span style={{ fontWeight: '800', color: '#191F28' }}>{`${getDocTotals(editingDoc).grandTotal.toLocaleString()} 원`}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6B7684' }}>현재 미수잔액:</span>
                <span style={{ fontWeight: '800', color: '#D92D20' }}>{`${getDocTotals(editingDoc).balance.toLocaleString()} 원`}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <button
                type="button"
                className="btn btn-green"
                style={{ flex: 1, fontSize: '0.75rem', padding: '0.4rem', minHeight: '34px' }}
                onClick={() => setInputPaid(getDocTotals(editingDoc).grandTotal)}
              >
                {`✓ 전액 완납 (${getDocTotals(editingDoc).grandTotal.toLocaleString()}원)`}
              </button>
              <button
                type="button"
                className="btn btn-outline"
                style={{ flex: 1, fontSize: '0.75rem', padding: '0.4rem', minHeight: '34px', color: '#D92D20', borderColor: '#FECDCA' }}
                onClick={() => setInputPaid(0)}
              >
                ✕ 전액 미수 (0원)
              </button>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label className="form-label">수금 / 입금액 (원)</label>
              <input
                type="number"
                className="form-input"
                style={{ fontSize: '1.125rem', fontWeight: '800', textAlign: 'right' }}
                value={inputPaid}
                onChange={e => setInputPaid(Number(e.target.value))}
              />
              <div style={{ fontSize: '0.75rem', color: '#8B95A1', marginTop: '0.25rem', textAlign: 'right' }}>
                {`변경 후 미수잔액: ${(getDocTotals(editingDoc).grandTotal - inputPaid).toLocaleString()} 원`}
              </div>
            </div>
            <div style={{ marginBottom: '1.25rem' }}>
              <label className="form-label">수금 관련 비고 / 메모</label>
              <input
                type="text"
                className="form-input"
                placeholder="예: 계좌이체 완납, 현금 수금 등"
                value={inputRemark}
                onChange={e => setInputRemark(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" style={{ minHeight: '36px' }} onClick={() => setEditingDoc(null)}>
                취소
              </button>
              <button className="btn btn-green" style={{ minHeight: '36px' }} onClick={handleSavePaidModal}>
                💾 수금 내역 저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
