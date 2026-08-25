import React, { useState, useEffect } from 'react';
import { registerBackHandler } from '../utils/navigationManager.js';

export default function ShareChoiceModal({
  isOpen,
  title = '문서 공유',
  supplier = {},
  onClose,
  onShareImage,
  onSharePDF
}) {
  const [includeBizCert, setIncludeBizCert] = useState(false);
  const [includeBankBook, setIncludeBankBook] = useState(false);

  const hasBizCert = !!(supplier.biz_cert_image || supplier.bizCertImage || supplier.bizCert);
  const hasBankBook = !!(supplier.bank_book_image || supplier.bankBookImage || supplier.bankBook);

  useEffect(() => {
    if (!isOpen) return;
    return registerBackHandler(() => {
      onClose();
      return true;
    }, 'ShareChoiceModal');
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getSelectedAttachments = () => {
    const attachments = [];
    if (includeBizCert && hasBizCert) {
      attachments.push({
        name: '사업자등록증',
        dataUrl: supplier.biz_cert_image || supplier.bizCertImage || supplier.bizCert
      });
    }
    if (includeBankBook && hasBankBook) {
      attachments.push({
        name: '통장사본',
        dataUrl: supplier.bank_book_image || supplier.bankBookImage || supplier.bankBook
      });
    }
    return attachments;
  };

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
          maxWidth: '420px',
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
          공유 및 출력 옵션
        </h3>
        <p
          style={{
            fontSize: '0.8125rem',
            color: '#64748B',
            marginBottom: '1.25rem',
            lineHeight: '1.4'
          }}
        >
          공유할 서류 및 파일 형식을 선택해 주세요.
        </p>

        {/* 첨부 서류 선택 섹션 (사업자등록증 / 통장사본) */}
        {(hasBizCert || hasBankBook) && (
          <div
            style={{
              padding: '0.875rem 1rem',
              backgroundColor: '#F8FAFC',
              border: '1.5px solid #E2E8F0',
              borderRadius: '14px',
              marginBottom: '1.25rem',
              textAlign: 'left'
            }}
          >
            <div style={{ fontSize: '0.8125rem', fontWeight: '800', color: '#1E293B', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
              📎 함께 보낼 공급자 서류 선택
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {hasBizCert && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.8125rem', color: '#334155' }}>
                  <input
                    type="checkbox"
                    checked={includeBizCert}
                    onChange={(e) => setIncludeBizCert(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: '#2563EB' }}
                  />
                  <span>📑 <b>사업자등록증 사본</b> 포함</span>
                </label>
              )}
              {hasBankBook && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.8125rem', color: '#334155' }}>
                  <input
                    type="checkbox"
                    checked={includeBankBook}
                    onChange={(e) => setIncludeBankBook(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: '#2563EB' }}
                  />
                  <span>🏦 <b>통장 사본</b> 포함</span>
                </label>
              )}
            </div>
            {(includeBizCert || includeBankBook) && (
              <div style={{ fontSize: '11px', color: '#2563EB', marginTop: '6px', fontWeight: '600' }}>
                💡 PDF 선택 시 명세서 뒤에 첨부 서류가 페이지로 자동 묶여 1개의 PDF로 전송됩니다.
              </div>
            )}
          </div>
        )}

        {/* Options List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* Option 1: PDF Document (Recommended for multi-page attachments) */}
          <button
            type="button"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '0.875rem 1rem',
              borderRadius: '14px',
              border: '2px solid #C7D2FE',
              backgroundColor: '#EEF2FF',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s ease'
            }}
            onClick={() => {
              onClose();
              if (onSharePDF) onSharePDF(getSelectedAttachments());
            }}
          >
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                backgroundColor: '#E0E7FF',
                color: '#4338CA',
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
              <div style={{ fontWeight: '900', fontSize: '0.9375rem', color: '#312E81', marginBottom: '2px' }}>
                PDF 전자 문서 파일
                {(includeBizCert || includeBankBook) && (
                  <span style={{ fontSize: '11px', color: '#4F46E5', fontWeight: '700', marginLeft: '6px' }}>
                    ({1 + getSelectedAttachments().length}장 묶음)
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#4338CA' }}>
                출력·보관용 정식 A4 PDF 문서
              </div>
            </div>
            <span style={{ fontSize: '1rem', color: '#6366F1' }}>➔</span>
          </button>

          {/* Option 2: Photo (PNG) */}
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
              if (onShareImage) onShareImage(getSelectedAttachments());
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
