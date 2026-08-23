// 🎨 TEAM D.D EXIT CONFIRMATION MODAL
import React, { useEffect } from 'react';
import { registerBackHandler, performExitApp } from '../utils/navigationManager.js';

export default function ExitConfirmModal({
  isOpen,
  onClose,
  onLogout,
  onExit = performExitApp
}) {
  // Register back button while modal is open (pressing back closes the modal)
  useEffect(() => {
    if (!isOpen) return;
    const unregister = registerBackHandler(() => {
      onClose();
      return true;
    }, 'ExitConfirmModal');
    return unregister;
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      style={{
        zIndex: 10000,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(6px)',
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
          maxWidth: '440px',
          width: '100%',
          textAlign: 'center',
          padding: '2rem 1.5rem',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          border: '1px solid var(--border-color, #e2e8f0)',
          backgroundColor: 'var(--bg-card, #ffffff)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* App Icon Badge */}
        <div
          style={{
            width: '68px',
            height: '68px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #02457A 0%, #001B48 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem',
            margin: '0 auto 1.25rem',
            boxShadow: '0 8px 16px rgba(2, 69, 122, 0.25)',
            border: '2px solid rgba(255, 255, 255, 0.2)'
          }}
        >
          🚜
        </div>

        {/* Title & Brand */}
        <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
          TEAM D.D 중장비 관리
        </div>
        <h3
          style={{
            fontSize: '1.25rem',
            fontWeight: '900',
            color: 'var(--text-main, #0f172a)',
            marginBottom: '0.625rem',
            letterSpacing: '-0.02em'
          }}
        >
          프로그램을 종료하시겠습니까?
        </h3>

        <p
          style={{
            fontSize: '0.875rem',
            color: 'var(--text-secondary, #64748b)',
            marginBottom: '1.75rem',
            lineHeight: '1.55'
          }}
        >
          작성 중인 명세서가 있다면 저장 후 종료해 주세요.<br />
          아래 버튼을 선택하여 안전하게 종료할 수 있습니다.
        </p>

        {/* Action Buttons Stack */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Primary Exit Button */}
          <button
            type="button"
            className="btn btn-primary"
            style={{
              width: '100%',
              minHeight: '48px',
              fontSize: '0.9375rem',
              fontWeight: '800',
              backgroundColor: '#dc2626',
              borderColor: '#dc2626',
              color: '#ffffff',
              borderRadius: '10px',
              boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
            onClick={() => {
              onClose();
              if (onExit) onExit();
            }}
          >
            <span>🚪</span>
            <span>앱 종료 (창 닫기)</span>
          </button>

          {/* Logout Button (if supported) */}
          {onLogout && (
            <button
              type="button"
              className="btn btn-outline"
              style={{
                width: '100%',
                minHeight: '42px',
                fontSize: '0.875rem',
                fontWeight: '700',
                borderColor: '#cbd5e1',
                color: '#475569',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
              onClick={() => {
                onClose();
                onLogout();
              }}
            >
              <span>🔒</span>
              <span>로그아웃 (시작 화면으로 이동)</span>
            </button>
          )}

          {/* Cancel / Keep Working Button */}
          <button
            type="button"
            className="btn btn-outline"
            style={{
              width: '100%',
              minHeight: '42px',
              fontSize: '0.875rem',
              fontWeight: '700',
              borderColor: '#0284c7',
              color: '#0284c7',
              backgroundColor: 'rgba(2, 132, 199, 0.06)',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
            onClick={onClose}
          >
            <span>↩️</span>
            <span>계속 사용하기 (취소)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
