// 🎨 TEAM D.D DESKTOP SHORTCUT MODAL
import React, { useState, useEffect } from 'react';

export function downloadDesktopShortcut() {
  const currentUrl = window.location.origin + window.location.pathname;
  const shortcutContent = `[InternetShortcut]\r\nURL=${currentUrl}\r\nIconIndex=0\r\nIconFile=${currentUrl}favicon.ico\r\n`;
  const blob = new Blob([shortcutContent], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'TEAM_DD_관리프로그램.url';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function DesktopShortcutModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const [installPrompt, setInstallPrompt] = useState(null);
  const [downloaded, setDownloaded] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleDownload = () => {
    downloadDesktopShortcut();
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 4000);
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1060 }}>
      <div className="modal-content" style={{ maxWidth: '580px', width: '95%', padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '2px solid #2563eb', paddingBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.5rem' }}>🖥️</span>
            <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: '900', color: '#1e293b' }}>
              PC 바탕화면에 아이콘 만들기
            </h3>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#94a3b8' }}>
            ✕
          </button>
        </div>

        {/* 추천 1 */}
        <div
          style={{
            backgroundColor: '#eff6ff',
            border: '1.5px solid #93c5fd',
            borderRadius: '12px',
            padding: '1.25rem',
            marginBottom: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ backgroundColor: '#2563eb', color: '#fff', fontSize: '11px', fontWeight: '800', padding: '2px 8px', borderRadius: '9999px' }}>
              추천 1
            </span>
            <strong style={{ fontSize: '0.9375rem', color: '#1e3a8a' }}>바탕화면 바로가기 파일 즉시 다운로드</strong>
          </div>
          <p style={{ margin: 0, fontSize: '0.8125rem', color: '#475569', lineHeight: '1.5' }}>
            아래 버튼을 누르면 바로가기 파일이 다운로드됩니다. 다운로드된 <strong style={{ color: '#2563eb' }}>'TEAM_DD_관리프로그램.url'</strong> 파일을 바탕화면으로 드래그하시면 언제든 더블클릭으로 즉시 실행됩니다!
          </p>
          <button
            type="button"
            className="btn btn-primary"
            style={{
              padding: '10px 16px',
              fontSize: '0.875rem',
              fontWeight: '900',
              backgroundColor: '#1d4ed8',
              borderColor: '#1d4ed8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 2px 4px rgba(29, 78, 216, 0.25)'
            }}
            onClick={handleDownload}
          >
            {downloaded ? "✓ 다운로드 완료! (바탕화면으로 드래그하세요)" : "📥 바탕화면 바로가기 파일 다운로드 (.url)"}
          </button>
        </div>

        {/* 방법 2 */}
        <div
          style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '1.25rem',
            marginBottom: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ backgroundColor: '#64748b', color: '#fff', fontSize: '11px', fontWeight: '800', padding: '2px 8px', borderRadius: '9999px' }}>
              방법 2
            </span>
            <strong style={{ fontSize: '0.9375rem', color: '#334155' }}>
              브라우저 메뉴에서 바로가기 만들기 (Chrome / Edge / Whale)
            </strong>
          </div>
          <div style={{ fontSize: '0.8125rem', color: '#475569', lineHeight: '1.6' }}>
            <div style={{ marginBottom: '4px' }}>1. 브라우저 우측 상단의 점 3개 메뉴(⋮) 클릭</div>
            <div style={{ marginBottom: '4px' }}>
              2. <strong>[저장 및 공유]</strong> 또는 <strong>[도구 더보기]</strong> ➡️ <strong style={{ color: '#2563eb' }}>[바로가기 만들기...]</strong> 클릭
            </div>
            <div>
              3. <strong>'창으로 열기'</strong>에 체크한 후 [만들기]를 누르면 전용 프로그램처럼 바탕화면에 설치됩니다!
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem' }}>
          <button type="button" className="btn btn-outline" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
