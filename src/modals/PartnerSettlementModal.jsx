// 🤝 TEAM D.D PARTNER SETTLEMENT MODAL (SHADCN/UI MINIMAL STYLE)
import React, { useRef, useState } from 'react';
import { copyPageToClipboard } from '../utils/exportUtils.js';
import { normalizePartners } from '../utils/validation.js';

export default function PartnerSettlementModal({
  isOpen,
  onClose,
  partnerName = '협력사',
  selectedPeriodStr = '',
  settlementItems = [],
  currentSupplier = {},
  selectedSupplierKey = 'sejin',
  direction = 'outgoing' // 'outgoing' (내가 보낼 돈) | 'incoming' (내가 받을 돈)
}) {
  const printAreaRef = useRef(null);
  const [copying, setCopying] = useState(false);

  if (!isOpen) return null;

  // Resolve item amounts per partner
  const resolvedItems = settlementItems.map(item => {
    const partners = normalizePartners(item);
    let matchedPartner = partners.find(p => p.name === partnerName || p.company === partnerName);
    if (!matchedPartner && partners.length === 1) matchedPartner = partners[0];
    if (!matchedPartner && partners.length > 0) matchedPartner = partners[0];

    const amount = matchedPartner ? Number(matchedPartner.amount) : (Number(item.settlement_amount) || 0);
    const status = matchedPartner ? (matchedPartner.status || '정산대기') : (item.settlement_status || '정산대기');
    const memo = matchedPartner ? (matchedPartner.memo || '') : (item.settlement_memo || '');
    const partnerLabel = matchedPartner ? (matchedPartner.name || matchedPartner.company || partnerName) : (item.partner_name || partnerName);

    return {
      ...item,
      resolvedAmount: amount,
      resolvedStatus: status,
      resolvedMemo: memo,
      resolvedPartnerName: partnerLabel
    };
  });

  const totalSalesSum = resolvedItems.reduce((sum, item) => sum + (Number(item.grandTotal) || 0), 0);
  const totalSettlementSum = resolvedItems.reduce((sum, item) => sum + (Number(item.resolvedAmount) || 0), 0);
  const settledCount = resolvedItems.filter(item => item.resolvedStatus === '정산완료').length;
  const pendingCount = resolvedItems.length - settledCount;

  const isOutgoing = direction === 'outgoing';
  const todayStr = new Date().toISOString().split('T')[0];

  const handleCopyImage = async () => {
    if (!printAreaRef.current) return;
    setCopying(true);
    try {
      await copyPageToClipboard(printAreaRef.current);
      alert('✓ 정산서 이미지가 클립보드에 복사되었습니다!\n카카오톡 대화창에서 [Ctrl + V] 로 즉시 전송할 수 있습니다.');
    } catch (err) {
      alert('이미지 복사 중 오류가 발생했습니다. 브라우저 인쇄를 이용해 주세요.');
    } finally {
      setCopying(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (settlementItems.length === 0) return;
    const headers = ['일자', '문서번호', '거래처명', '총매출액', '고객수금', '정산합의금액', '정산상태', '정산메모'];
    const rows = settlementItems.map(item => [
      `"${item.doc_date || item.docDate || ''}"`,
      `"${item.doc_no || item.docNo || ''}"`,
      `"${(item.customer_name || '').replace(/"/g, '""')}"`,
      item.grandTotal || 0,
      `"${item.balance <= 0 ? '입금완료' : '미수'}"`,
      item.settlement_amount || 0,
      `"${item.settlement_status || '정산대기'}"`,
      `"${(item.settlement_memo || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `공동작업_정산서_${partnerName}_${todayStr}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1150, backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(4px)' }}>
      <div
        className="modal-content"
        style={{
          maxWidth: '760px',
          width: '95%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '16px',
          padding: '0',
          backgroundColor: '#ffffff',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden'
        }}
      >
        {/* Modal Header (shadcn style) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.25rem' }}>🤝</span>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: '800', color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
                공동작업 정산 내역서
              </h3>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                {partnerName} ⇄ {currentSupplier.company || currentSupplier.name || '본사'}
              </div>
            </div>
          </div>
          <button
            type="button"
            style={{ border: 'none', background: 'none', fontSize: '1.25rem', color: '#94a3b8', cursor: 'pointer', padding: '4px 8px', borderRadius: '6px' }}
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Printable Settlement Statement Canvas */}
        <div style={{ overflowY: 'auto', padding: '1.25rem', flex: 1, backgroundColor: '#f1f5f9' }}>
          <div
            ref={printAreaRef}
            style={{
              backgroundColor: '#ffffff',
              padding: '1.5rem',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              color: '#0f172a',
              fontFamily: 'inherit'
            }}
          >
            {/* Document Title & Meta Header */}
            <div style={{ borderBottom: '2px solid #0f172a', paddingBottom: '1rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <div style={{ display: 'inline-block', fontSize: '0.6875rem', fontWeight: '800', backgroundColor: '#eef2ff', color: '#4f46e5', padding: '2px 8px', borderRadius: '9999px', marginBottom: '6px' }}>
                  TEAM D.D COLLABORATION SETTLEMENT
                </div>
                <h2 style={{ fontSize: '1.375rem', fontWeight: '900', color: '#0f172a', margin: 0, letterSpacing: '-0.03em' }}>
                  공동작업 정산 명세서
                </h2>
                <div style={{ fontSize: '0.8125rem', color: '#475569', marginTop: '4px' }}>
                  <strong>수신:</strong> {partnerName} 귀하
                </div>
              </div>

              <div style={{ textAlign: 'right', fontSize: '0.75rem', color: '#64748b' }}>
                <div><strong>발행일자:</strong> {todayStr}</div>
                <div><strong>정산대상 기간:</strong> {selectedPeriodStr || '전체 기간'}</div>
                <div><strong>구분:</strong> {isOutgoing ? '📤 송금 정산서 (당사 → 파트너)' : '📥 청구 정산서 (파트너 → 당사)'}</div>
              </div>
            </div>

            {/* KPI Summary Strip */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.6875rem', color: '#64748b', fontWeight: '700' }}>총 협업 건수</div>
                <div style={{ fontSize: '1.125rem', fontWeight: '900', color: '#0f172a', marginTop: '2px' }}>
                  {settlementItems.length} <span style={{ fontSize: '0.75rem', fontWeight: '600' }}>건</span>
                </div>
                <div style={{ fontSize: '0.6875rem', color: '#64748b', marginTop: '2px' }}>
                  완료 {settledCount}건 / 대기 {pendingCount}건
                </div>
              </div>

              <div style={{ backgroundColor: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.6875rem', color: '#64748b', fontWeight: '700' }}>고객 총 매출액</div>
                <div style={{ fontSize: '1.125rem', fontWeight: '900', color: '#0f172a', marginTop: '2px' }}>
                  {totalSalesSum.toLocaleString()} <span style={{ fontSize: '0.75rem', fontWeight: '600' }}>원</span>
                </div>
                <div style={{ fontSize: '0.6875rem', color: '#64748b', marginTop: '2px' }}>공동작업 총 거래금액</div>
              </div>

              <div style={{ backgroundColor: '#eef2ff', padding: '0.75rem', borderRadius: '8px', border: '1px solid #c7d2fe' }}>
                <div style={{ fontSize: '0.6875rem', color: '#4338ca', fontWeight: '800' }}>
                  {isOutgoing ? '최종 송금(정산) 합계' : '최종 수금(청구) 합계'}
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: '900', color: '#3730a3', marginTop: '2px' }}>
                  {totalSettlementSum.toLocaleString()} <span style={{ fontSize: '0.75rem', fontWeight: '700' }}>원</span>
                </div>
                <div style={{ fontSize: '0.6875rem', color: '#4338ca', marginTop: '2px' }}>
                  합의된 정산 금액 합계
                </div>
              </div>
            </div>

            {/* Detailed Items Table */}
            <div style={{ borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden', marginBottom: '1.25rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: '800' }}>
                  <tr>
                    <th style={{ padding: '8px 10px', textAlign: 'left' }}>일자</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left' }}>문서번호</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left' }}>거래처명</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>총 매출액</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right', color: '#4338ca' }}>정산 합의금액</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center' }}>상태</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left' }}>정산 메모</th>
                  </tr>
                </thead>
                <tbody>
                  {settlementItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '1.5rem', textAlign: 'center', color: '#94a3b8' }}>
                        정산 대상 내역이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    resolvedItems.map((item, idx) => {
                      const isDone = item.resolvedStatus === '정산완료';
                      return (
                        <tr key={item.id || idx} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: idx % 2 === 1 ? '#fafafa' : '#ffffff' }}>
                          <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>{item.doc_date || item.docDate}</td>
                          <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontWeight: '700' }}>{item.doc_no || item.docNo}</td>
                          <td style={{ padding: '8px 10px', fontWeight: '700' }}>{item.customer_name || '-'}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right' }}>{(item.grandTotal || 0).toLocaleString()}원</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '900', color: '#3730a3' }}>
                            {(Number(item.resolvedAmount) || 0).toLocaleString()}원
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                fontSize: '0.6875rem',
                                fontWeight: '800',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                backgroundColor: isDone ? '#ecfdf5' : '#fef3c7',
                                color: isDone ? '#047857' : '#b45309',
                                border: `1px solid ${isDone ? '#a7f3d0' : '#fde68a'}`
                              }}
                            >
                              {isDone ? '● 정산완료' : '○ 정산대기'}
                            </span>
                          </td>
                          <td style={{ padding: '8px 10px', color: '#64748b', fontSize: '0.6875rem' }}>
                            {item.resolvedMemo || '-'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Bank Info & Supplier Footer Card */}
            <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.875rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <div style={{ fontSize: '0.6875rem', fontWeight: '800', color: '#64748b' }}>
                  {isOutgoing ? '송금 안내 / 담당 문의' : '입금 계좌 안내'}
                </div>
                <div style={{ fontSize: '0.8125rem', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>
                  {currentSupplier.bank ? `🏦 ${currentSupplier.bank}` : `${currentSupplier.company || currentSupplier.name} (연락처: ${currentSupplier.tel || currentSupplier.phone || '-'})`}
                </div>
              </div>
              <div style={{ textAlign: 'right', fontSize: '0.75rem', color: '#475569' }}>
                <div style={{ fontWeight: '800', color: '#0f172a' }}>{currentSupplier.company || currentSupplier.name || '세진건설기계'}</div>
                <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>대표자: {currentSupplier.person || currentSupplier.owner || '허강'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Controls (shadcn Button Actions) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.875rem 1.25rem', borderTop: '1px solid #e2e8f0', backgroundColor: '#ffffff', flexWrap: 'wrap', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={handleExportCSV}
            style={{
              padding: '6px 12px',
              fontSize: '0.8125rem',
              fontWeight: '700',
              color: '#334155',
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            📊 엑셀 다운로드
          </button>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={handleCopyImage}
              disabled={copying}
              style={{
                padding: '6px 14px',
                fontSize: '0.8125rem',
                fontWeight: '800',
                color: '#ffffff',
                backgroundColor: '#4f46e5',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(79, 70, 229, 0.3)'
              }}
            >
              {copying ? '⏳ 복사 중...' : '📋 카톡용 이미지 복사'}
            </button>
            <button
              type="button"
              onClick={handlePrint}
              style={{
                padding: '6px 14px',
                fontSize: '0.8125rem',
                fontWeight: '800',
                color: '#0f172a',
                backgroundColor: '#e2e8f0',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              🖨️ 인쇄
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '6px 14px',
                fontSize: '0.8125rem',
                fontWeight: '700',
                color: '#64748b',
                backgroundColor: '#f1f5f9',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
