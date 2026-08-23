import React, { useState, useMemo } from 'react';
import { areSupplierKeysEquivalent, normalizePartners, isPartnerInDoc } from '../utils/validation.js';
import { DOC_TYPES } from '../config/constants.js';
import PartnerSettlementModal from '../modals/PartnerSettlementModal.jsx';

export default function AccountingTab({
  documents = [],
  customersList = [],
  suppliersList = [],
  selectedSupplierKey = 'sejin',
  currentSupplier = {},
  onUpdateDocumentPaid,
  onDeleteDocument,
  onPreviewDocument,
  onUpdateDocumentSettlement
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
  const [subTab, setSubTab] = useState('summary'); // 'summary' | 'detailed' | 'collab'
  const [summaryFilterMode, setSummaryFilterMode] = useState('unpaid'); // 'unpaid' (미수 거래처만) | 'monthly' (당월 거래처) | 'all' (전체)

  // Collaborative Filter States (shadcn style)
  const [collabDirectionFilter, setCollabDirectionFilter] = useState('all'); // 'all' | 'outgoing' | 'incoming' | 'completed'
  const [collabPartnerFilter, setCollabPartnerFilter] = useState('all');

  // Partner Settlement Modal State
  const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false);
  const [partnerModalDirection, setPartnerModalDirection] = useState('outgoing');
  const [partnerModalPartnerName, setPartnerModalPartnerName] = useState('');
  const [partnerModalItems, setPartnerModalItems] = useState([]);

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

  const uniqueCustomerOptions = useMemo(() => {
    const seen = new Set();
    const list = [];
    customersList.forEach(c => {
      if (!c || !c.name || !c.name.trim() || c.name.trim() === '미지정') return;
      const trimmed = c.name.trim();
      const key = trimmed.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        list.push(trimmed);
      }
    });
    list.sort((a, b) => a.localeCompare(b, 'ko'));
    return list;
  }, [customersList]);

  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      if (!doc || doc.is_deleted) return false;
      const dDate = doc.doc_date || doc.docDate;
      if (dDate) {
        const [y, m] = dDate.split('-');
        if (selectedYear !== 'all' && y !== selectedYear) return false;
        if (selectedMonth !== 'all' && m !== selectedMonth) return false;
      }
      if (selectedCustomer !== 'all') {
        const custName = (doc.customer_name || doc.customer_data?.name || doc.customer?.name || '').trim();
        if (custName.toLowerCase() !== selectedCustomer.trim().toLowerCase()) return false;
      }
      if (selectedSupplier !== 'all') {
        const suppKey = doc.supplier_key || doc.supplierKey || '';
        if (!areSupplierKeysEquivalent(suppKey, selectedSupplier)) return false;
      }
      const dType = doc.doc_type || doc.docType;
      if (docTypeFilter !== 'all' && dType !== docTypeFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
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

  const { allCustomerSummaries, summaryCounts } = useMemo(() => {
    const map = new Map();
    customersList.forEach(c => {
      if (!c || !c.name) return;
      const rawName = c.name.trim();
      if (!rawName || rawName === '미지정') return;
      const key = rawName.toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          name: rawName,
          person: c.person || c.repName || '-',
          phone: c.phone || '-',
          bizno: c.bizno || '-',
          monthlySales: 0,
          monthlyPaid: 0,
          monthlyUnpaid: 0,
          allTimeUnpaid: 0,
          docCount: 0
        });
      } else {
        const existing = map.get(key);
        if (existing.person === '-' && (c.person || c.repName)) existing.person = c.person || c.repName;
        if (existing.phone === '-' && c.phone) existing.phone = c.phone;
        if (existing.bizno === '-' && c.bizno) existing.bizno = c.bizno;
      }
    });

    documents.forEach(doc => {
      if (!doc || doc.is_deleted) return;
      if ((doc.doc_type || doc.docType) === '견적서') return;

      const rawName = (doc.customer_name || doc.customer_data?.name || doc.customer?.name || '').trim();
      if (!rawName || rawName === '미지정') return;

      const key = rawName.toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          name: rawName,
          person: doc.customer_data?.person || doc.customer_data?.repName || doc.customer?.person || doc.customer?.repName || '-',
          phone: doc.customer_data?.phone || doc.customer?.phone || '-',
          bizno: doc.customer_data?.bizno || doc.customer?.bizno || '-',
          monthlySales: 0,
          monthlyPaid: 0,
          monthlyUnpaid: 0,
          allTimeUnpaid: 0,
          docCount: 0
        });
      }
      const entry = map.get(key);
      const sKey = doc.supplier_key || doc.supplierKey;
      if (selectedSupplier !== 'all' && !areSupplierKeysEquivalent(sKey, selectedSupplier)) {
        return;
      }

      const { grandTotal, paid, balance } = getDocTotals(doc);
      entry.allTimeUnpaid += balance;

      let matchesPeriod = true;
      const dDate = doc.doc_date || doc.docDate;
      if (dDate) {
        const [y, m] = dDate.split('-');
        if (selectedYear !== 'all' && y !== selectedYear) matchesPeriod = false;
        if (selectedMonth !== 'all' && m !== selectedMonth) matchesPeriod = false;
      }

      if (matchesPeriod) {
        entry.monthlySales += grandTotal;
        entry.monthlyPaid += paid;
        entry.monthlyUnpaid += balance;
        entry.docCount += 1;
      }
    });

    let list = Array.from(map.values()).filter(c => c.name && c.name !== '미지정');

    if (selectedCustomer !== 'all') {
      const sel = selectedCustomer.trim().toLowerCase();
      list = list.filter(c => c.name.trim().toLowerCase() === sel);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(c => 
        c.name.toLowerCase().includes(q) || 
        c.phone.includes(q) || 
        c.person.toLowerCase().includes(q) ||
        (c.bizno && c.bizno.includes(q))
      );
    }

    list.sort((a, b) => b.monthlySales - a.monthlySales || b.allTimeUnpaid - a.allTimeUnpaid);

    const unpaidCount = list.filter(c => c.allTimeUnpaid > 0 || c.monthlyUnpaid > 0).length;
    const monthlyCount = list.filter(c => c.monthlySales > 0 || c.monthlyPaid > 0 || c.docCount > 0).length;
    const allCount = list.length;

    return {
      allCustomerSummaries: list,
      summaryCounts: { unpaidCount, monthlyCount, allCount }
    };
  }, [customersList, documents, selectedYear, selectedMonth, selectedCustomer, selectedSupplier, searchQuery]);

  const customerSummaries = useMemo(() => {
    if (selectedCustomer !== 'all' || searchQuery.trim()) {
      return allCustomerSummaries;
    }
    if (summaryFilterMode === 'unpaid') {
      return allCustomerSummaries.filter(c => c.allTimeUnpaid > 0 || c.monthlyUnpaid > 0);
    }
    if (summaryFilterMode === 'monthly') {
      return allCustomerSummaries.filter(c => c.monthlySales > 0 || c.monthlyPaid > 0 || c.docCount > 0);
    }
    return allCustomerSummaries;
  }, [allCustomerSummaries, summaryFilterMode, selectedCustomer, searchQuery]);

  // 🤝 Collaborative Settlements Data (shadcn/ui style metrics with multi-partner support)
  const collaborativeData = useMemo(() => {
    const rawList = documents.filter(doc => {
      if (doc.is_deleted) return false;
      const isShared = !!doc.is_shared || !!doc.partner_key || (doc.partners && doc.partners.length > 0);
      if (!isShared) return false;

      const isMyLead = areSupplierKeysEquivalent(doc.supplier_key || doc.supplierKey, selectedSupplierKey);
      const isPartnerIn = isPartnerInDoc(doc, selectedSupplierKey);
      if (!isMyLead && !isPartnerIn) return false;

      const dDate = doc.doc_date || doc.docDate;
      if (dDate) {
        const [y, m] = dDate.split('-');
        if (selectedYear !== 'all' && y !== selectedYear) return false;
        if (selectedMonth !== 'all' && m !== selectedMonth) return false;
      }

      if (collabPartnerFilter !== 'all') {
        const partners = normalizePartners(doc);
        const match = partners.some(p => areSupplierKeysEquivalent(p.key, collabPartnerFilter)) ||
                      (!isMyLead && areSupplierKeysEquivalent(doc.supplier_key || doc.supplierKey, collabPartnerFilter));
        if (!match) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const docNo = (doc.doc_no || doc.docNo || '').toLowerCase();
        const custName = (doc.customer_name || doc.customer_data?.name || doc.customer?.name || '').toLowerCase();
        const memo = (doc.settlement_memo || doc.remark || '').toLowerCase();
        const partnersStr = (doc.partners || []).map(p => p.name).join(' ').toLowerCase();
        if (!docNo.includes(q) && !custName.includes(q) && !memo.includes(q) && !partnersStr.includes(q)) return false;
      }

      return true;
    }).map(doc => {
      const { totalSupply, vatAmount, grandTotal, paid, balance } = getDocTotals(doc);
      const isMyLead = areSupplierKeysEquivalent(doc.supplier_key || doc.supplierKey, selectedSupplierKey);
      const partners = normalizePartners(doc);

      const partnerNames = partners.map(p => p.name).join(', ') || doc.partner_name || '협력사';
      const totalPartnerAmount = partners.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const isAllDone = partners.length > 0 ? partners.every(p => p.status === '정산완료') : (doc.settlement_status === '정산완료');

      return {
        ...doc,
        totalSupply,
        vatAmount,
        grandTotal,
        paid,
        balance,
        isMyLead,
        partners,
        partnerNames,
        totalPartnerAmount,
        isAllDone,
        settlement_amount: totalPartnerAmount || Number(doc.settlement_amount) || 0,
        settlement_status: isAllDone ? '정산완료' : (partners.length > 0 && partners.some(p => p.status === '정산완료') ? '부분완료' : '정산대기'),
        settlement_memo: doc.settlement_memo || ''
      };
    });

    let outgoingPending = 0; // 내가 보낼 돈 (미지급)
    let incomingPending = 0; // 내가 받을 돈 (미수)
    let outgoingSettled = 0;
    let incomingSettled = 0;
    let totalSettled = 0;

    rawList.forEach(doc => {
      const partners = doc.partners || [];
      if (doc.isMyLead) {
        partners.forEach(p => {
          const amt = Number(p.amount) || 0;
          if (p.status === '정산완료') {
            totalSettled += amt;
            outgoingSettled += amt;
          } else {
            outgoingPending += amt;
          }
        });
      } else {
        const myP = partners.find(p => areSupplierKeysEquivalent(p.key, selectedSupplierKey)) || { amount: doc.settlement_amount, status: doc.settlement_status };
        const amt = Number(myP.amount) || 0;
        if (myP.status === '정산완료') {
          totalSettled += amt;
          incomingSettled += amt;
        } else {
          incomingPending += amt;
        }
      }
    });

    const filteredByDirection = rawList.filter(doc => {
      if (collabDirectionFilter === 'outgoing') return doc.isMyLead;
      if (collabDirectionFilter === 'incoming') return !doc.isMyLead;
      if (collabDirectionFilter === 'completed') return doc.isAllDone;
      if (collabDirectionFilter === 'pending') return !doc.isAllDone;
      return true;
    });

    return {
      list: filteredByDirection,
      allCollabCount: rawList.length,
      outgoingCount: rawList.filter(d => d.isMyLead).length,
      incomingCount: rawList.filter(d => !d.isMyLead).length,
      completedCount: rawList.filter(d => d.isAllDone).length,
      pendingCount: rawList.filter(d => !d.isAllDone).length,
      outgoingPending,
      incomingPending,
      totalSettled
    };
  }, [documents, selectedYear, selectedMonth, selectedSupplierKey, collabPartnerFilter, collabDirectionFilter, searchQuery, suppliersList]);

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
    setInputRemark((doc.remark || '').split('---EXT---')[0].trim());
  };

  const handleSavePaidModal = async () => {
    if (!editingDoc) return;
    await onUpdateDocumentPaid(editingDoc.id, inputPaid, inputRemark);
    setEditingDoc(null);
  };

  // Quick Settlement Update Handlers (Supports individual partner updates)
  const handleToggleSettlementStatus = async (doc, targetPartnerKey = null) => {
    if (!onUpdateDocumentSettlement) return;
    const partners = normalizePartners(doc);
    let nextStatus = '정산완료';

    if (targetPartnerKey) {
      const p = partners.find(part => areSupplierKeysEquivalent(part.key, targetPartnerKey));
      nextStatus = (p?.status === '정산완료') ? '정산대기' : '정산완료';
    } else {
      nextStatus = (doc.settlement_status === '정산완료') ? '정산대기' : '정산완료';
    }

    await onUpdateDocumentSettlement(doc.id, {
      partner_key: targetPartnerKey || (partners[0]?.key || doc.partner_key),
      settlement_status: nextStatus
    });
  };

  const handleUpdateSettlementAmount = async (doc, newAmt, targetPartnerKey = null) => {
    if (!onUpdateDocumentSettlement) return;
    const partners = normalizePartners(doc);
    await onUpdateDocumentSettlement(doc.id, {
      partner_key: targetPartnerKey || (partners[0]?.key || doc.partner_key),
      settlement_amount: Number(newAmt) || 0
    });
  };

  const handleUpdateSettlementMemo = async (doc, newMemo, targetPartnerKey = null) => {
    if (!onUpdateDocumentSettlement) return;
    const partners = normalizePartners(doc);
    await onUpdateDocumentSettlement(doc.id, {
      partner_key: targetPartnerKey || (partners[0]?.key || doc.partner_key),
      settlement_memo: newMemo
    });
  };

  const handleOpenPartnerSettlementModal = (specificDoc = null) => {
    const targetItems = specificDoc ? [specificDoc] : collaborativeData.list;
    if (targetItems.length === 0) {
      alert('정산서를 발행할 공동작업 내역이 없습니다.');
      return;
    }
    const partnerName = specificDoc ? specificDoc.partnerDisplayName : (targetItems[0]?.partnerDisplayName || '협력사');
    const dir = specificDoc ? (specificDoc.isMyLead ? 'outgoing' : 'incoming') : (collabDirectionFilter === 'incoming' ? 'incoming' : 'outgoing');
    
    setPartnerModalPartnerName(partnerName);
    setPartnerModalDirection(dir);
    setPartnerModalItems(targetItems);
    setIsPartnerModalOpen(true);
  };

  const handleExportCSV = () => {
    if (subTab === 'collab') {
      if (collaborativeData.list.length === 0) {
        alert('다운로드할 공동작업 정산 내역이 없습니다.');
        return;
      }
      const headers = ['일자', '문서번호', '거래처명', '수주구분', '협력사', '총매출액', '수금상태', '정산합의금액', '정산상태', '정산메모'];
      const rows = collaborativeData.list.map(doc => [
        `"${doc.doc_date || doc.docDate || ''}"`,
        `"${doc.doc_no || doc.docNo || ''}"`,
        `"${(doc.customer_name || '').replace(/"/g, '""')}"`,
        `"${doc.isMyLead ? '당사수주' : '파트너수주'}"`,
        `"${(doc.partnerDisplayName || '').replace(/"/g, '""')}"`,
        doc.grandTotal || 0,
        `"${doc.balance <= 0 ? '입금완료' : '미수'}"`,
        doc.settlement_amount || 0,
        `"${doc.settlement_status || '정산대기'}"`,
        `"${(doc.settlement_memo || '').replace(/"/g, '""')}"`
      ]);
      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `공동작업_정산장부_${selectedYear}년_${selectedMonth === 'all' ? '전체' : selectedMonth + '월'}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      return;
    }

    if (subTab === 'summary') {
      if (customerSummaries.length === 0) {
        alert('다운로드할 거래처별 회계 현황이 없습니다.');
        return;
      }
      const headers = ['거래처명', '담당자', '연락처', '사업자번호', '해당기간 매출액', '해당기간 수금액', '해당기간 미수액', '누적 총 미수금액', '발행건수', '상태'];
      const rows = customerSummaries.map(c => [
        `"${(c.name || '').replace(/"/g, '""')}"`,
        `"${(c.person || '').replace(/"/g, '""')}"`,
        `"${(c.phone || '').replace(/"/g, '""')}"`,
        `"${(c.bizno || '').replace(/"/g, '""')}"`,
        c.monthlySales || 0,
        c.monthlyPaid || 0,
        c.monthlyUnpaid || 0,
        c.allTimeUnpaid || 0,
        c.docCount || 0,
        `"${c.allTimeUnpaid > 0 ? '미수' : '완납'}"`
      ]);
      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `거래처별_회계현황요약_${selectedYear}년_${selectedMonth === 'all' ? '전체' : selectedMonth + '월'}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      return;
    }

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
      const cleanRemark = (doc.remark || '').split('---EXT---')[0].trim();
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
        `"${cleanRemark.replace(/"/g, '""')}"`
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
              <span>📊</span> {subTab === 'collab' ? '🤝 공동작업 협업 정산 관리' : '거래처별 회계 관리 (월별 회계장부)'}
            </h2>
            <p style={{ fontSize: '0.8125rem', color: '#6B7684', margin: '0.25rem 0 0 0' }}>
              {subTab === 'collab'
                ? '세진 ⇄ 디에스 등 협력사와의 공동작업 내역, 송금/수금 정산액 및 정산서를 통합 관리합니다.'
                : '발행된 거래명세서/청구서 기준 월별 매출, 수금, 미수금 현황을 통합 관리합니다.'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {subTab === 'collab' && (
              <button
                onClick={() => handleOpenPartnerSettlementModal()}
                className="btn btn-primary"
                style={{ fontSize: '0.8125rem', padding: '6px 14px', minHeight: '34px', backgroundColor: '#4f46e5', borderColor: '#4338ca' }}
              >
                📋 파트너 정산서 발행
              </button>
            )}
            <button onClick={handleExportCSV} className="btn btn-outline" style={{ fontSize: '0.8125rem', padding: '6px 12px', minHeight: '34px' }}>
              📥 엑셀(CSV) 저장
            </button>
            <button onClick={handlePrint} className="btn btn-primary" style={{ fontSize: '0.8125rem', padding: '6px 12px', minHeight: '34px' }}>
              🖨️ 인쇄
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #F2F4F6', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <button onClick={handlePrevMonth} className="btn btn-outline" style={{ padding: '4px 8px', fontSize: '0.75rem', minHeight: '32px' }}>◀</button>
            <span style={{ fontWeight: '800', fontSize: '0.9375rem', color: '#191F28', minWidth: '95px', textAlign: 'center' }}>
              {selectedYear}년 {selectedMonth === 'all' ? '전체' : selectedMonth + '월'}
            </span>
            <button onClick={handleNextMonth} className="btn btn-outline" style={{ padding: '4px 8px', fontSize: '0.75rem', minHeight: '32px' }}>▶</button>
            <button onClick={handleCurrentMonth} className="btn btn-outline" style={{ padding: '4px 8px', fontSize: '0.75rem', minHeight: '32px' }}>당월</button>
            <button onClick={() => setSelectedMonth('all')} className="btn btn-outline" style={{ padding: '4px 8px', fontSize: '0.75rem', minHeight: '32px', backgroundColor: selectedMonth === 'all' ? '#E8F8F0' : 'transparent', color: selectedMonth === 'all' ? '#028A3E' : 'inherit' }}>연간</button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap' }}>
            {subTab === 'collab' ? (
              <>
                <select
                  className="form-select"
                  style={{ width: '150px', minHeight: '34px', padding: '4px 8px', fontSize: '0.8125rem' }}
                  value={collabPartnerFilter}
                  onChange={e => setCollabPartnerFilter(e.target.value)}
                >
                  <option value="all">🤝 전체 협력사</option>
                  {suppliersList.map(s => <option key={s.id} value={s.id}>{s.name || s.company}</option>)}
                </select>
                <input
                  type="text"
                  className="form-input"
                  style={{ width: '170px', minHeight: '34px', padding: '4px 8px', fontSize: '0.8125rem' }}
                  placeholder="🔍 문서/거래처/메모..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </>
            ) : (
              <>
                <select className="form-select" style={{ width: '140px', minHeight: '34px', padding: '4px 8px', fontSize: '0.8125rem' }} value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)}>
                  <option value="all">🏢 전체 거래처</option>
                  {uniqueCustomerOptions.map(name => <option key={name} value={name}>{name}</option>)}
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
              </>
            )}
          </div>
        </div>
      </div>

      {/* Summary KPI Grid: Collaborative vs General */}
      {subTab === 'collab' ? (
        /* 🤝 Collaborative 4 KPI Cards (shadcn/ui style) */
        <div className="accounting-summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
          {/* Outgoing Pending */}
          <div className="card-box" style={{ padding: '1rem', borderTop: '3px solid #f59e0b', backgroundColor: '#ffffff' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: '800', color: '#b45309' }}>📤 보낼 정산금 (미지급)</span>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem' }}>📤</div>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#191F28', letterSpacing: '-0.03em' }}>
              {collaborativeData.outgoingPending.toLocaleString()}
              <span style={{ fontSize: '0.9375rem', fontWeight: '700', color: '#4E5968' }}> 원</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#b45309', marginTop: '0.25rem', fontWeight: '700' }}>
              내가 수주한 공동작업 정산 대기
            </div>
          </div>

          {/* Incoming Pending */}
          <div className="card-box" style={{ padding: '1rem', borderTop: '3px solid #3b82f6', backgroundColor: '#ffffff' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: '800', color: '#1d4ed8' }}>📥 받을 정산금 (미수)</span>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem' }}>📥</div>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#191F28', letterSpacing: '-0.03em' }}>
              {collaborativeData.incomingPending.toLocaleString()}
              <span style={{ fontSize: '0.9375rem', fontWeight: '700', color: '#4E5968' }}> 원</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#1d4ed8', marginTop: '0.25rem', fontWeight: '700' }}>
              파트너 수주 건 내가 받을 대금
            </div>
          </div>

          {/* Settled Total */}
          <div className="card-box" style={{ padding: '1rem', borderTop: '3px solid #10b981', backgroundColor: '#ffffff' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: '800', color: '#047857' }}>✅ 정산 완료 누적액</span>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem' }}>✨</div>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#191F28', letterSpacing: '-0.03em' }}>
              {collaborativeData.totalSettled.toLocaleString()}
              <span style={{ fontSize: '0.9375rem', fontWeight: '700', color: '#4E5968' }}> 원</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#047857', marginTop: '0.25rem', fontWeight: '700' }}>
              {`${collaborativeData.completedCount}건 마감 완료`}
            </div>
          </div>

          {/* Total Collaboration Docs */}
          <div className="card-box" style={{ padding: '1rem', borderTop: '3px solid #6366f1', backgroundColor: '#ffffff' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: '800', color: '#4338ca' }}>🤝 공동작업 총 건수</span>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem' }}>🤝</div>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#191F28', letterSpacing: '-0.03em' }}>
              {collaborativeData.allCollabCount}
              <span style={{ fontSize: '0.9375rem', fontWeight: '700', color: '#4E5968' }}> 건</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
              {`미정산 ${collaborativeData.pendingCount}건 / 완료 ${collaborativeData.completedCount}건`}
            </div>
          </div>
        </div>
      ) : (
        /* Standard 4 KPI Cards */
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
      )}

      {/* Sub-tabs Capsule Navigation (shadcn style segmented control) */}
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
        <button
          type="button"
          style={{
            borderRadius: '8px',
            fontSize: '0.8125rem',
            fontWeight: '800',
            padding: '0.35rem 1rem',
            backgroundColor: subTab === 'collab' ? '#ffffff' : 'transparent',
            color: subTab === 'collab' ? '#4f46e5' : '#6B7684',
            boxShadow: subTab === 'collab' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.15s'
          }}
          onClick={() => setSubTab('collab')}
        >
          {`🤝 공동작업 정산 (${collaborativeData.allCollabCount})`}
        </button>
      </div>

      {/* Main Data View */}
      <div className="card-box" style={{ padding: '0', overflow: 'hidden' }}>
        {subTab === 'collab' ? (
          /* 🤝 Collaborative Settlement DataTable (shadcn/ui minimal clean) */
          <div>
            {/* Direction Filter Bar */}
            <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', gap: '4px' }}>
                {[
                  { id: 'all', label: `전체 (${collaborativeData.allCollabCount})` },
                  { id: 'outgoing', label: `📤 보낼 돈 (${collaborativeData.outgoingCount})` },
                  { id: 'incoming', label: `📥 받을 돈 (${collaborativeData.incomingCount})` },
                  { id: 'pending', label: `🟡 미정산 (${collaborativeData.pendingCount})` },
                  { id: 'completed', label: `🟢 정산완료 (${collaborativeData.completedCount})` }
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setCollabDirectionFilter(tab.id)}
                    style={{
                      padding: '4px 10px',
                      fontSize: '0.75rem',
                      fontWeight: '800',
                      borderRadius: '6px',
                      border: collabDirectionFilter === tab.id ? '1px solid #c7d2fe' : '1px solid transparent',
                      backgroundColor: collabDirectionFilter === tab.id ? '#eef2ff' : 'transparent',
                      color: collabDirectionFilter === tab.id ? '#4338ca' : '#64748b',
                      cursor: 'pointer'
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                💡 <strong>정산금액</strong> 및 <strong>상태</strong>를 표에서 직접 즉시 변경할 수 있습니다.
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                <thead style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #E5E8EB', color: '#4E5968', fontWeight: '800' }}>
                  <tr>
                    <th style={{ padding: '0.75rem 0.75rem', textAlign: 'left' }}>일자</th>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>문서번호</th>
                    <th style={{ padding: '0.75rem 0.75rem', textAlign: 'left' }}>거래처명</th>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>구분</th>
                    <th style={{ padding: '0.75rem 0.75rem', textAlign: 'left' }}>협력 파트너</th>
                    <th style={{ padding: '0.75rem 0.75rem', textAlign: 'right' }}>총 매출액</th>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>고객수금</th>
                    <th style={{ padding: '0.75rem 0.75rem', textAlign: 'right', color: '#4338ca' }}>정산 합의금액</th>
                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>정산상태</th>
                    <th style={{ padding: '0.75rem 0.75rem', textAlign: 'left' }}>정산 메모</th>
                    <th className="no-print" style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>관리</th>
                  </tr>
                </thead>
                <tbody>
                  {collaborativeData.list.length === 0 ? (
                    <tr>
                      <td colSpan={11} style={{ padding: '2.5rem', textAlign: 'center', color: '#8B95A1' }}>
                        조회 조건에 해당하는 공동작업 정산 내역이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    collaborativeData.list.map((doc, idx) => {
                      const partners = doc.partners && doc.partners.length > 0 ? doc.partners : normalizePartners(doc);
                      const isOutgoing = doc.isMyLead;

                      return (
                        <tr
                          key={doc.id || idx}
                          style={{
                            borderBottom: '1px solid #E5E8EB',
                            backgroundColor: idx % 2 === 0 ? '#ffffff' : '#F9FAFB'
                          }}
                        >
                          <td style={{ padding: '0.75rem 0.75rem', color: '#6B7684', whiteSpace: 'nowrap' }}>
                            {doc.doc_date || doc.docDate || '-'}
                          </td>
                          <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontFamily: 'monospace', fontWeight: '700' }}>
                            {doc.doc_no || doc.docNo}
                          </td>
                          <td style={{ padding: '0.75rem 0.75rem', fontWeight: '800', color: '#191F28' }}>
                            {doc.customer_name || doc.customer_data?.name || doc.customer?.name || '-'}
                          </td>
                          <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: '800',
                                backgroundColor: isOutgoing ? '#fef3c7' : '#eff6ff',
                                color: isOutgoing ? '#b45309' : '#1d4ed8',
                                border: `1px solid ${isOutgoing ? '#fde68a' : '#bfdbfe'}`
                              }}
                            >
                              {isOutgoing ? '📤 당사수주' : '📥 파트너수주'}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem 0.75rem', color: '#334155' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              {partners.map((p, pIdx) => (
                                <span
                                  key={p.key || pIdx}
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    backgroundColor: '#f1f5f9',
                                    color: '#1e293b',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    border: '1px solid #e2e8f0',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}
                                >
                                  <span style={{ color: '#4f46e5', fontWeight: '900' }}>{`#${pIdx + 1}`}</span>
                                  {p.name || p.company || p.key}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td style={{ padding: '0.75rem 0.75rem', textAlign: 'right', fontWeight: '700', color: '#191F28' }}>
                            {(doc.grandTotal || 0).toLocaleString()}원
                          </td>
                          <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: '800',
                                backgroundColor: doc.balance <= 0 ? '#E8F8F0' : '#FEF3F2',
                                color: doc.balance <= 0 ? '#028A3E' : '#D92D20'
                              }}
                            >
                              {doc.balance <= 0 ? '완납' : '미수'}
                            </span>
                          </td>
                          <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
                              {partners.map((p, pIdx) => (
                                <div key={p.key || pIdx} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  {partners.length > 1 && (
                                    <span style={{ fontSize: '10px', color: '#6366f1', fontWeight: '800' }}>
                                      {`#${pIdx + 1}`}
                                    </span>
                                  )}
                                  <input
                                    type="number"
                                    defaultValue={p.amount || 0}
                                    onBlur={e => handleUpdateSettlementAmount(doc, e.target.value, p.key)}
                                    onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
                                    style={{
                                      width: '90px',
                                      textAlign: 'right',
                                      fontWeight: '900',
                                      fontSize: '0.8125rem',
                                      color: '#3730a3',
                                      padding: '2px 5px',
                                      border: '1px solid #cbd5e1',
                                      borderRadius: '6px',
                                      backgroundColor: '#ffffff',
                                      outline: 'none'
                                    }}
                                  />
                                </div>
                              ))}
                              {partners.length > 1 && (
                                <div style={{ fontSize: '10px', fontWeight: '800', color: '#4338ca', borderTop: '1px dashed #cbd5e1', paddingTop: '2px' }}>
                                  {`합계: ${doc.totalPartnerAmount?.toLocaleString()}원`}
                                </div>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: '0.5rem 0.5rem', textAlign: 'center' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                              {partners.map((p, pIdx) => {
                                const isDone = p.status === '정산완료';
                                return (
                                  <button
                                    key={p.key || pIdx}
                                    type="button"
                                    onClick={() => handleToggleSettlementStatus(doc, p.key)}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '3px',
                                      padding: '2px 6px',
                                      borderRadius: '6px',
                                      fontSize: '10px',
                                      fontWeight: '800',
                                      backgroundColor: isDone ? '#ecfdf5' : '#fef3c7',
                                      color: isDone ? '#047857' : '#b45309',
                                      border: `1px solid ${isDone ? '#a7f3d0' : '#fde68a'}`,
                                      cursor: 'pointer',
                                      transition: 'all 0.15s',
                                      whiteSpace: 'nowrap'
                                    }}
                                    title="클릭하여 정산완료/대기 전환"
                                  >
                                    {partners.length > 1 && <span style={{ opacity: 0.8 }}>{`#${pIdx + 1}`}</span>}
                                    {isDone ? '🟢 완료' : '🟡 대기'}
                                  </button>
                                );
                              })}
                            </div>
                          </td>
                          <td style={{ padding: '0.5rem 0.75rem' }}>
                            <input
                              type="text"
                              defaultValue={doc.settlement_memo || ''}
                              placeholder="정산 메모..."
                              onBlur={e => handleUpdateSettlementMemo(doc, e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
                              style={{
                                width: '100%',
                                minWidth: '110px',
                                fontSize: '0.75rem',
                                color: '#475569',
                                padding: '3px 6px',
                                border: '1px solid #e2e8f0',
                                borderRadius: '6px',
                                backgroundColor: '#ffffff',
                                outline: 'none'
                              }}
                            />
                          </td>
                          <td className="no-print" style={{ padding: '0.5rem 0.5rem', textAlign: 'center' }}>
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
                                className="btn btn-sm"
                                style={{ fontSize: '11px', padding: '2px 6px', minHeight: '26px', backgroundColor: '#eef2ff', color: '#4f46e5', border: '1px solid #c7d2fe' }}
                                onClick={() => handleOpenPartnerSettlementModal(doc)}
                              >
                                📋 정산서
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
          </div>
        ) : subTab === 'summary' ? (
          /* Summary Table */
          <div>
            {/* Quick Filter Pill Bar */}
            <div className="no-print" style={{ padding: '0.625rem 1rem', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#4E5968', marginRight: '2px' }}>보기 구분:</span>
                {[
                  { id: 'unpaid', label: `⚠️ 미수 거래처 (${summaryCounts.unpaidCount})`, activeColor: '#D92D20', activeBg: '#FEF3F2', activeBorder: '#FECDCA' },
                  { id: 'monthly', label: `📅 당월 거래처 (${summaryCounts.monthlyCount})`, activeColor: '#1B64DA', activeBg: '#EFF4FE', activeBorder: '#B2CCFF' },
                  { id: 'all', label: `🏢 전체 거래처 (${summaryCounts.allCount})`, activeColor: '#191F28', activeBg: '#ffffff', activeBorder: '#D1D5DB' }
                ].map(btn => (
                  <button
                    key={btn.id}
                    type="button"
                    onClick={() => setSummaryFilterMode(btn.id)}
                    style={{
                      padding: '4px 10px',
                      fontSize: '0.75rem',
                      fontWeight: '800',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      backgroundColor: summaryFilterMode === btn.id ? btn.activeBg : '#ffffff',
                      color: summaryFilterMode === btn.id ? btn.activeColor : '#6B7684',
                      border: `1px solid ${summaryFilterMode === btn.id ? btn.activeBorder : '#E5E8EB'}`,
                      boxShadow: summaryFilterMode === btn.id ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                    }}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#8B95A1' }}>
                {summaryFilterMode === 'unpaid' ? '※ 누적 또는 해당 기간 미수금이 남아있는 거래처만 표시 중입니다.' :
                 summaryFilterMode === 'monthly' ? '※ 선택한 기간에 거래/발행 내역이 있는 거래처만 표시 중입니다.' :
                 '※ 등록된 모든 거래처(미수금 0원 포함)를 표시 중입니다.'}
              </div>
            </div>

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
                      <td colSpan={7} style={{ padding: '2.5rem 1rem', textAlign: 'center', color: '#8B95A1' }}>
                        <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>
                          {summaryFilterMode === 'unpaid' ? '🎉' : '📂'}
                        </div>
                        <div style={{ fontWeight: '800', fontSize: '0.875rem', color: '#4E5968', marginBottom: '0.25rem' }}>
                          {summaryFilterMode === 'unpaid' ? '미수금이 남아있는 거래처가 없습니다! (전액 완납)' : '조회 조건에 해당하는 거래처 내역이 없습니다.'}
                        </div>
                        {summaryFilterMode === 'unpaid' && summaryCounts.allCount > 0 && (
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            style={{ marginTop: '0.5rem', fontSize: '0.75rem' }}
                            onClick={() => setSummaryFilterMode('all')}
                          >
                            🏢 전체 등록 거래처 목록 보기 ({summaryCounts.allCount}개사)
                          </button>
                        )}
                      </td>
                    </tr>
                  ) : (
                  customerSummaries.map((c, idx) => {
                    const hasUnpaid = c.allTimeUnpaid > 0;
                    return (
                      <tr
                        key={c.name + idx}
                        style={{
                          borderBottom: '1px solid #E5E8EB',
                          backgroundColor: idx % 2 === 0 ? '#ffffff' : '#F9FAFB',
                          cursor: 'pointer'
                        }}
                        title="클릭하여 이 거래처의 상세 거래장부 보기"
                        onClick={() => {
                          setSelectedCustomer(c.name);
                          setSubTab('detailed');
                        }}
                      >
                        <td style={{ padding: '0.75rem 1rem', fontWeight: '800', color: '#191F28' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>{c.name}</span>
                            <span style={{ fontSize: '10px', color: '#3b82f6', backgroundColor: '#eff6ff', padding: '1px 5px', borderRadius: '4px', border: '1px solid #dbeafe' }}>상세보기 ↗</span>
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', color: '#6B7684', fontSize: '0.75rem' }}>{`${c.person} (${c.phone})`}</td>
                        <td style={{ padding: '0.75rem 0.75rem', textAlign: 'right', fontWeight: '800', color: '#191F28' }}>{`${c.monthlySales.toLocaleString()} 원`}</td>
                        <td style={{ padding: '0.75rem 0.75rem', textAlign: 'right', fontWeight: '700', color: '#1B64DA' }}>{`${c.monthlyPaid.toLocaleString()} 원`}</td>
                        <td style={{ padding: '0.75rem 0.75rem', textAlign: 'right', fontWeight: '800', color: c.monthlyUnpaid > 0 ? '#D92D20' : '#03C75A' }}>{`${c.monthlyUnpaid.toLocaleString()} 원`}</td>
                        <td style={{ padding: '0.75rem 0.75rem', textAlign: 'right', fontWeight: '900', color: hasUnpaid ? '#D92D20' : '#03C75A' }}>{`${c.allTimeUnpaid.toLocaleString()} 원`}</td>
                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                            {hasUnpaid ? (
                              <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '800', backgroundColor: '#FEF3F2', color: '#D92D20', border: '1px solid #FECDCA' }}>
                                미수
                              </span>
                            ) : (
                              <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '800', backgroundColor: '#E8F8F0', color: '#028A3E', border: '1px solid #A3E9C4' }}>
                                완납
                              </span>
                            )}
                            {c.docCount > 0 && (
                              <span style={{ fontSize: '10px', color: '#6B7684', fontWeight: '600' }}>
                                {`해당월 ${c.docCount}건`}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
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

      {/* Partner Settlement Modal (shadcn style) */}
      <PartnerSettlementModal
        isOpen={isPartnerModalOpen}
        onClose={() => setIsPartnerModalOpen(false)}
        partnerName={partnerModalPartnerName}
        selectedPeriodStr={`${selectedYear}년 ${selectedMonth === 'all' ? '전체' : selectedMonth + '월'}`}
        settlementItems={partnerModalItems}
        currentSupplier={currentSupplier}
        selectedSupplierKey={selectedSupplierKey}
        direction={partnerModalDirection}
      />
    </div>
  );
}
