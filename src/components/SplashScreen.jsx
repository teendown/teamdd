// 🎨 TEAM D.D SPLASH & LOGIN SCREEN COMPONENT
import React, { useState } from 'react';
import InstallPrompt from './InstallPrompt.jsx';

export default function SplashScreen({
  suppliersList = [],
  onSelect,
  onSelectAdmin
}) {
  const avatarColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e) => {
    if (e) e.preventDefault();
    if (isAdminMode) {
      const savedAdminPwd = localStorage.getItem('dd_pwd_admin') || '0000';
      if (password === savedAdminPwd) {
        setError('');
        setPassword('');
        onSelectAdmin();
      } else {
        setError('비밀번호가 일치하지 않습니다.');
      }
    } else if (selectedSupplier) {
      const savedPwd = selectedSupplier.pwd || localStorage.getItem('dd_pwd_' + selectedSupplier.id) || '0000';
      if (password === savedPwd) {
        setError('');
        setPassword('');
        onSelect(selectedSupplier.id);
      } else {
        setError('비밀번호가 일치하지 않습니다.');
      }
    }
  };

  const handleCancel = () => {
    setSelectedSupplier(null);
    setIsAdminMode(false);
    setPassword('');
    setError('');
  };

  if (selectedSupplier || isAdminMode) {
    const title = isAdminMode ? '관리자 시스템 로그인' : (selectedSupplier.name || selectedSupplier.company) + ' 로그인';
    const subtitle = isAdminMode ? '관리자 권한으로 전체 데이터를 제어합니다.' : '공급자 비밀번호를 입력해주세요.';
    return (
      <div className="splash-screen">
        <div className="splash-logo-wrap">
          <div className="splash-icon">
            <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <path d="M8 21h8M12 17v4" />
            </svg>
          </div>
          <div className="splash-title">
            TEAM <span>D.D</span>
          </div>
          <div className="splash-subtitle">Construction Machine Management</div>
        </div>

        <form className="login-form-container" onSubmit={handleLogin}>
          <div className="login-form-title">{title}</div>
          <div className="login-form-subtitle">{subtitle}</div>
          <input
            type="password"
            className="login-input"
            maxLength={12}
            placeholder="••••"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(''); }}
            autoFocus
          />
          {error && <div className="login-error">{error}</div>}
          <div className="login-buttons">
            <button type="button" className="login-btn login-btn-secondary" onClick={handleCancel}>
              뒤로가기
            </button>
            <button type="submit" className="login-btn login-btn-primary">
              로그인
            </button>
          </div>
        </form>

        <div className="splash-footer">TEAM D.D · 비밀번호 분실 시 관리자에게 문의바람</div>
      </div>
    );
  }

  return (
    <div className="splash-screen">
      <div className="splash-logo-wrap">
        <div className="splash-icon">
          <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <path d="M8 21h8M12 17v4" />
          </svg>
        </div>
        <div className="splash-title">
          TEAM <span>D.D</span>
        </div>
        <div className="splash-subtitle">Construction Machine Management</div>
      </div>

      <div className="splash-label">공급자를 선택하세요</div>
      <div className="splash-cards">
        {suppliersList.map((s, idx) => (
          <div
            key={s.id}
            className="splash-card"
            onClick={() => setSelectedSupplier(s)}
          >
            <div
              className="splash-card-avatar"
              style={{
                background: avatarColors[idx % avatarColors.length] + '33',
                border: '1.5px solid ' + avatarColors[idx % avatarColors.length] + '66'
              }}
            >
              <span style={{ fontSize: '1.25rem' }}>🏢</span>
            </div>
            <div className="splash-card-info">
              <div className="splash-card-name">{s.name || s.company}</div>
              <div className="splash-card-sub">{s.bizno || s.phone || ''}</div>
            </div>
            <div className="splash-card-arrow">›</div>
          </div>
        ))}
      </div>

      <button
        type="button"
        className="admin-login-trigger"
        onClick={() => setIsAdminMode(true)}
      >
        관리자 로그인 (Admin)
      </button>
      <div className="splash-footer">TEAM D.D · 대한민국 건설기계 정비 1등</div>
      <InstallPrompt />
    </div>
  );
}
