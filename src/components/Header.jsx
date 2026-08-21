import React, { useState } from 'react';
import { SQL_ALL, DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_KEY } from '../config/constants.js';
import { areSupplierKeysEquivalent } from '../utils/validation.js';

export default function Header({
  activeTab,
  setActiveTab,
  isConnected,
  isTesting,
  connectionMessage,
  supabaseUrl,
  setSupabaseUrl,
  supabaseKey,
  setSupabaseKey,
  onTestConnection,
  docType,
  setDocType,
  userRole,
  onLogout,
  currentSupplier,
  selectedSupplierKey,
  suppliersList = []
}) {
  const [showConfig, setShowConfig] = useState(false);
  const [copiedSQL, setCopiedSQL] = useState(false);

  const handleResetToDefaults = () => {
    setSupabaseUrl(DEFAULT_SUPABASE_URL);
    setSupabaseKey(DEFAULT_SUPABASE_KEY);
    localStorage.setItem('supabase_url', DEFAULT_SUPABASE_URL);
    localStorage.setItem('supabase_anon_key', DEFAULT_SUPABASE_KEY);
    setTimeout(() => {
      onTestConnection();
    }, 50);
  };

  const supplierDisplayName = currentSupplier?.company || currentSupplier?.name || 
    (suppliersList.find(s => areSupplierKeysEquivalent(s.id, selectedSupplierKey))?.name) || 
    (selectedSupplierKey === 'sejin' ? '세진중기' : (selectedSupplierKey === 'ds' ? '디에스건설기계' : '대성건설기계'));

  const copySQL = () => {
    navigator.clipboard.writeText(SQL_ALL).then(() => {
      setCopiedSQL(true);
      setTimeout(() => setCopiedSQL(false), 2500);
    });
  };

  return (
    <header className="top-header">
      <div className="header-card">
        <div>
          <h1 className="brand-title">TEAM D.D</h1>
          <span className="brand-sub">대한민국 건설기계 정비 1등</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* 🏢 로그인 계정 뱃지 */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'var(--c-blue-lightest)',
              border: '1.5px solid var(--c-blue-soft)',
              padding: '3px 10px',
              borderRadius: '20px',
              fontSize: '0.8125rem',
              fontWeight: '800',
              color: 'var(--c-navy-dark)'
            }}
            title={userRole === 'admin' ? '관리자 모드' : `공급자 계정: ${supplierDisplayName}`}
          >
            <span>{userRole === 'admin' ? '👑' : '🏢'}</span>
            <span style={{ color: 'var(--c-navy-primary)' }}>
              {userRole === 'admin' ? '관리자' : supplierDisplayName}
            </span>
          </div>

          {/* 🚪 로그아웃 버튼 */}
          <button
            type="button"
            onClick={onLogout}
            className="btn btn-outline btn-sm"
            style={{
              height: '30px',
              fontSize: '0.75rem',
              fontWeight: '700',
              color: '#D92D20',
              borderColor: '#FECDCA',
              backgroundColor: '#FEF3F2',
              cursor: 'pointer'
            }}
          >
            로그아웃
          </button>
        </div>

        {/* 🟢 DB 연결 상태 배지 */}
        <button
          type="button"
          onClick={() => setShowConfig(prev => !prev)}
          className={`status-badge ${isConnected ? 'connected' : 'disconnected'}`}
        >
          <span>{isConnected ? '🟢 DB 연결됨' : '🔴 로컬저장 모드'}</span>
          <span style={{ fontSize: '10px' }}>{showConfig ? '▲' : '▼'}</span>
        </button>
      </div>

      {showConfig && (
        <div
          style={{
            marginTop: '0.75rem',
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '1rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '0.75rem',
              marginBottom: '0.75rem'
            }}
          >
            <div>
              <label className="form-label">Supabase Project URL</label>
              <input
                type="text"
                className="form-input"
                placeholder="https://xxxxxxxxxxx.supabase.co"
                value={supabaseUrl}
                onChange={e => setSupabaseUrl(e.target.value)}
              />
            </div>
            <div>
              <label className="form-label">Supabase Anon Key</label>
              <input
                type="password"
                className="form-input"
                placeholder="eyJhbGciOi..."
                value={supabaseKey}
                onChange={e => setSupabaseKey(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px' }}>
              <button
                type="button"
                className="btn btn-green"
                style={{ flex: 1, height: '38px', fontSize: '0.8125rem' }}
                onClick={onTestConnection}
                disabled={isTesting}
              >
                {isTesting ? '테스트 중...' : '🔗 연결 테스트'}
              </button>
              <button
                type="button"
                className="btn btn-outline"
                style={{ height: '38px', fontSize: '0.75rem', padding: '0 10px', whiteSpace: 'nowrap' }}
                title="기본 프로젝트 설정값으로 즉시 복원"
                onClick={handleResetToDefaults}
                disabled={isTesting}
              >
                🔄 기본값 복원
              </button>
            </div>
          </div>

          {connectionMessage && (
            <div
              style={{
                fontSize: '0.75rem',
                padding: '0.625rem 0.875rem',
                borderRadius: '8px',
                backgroundColor: isConnected ? '#ecfdf5' : '#fef9c3',
                color: isConnected ? '#065f46' : '#854d0e',
                border: `1px solid ${isConnected ? '#a7f3d0' : '#fde68a'}`,
                marginBottom: '0.75rem'
              }}
            >
              {connectionMessage}
            </div>
          )}

          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '0.75rem'
            }}
          >
            <div
              style={{
                fontSize: '0.75rem',
                fontWeight: '700',
                marginBottom: '0.5rem',
                color: '#374151'
              }}
            >
              📋 Supabase DB 테이블 생성 SQL
            </div>
            <button
              className="btn btn-green"
              style={{ fontSize: '0.75rem', padding: '0.375rem 1rem', fontWeight: '700' }}
              onClick={copySQL}
            >
              {copiedSQL ? '✓ SQL 복사됨! SQL Editor에 붙여넣기 후 Run 클릭' : '⚡ 전체 테이블 SQL 한번에 복사 (권장)'}
            </button>
            <div style={{ fontSize: '0.6875rem', color: '#6b7280', marginTop: '0.5rem' }}>
              💡 Supabase 대시보드 → <strong>SQL Editor</strong> → New query → 붙여넣기 → <strong>Run</strong> 클릭
            </div>
          </div>
        </div>
      )}

      {/* 탭 네비게이션 */}
      <div className="tab-bar-container">
        <div className="tab-nav">
          <button
            className={`tab-btn ${activeTab === 'doc' && docType === '거래명세서' ? 'active' : ''}`}
            onClick={() => { setActiveTab('doc'); setDocType('거래명세서'); }}
          >
            📄 거래명세서
          </button>
          <button
            className={`tab-btn ${activeTab === 'doc' && docType === '견적서' ? 'active' : ''}`}
            onClick={() => { setActiveTab('doc'); setDocType('견적서'); }}
          >
            📄 견적서
          </button>
          <button
            className={`tab-btn ${activeTab === 'doc' && docType === '청구서' ? 'active' : ''}`}
            onClick={() => { setActiveTab('doc'); setDocType('청구서'); }}
          >
            📄 청구서
          </button>
          <button
            className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            📁 문서조회
          </button>
          <button
            className={`tab-btn ${activeTab === 'accounting' ? 'active' : ''}`}
            onClick={() => setActiveTab('accounting')}
          >
            💡 거래처별 회계
          </button>
          <button
            className={`tab-btn ${activeTab === 'schedule' ? 'active' : ''}`}
            onClick={() => setActiveTab('schedule')}
          >
            📅 일정관리
          </button>
          <button
            className={`tab-btn ${activeTab === 'customers' ? 'active' : ''}`}
            onClick={() => setActiveTab('customers')}
          >
            👥 고객관리
          </button>
          {userRole === 'admin' && (
            <button
              className={`tab-btn ${activeTab === 'suppliers' ? 'active' : ''}`}
              onClick={() => setActiveTab('suppliers')}
            >
              🏢 공급자
            </button>
          )}
          <button
            className={`tab-btn ${activeTab === 'parts' ? 'active' : ''}`}
            onClick={() => setActiveTab('parts')}
          >
            🛠️ 부품관리
          </button>
        </div>
      </div>
    </header>
  );
}
