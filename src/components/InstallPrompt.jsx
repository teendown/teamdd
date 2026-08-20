// 🎨 TEAM D.D PWA INSTALL PROMPT COMPONENT
import React, { useState, useEffect, useRef } from 'react';

export default function InstallPrompt() {
  const installEvent = useRef(null);
  const [showState, setShowState] = useState('idle'); // 'idle' | 'android' | 'ios' | 'installed'
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
  const isInStandaloneMode = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;

  useEffect(() => {
    if (isInStandaloneMode) {
      setShowState('installed');
      return;
    }
    function handler(e) {
      e.preventDefault();
      installEvent.current = e;
      setShowState('android');
    }
    window.addEventListener('beforeinstallprompt', handler);
    if (isIOS) setShowState('ios');
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [isInStandaloneMode, isIOS]);

  if (showState === 'installed') {
    return (
      <div style={{ marginTop: '1.25rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
        ✅ 홈 화면에 설치됨
      </div>
    );
  }

  if (showState === 'android') {
    return (
      <button
        type="button"
        className="splash-install-btn"
        onClick={() => {
          if (installEvent.current) {
            installEvent.current.prompt();
            installEvent.current.userChoice.then((r) => {
              if (r.outcome === 'accepted') setShowState('installed');
              installEvent.current = null;
            });
          }
        }}
      >
        📱 홈 화면에 추가
      </button>
    );
  }

  if (showState === 'ios') {
    return (
      <div className="splash-install-ios-guide">
        <div style={{ fontSize: '1.25rem', marginBottom: '0.375rem' }}>📱</div>
        <div>
          홈 화면에 추가하려면: <b>공유 버튼 (네모화살표)</b> 탭 후 <b>"홈 화면에 추가"</b> 선택
        </div>
      </div>
    );
  }

  return null;
}
