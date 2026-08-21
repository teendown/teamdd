// 🎨 TEAM D.D STATEMENT & ESTIMATE GENERATOR TAB
import React, { useState, useMemo } from 'react';
import DocumentCanvas from '../components/DocumentCanvas.jsx';
import SmartItemListManager from '../components/SmartItemListManager.jsx';
import { exportPagesToPNG, copyPageToClipboard, shareDocumentImage, exportDocumentToExcel } from '../utils/exportUtils.js';

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
  onSaveDraft,
  onOpenDraftsModal,
  draftsCount = 0,
  onUpdateScheduleStatus,
  onNavigateToDoc
}) {
  const [showAutocomplete, setShowAutocomplete] = useState(false);

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
    await exportPagesToPNG(`${docType}_${docNo || '명세서'}`);
  };

  const handleExportPDF = async () => {
    if (!validateBeforeAction()) return;
    const pages = document.querySelectorAll('.document-page');
    if (!pages || pages.length === 0) return;
    try {
      if (!window.html2canvas) {
        window.print();
        return;
      }
      if (!window.jspdf) {
        window.print();
        return;
      }
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF('p', 'mm', 'a4');
      for (let i = 0; i < pages.length; i++) {
        if (i > 0) pdf.addPage();
        const canvas = await window.html2canvas(pages[i], {
          scale: 2,
          backgroundColor: '#ffffff'
        });
        const imgData = canvas.toDataURL('image/png');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      }
      pdf.save(`${docType}_${docNo || '명세서'}.pdf`);
    } catch (e) {
      console.error(e);
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
    await shareDocumentImage(`${docType}_${docNo || '명세서'}`);
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
                value={selectedSupplierKey}
                onChange={e => setSelectedSupplierKey(e.target.value)}
                disabled={sessionStorage.getItem('dd_user_role') !== 'admin'}
              >
                {suppliersList.map(s => (
                  <option key={s.id} value={s.id}>{s.name || s.company}</option>
                ))}
              </select>
            </div>
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
            onClick={onSaveDocument}
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
