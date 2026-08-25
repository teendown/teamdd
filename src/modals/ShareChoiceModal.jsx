import React, { useEffect } from 'react';
import { registerBackHandler } from '../utils/navigationManager.js';

export default function ShareChoiceModal({
  isOpen,
  title = '문서 공유',
  onClose,
  onShareImage,
  onSharePDF
}) {
  useEffect(() => {
    if (!isOpen) return;
    return registerBackHandler(() => {
      onClose();
      return true;
    }, 'ShareChoiceModal');
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      style={{
        zIndex: 10060,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(5px)',
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
          maxWidth: '400px',
          width: '100%',
          padding: '1.5rem',
          borderRadius: '20px',
          backgroundColor: '#FFFFFF',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          textAlign: 'center'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Icon & Title */}
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            backgroundColor: '#EFF6FF',
            color: '#2563EB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.75rem',
            margin: '0 auto 0.875rem auto'
          }}
        >
          📱
        </div>

        <h3
          style={{
            fontSize: '1.125rem',
            fontWeight: '900',
            color: '#1E293B',
            marginBottom: '0.375rem',
            letterSpacing: '-0.02em'
          }}
        >
          공유 형식 선택
        </h3>
        <p
          style={{
            fontSize: '0.8125rem',
            color: '#64748B',
            marginBottom: '1.5rem',
            lineHeight: '1.4'
          }}
        >
          어떤 형식으로 공유하시겠습니까?
        </p>

        {/* Options List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* Option 1: Photo (PNG) */}
          <button
            type="button"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '0.875rem 1rem',
              borderRadius: '14px',
              border: '2px solid #BFDBFE',
              backgroundColor: '#F8FAFC',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s ease'
            }}
            onClick={() => {
              onClose();
              if (onShareImage) onShareImage();
            }}
          >
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                backgroundColor: '#DBEAFE',
                color: '#1D4ED8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.25rem',
                flexShrink: 0
              }}
            >
              📸
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: '800', fontSize: '0.9375rem', color: '#1E293B', marginBottom: '2px' }}>
                사진 (이미지 / PNG)
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                카톡 채팅방·문자에 바로 보이게 전송
              </div>
            </div>
            <span style={{ fontSize: '1rem', color: '#94A3B8' }}>➔</span>
          </button>

          {/* Option 2: PDF Document */}
          <button
            type="button"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '0.875rem 1rem',
              borderRadius: '14px',
              border: '2px solid #E2E8F0',
              backgroundColor: '#F8FAFC',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s ease'
            }}
            onClick={() => {
              onClose();
              if (onSharePDF) onSharePDF();
            }}
          >
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                backgroundColor: '#F3E8FF',
                color: '#7E22CE',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.25rem',
                flexShrink: 0
              }}
            >
              📄
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: '800', fontSize: '0.9375rem', color: '#1E293B', marginBottom: '2px' }}>
                PDF 전자 문서 파일
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                출력 및 보관용 정식 A4 PDF 파일
              </div>
            </div>
            <span style={{ fontSize: '1rem', color: '#94A3B8' }}>➔</span>
          </button>
        </div>

        {/* Cancel Button */}
        <button
          type="button"
          className="btn btn-outline"
          style={{
            width: '100%',
            marginTop: '1.25rem',
            minHeight: '40px',
            fontSize: '0.875rem',
            fontWeight: '700',
            borderRadius: '12px'
          }}
          onClick={onClose}
        >
          닫기 (취소)
        </button>
      </div>
    </div>
  );
}
