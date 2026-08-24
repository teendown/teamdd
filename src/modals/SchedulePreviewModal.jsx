import React, { useEffect } from 'react';
import { registerBackHandler } from '../utils/navigationManager.js';
import { areSupplierKeysEquivalent } from '../utils/validation.js';

export default function SchedulePreviewModal({
  schedule,
  onClose,
  onEdit,
  onDelete,
  onNavigateToDoc,
  suppliersList = []
}) {
  useEffect(() => {
    if (!schedule) return;
    return registerBackHandler(() => {
      onClose();
      return true;
    }, 'SchedulePreviewModal');
  }, [schedule, onClose]);

  if (!schedule) return null;

  const isPrivate = schedule.is_shared === false;
  const isPeriod = schedule.isPeriod || (schedule.end_date && schedule.end_date > (schedule.event_date || schedule.start_date));
  const startDate = schedule.event_date || schedule.start_date || schedule.date || '-';
  const endDate = schedule.end_date || startDate;
  const timeStr = schedule.event_time || schedule.schedule_time || '';
  const customerName = schedule.customer_name || '-';
  const customerPhone = schedule.customer_phone || schedule.phone || '';
  const machine = schedule.machine_info || schedule.machine || '';
  const amount = Number(schedule.amount) || 0;
  const memo = schedule.memo || '';
  const category = schedule.category || 'repair';

  const categoryLabels = {
    repair: { label: '🚜 정비 / 수리 / 출장', bg: '#EFF8FF', color: '#175CD3', border: '#B2DDFF' },
    payment: { label: '💳 수금 / 결제 예정', bg: '#FEF3F2', color: '#D92D20', border: '#FECDCA' },
    estimate: { label: '📋 견적 제출 / 상담', bg: '#F9F5FF', color: '#6941C6', border: '#E9D7FE' },
    field: { label: '🚗 현장 출장 정비', bg: '#ECFDF3', color: '#027A48', border: '#A6F4C5' },
    inspection: { label: '🔍 점검 및 진단', bg: '#FFF6ED', color: '#C4320A', border: '#FECDCA' },
    general: { label: '📌 일반 업무 / 기타', bg: '#F8F9FC', color: '#344054', border: '#D0D5DD' }
  };

  const catMeta = categoryLabels[category] || categoryLabels.general;

  const supplierObj = suppliersList.find(s => areSupplierKeysEquivalent(s.id, schedule.supplier_key));
  const supplierName = supplierObj ? (supplierObj.name || supplierObj.company) : (schedule.supplier_key === 'sejin' ? '세진건설기계' : (schedule.supplier_key === 'ds_gimje' ? '디에스건설기계' : ''));

  const handleCopyPhone = () => {
    if (!customerPhone) return;
    navigator.clipboard.writeText(customerPhone);
    alert(`연락처 (${customerPhone})가 클립보드에 복사되었습니다.`);
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 10050 }} onClick={onClose}>
      <div
        className="modal-content"
        style={{
          maxWidth: '520px',
          padding: '0',
          borderRadius: '16px',
          overflow: 'hidden',
          backgroundColor: '#FFFFFF',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div
          style={{
            backgroundColor: 'var(--c-navy-dark, #001B48)',
            color: '#FFFFFF',
            padding: '1rem 1.25rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <span style={{ fontSize: '1.25rem' }}>📅</span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span
                  style={{
                    backgroundColor: catMeta.bg,
                    color: catMeta.color,
                    border: `1px solid ${catMeta.border}`,
                    fontSize: '11px',
                    fontWeight: '800',
                    padding: '2px 8px',
                    borderRadius: '6px'
                  }}
                >
                  {catMeta.label}
                </span>
                <span
                  style={{
                    backgroundColor: isPrivate ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                    color: isPrivate ? '#FEF08A' : '#A7F3D0',
                    border: `1px solid ${isPrivate ? '#F59E0B' : '#10B981'}`,
                    fontSize: '10px',
                    fontWeight: '800',
                    padding: '2px 6px',
                    borderRadius: '4px'
                  }}
                >
                  {isPrivate ? '🔒 비공개' : '🔓 공개'}
                </span>
              </div>
              <h3
                style={{
                  fontSize: '1.125rem',
                  fontWeight: '900',
                  color: '#FFFFFF',
                  margin: '4px 0 0 0',
                  lineHeight: '1.3'
                }}
              >
                {schedule.title || '일정 상세 정보'}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              borderRadius: '50%',
              color: '#FFFFFF',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1rem',
              cursor: 'pointer',
              fontWeight: 'bold',
              flexShrink: 0,
              marginLeft: '8px'
            }}
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {/* 1. 일시 및 기간 */}
          <div
            style={{
              padding: '0.875rem 1rem',
              backgroundColor: 'var(--c-blue-lightest, #F0F8FF)',
              borderRadius: '10px',
              border: '1px solid var(--c-blue-soft, #BEE3F8)'
            }}
          >
            <div style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--c-navy-primary, #02457A)', marginBottom: '4px' }}>
              📅 일정 일시
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
              <span style={{ fontSize: '1rem', fontWeight: '900', color: 'var(--c-navy-dark, #001B48)' }}>
                {isPeriod ? `${startDate} ~ ${endDate}` : startDate}
              </span>
              {timeStr && (
                <span
                  style={{
                    fontSize: '0.8125rem',
                    fontWeight: '800',
                    color: '#1E40AF',
                    backgroundColor: '#DBEAFE',
                    padding: '2px 8px',
                    borderRadius: '6px'
                  }}
                >
                  ⏰ {timeStr}
                </span>
              )}
            </div>
            {isPeriod && (
              <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '4px' }}>
                💡 {startDate}부터 {endDate}까지 연속 표시되는 다일간 일정입니다.
              </div>
            )}
          </div>

          {/* 2. 거래처 및 장비 정보 그리드 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
            {/* 거래처 정보 */}
            <div
              style={{
                padding: '0.875rem 1rem',
                backgroundColor: '#FFFFFF',
                borderRadius: '10px',
                border: '1px solid var(--border-color, #E2E8F0)',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
              }}
            >
              <div style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted, #64748B)', marginBottom: '4px' }}>
                🏢 거래처명 (고객)
              </div>
              <div style={{ fontSize: '0.9375rem', fontWeight: '900', color: 'var(--c-navy-dark, #001B48)', marginBottom: '6px' }}>
                {customerName}
              </div>
              {customerPhone ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                  <a
                    href={`tel:${customerPhone}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.75rem',
                      fontWeight: '800',
                      color: '#059669',
                      backgroundColor: '#ECFDF5',
                      border: '1px solid #A7F3D0',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      textDecoration: 'none'
                    }}
                  >
                    📞 {customerPhone}
                  </a>
                  <button
                    type="button"
                    onClick={handleCopyPhone}
                    style={{
                      fontSize: '0.6875rem',
                      fontWeight: '700',
                      padding: '3px 6px',
                      backgroundColor: '#F1F5F9',
                      border: '1px solid #CBD5E1',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                    title="전화번호 복사"
                  >
                    복사
                  </button>
                </div>
              ) : (
                <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>연락처 없음</div>
              )}
            </div>

            {/* 장비/기종 정보 */}
            <div
              style={{
                padding: '0.875rem 1rem',
                backgroundColor: '#FFFFFF',
                borderRadius: '10px',
                border: '1px solid var(--border-color, #E2E8F0)',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
              }}
            >
              <div style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted, #64748B)', marginBottom: '4px' }}>
                🚜 장비 / 기종
              </div>
              <div style={{ fontSize: '0.9375rem', fontWeight: '900', color: machine ? '#2563EB' : '#94A3B8', marginBottom: '6px' }}>
                {machine || '기종 미지정'}
              </div>
              {amount > 0 && (
                <div style={{ fontSize: '0.8125rem', fontWeight: '800', color: '#059669' }}>
                  💰 {amount.toLocaleString()}원
                </div>
              )}
            </div>
          </div>

          {/* 3. 메모 및 작업 상세 내용 */}
          <div
            style={{
              padding: '0.875rem 1rem',
              backgroundColor: '#FAFAFA',
              borderRadius: '10px',
              border: '1px solid var(--border-color, #E2E8F0)'
            }}
          >
            <div style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted, #64748B)', marginBottom: '6px' }}>
              📝 상세 메모 / 작업 내용
            </div>
            <div
              style={{
                fontSize: '0.8125rem',
                lineHeight: '1.6',
                color: memo ? '#1E293B' : '#94A3B8',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                minHeight: '40px'
              }}
            >
              {memo || '등록된 상세 메모가 없습니다.'}
            </div>
          </div>

          {/* 4. 공유 및 등록 공급자 정보 안내 */}
          <div
            style={{
              fontSize: '0.6875rem',
              color: '#64748B',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0 4px'
            }}
          >
            <span>{supplierName ? `🏢 등록업체: ${supplierName}` : ''}</span>
            <span>{isPrivate ? '🔒 오직 내 업체에만 표시됨' : '🔓 모든 공급자에게 공유됨'}</span>
          </div>
        </div>

        {/* Footer Action Buttons */}
        <div
          style={{
            padding: '0.875rem 1.25rem',
            backgroundColor: '#F8FAFC',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap'
          }}
        >
          {onDelete ? (
            <button
              type="button"
              className="btn btn-outline"
              style={{ color: '#DC2626', borderColor: '#FECACA', fontSize: '0.8125rem' }}
              onClick={() => {
                onDelete(schedule.id);
                onClose();
              }}
            >
              🗑️ 삭제
            </button>
          ) : (
            <div />
          )}

          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {onNavigateToDoc && (
              <button
                type="button"
                className="btn btn-outline"
                style={{
                  fontSize: '0.8125rem',
                  fontWeight: '800',
                  color: '#1D4ED8',
                  borderColor: '#BFDBFE',
                  backgroundColor: '#EFF6FF'
                }}
                onClick={() => {
                  onNavigateToDoc(schedule);
                  onClose();
                }}
                title="이 일정을 기반으로 거래명세서/견적서 작성"
              >
                📄 명세서 작성
              </button>
            )}
            {onEdit && (
              <button
                type="button"
                className="btn btn-primary"
                style={{ fontSize: '0.8125rem', fontWeight: '800' }}
                onClick={() => {
                  onEdit(schedule);
                  onClose();
                }}
              >
                ✏️ 일정 수정
              </button>
            )}
            <button
              type="button"
              className="btn btn-outline"
              style={{ fontSize: '0.8125rem' }}
              onClick={onClose}
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
