// 🔄 TEAM D.D DOCUMENT CONVERT MODAL (원본 보존 및 신규 문서 변환 복사)
import React, { useState } from 'react';

export default function DocConvertModal({
  isOpen,
  onClose,
  currentDocType = '거래명세서',
  customerName = '',
  itemCount = 0,
  totalAmount = 0,
  onConfirmConvert
}) {
  if (!isOpen) return null;

  const allDocTypes = [
    { type: '거래명세서', icon: '📦', label: '거래명세서', desc: '출고 및 작업 완료 내역을 증빙하는 거래명세서로 변환' },
    { type: '견적서', icon: '📑', label: '견적서', desc: '사전 작업 비용 및 부품 단가를 안내하는 견적서로 변환' },
    { type: '청구서', icon: '🧾', label: '청구서', desc: '공사/정비 대금 정산을 요청하는 청구서로 변환' }
  ];

  // 현재 작성 중인 타입을 제외한 나머지 2개
  const availableTargetTypes = allDocTypes.filter(d => d.type !== currentDocType);
  const [selectedTargetType, setSelectedTargetType] = useState(availableTargetTypes[0]?.type || '견적서');

  const handleExecute = () => {
    if (!selectedTargetType) return;
    onConfirmConvert(selectedTargetType);
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div className="modal-content" style={{ maxWidth: '480px', borderRadius: '12px', padding: '1.25rem' }}>
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.75rem' }}>
          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '900', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
              <span>🔄</span> 문서 양식 변환 발행
            </h3>
            <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px' }}>
              현재 작성 중인 문서를 다른 양식으로 복사하여 새로 발행합니다.
            </div>
          </div>
          <button
            type="button"
            style={{ border: 'none', background: 'none', fontSize: '1.25rem', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Current Document Summary Box */}
        <div style={{ padding: '0.75rem 1rem', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.6875rem', fontWeight: '800', color: '#64748B', marginBottom: '4px' }}>
            현재 작성 중인 원본 문서
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: '800', fontSize: '0.875rem', color: '#1E293B' }}>
              📄 {currentDocType} {customerName ? `(${customerName})` : ''}
            </span>
            <span style={{ fontSize: '0.8125rem', fontWeight: '700', color: '#2563EB' }}>
              {itemCount}개 품목 · ₩ {totalAmount.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Target Document Selection (2 Choices) */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '800', color: '#0F172A', marginBottom: '0.5rem' }}>
            어떤 문서로 변환하시겠습니까? (선택)
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {availableTargetTypes.map(target => {
              const isSelected = selectedTargetType === target.type;
              return (
                <div
                  key={target.type}
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    border: isSelected ? '2px solid #2563EB' : '1px solid #E2E8F0',
                    backgroundColor: isSelected ? '#EFF6FF' : '#FFFFFF',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.15s ease'
                  }}
                  onClick={() => setSelectedTargetType(target.type)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.25rem' }}>{target.icon}</span>
                    <div>
                      <div style={{ fontWeight: '800', fontSize: '0.875rem', color: isSelected ? '#1D4ED8' : '#1E293B' }}>
                        {target.label}로 변환
                      </div>
                      <div style={{ fontSize: '0.6875rem', color: isSelected ? '#3B82F6' : '#64748B', marginTop: '1px' }}>
                        {target.desc}
                      </div>
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="targetDocType"
                    checked={isSelected}
                    onChange={() => setSelectedTargetType(target.type)}
                    style={{ cursor: 'pointer' }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Notice Info Box */}
        <div style={{ padding: '0.625rem 0.75rem', backgroundColor: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: '6px', marginBottom: '1.25rem', fontSize: '0.75rem', color: '#92400E', lineHeight: '1.4' }}>
          <strong>💡 원본 보존 안내:</strong><br />
          현재 작성 중인 <strong>[{currentDocType}]</strong>는 먼저 안전하게 원본으로 자동 저장되며, 거래처 정보와 품목 리스트를 그대로 복사하여 <strong>새로운 [{selectedTargetType}]</strong> 번호로 생성 전환됩니다.
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-outline"
            onClick={onClose}
          >
            취소
          </button>
          <button
            type="button"
            className="btn btn-primary"
            style={{ fontWeight: '800', backgroundColor: '#2563EB', borderColor: '#2563EB' }}
            onClick={handleExecute}
          >
            {`💾 저장 후 [${selectedTargetType}]로 변환하기`}
          </button>
        </div>
      </div>
    </div>
  );
}
