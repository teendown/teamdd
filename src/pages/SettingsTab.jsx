// 🎨 TEAM D.D SETTINGS TAB (사업자 설정, 데이터 공개 범위 & 클라우드 연동)
import React, { useState } from 'react';
import { SQL_ALL, DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_KEY } from '../config/constants.js';

export default function SettingsTab({
  currentSupplier = {},
  selectedSupplierKey = 'sejin',
  suppliersList = [],
  onSaveSupplier,
  supabaseUrl,
  setSupabaseUrl,
  supabaseKey,
  setSupabaseKey,
  isConnected,
  isTesting,
  connectionMessage,
  onTestConnection
}) {
  const [copiedSQL, setCopiedSQL] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // 사업자 폼 정보
  const [form, setForm] = useState({
    id: currentSupplier.id || selectedSupplierKey,
    name: currentSupplier.name || currentSupplier.company || '',
    person: currentSupplier.person || currentSupplier.owner || '',
    bizno: currentSupplier.bizno || '',
    phone: currentSupplier.phone || currentSupplier.tel || '',
    fax: currentSupplier.fax || '',
    addr: currentSupplier.addr || '',
    email: currentSupplier.email || '',
    bank: currentSupplier.bank || '',
    defaultShared: false
  });

  const handleCopySQL = () => {
    navigator.clipboard.writeText(SQL_ALL).then(() => {
      setCopiedSQL(true);
      setTimeout(() => setCopiedSQL(false), 2500);
    });
  };

  const handleSaveSupplierProfile = (e) => {
    e.preventDefault();
    if (onSaveSupplier) {
      onSaveSupplier({
        ...currentSupplier,
        ...form,
        company: form.name,
        owner: form.person,
        tel: form.phone
      });
    }
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleResetToDefaults = () => {
    setSupabaseUrl(DEFAULT_SUPABASE_URL);
    setSupabaseKey(DEFAULT_SUPABASE_KEY);
    localStorage.setItem('supabase_url', DEFAULT_SUPABASE_URL);
    localStorage.setItem('supabase_anon_key', DEFAULT_SUPABASE_KEY);
    setTimeout(() => {
      if (onTestConnection) onTestConnection(DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_KEY);
    }, 50);
  };

  return (
    <div className="management-container">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '900px', margin: '0 auto' }}>
        
        {/* 1. 사업자 프로필 설정 */}
        <div className="card-box">
          <div className="card-box-header">
            <div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: '900' }}>🏢 내 사업자(공급자) 정보 관리</h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                거래명세서, 견적서, 청구서 상단에 인쇄되는 사업자 공급자 정보입니다.
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveSupplierProfile} style={{ padding: '1.25rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">상호(사업자명) *</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">대표자 성명 *</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.person}
                  onChange={(e) => setForm({ ...form, person: e.target.value })}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">사업자등록번호</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="000-00-00000"
                  value={form.bizno}
                  onChange={(e) => setForm({ ...form, bizno: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">대표 전화번호</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="010-0000-0000"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">사업장 주소</label>
              <input
                type="text"
                className="form-input"
                value={form.addr}
                onChange={(e) => setForm({ ...form, addr: e.target.value })}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">이메일</label>
                <input
                  type="email"
                  className="form-input"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">입금 계좌번호 (은행 / 예금주)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="예: 기업은행 123-456-789012 (예금주: 홍길동)"
                  value={form.bank}
                  onChange={(e) => setForm({ ...form, bank: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
              {saveSuccess && (
                <span style={{ color: 'var(--accent-green)', fontWeight: '700', fontSize: '0.8125rem', display: 'flex', alignItems: 'center' }}>
                  ✓ 사업자 정보가 성공적으로 저장되었습니다!
                </span>
              )}
              <button type="submit" className="btn btn-primary">
                사업자 정보 저장
              </button>
            </div>
          </form>
        </div>

        {/* 2. 데이터 보안 및 공개 범위 설정 */}
        <div className="card-box">
          <div className="card-box-header">
            <h2 style={{ fontSize: '1.125rem', fontWeight: '900' }}>🔒 데이터 보안 및 공개 범위 설정</h2>
          </div>
          <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ padding: '0.875rem 1rem', backgroundColor: 'var(--bg-muted)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: '800', fontSize: '0.875rem' }}>고객 거래명세서 / 회계 / 미수금 데이터</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>사업자별 완전 비공개 격리 원칙 (타 사업자 열람 절대 불가)</div>
              </div>
              <span className="priority-pill urgent" style={{ fontSize: '0.75rem', padding: '4px 8px' }}>
                🔒 강제 비공개 (안전)
              </span>
            </div>

            <div style={{ padding: '0.875rem 1rem', backgroundColor: 'var(--bg-muted)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: '800', fontSize: '0.875rem' }}>정비 및 예약 일정 공개 여부</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>개별 일정 생성 시 [공유 일정] 체크박스로 선택적 공개 가능</div>
              </div>
              <span style={{ fontSize: '0.75rem', backgroundColor: 'var(--accent-blue-bg)', color: 'var(--accent-blue)', padding: '4px 8px', borderRadius: '4px', fontWeight: '800' }}>
                🌐 선택적 공개 지원
              </span>
            </div>
          </div>
        </div>

        {/* 3. 클라우드 데이터베이스 (Supabase) 연동 설정 */}
        <div className="card-box">
          <div className="card-box-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: '900' }}>☁️ 클라우드 DB (Supabase) 연동</h2>
              <span className={`status-badge ${isConnected ? 'connected' : 'disconnected'}`}>
                {isConnected ? '🟢 클라우드 동기화 완료' : '🔴 로컬 모드 (오프라인)'}
              </span>
            </div>
            <button
              type="button"
              className="btn btn-outline"
              style={{ fontSize: '0.75rem' }}
              onClick={handleResetToDefaults}
            >
              기본 서버 주소로 복원
            </button>
          </div>

          <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            <div className="form-group">
              <label className="form-label">Supabase Project URL</label>
              <input
                type="text"
                className="form-input"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                placeholder="https://your-project.supabase.co"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Supabase Anon Key</label>
              <input
                type="password"
                className="form-input"
                value={supabaseKey}
                onChange={(e) => setSupabaseKey(e.target.value)}
                placeholder="sb_publishable_..."
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => onTestConnection && onTestConnection(supabaseUrl, supabaseKey)}
                disabled={isTesting}
              >
                {isTesting ? '연결 테스트 중...' : '⚡ 연결 테스트 및 즉시 동기화'}
              </button>

              <button
                type="button"
                className="btn btn-outline"
                onClick={handleCopySQL}
              >
                {copiedSQL ? '✓ SQL 클립보드 복사 완료!' : '📋 Supabase 테이블 생성 SQL 복사'}
              </button>
            </div>

            {connectionMessage && (
              <div style={{ fontSize: '0.8125rem', color: isConnected ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: '700', marginTop: '0.25rem' }}>
                {connectionMessage}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
