// 🎨 TEAM D.D PURCHASE INVOICE OCR MODAL (AI VISION ENGINE)
import React, { useState, useEffect, useRef } from 'react';
import { compressInvoiceImage, parsePurchaseInvoiceImage } from '../services/purchaseService.js';
import { registerBackHandler } from '../utils/navigationManager.js';

export default function PurchaseOcrModal({
  isOpen,
  onClose,
  suppliersList = [],
  selectedSupplierKey = 'sejin',
  onSavePurchase
}) {
  const [step, setStep] = useState('upload'); // upload | analyzing | verify
  const [isDragging, setIsDragging] = useState(false);
  const [sourceImage, setSourceImage] = useState(null); // dataUrl, base64, mimeType
  const [analyzingStatus, setAnalyzingStatus] = useState('');
  const [autoRegisterParts, setAutoRegisterParts] = useState(true);

  // 전표 폼 데이터
  const [form, setForm] = useState({
    supplier_key: selectedSupplierKey,
    vendor_name: '',
    vendor_bizno: '',
    invoice_date: new Date().toISOString().split('T')[0],
    items: [],
    total_amount: 0,
    supply_amount: 0,
    vat_amount: 0,
    memo: ''
  });

  const fileInputRef = useRef(null);

  // 모바일 뒤로가기 키 닫기 연동
  useEffect(() => {
    if (!isOpen) return;
    return registerBackHandler(() => {
      onClose();
      return true;
    }, 'PurchaseOcrModal');
  }, [isOpen, onClose]);

  // 모달 열릴 때 초기화
  useEffect(() => {
    if (isOpen) {
      setStep('upload');
      setSourceImage(null);
      setAnalyzingStatus('');
      setForm({
        supplier_key: selectedSupplierKey,
        vendor_name: '',
        vendor_bizno: '',
        invoice_date: new Date().toISOString().split('T')[0],
        items: [],
        total_amount: 0,
        supply_amount: 0,
        vat_amount: 0,
        memo: ''
      });
    }
  }, [isOpen, selectedSupplierKey]);

  // 클립보드 붙여넣기(Ctrl+V) 이벤트 리스너
  useEffect(() => {
    if (!isOpen || step !== 'upload') return;

    const handlePaste = async (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            handleProcessFile(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen, step]);

  if (!isOpen) return null;

  // 파일 처리 및 OCR 시작
  const handleProcessFile = async (file) => {
    try {
      setStep('analyzing');
      setAnalyzingStatus('📄 전표/영수증 이미지 최적화 중...');
      const compressed = await compressInvoiceImage(file);
      setSourceImage(compressed);

      setAnalyzingStatus('🤖 Google Gemini Vision AI가 전표와 품목 표를 정밀 분석 중...');
      const result = await parsePurchaseInvoiceImage(compressed.base64, compressed.mimeType);

      setForm({
        supplier_key: selectedSupplierKey,
        vendor_name: result.vendor_name || '',
        vendor_bizno: result.vendor_bizno || '',
        invoice_date: result.invoice_date || new Date().toISOString().split('T')[0],
        items: (result.items && result.items.length > 0) ? result.items : [
          { name: '', spec: '', qty: 1, unit_price: 0, amount: 0, memo: '' }
        ],
        total_amount: result.total_amount || 0,
        supply_amount: result.supply_amount || 0,
        vat_amount: result.vat_amount || 0,
        memo: result.memo || ''
      });

      setStep('verify');
    } catch (err) {
      console.error('OCR Error:', err);
      alert('❌ 전표 분석 실패: ' + (err.message || err));
      setStep('upload');
    }
  };

  // 품목 수정 핸들러
  const handleItemChange = (index, field, value) => {
    const updated = [...form.items];
    updated[index] = { ...updated[index], [field]: value };

    // 수량이나 단가 변경 시 금액 자동 계산
    if (field === 'qty' || field === 'unit_price') {
      const q = Number(field === 'qty' ? value : updated[index].qty) || 0;
      const p = Number(field === 'unit_price' ? value : updated[index].unit_price) || 0;
      updated[index].amount = q * p;
    }

    // 전체 합계 재계산
    const newSupply = updated.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
    const newVat = Math.round(newSupply * 0.1);
    const newTotal = newSupply + newVat;

    setForm({
      ...form,
      items: updated,
      supply_amount: newSupply,
      vat_amount: newVat,
      total_amount: newTotal
    });
  };

  // 품목 행 추가
  const handleAddItem = () => {
    setForm({
      ...form,
      items: [
        ...form.items,
        { name: '', spec: '', qty: 1, unit_price: 0, amount: 0, memo: '' }
      ]
    });
  };

  // 품목 행 삭제
  const handleRemoveItem = (index) => {
    if (form.items.length <= 1) {
      alert('최소 1개 이상의 품목이 있어야 합니다.');
      return;
    }
    const updated = form.items.filter((_, i) => i !== index);
    const newSupply = updated.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
    const newVat = Math.round(newSupply * 0.1);
    const newTotal = newSupply + newVat;

    setForm({
      ...form,
      items: updated,
      supply_amount: newSupply,
      vat_amount: newVat,
      total_amount: newTotal
    });
  };

  // 최종 저장
  const handleSave = () => {
    if (!form.vendor_name || form.vendor_name.trim() === '') {
      alert('❌ 매입처(구매한 업체 상호)를 입력해 주세요.');
      return;
    }
    const validItems = form.items.filter(it => it.name && it.name.trim() !== '');
    if (validItems.length === 0) {
      alert('❌ 최소 1개 이상의 품목명을 입력해 주세요.');
      return;
    }

    const payload = {
      ...form,
      items: validItems,
      receipt_image: sourceImage?.dataUrl || null
    };

    if (onSavePurchase) {
      onSavePurchase(payload, autoRegisterParts);
    }
    onClose();
  };

  return (
    <div
      className="modal-overlay"
      style={{
        zIndex: 10050,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
      onClick={onClose}
    >
      <div
        className="modal-content"
        style={{
          maxWidth: step === 'verify' ? '1050px' : '560px',
          width: '100%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#FFFFFF',
          borderRadius: '20px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 모달 헤더 */}
        <div
          style={{
            padding: '1rem 1.25rem',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#F8FAFC'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.25rem' }}>🧾</span>
            <div>
              <h3 style={{ fontSize: '1.0625rem', fontWeight: '900', color: '#0F172A', margin: 0 }}>
                매입전표 / 영수증 AI 자동 등록
              </h3>
              <p style={{ fontSize: '0.6875rem', color: '#64748B', margin: 0 }}>
                PDF 전자문서나 사진 캡처본을 올리면 AI가 품목과 단가를 자동으로 추출합니다.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-outline"
            style={{ padding: '4px 8px', fontSize: '11px', borderColor: '#CBD5E1' }}
            onClick={onClose}
          >
            ✕ 닫기
          </button>
        </div>

        {/* 1단계: 파일 업로드 화면 */}
        {step === 'upload' && (
          <div style={{ padding: '2rem 1.5rem', textAlign: 'center' }}>
            <div
              style={{
                border: isDragging ? '2.5px dashed #2563EB' : '2px dashed #CBD5E1',
                backgroundColor: isDragging ? '#EFF6FF' : '#F8FAFC',
                borderRadius: '16px',
                padding: '2.5rem 1.5rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const file = e.dataTransfer?.files?.[0];
                if (file) handleProcessFile(file);
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📄</div>
              <h4 style={{ fontSize: '1rem', fontWeight: '800', color: '#1E293B', marginBottom: '0.25rem' }}>
                전표 파일 (PDF, JPG, PNG) 드래그 또는 클릭
              </h4>
              <p style={{ fontSize: '0.75rem', color: '#64748B', marginBottom: '1rem' }}>
                타 업체에서 받은 거래명세서, 전자세금계산서 PDF 또는 스마트폰 캡처본을 올려주세요.
              </p>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '20px',
                  backgroundColor: '#DBEAFE',
                  color: '#1E40AF',
                  fontSize: '0.75rem',
                  fontWeight: '700'
                }}
              >
                📋 화면 캡처 후 Ctrl+V (붙여넣기)도 지원됩니다!
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleProcessFile(file);
                }}
              />
            </div>
          </div>
        )}

        {/* 2단계: AI 분석 중 로딩 스피너 */}
        {step === 'analyzing' && (
          <div style={{ padding: '3.5rem 2rem', textAlign: 'center' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                border: '4px solid #E2E8F0',
                borderTop: '4px solid #2563EB',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 1.25rem auto'
              }}
            />
            <h4 style={{ fontSize: '1.0625rem', fontWeight: '800', color: '#1E293B', marginBottom: '0.5rem' }}>
              전표 데이터 분석 중...
            </h4>
            <p style={{ fontSize: '0.8125rem', color: '#2563EB', fontWeight: '600' }}>
              {analyzingStatus}
            </p>
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* 3단계: AI 추출 결과 검수 및 편집 테이블 */}
        {step === 'verify' && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            <div style={{ display: 'flex', flex: 1, overflowY: 'auto', flexDirection: window.innerWidth < 768 ? 'column' : 'row' }}>
              
              {/* 좌측: 원본 전표 썸네일 */}
              <div
                style={{
                  width: window.innerWidth < 768 ? '100%' : '320px',
                  backgroundColor: '#0F172A',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRight: '1px solid #E2E8F0',
                  flexShrink: 0
                }}
              >
                <div style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '6px', fontWeight: '700' }}>
                  📷 원본 전표 증빙
                </div>
                {sourceImage?.dataUrl && (
                  <img
                    src={sourceImage.dataUrl}
                    alt="원본 전표"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '380px',
                      objectFit: 'contain',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                    }}
                  />
                )}
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ marginTop: '0.75rem', fontSize: '11px', color: '#F1F5F9', borderColor: '#475569' }}
                  onClick={() => setStep('upload')}
                >
                  🔄 다른 파일 다시 올리기
                </button>
              </div>

              {/* 우측: 정형 전표 정보 및 품목 목록 */}
              <div style={{ flex: 1, padding: '1.25rem', overflowY: 'auto' }}>
                {/* 상단 기본 정보 */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: '700', color: '#1E40AF' }}>
                      🏢 내 사업자 (매입 귀속)
                    </label>
                    <select
                      className="form-input"
                      style={{ fontWeight: '700' }}
                      value={form.supplier_key}
                      onChange={(e) => setForm({ ...form, supplier_key: e.target.value })}
                    >
                      {suppliersList.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name || s.company}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: '700' }}>
                      🏪 매입처 상호 (구매한 업체) *
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="예: 대한유압"
                      value={form.vendor_name}
                      onChange={(e) => setForm({ ...form, vendor_name: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">매입처 사업자번호</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="000-00-00000"
                      value={form.vendor_bizno}
                      onChange={(e) => setForm({ ...form, vendor_bizno: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">전표 발행일자 *</label>
                    <input
                      type="date"
                      className="form-input"
                      value={form.invoice_date}
                      onChange={(e) => setForm({ ...form, invoice_date: e.target.value })}
                    />
                  </div>
                </div>

                {/* 품목 리스트 테이블 */}
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.8125rem', fontWeight: '800', color: '#1E293B' }}>
                      📦 매입 품목 내역 ({form.items.length}건)
                    </span>
                    <button
                      type="button"
                      className="btn btn-outline"
                      style={{ fontSize: '11px', padding: '3px 8px', borderColor: '#2563EB', color: '#2563EB' }}
                      onClick={handleAddItem}
                    >
                      ➕ 품목 행 추가
                    </button>
                  </div>

                  <div style={{ overflowX: 'auto', border: '1px solid #E2E8F0', borderRadius: '10px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569' }}>
                          <th style={{ padding: '6px 8px', width: '35%' }}>품목명 *</th>
                          <th style={{ padding: '6px 8px', width: '20%' }}>규격/모델</th>
                          <th style={{ padding: '6px 8px', width: '12%', textAlign: 'right' }}>수량</th>
                          <th style={{ padding: '6px 8px', width: '18%', textAlign: 'right' }}>매입단가</th>
                          <th style={{ padding: '6px 8px', width: '15%', textAlign: 'right' }}>공급가액</th>
                          <th style={{ padding: '6px 4px', width: '30px', textAlign: 'center' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {form.items.map((it, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                            <td style={{ padding: '4px 6px' }}>
                              <input
                                type="text"
                                className="form-input"
                                style={{ padding: '4px 6px', fontSize: '11px' }}
                                placeholder="품목명 입력"
                                value={it.name}
                                onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                              />
                            </td>
                            <td style={{ padding: '4px 6px' }}>
                              <input
                                type="text"
                                className="form-input"
                                style={{ padding: '4px 6px', fontSize: '11px' }}
                                placeholder="규격"
                                value={it.spec}
                                onChange={(e) => handleItemChange(idx, 'spec', e.target.value)}
                              />
                            </td>
                            <td style={{ padding: '4px 6px' }}>
                              <input
                                type="number"
                                className="form-input"
                                style={{ padding: '4px 6px', fontSize: '11px', textAlign: 'right' }}
                                value={it.qty}
                                onChange={(e) => handleItemChange(idx, 'qty', e.target.value)}
                              />
                            </td>
                            <td style={{ padding: '4px 6px' }}>
                              <input
                                type="number"
                                className="form-input"
                                style={{ padding: '4px 6px', fontSize: '11px', textAlign: 'right', fontWeight: '700' }}
                                value={it.unit_price}
                                onChange={(e) => handleItemChange(idx, 'unit_price', e.target.value)}
                              />
                            </td>
                            <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: '700', color: '#1E293B' }}>
                              {(Number(it.amount) || 0).toLocaleString()}원
                            </td>
                            <td style={{ padding: '4px 4px', textAlign: 'center' }}>
                              <button
                                type="button"
                                style={{ border: 'none', background: 'none', color: '#EF4444', cursor: 'pointer', fontSize: '13px' }}
                                onClick={() => handleRemoveItem(idx)}
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 금액 합계 & 옵션 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', padding: '10px', backgroundColor: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '700', color: '#2563EB' }}>
                    <input
                      type="checkbox"
                      checked={autoRegisterParts}
                      onChange={(e) => setAutoRegisterParts(e.target.checked)}
                      style={{ width: '16px', height: '16px', accentColor: '#2563EB' }}
                    />
                    <span>⭐ 이 품목들을 내 부품함(재고/단가표)에 자동 등록·단가 갱신</span>
                  </label>

                  <div style={{ display: 'flex', gap: '16px', fontSize: '12px', fontWeight: '700', alignItems: 'center' }}>
                    <div>공급가: <span style={{ color: '#0F172A' }}>{form.supply_amount.toLocaleString()}원</span></div>
                    <div>세액: <span style={{ color: '#64748B' }}>{form.vat_amount.toLocaleString()}원</span></div>
                    <div style={{ fontSize: '14px', color: '#1D4ED8' }}>
                      총 매입액: <span>{form.total_amount.toLocaleString()}원</span>
                    </div>
                  </div>
                </div>

                {/* 메모 */}
                <div style={{ marginTop: '10px' }}>
                  <input
                    type="text"
                    className="form-input"
                    style={{ fontSize: '11px' }}
                    placeholder="메모 (예: 계좌이체 완료, OO현장 사용 부품 등)"
                    value={form.memo}
                    onChange={(e) => setForm({ ...form, memo: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* 하단 버튼 바 */}
            <div
              style={{
                padding: '0.875rem 1.25rem',
                borderTop: '1px solid #E2E8F0',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '8px',
                backgroundColor: '#F8FAFC'
              }}
            >
              <button
                type="button"
                className="btn btn-outline"
                style={{ padding: '6px 16px', fontSize: '12px' }}
                onClick={onClose}
              >
                취소
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ padding: '6px 20px', fontSize: '12px', fontWeight: '800' }}
                onClick={handleSave}
              >
                💾 매입전표 저장 완료
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
