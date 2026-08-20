// 🎨 TEAM D.D STATEMENT & ESTIMATE GENERATOR TAB
import React, { useState, useMemo } from 'react';
import DocumentCanvas from '../components/DocumentCanvas.jsx';
import { exportPagesToPNG, copyPageToClipboard, shareDocumentImage } from '../utils/exportUtils.js';

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
  draftsCount = 0
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
          <div className="section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>📄 {docType} 기본 설정</span>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'normal' }}>⚡ 원클릭 양식 전환</span>
          </div>

          <div
            style={{
              display: 'flex',
              backgroundColor: '#f1f5f9',
              padding: '4px',
              borderRadius: '8px',
              marginBottom: '1rem',
              border: '1px solid #e2e8f0'
            }}
          >
            {['거래명세서', '견적서', '청구서'].map(type => (
              <button
                key={type}
                type="button"
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  fontSize: '0.8125rem',
                  fontWeight: docType === type ? '800' : '600',
                  backgroundColor: docType === type ? '#ffffff' : 'transparent',
                  color: docType === type ? '#1d6bf3' : '#64748b',
                  borderRadius: '6px',
                  border: 'none',
                  boxShadow: docType === type ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px'
                }}
                onClick={() => setDocType(type)}
              >
                {type === '거래명세서' ? '📦 거래명세서' : (type === '견적서' ? '📋 견적서' : '🧾 청구서')}
              </button>
            ))}
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

        {/* 품목 리스트 */}
        <div className="form-section">
          <div className="section-title">
            <span>📦 품목 리스트 ({items.length}건)</span>
          </div>
          {items.map((item, idx) => (
            <div key={item.id || idx} className="item-card">
              <div className="item-card-header">
                <span style={{ fontSize: '11px', color: '#666', fontWeight: '800' }}>
                  #{idx + 1} 품목
                </span>
                <button
                  type="button"
                  style={{
                    border: 'none',
                    background: 'none',
                    color: '#dc2626',
                    cursor: 'pointer',
                    fontSize: '11px',
                    padding: '4px',
                    fontWeight: '700'
                  }}
                  onClick={() => setItems(items.length === 1 ? [{
                    id: Date.now().toString(),
                    code: '',
                    name: '',
                    unit: 'EA',
                    qty: 1,
                    price: 0
                  }] : items.filter(i => i.id !== item.id))}
                >
                  🗑️ 삭제
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: docType === '청구서' ? '110px 1fr' : '1fr', gap: '4px', marginBottom: '4px' }}>
                {docType === '청구서' && (
                  <input
                    type="date"
                    className="form-input"
                    value={item.date || ''}
                    onChange={e => setItems(items.map(i => i.id === item.id ? { ...i, date: e.target.value } : i))}
                    style={{ fontSize: '11px', padding: '0.4rem' }}
                  />
                )}
                <input
                  type="text"
                  className="form-input"
                  placeholder="품명 및 규격"
                  value={item.name}
                  onChange={e => setItems(items.map(i => i.id === item.id ? { ...i, name: e.target.value } : i))}
                  style={{ fontWeight: '700' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '65px 75px 1fr', gap: '4px' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="단위"
                  value={item.unit}
                  onChange={e => setItems(items.map(i => i.id === item.id ? { ...i, unit: e.target.value } : i))}
                  style={{ textAlign: 'center' }}
                />
                <input
                  type="number"
                  className="form-input"
                  placeholder="수량"
                  value={item.qty === 0 ? '' : item.qty}
                  onChange={e => setItems(items.map(i => i.id === item.id ? { ...i, qty: Number(e.target.value) || 0 } : i))}
                  style={{ textAlign: 'center', fontWeight: '700' }}
                />
                <input
                  type="number"
                  className="form-input"
                  placeholder="단가 (금액)"
                  value={item.price === 0 ? '' : item.price}
                  onChange={e => setItems(items.map(i => i.id === item.id ? { ...i, price: Number(e.target.value) || 0 } : i))}
                  style={{ textAlign: 'right', fontWeight: '800', color: '#1d6bf3' }}
                />
              </div>

              <input
                type="text"
                className="form-input"
                placeholder="품목 비고 / 메모 (선택사항)"
                value={item.memo || item.remark || ''}
                onChange={e => setItems(items.map(i => i.id === item.id ? { ...i, memo: e.target.value, remark: e.target.value } : i))}
                style={{ marginTop: '4px', fontSize: '0.75rem' }}
              />
            </div>
          ))}

          <div style={{ marginTop: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-outline"
              style={{
                width: '100%',
                minHeight: '44px',
                fontSize: '0.875rem',
                fontWeight: '800',
                color: '#1d6bf3',
                borderColor: '#3b82f6',
                backgroundColor: '#eff6ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                borderRadius: '8px',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(29,107,243,0.1)'
              }}
              onClick={() => setItems([...items, {
                id: Date.now().toString(),
                code: '',
                name: '',
                unit: 'EA',
                qty: 1,
                price: 0
              }])}
            >
              <span>➕ 품목 행 추가 (새 품목 입력)</span>
            </button>
          </div>
        </div>

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

        {/* 하단 실행 버튼 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
          <button
            type="button"
            className="btn btn-primary"
            style={{
              minHeight: '44px',
              fontSize: '0.9375rem',
              fontWeight: '800',
              backgroundColor: '#16a34a',
              borderColor: '#16a34a'
            }}
            onClick={onSaveDocument}
          >
            💾 로컬 / DB 저장
          </button>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-green"
              style={{ flex: 1, padding: '0.5rem', fontSize: '0.875rem' }}
              onClick={handleExportPNG}
            >
              📸 이미지
            </button>
            <button
              type="button"
              className="btn btn-primary"
              style={{ flex: 1, padding: '0.5rem', fontSize: '0.875rem' }}
              onClick={() => { if (validateBeforeAction()) window.print(); }}
            >
              🖨️ 인쇄
            </button>
            <button
              type="button"
              className="btn btn-primary"
              style={{ flex: 1, padding: '0.5rem', fontSize: '0.875rem', backgroundColor: '#dc2626', borderColor: '#dc2626' }}
              onClick={handleExportPDF}
            >
              📄 PDF
            </button>
          </div>

          <button
            type="button"
            className="btn btn-outline"
            style={{
              minHeight: '40px',
              fontWeight: '700',
              color: '#1d6bf3',
              borderColor: '#1d6bf3',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
            onClick={handleShare}
          >
            📱 모바일 공유하기 (카톡/문자)
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
