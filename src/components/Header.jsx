import React, { useState } from 'react';
import { SQL_SCHEMAS } from '../services/storage.js';

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
  onTestConnection
}) {
  const [showConfig, setShowConfig] = useState(false);
  const [copiedKey, setCopiedKey] = useState('');

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(''), 2000);
  };

  return (
    <header className="top-header">
      <div className="header-card">
        <div className="brand-section">
          <h1 className="brand-title">TEAM D.D</h1>
          <span className="brand-sub">
            세진 568-23-00015 (허강) • 디에스김제 213-17-24815 (경아름)
          </span>
        </div>

        <button
          onClick={() => setShowConfig(!showConfig)}
          className={`status-badge ${isConnected ? 'connected' : 'disconnected'}`}
        >
          <span>{isConnected ? '🟢 DB 연결됨' : '🔴 로컬저장 모드'}</span>
          <span style={{ fontSize: '10px' }}>{showConfig ? '▲' : '▼'}</span>
        </button>
      </div>

      {/* Supabase Connection Drawer */}
      {showConfig && (
        <div style={{
          marginTop: '0.75rem',
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '1rem',
          boxShadow: 'var(--shadow-md)'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div>
              <label className="form-label">Supabase Project URL</label>
              <input
                type="text"
                className="form-input"
                placeholder="https://xyz.supabase.co"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
              />
            </div>
            <div>
              <label className="form-label">Supabase Anon Key</label>
              <input
                type="password"
                className="form-input"
                placeholder="eyJhbGciOi..."
                value={supabaseKey}
                onChange={(e) => setSupabaseKey(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem' }}>
              <button
                className="btn btn-green"
                style={{ flex: 1 }}
                onClick={onTestConnection}
                disabled={isTesting}
              >
                {isTesting ? '테스트 중...' : '연결 테스트'}
              </button>
            </div>
          </div>

          {connectionMessage && (
            <div style={{
              fontSize: '0.75rem',
              padding: '0.625rem 0.875rem',
              borderRadius: '8px',
              backgroundColor: isConnected ? '#ecfdf5' : '#fef9c3',
              color: isConnected ? '#065f46' : '#854d0e',
              border: `1px solid ${isConnected ? '#a7f3d0' : '#fde68a'}`,
              marginBottom: '0.75rem'
            }}>
              {connectionMessage}
            </div>
          )}

          {/* SQL Snippets Helper */}
          <div style={{
            backgroundColor: '#fafafa',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '0.75rem'
          }}>
            <div style={{ fontSize: '0.75rem', fontWeight: '700', marginBottom: '0.5rem', color: '#374151' }}>
              📋 Supabase DB 테이블 생성 SQL (클릭하여 복사 후 SQL Editor에서 실행)
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
              <button
                className="btn btn-green"
                style={{ fontSize: '0.6875rem', padding: '0.25rem 0.875rem', fontWeight: '700' }}
                onClick={() => copyToClipboard(SQL_SCHEMAS.ALL, 'all')}
              >
                {copiedKey === 'all' ? '✓ 전체 SQL 복사됨!' : '⚡ 전체 SQL 한번에 복사 (권장)'}
              </button>
              <button
                className="btn btn-outline"
                style={{ fontSize: '0.6875rem', padding: '0.25rem 0.625rem' }}
                onClick={() => copyToClipboard(SQL_SCHEMAS.CUSTOMERS, 'cust')}
              >
                {copiedKey === 'cust' ? '✓ 복사됨!' : '고객 SQL'}
              </button>
              <button
                className="btn btn-outline"
                style={{ fontSize: '0.6875rem', padding: '0.25rem 0.625rem' }}
                onClick={() => copyToClipboard(SQL_SCHEMAS.SUPPLIERS, 'supp')}
              >
                {copiedKey === 'supp' ? '✓ 복사됨!' : '공급자 SQL'}
              </button>
              <button
                className="btn btn-outline"
                style={{ fontSize: '0.6875rem', padding: '0.25rem 0.625rem' }}
                onClick={() => copyToClipboard(SQL_SCHEMAS.PARTS, 'part')}
              >
                {copiedKey === 'part' ? '✓ 복사됨!' : '부품 SQL'}
              </button>
              <button
                className="btn btn-outline"
                style={{ fontSize: '0.6875rem', padding: '0.25rem 0.625rem' }}
                onClick={() => copyToClipboard(SQL_SCHEMAS.DOCUMENTS, 'doc')}
              >
                {copiedKey === 'doc' ? '✓ 복사됨!' : '문서 SQL'}
              </button>
            </div>
            <div style={{ fontSize: '0.6875rem', color: '#6b7280', marginTop: '0.5rem', lineHeight: 1.5 }}>
              💡 Supabase 대시보드 → <strong>SQL Editor</strong> → New query → 붙여넣기 → <strong>Run</strong>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs Bar */}
      <div className="tab-bar-container">
        <div className="tab-nav">
          <button
            className={`tab-btn ${activeTab === 'doc' ? 'active' : ''}`}
            onClick={() => setActiveTab('doc')}
          >
            📄 거래명세서 작성
          </button>
          <button
            className={`tab-btn ${activeTab === 'customers' ? 'active' : ''}`}
            onClick={() => setActiveTab('customers')}
          >
            👥 고객관리
          </button>
          <button
            className={`tab-btn ${activeTab === 'suppliers' ? 'active' : ''}`}
            onClick={() => setActiveTab('suppliers')}
          >
            🏢 공급자관리
          </button>
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
