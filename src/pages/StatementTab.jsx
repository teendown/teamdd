// 🎨 TEAM D.D STATEMENT & ESTIMATE GENERATOR TAB
import React, { useState, useMemo } from 'react';
import DocumentCanvas from '../components/DocumentCanvas.jsx';
import SmartItemListManager from '../components/SmartItemListManager.jsx';
import { exportPagesToPNG, copyPageToClipboard, shareDocumentImage, exportDocumentToExcel } from '../utils/exportUtils.js';
import { areSupplierKeysEquivalent } from '../utils/validation.js';

export default function StatementTab({
  docType,
  setDocType,
  docNo,
  setDocNo,
  docDate,
  setDocDate,
  docTime,
  setDocTime,
  selectedSupplierKey,
  setSelectedSupplierKey,
  suppliersList = [],
  currentSupplier = {},
  setCurrentSupplier,
  customer = {},
  setCustomer,
  customersList = [],
  items = [],
  setItems,
  onAggregateOpen,
  onOpenConvertModal,
  vat,
  setVat,
  vatIncluded,
  setVatIncluded,
  paid,
  setPaid,
  paymentStatus,
  setPaymentStatus,
  paymentMethod,
  setPaymentMethod,
  paymentDate,
  validityPeriod,
  deliveryDate,
  deliveryLocation,
  paymentTerms,
  bankAccount,
  dueDate,
  receiverName,
  receiveDate,
  setPaymentDate,
  remark,
  setRemark,
  onResetForm,
  onSaveDocument,
  onAddNewCustomer,
  onOpenEstimateModal,
  onOpenPastStatementModal,
  onOpenOcrModal,
  editingDocId,
  documentsList = [],
  onLoadDocument,
  onCopyDocument,
  isDocShared = false,
  setIsDocShared,
  partners = [],
  setPartners,
  partnerKey = '',
  setPartnerKey,
  partnerName = '',
  setPartnerName,
  onSaveDraft,
  onOpenDraftsModal,
  draftsCount = 0,
  onUpdateScheduleStatus,
  onNavigateToDoc
}) {
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [selectedPartnerToAdd, setSelectedPartnerToAdd] = useState('');
  const [isPartnersExpanded, setIsPartnersExpanded] = useState(false);

  // 실시간 고객 검색 자동완성
  const matchingCustomers = useMemo(() => {
    const rawQ = (customer.name || '').trim();
    if (!rawQ) return [];
    const q = rawQ.toLowerCase();
    const cleanNum = rawQ.replace(/[^0-9]/g, '');

    return customersList.filter(c => {
      if (!c || !c.name) return false;
      const name = (c.name || '').toLowerCase();
      const person = (c.person || c.repName || '').toLowerCase();
      const phone = (c.phone || '').replace(/[^0-9]/g, '');
      const bizno = (c.bizno || '').replace(/[^0-9]/g, '');
      const addr = (c.addr || '').toLowerCase();

      if (name.includes(q)) return true;
      if (person.includes(q)) return true;
      if (cleanNum && cleanNum.length >= 1 && phone.includes(cleanNum)) return true;
      if (cleanNum && cleanNum.length >= 2 && bizno.includes(cleanNum)) return true;
      if (addr.includes(q)) return true;
      return false;
    }).slice(0, 15);
  }, [customer.name, customersList]);

  const validateBeforeAction = () => {
    if (!customer || !customer.name || customer.name.trim() === '') {
      alert('❌ 거래처(공급받는자)를 입력해 주세요.\n거래처가 비어 있으면 인쇄·저장·다운로드가 불가합니다.');
      return false;
    }
    const validItems = items.filter(i => i.name && i.name.trim() !== '');
    if (validItems.length === 0) {
      alert('❌ 품목을 1개 이상 입력해 주세요.\n품목이 비어 있으면 인쇄·저장·다운로드가 불가합니다.');
      return false;
    }
    return true;
  };

  const handleExportPNG = async () => {
    if (!validateBeforeAction()) return;
    const pages = document.querySelectorAll('.document-page');
    await exportPagesToPNG(pages, `${docType}_${docNo || '명세서'}`);
  };

  const handleExportPDF = async () => {
    if (!validateBeforeAction()) return;
    const pages = document.querySelectorAll('.document-page');
    if (!pages || pages.length === 0) {
      alert('❌ PDF로 변환할 문서 페이지를 찾을 수 없습니다.');
      return;
    }
    try {
      if (!window.html2canvas || !window.jspdf) {
        window.print();
        return;
      }
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF('p', 'mm', 'a4');
      for (let i = 0; i < pages.length; i++) {
        if (i > 0) pdf.addPage();
        const canvas = await window.html2canvas(pages[i], {
          scale: 2,
          backgroundColor: '#ffffff',
          useCORS: true,
          logging: false
        });
        const imgData = canvas.toDataURL('image/png');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      }
      pdf.save(`${docType}_${docNo || '명세서'}.pdf`);
    } catch (e) {
      console.error('PDF 내보내기 오류:', e);
      window.print();
    }
  };

  const handleExportExcel = async () => {
    if (!validateBeforeAction()) return;
    try {
      await exportDocumentToExcel({
        docType,
        docNo,
        docDate,
        docTime,
        supplier: currentSupplier,
        customer,
        items,
        vat,
        vatIncluded,
        paid,
        remark
      });
    } catch (err) {
      console.error('엑셀 내보내기 오류:', err);
      alert('엑셀 내보내기 중 오류가 발생했습니다.');
    }
  };

  const handleShare = async () => {
    if (!validateBeforeAction()) return;
    const page = document.querySelector('.document-page');
    await shareDocumentImage(page, `${docType}_${docNo || '명세서'}`);
  };

  return (
    <div className="generator-split">
      <div className="form-panel">
        {editingDocId && (
          <div
            style={{
              marginBottom: '0.75rem',
              padding: '0.625rem 0.875rem',
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '8px',
              color: '#1e40af',
              fontSize: '0.8125rem',
              fontWeight: '700',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <span>✏️ 저장된 문서 [{docNo}] 수정 중입니다.</span>
            <button
              style={{
                border: 'none',
                background: 'none',
                color: '#1d6bf3',
                textDecoration: 'underline',
                cursor: 'pointer',
                fontSize: '0.75rem'
              }}
              onClick={onResetForm}
            >
              신규 작성 전환
            </button>
          </div>
        )}

        {/* 문서 기본 설정 */}
        <div className="form-section">
          <div className="section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.9375rem', fontWeight: '900' }}>📄 {docType} 기본 설정</span>
            {onOpenConvertModal && (
              <button
                type="button"
                className="btn btn-outline"
                style={{
                  fontSize: '0.75rem',
                  padding: '3px 8px',
                  borderColor: '#93c5fd',
                  color: '#1d4ed8',
                  backgroundColor: '#eff6ff',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                onClick={onOpenConvertModal}
                title="현재 문서를 다른 양식으로 복사 변환"
              >
                🔄 다른 양식으로 변환
              </button>
            )}
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">공급자 선택</label>
              <select
                className="form-select"
                value={suppliersList.find(s => areSupplierKeysEquivalent(s.id, selectedSupplierKey))?.id || selectedSupplierKey}
                onChange={e => {
                  const newKey = e.target.value;
                  setSelectedSupplierKey(newKey);
                  const found = suppliersList.find(s => areSupplierKeysEquivalent(s.id, newKey));
                  if (found && setCurrentSupplier) {
                    setCurrentSupplier({
                      ...found,
                      company: found.name || found.company,
                      person: found.person || found.owner || '',
                      tel: found.phone || found.tel,
                      email: found.email || '',
                      hasStamp: areSupplierKeysEquivalent(newKey, 'sejin')
                    });
                  }
                }}
                disabled={sessionStorage.getItem('dd_user_role') !== 'admin' && !editingDocId}
              >
                {suppliersList.map(s => (
                  <option key={s.id} value={s.id}>{s.name || s.company}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 🤝 shadcn style Multi-Partner Collaborative Toggle */}
          <div
            style={{
              padding: '0.75rem 0.875rem',
              backgroundColor: isDocShared ? '#f5f7ff' : '#f8fafc',
              border: `1px solid ${isDocShared ? '#c7d2fe' : '#e2e8f0'}`,
              borderRadius: '8px',
              marginBottom: '0.75rem',
              transition: 'all 0.2s ease',
              boxShadow: isDocShared ? '0 1px 3px rgba(79, 70, 229, 0.08)' : 'none'
            }}
          >
            {/* 상단 헤더 바 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0, userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={isDocShared}
                  onChange={e => {
                    const checked = e.target.checked;
                    setIsDocShared(checked);
                    if (checked) {
                      setIsPartnersExpanded(true); // 체크 시 펼침
                      if (!partners || partners.length === 0) {
                        const avail = suppliersList.filter(s => !areSupplierKeysEquivalent(s.id, selectedSupplierKey));
                        if (avail.length > 0) {
                          const initialPartner = {
                            id: avail[0].id,
                            key: avail[0].id,
                            name: avail[0].name || avail[0].company,
                            amount: 0,
                            status: '정산대기',
                            memo: ''
                          };
                          if (setPartners) setPartners([initialPartner]);
                          if (setPartnerKey) setPartnerKey(avail[0].id);
                          if (setPartnerName) setPartnerName(avail[0].name || avail[0].company);
                        }
                      }
                    } else {
                      setIsPartnersExpanded(false);
                    }
                  }}
                  style={{ width: '16px', height: '16px', accentColor: '#4f46e5', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '0.8125rem', fontWeight: '800', color: isDocShared ? '#3730a3' : '#334155' }}>
                  🤝 공동작업 (협력 파트너 1인 / 2인 이상 다수 정산)
                </span>
              </label>

              {isDocShared && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '800', backgroundColor: '#4f46e5', color: '#ffffff', padding: '2px 8px', borderRadius: '9999px' }}>
                    {`공동작업 (${(partners || []).length}명 참여)`}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsPartnersExpanded(prev => !prev)}
                    style={{
                      border: '1px solid #c7d2fe',
                      backgroundColor: isPartnersExpanded ? '#e0e7ff' : '#ffffff',
                      color: '#4338ca',
                      fontSize: '11px',
                      fontWeight: '800',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {isPartnersExpanded ? '▲ 접기' : '▼ 상세 확인/수정'}
                  </button>
                </div>
              )}
            </div>

            {/* 1. 접혀있을 때의 요약 바 (Collapsed State) */}
            {isDocShared && !isPartnersExpanded && (
              <div
                onClick={() => setIsPartnersExpanded(true)}
                style={{
                  marginTop: '0.625rem',
                  padding: '8px 10px',
                  backgroundColor: '#ffffff',
                  borderRadius: '6px',
                  border: '1px solid #c7d2fe',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '8px',
                  flexWrap: 'wrap',
                  transition: 'background-color 0.15s ease'
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8faff'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#ffffff'}
                title="클릭하여 파트너 및 정산금 상세 설정 펼치기"
              >
                {(partners || []).length === 0 ? (
                  <div style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: '700' }}>
                    ⚠️ 등록된 파트너가 없습니다. (클릭하여 파트너 추가)
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '11px', fontWeight: '800', color: '#4338ca' }}>
                        👥 참여 파트너:
                      </span>
                      {(partners || []).map((p, idx) => (
                        <span
                          key={p.key || p.id || idx}
                          style={{
                            fontSize: '11px',
                            fontWeight: '700',
                            backgroundColor: '#eef2ff',
                            color: '#3730a3',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            border: '1px solid #c7d2fe'
                          }}
                        >
                          {`${p.name || p.company || p.key} (${Number(p.amount || 0).toLocaleString()}원)`}
                        </span>
                      ))}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: '800', color: '#1e293b' }}>
                        {`총 정산 배분: ${(partners || []).reduce((s, p) => s + (Number(p.amount) || 0), 0).toLocaleString()}원`}
                      </span>
                      <span style={{ fontSize: '10px', color: '#6366f1', textDecoration: 'underline', fontWeight: '700' }}>
                        클릭하여 수정
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* 2. 펼쳐져 있을 때의 상세 설정 영역 (Expanded State) */}
            {isDocShared && isPartnersExpanded && (
              <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px dashed #c7d2fe', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                
                {/* Selected Partners List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#4338ca' }}>
                      참여 협력 파트너 목록 (1명 ~ 다수 등록 가능):
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#4f46e5' }}>
                      {`총 정산 배분: ${(partners || []).reduce((s, p) => s + (Number(p.amount) || 0), 0).toLocaleString()}원`}
                    </span>
                  </div>

                  {(partners || []).length === 0 ? (
                    <div style={{ fontSize: '0.75rem', color: '#64748b', backgroundColor: '#ffffff', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                      ⚠️ 등록된 협력 파트너가 없습니다. 아래에서 파트너를 추가해 주세요.
                    </div>
                  ) : (
                    (partners || []).map((p, pIdx) => (
                      <div
                        key={p.key || p.id || pIdx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px',
                          backgroundColor: '#ffffff',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: '1px solid #c7d2fe',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: '110px' }}>
                          <span style={{ fontSize: '11px', fontWeight: '800', backgroundColor: '#e0e7ff', color: '#3730a3', padding: '1px 6px', borderRadius: '4px' }}>
                            {`#${pIdx + 1}`}
                          </span>
                          <span style={{ fontSize: '0.8125rem', fontWeight: '700', color: '#1e293b' }}>
                            {p.name || p.company || p.key}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, justifyContent: 'flex-end' }}>
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>정산금:</span>
                          <input
                            type="number"
                            value={p.amount || 0}
                            onChange={e => {
                              const val = Number(e.target.value) || 0;
                              const next = [...partners];
                              next[pIdx] = { ...next[pIdx], amount: val };
                              if (setPartners) setPartners(next);
                              if (pIdx === 0 && setPartnerKey) setPartnerKey(next[0].key);
                            }}
                            placeholder="0"
                            style={{
                              width: '85px',
                              textAlign: 'right',
                              fontSize: '0.75rem',
                              fontWeight: '800',
                              padding: '3px 6px',
                              borderRadius: '4px',
                              border: '1px solid #cbd5e1'
                            }}
                          />
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>원</span>

                          <button
                            type="button"
                            onClick={() => {
                              const next = partners.filter((_, idx) => idx !== pIdx);
                              if (setPartners) setPartners(next);
                              if (next.length > 0) {
                                if (setPartnerKey) setPartnerKey(next[0].key);
                                if (setPartnerName) setPartnerName(next[0].name);
                              } else {
                                if (setPartnerKey) setPartnerKey('');
                                if (setPartnerName) setPartnerName('');
                              }
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#ef4444',
                              fontWeight: '800',
                              cursor: 'pointer',
                              fontSize: '14px',
                              padding: '0 4px',
                              lineHeight: 1
                            }}
                            title="파트너 삭제"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Partner Bar */}
                <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
                  <select
                    className="form-select"
                    style={{ flex: 1, minHeight: '30px', fontSize: '0.75rem', borderColor: '#c7d2fe', backgroundColor: '#ffffff' }}
                    value={selectedPartnerToAdd}
                    onChange={e => setSelectedPartnerToAdd(e.target.value)}
                  >
                    <option value="">-- 등록된 공급자에서 파트너 추가 --</option>
                    {suppliersList
                      .filter(s => !areSupplierKeysEquivalent(s.id, selectedSupplierKey) && !(partners || []).some(p => areSupplierKeysEquivalent(p.key, s.id)))
                      .map(s => (
                        <option key={s.id} value={s.id}>{s.name || s.company}</option>
                      ))}
                  </select>
                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{ fontSize: '0.75rem', padding: '3px 10px', minHeight: '30px', borderColor: '#818cf8', color: '#4338ca', backgroundColor: '#ffffff', fontWeight: '700', whiteSpace: 'nowrap' }}
                    onClick={() => {
                      if (!selectedPartnerToAdd) return;
                      const found = suppliersList.find(s => areSupplierKeysEquivalent(s.id, selectedPartnerToAdd));
                      if (found) {
                        const newP = {
                          id: found.id,
                          key: found.id,
                          name: found.name || found.company,
                          amount: 0,
                          status: '정산대기',
                          memo: ''
                        };
                        const next = [...(partners || []), newP];
                        if (setPartners) setPartners(next);
                        if (next.length === 1) {
                          if (setPartnerKey) setPartnerKey(found.id);
                          if (setPartnerName) setPartnerName(found.name || found.company);
                        }
                        setSelectedPartnerToAdd('');
                      }
                    }}
                  >
                    + 추가
                  </button>
                </div>

                <div style={{ fontSize: '0.6875rem', color: '#6366f1', lineHeight: '1.4' }}>
                  ℹ️ 고객용 출력 문서에는 대표 공급자({currentSupplier.company || currentSupplier.name || '본사'}) 정보만 깔끔하게 단일 표기되며, 지정된 모든 협력사({(partners || []).length}개사)에 실시간 자동 공유 및 개별 정산 관리됩니다.
                </div>

                {/* 설정 완료 및 접기 버튼 */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2px' }}>
                  <button
                    type="button"
                    onClick={() => setIsPartnersExpanded(false)}
                    style={{
                      border: '1px solid #c7d2fe',
                      backgroundColor: '#ffffff',
                      color: '#4338ca',
                      fontSize: '11px',
                      fontWeight: '700',
                      padding: '3px 10px',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    ▲ 설정 완료 및 접기
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">문서번호</label>
              <input
                type="text"
                className="form-input"
                value={docNo}
                onChange={e => setDocNo(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">일자</label>
              <input
                type="date"
                className="form-input"
                value={docDate}
                onChange={e => setDocDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* 상단 문서 제어 버튼 바 */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: (docType === '거래명세서') ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)',
            gap: '6px',
            marginBottom: '1rem'
          }}
        >
          <button
            type="button"
            className="btn btn-primary"
            style={{ fontSize: '0.8125rem', padding: '0 6px', fontWeight: '800' }}
            onClick={onResetForm}
          >
            ✨ 신규 작성
          </button>

          {docType === '거래명세서' && (
            <button
              type="button"
              className="btn btn-blue"
              style={{ fontSize: '0.8125rem', padding: '0 6px', fontWeight: '700' }}
              onClick={() => onOpenPastStatementModal && onOpenPastStatementModal()}
            >
              📂 지난 명세서
            </button>
          )}

          {docType === '거래명세서' && (
            <button
              type="button"
              className="btn btn-outline"
              style={{ fontSize: '0.8125rem', padding: '0 6px', fontWeight: '700' }}
              onClick={() => onOpenEstimateModal && onOpenEstimateModal('convert_to_statement')}
            >
              📑 견적서 가져오기
            </button>
          )}

          {docType === '견적서' && (
            <button
              type="button"
              className="btn btn-outline"
              style={{ fontSize: '0.8125rem', padding: '0 6px', fontWeight: '700' }}
              onClick={() => onOpenEstimateModal && onOpenEstimateModal('import_estimate')}
            >
              📂 견적서 목록
            </button>
          )}

          {docType === '청구서' && (
            <button
              type="button"
              className="btn btn-blue"
              style={{ fontSize: '0.8125rem', padding: '0 6px', fontWeight: '700' }}
              onClick={() => {
                if (!customer || !customer.name) {
                  alert('먼저 거래처를 검색하거나 입력해주세요.');
                  return;
                }
                onAggregateOpen();
              }}
            >
              🧾 명세서 취합
            </button>
          )}
        </div>

        {/* 공급받는자 (거래처) 섹션 */}
        <div className="form-section">
          <div className="section-title" style={{ marginBottom: '0.5rem' }}>
            <span style={{ fontWeight: '800', fontSize: '0.875rem', color: 'var(--c-navy-dark)' }}>
              🏢 공급받는자 (거래처)
            </span>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '6px',
              marginBottom: '0.625rem'
            }}
          >
            <button
              type="button"
              className="btn btn-outline"
              style={{ fontSize: '0.8125rem', fontWeight: '700' }}
              onClick={() => onAddNewCustomer(customer.name || '')}
            >
              + 신규 거래처
            </button>
            <button
              type="button"
              className="btn btn-light"
              style={{ fontSize: '0.8125rem', fontWeight: '700' }}
              onClick={() => onOpenOcrModal && onOpenOcrModal()}
            >
              📷 명함/등록증 AI
            </button>
          </div>

          <div className="form-group" style={{ position: 'relative' }}>
            <label className="form-label">거래처명 검색 / 입력</label>
            <input
              type="text"
              className="form-input"
              placeholder="거래처 검색 (자동완성)"
              value={customer.name || ''}
              onChange={e => {
                setCustomer({
                  ...customer,
                  name: e.target.value
                });
                setShowAutocomplete(true);
              }}
              onFocus={() => setShowAutocomplete(true)}
            />
            {showAutocomplete && matchingCustomers.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: '#ffffff',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  zIndex: 20,
                  maxHeight: '200px',
                  overflowY: 'auto'
                }}
              >
                {matchingCustomers.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '0.625rem',
                      background: 'none',
                      border: 'none',
                      borderBottom: '1px solid #eee',
                      cursor: 'pointer'
                    }}
                    onClick={() => {
                      setCustomer({
                        name: c.name,
                        person: c.person || c.repName || '',
                        phone: c.phone || '',
                        addr: c.addr || '',
                        bizno: c.bizno || '',
                        selectedMachine: c.selectedMachine || c.machine || ''
                      });
                      setShowAutocomplete(false);
                    }}
                  >
                    <div style={{ fontWeight: '700' }}>{c.name}</div>
                    <div style={{ fontSize: '10px', color: '#666' }}>
                      {c.person} • {c.phone}
                    </div>
                  </button>
                ))}
              </div>
            )}
            {showAutocomplete && matchingCustomers.length === 0 && (customer.name || '').trim() !== '' && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: '#ffffff',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  zIndex: 20,
                  padding: '1rem',
                  textAlign: 'center',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                }}
              >
                <div style={{ marginBottom: '0.5rem', color: '#4b5563', fontSize: '0.875rem' }}>
                  "{customer.name}" 거래처가 없습니다.
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                  onClick={() => {
                    setShowAutocomplete(false);
                    onAddNewCustomer(customer.name);
                  }}
                >
                  + 새 거래처 등록하기
                </button>
              </div>
            )}
          </div>

          {(customer.person || customer.phone || customer.addr) && (
            <div
              style={{
                marginTop: '0.5rem',
                padding: '0.5rem',
                backgroundColor: '#f9fafb',
                borderRadius: '4px',
                fontSize: '0.875rem',
                color: '#4b5563'
              }}
            >
              {customer.person && <div><strong>담당자: </strong>{customer.person}</div>}
              {customer.phone && <div><strong>연락처: </strong>{customer.phone}</div>}
              {customer.addr && <div><strong>주소: </strong>{customer.addr}</div>}
            </div>
          )}
        </div>

        {/* 청구서 전용 계좌정보 */}
        {docType === '청구서' && (
          <div className="form-section">
            <div className="section-title">청구서 상세 정보</div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">입금 계좌번호</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="예: 신한 110-xxx 홍길동"
                  value={bankAccount}
                  onChange={e => setBankAccount(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">입금 기한</label>
                <input
                  type="text"
                  className="form-input"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* 📦 스마트 품목 관리자 (1줄 스택 리스트 + 단일 스마트 입력창 + 팝업 미리보기) */}
        <SmartItemListManager
          items={items}
          setItems={setItems}
          docType={docType}
          vatIncluded={vatIncluded}
        />

        {/* 부가세 토글 */}
        <div className="form-section">
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '7px 10px',
              backgroundColor: vatIncluded ? '#eff6ff' : '#f8fafc',
              border: `1px solid ${vatIncluded ? '#3b82f6' : '#cbd5e1'}`,
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              userSelect: 'none'
            }}
          >
            <input
              type="checkbox"
              checked={!!vatIncluded}
              onChange={e => setVatIncluded(e.target.checked)}
              style={{
                width: '16px',
                height: '16px',
                accentColor: '#1d6bf3',
                cursor: 'pointer'
              }}
            />
            <span
              style={{
                fontSize: '0.875rem',
                fontWeight: '700',
                color: vatIncluded ? '#1d6bf3' : '#64748b'
              }}
            >
              부가세 적용 (10%)
            </span>
          </label>
        </div>

        {/* 입금 관리 (견적서 제외) */}
        {docType !== '견적서' && (
          <div className="form-section">
            <div className="section-title">💳 입금 · 수금 관리</div>
            <div style={{ marginBottom: '10px' }}>
              <div className="form-group" style={{ marginTop: '8px' }}>
                <label className="form-label">입금금액 (미수금은 0)</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="0"
                  value={paid === 0 ? '' : paid}
                  onChange={e => {
                    const val = Number(e.target.value) || 0;
                    setPaid(val);
                    const total = items.reduce((sum, i) => sum + (Number(i.qty) || 0) * (Number(i.price) || 0), 0);
                    const v = vatIncluded !== false ? Math.floor(total * 0.1) : Number(vat) || 0;
                    const finalTotal = total + v;
                    if (val >= finalTotal && finalTotal > 0) {
                      setPaymentStatus('입금완료');
                      if (!paymentDate) {
                        const d = new Date();
                        setPaymentDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
                      }
                    } else if (val > 0) {
                      setPaymentStatus('부분입금');
                      if (!paymentDate) {
                        const d = new Date();
                        setPaymentDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
                      }
                    } else {
                      setPaymentStatus('미수금');
                    }
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
                <div className="form-group">
                  <label className="form-label">입금방법</label>
                  <select
                    className="form-select"
                    value={paymentMethod}
                    onChange={e => {
                      const m = e.target.value;
                      setPaymentMethod(m);
                      if (m === '카드' || m === '신용카드' || m === '세금계산서') {
                        setVatIncluded(true);
                      }
                    }}
                  >
                    {['계좌이체', '현금', '카드', '어음', '기타'].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">입금일자</label>
                  <input
                    type="date"
                    className="form-input"
                    value={paymentDate}
                    onChange={e => setPaymentDate(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 비고란 */}
        <div className="form-section">
          <div className="section-title">📝 비고 / 특이사항</div>
          <div className="form-group">
            <textarea
              className="form-input"
              style={{ minHeight: '60px', resize: 'vertical' }}
              value={remark}
              onChange={e => setRemark(e.target.value)}
              placeholder="명세서 하단에 인쇄될 비고를 입력하세요"
            />
          </div>
        </div>

        {/* 문서 공개 설정 */}
        <div
          style={{
            padding: '8px 10px',
            backgroundColor: isDocShared ? '#f0fdf4' : '#fffbeb',
            border: `1px solid ${isDocShared ? '#86efac' : '#fde68a'}`,
            borderRadius: '8px',
            marginTop: '0.75rem',
            marginBottom: '0.25rem'
          }}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#1e293b', marginBottom: '4px' }}>
            🛡️ 문서 공개 설정 (타 공급자 달력 노출 여부)
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '700', color: '#c2410c' }}>
              <input
                type="radio"
                name="doc_is_shared"
                checked={!isDocShared}
                onChange={() => setIsDocShared && setIsDocShared(false)}
              />
              <span>🔒 비공개 (기본값)</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '700', color: '#15803d' }}>
              <input
                type="radio"
                name="doc_is_shared"
                checked={!!isDocShared}
                onChange={() => setIsDocShared && setIsDocShared(true)}
              />
              <span>🔓 공개 (공유)</span>
            </label>
          </div>
        </div>

        {/* 하단 실행 버튼 영역 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
          {/* 1. 메인 저장 버튼 (통일된 로열 블루) */}
          <button
            type="button"
            className="btn btn-primary"
            style={{
              width: '100%',
              minHeight: '44px',
              fontSize: '0.9375rem',
              fontWeight: '800',
              backgroundColor: '#2563eb',
              borderColor: '#2563eb',
              boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
            }}
            onClick={() => {
              setIsPartnersExpanded(false);
              if (onSaveDocument) onSaveDocument();
            }}
          >
            💾 문서 저장
          </button>

          {/* 2. 다른 양식으로 변환 발행 (소프트 블루 아웃라인) */}
          {onOpenConvertModal && (
            <button
              type="button"
              className="btn btn-outline"
              style={{
                width: '100%',
                minHeight: '36px',
                fontSize: '0.8125rem',
                fontWeight: '700',
                color: '#1d4ed8',
                borderColor: '#bfdbfe',
                backgroundColor: '#eff6ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
              onClick={onOpenConvertModal}
            >
              🔄 다른 양식으로 변환 발행 (견적서 / 청구서)...
            </button>
          )}

          {/* 3. 내보내기 4대 기능 (이미지, PDF, 엑셀, 인쇄) - 4분할 조화로운 스타일 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
            <button
              type="button"
              className="btn btn-outline"
              style={{
                padding: '0.5rem 0.25rem',
                fontSize: '0.75rem',
                fontWeight: '700',
                color: '#1e293b',
                borderColor: '#cbd5e1',
                backgroundColor: '#ffffff'
              }}
              onClick={handleExportPNG}
              title="이미지(PNG) 다운로드"
            >
              📸 이미지
            </button>
            <button
              type="button"
              className="btn btn-outline"
              style={{
                padding: '0.5rem 0.25rem',
                fontSize: '0.75rem',
                fontWeight: '700',
                color: '#1e293b',
                borderColor: '#cbd5e1',
                backgroundColor: '#ffffff'
              }}
              onClick={handleExportPDF}
              title="PDF 문서 다운로드"
            >
              📄 PDF
            </button>
            <button
              type="button"
              className="btn btn-outline"
              style={{
                padding: '0.5rem 0.25rem',
                fontSize: '0.75rem',
                fontWeight: '700',
                color: '#047857',
                borderColor: '#a7f3d0',
                backgroundColor: '#ecfdf5'
              }}
              onClick={handleExportExcel}
              title="엑셀(.xlsx) 파일 다운로드"
            >
              📊 엑셀
            </button>
            <button
              type="button"
              className="btn btn-outline"
              style={{
                padding: '0.5rem 0.25rem',
                fontSize: '0.75rem',
                fontWeight: '700',
                color: '#1e293b',
                borderColor: '#cbd5e1',
                backgroundColor: '#ffffff'
              }}
              onClick={() => { if (validateBeforeAction()) window.print(); }}
              title="인쇄"
            >
              🖨️ 인쇄
            </button>
          </div>

          {/* 4. 모바일 공유하기 */}
          <button
            type="button"
            className="btn btn-outline"
            style={{
              minHeight: '38px',
              fontSize: '0.8125rem',
              fontWeight: '700',
              color: '#475569',
              borderColor: '#cbd5e1',
              backgroundColor: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
            onClick={handleShare}
          >
            📱 모바일 공유하기 (카톡 / 문자)
          </button>
        </div>
      </div>

      <div className="preview-panel">
        <DocumentCanvas
          docType={docType}
          docNo={docNo}
          docDate={docDate}
          docTime={docTime}
          supplier={currentSupplier}
          customer={customer}
          items={items}
          vat={vat}
          vatIncluded={vatIncluded}
          paid={paid}
          remark={remark}
          setItems={setItems}
          setCustomer={setCustomer}
          setRemark={setRemark}
        />
      </div>
    </div>
  );
}
