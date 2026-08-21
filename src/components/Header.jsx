// 🎨 TEAM D.D PREMIUM RESPONSIVE HEADER & MOBILE DRAWER
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    (selectedSupplierKey === 'sejin' ? '세진건설기계' : (selectedSupplierKey === 'ds' ? '디에스건설기계' : '대성건설기계'));

  const copySQL = () => {
    navigator.clipboard.writeText(SQL_ALL).then(() => {
      setCopiedSQL(true);
      setTimeout(() => setCopiedSQL(false), 2500);
    });
  };

  const getActiveTabTitle = () => {
    if (activeTab === 'doc') {
      return docType === '견적서' ? '📑 견적서' : (docType === '청구서' ? '🧾 청구서' : '📄 거래명세서');
    }
    switch (activeTab) {
      case 'history': return '📁 문서조회';
      case 'accounting': return '💡 회계관리';
      case 'schedule': return '📅 일정관리';
      case 'customers': return '👥 고객관리';
      case 'suppliers': return '🏢 공급자';
      case 'parts': return '🛠️ 부품관리';
      default: return '📄 거래명세서';
    }
  };

  const handleSelectTab = (tab, type = null) => {
    setActiveTab(tab);
    if (type) setDocType(type);
    setMobileMenuOpen(false);
  };

  // Menu item definitions with rich visual hierarchy
  const menuSections = [
    {
      category: '문서 작성 (신규 발행)',
      items: [
        {
          id: 'doc_statement',
          title: '거래명세서 작성',
          sub: '신규 거래명세서 작성 및 즉시 출력',
          icon: '📄',
          iconBg: 'rgba(59, 130, 246, 0.15)',
          iconColor: '#2563eb',
          isActive: activeTab === 'doc' && docType === '거래명세서',
          onClick: () => handleSelectTab('doc', '거래명세서')
        },
        {
          id: 'doc_estimate',
          title: '견적서 작성',
          sub: '고객 사전 견적서 산출 및 저장',
          icon: '📑',
          iconBg: 'rgba(147, 51, 234, 0.15)',
          iconColor: '#7e22ce',
          isActive: activeTab === 'doc' && docType === '견적서',
          onClick: () => handleSelectTab('doc', '견적서')
        },
        {
          id: 'doc_invoice',
          title: '청구서 작성',
          sub: '정산 및 대금 청구서 발행',
          icon: '🧾',
          iconBg: 'rgba(2, 132, 199, 0.15)',
          iconColor: '#0369a1',
          isActive: activeTab === 'doc' && docType === '청구서',
          onClick: () => handleSelectTab('doc', '청구서')
        }
      ]
    },
    {
      category: '조회 및 업무 관리',
      items: [
        {
          id: 'history',
          title: '문서 조회 / 발행 내역',
          sub: '전체 발행 문서 검색, 미리보기 및 재인쇄',
          icon: '📁',
          iconBg: 'rgba(245, 158, 11, 0.15)',
          iconColor: '#b45309',
          isActive: activeTab === 'history',
          onClick: () => handleSelectTab('history')
        },
        {
          id: 'accounting',
          title: '거래처별 회계 / 미수금',
          sub: '거래처별 입금/미수 정산 및 회계 관리',
          icon: '💡',
          iconBg: 'rgba(16, 185, 129, 0.15)',
          iconColor: '#047857',
          isActive: activeTab === 'accounting',
          onClick: () => handleSelectTab('accounting')
        },
        {
          id: 'schedule',
          title: '일정 / 캘린더 관리',
          sub: '장비 정비, 출장 및 예약 일정표',
          icon: '📅',
          iconBg: 'rgba(99, 102, 241, 0.15)',
          iconColor: '#4338ca',
          isActive: activeTab === 'schedule',
          onClick: () => handleSelectTab('schedule')
        }
      ]
    },
    {
      category: '기준 정보 관리',
      items: [
        {
          id: 'customers',
          title: '고객 (거래처) 관리',
          sub: '거래처 주소록 및 보유 기종 관리',
          icon: '👥',
          iconBg: 'rgba(20, 184, 166, 0.15)',
          iconColor: '#0f766e',
          isActive: activeTab === 'customers',
          onClick: () => handleSelectTab('customers')
        },
        {
          id: 'parts',
          title: '부품 / 단가 관리',
          sub: '부품 단가표 및 재고 수량 관리',
          icon: '🛠️',
          iconBg: 'rgba(239, 68, 68, 0.15)',
          iconColor: '#b91c1c',
          isActive: activeTab === 'parts',
          onClick: () => handleSelectTab('parts')
        },
        ...(userRole === 'admin' ? [{
          id: 'suppliers',
          title: '공급자 정보 관리',
          sub: '사업자 등록 정보 및 직인(도장) 설정',
          icon: '🏢',
          iconBg: 'rgba(14, 165, 233, 0.15)',
          iconColor: '#0369a1',
          isActive: activeTab === 'suppliers',
          onClick: () => handleSelectTab('suppliers')
        }] : [])
      ]
    }
  ];

  return (
    <header className="top-header" style={{ position: 'sticky', top: 0, zIndex: 90 }}>
      {/* ── Main Top Header Card ── */}
      <div
        className="header-card"
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
          boxShadow: '0 2px 8px rgba(0, 27, 72, 0.06)',
          padding: '0.5rem 0.875rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem'
        }}
      >
        {/* Left Side: Brand Logo + Compact Supplier Tag */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h1
              className="brand-title"
              style={{
                margin: 0,
                fontSize: '1.0625rem',
                fontWeight: '900',
                color: 'var(--c-navy-dark)',
                letterSpacing: '-0.02em',
                lineHeight: 1.1
              }}
            >
              TEAM <span style={{ color: 'var(--c-blue-accent)' }}>D.D</span>
            </h1>
            <span className="brand-sub" style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: '600' }}>
              대한민국 건설기계 정비 1등
            </span>
          </div>

          {/* 🏢 로그인 계정 뱃지 */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: 'var(--c-blue-lightest)',
              border: '1px solid var(--c-blue-soft)',
              padding: '3px 8px',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: '800',
              color: 'var(--c-navy-dark)',
              whiteSpace: 'nowrap'
            }}
            title={userRole === 'admin' ? '관리자 모드' : `공급자: ${supplierDisplayName}`}
          >
            <span>{userRole === 'admin' ? '👑' : '🏢'}</span>
            <span style={{ color: 'var(--c-navy-primary)' }}>
              {userRole === 'admin' ? '관리자' : supplierDisplayName}
            </span>
          </div>
        </div>

        {/* Right Side: DB Pill + [📋 메뉴 ▾] + Desktop Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          {/* 🟢 DB 연결 상태 배지 */}
          <button
            type="button"
            onClick={() => setShowConfig(prev => !prev)}
            className={`status-badge ${isConnected ? 'connected' : 'disconnected'}`}
            style={{
              padding: '0.35rem 0.55rem',
              fontSize: '0.6875rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              borderRadius: '20px'
            }}
          >
            <span>{isConnected ? '🟢 DB' : '🔴 로컬'}</span>
            <span style={{ fontSize: '8px' }}>{showConfig ? '▲' : '▼'}</span>
          </button>

          {/* 🚪 로그아웃 버튼 (Desktop Only) */}
          <button
            type="button"
            onClick={onLogout}
            className="desktop-only btn btn-outline btn-sm"
            style={{
              height: '28px',
              fontSize: '0.6875rem',
              fontWeight: '700',
              color: '#D92D20',
              borderColor: '#FECDCA',
              backgroundColor: '#FEF3F2',
              cursor: 'pointer',
              padding: '0 8px'
            }}
          >
            로그아웃
          </button>

          {/* 📋 Fixed [메뉴 ▾] Button (Mobile Primary) */}
          <button
            type="button"
            className="mobile-menu-fixed-btn"
            onClick={() => setMobileMenuOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              height: '32px',
              padding: '0 10px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #001B48 0%, #02457A 100%)',
              color: '#FFFFFF',
              border: 'none',
              fontSize: '0.8125rem',
              fontWeight: '900',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0, 27, 72, 0.25)',
              whiteSpace: 'nowrap'
            }}
            title="전체 메뉴 열기"
          >
            <span>메뉴</span>
            <span style={{ fontSize: '9px', opacity: 0.8 }}>▼</span>
          </button>
        </div>
      </div>

      {/* Supabase DB 설정 패널 */}
      {showConfig && (
        <div
          style={{
            marginTop: '0.75rem',
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '1rem',
            boxShadow: '0 4px 16px rgba(0,0,0,0.1)'
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

      {/* Desktop Top Tab Navigation (Visible ONLY on Desktop >=840px) */}
      <div className="tab-bar-container">
        <div className="tab-nav">
          <button
            className={`tab-btn ${activeTab === 'doc' && docType === '거래명세서' ? 'active' : ''}`}
            onClick={() => handleSelectTab('doc', '거래명세서')}
          >
            📄 거래명세서
          </button>
          <button
            className={`tab-btn ${activeTab === 'doc' && docType === '견적서' ? 'active' : ''}`}
            onClick={() => handleSelectTab('doc', '견적서')}
          >
            📑 견적서
          </button>
          <button
            className={`tab-btn ${activeTab === 'doc' && docType === '청구서' ? 'active' : ''}`}
            onClick={() => handleSelectTab('doc', '청구서')}
          >
            🧾 청구서
          </button>
          <button
            className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => handleSelectTab('history')}
          >
            📁 문서조회
          </button>
          <button
            className={`tab-btn ${activeTab === 'accounting' ? 'active' : ''}`}
            onClick={() => handleSelectTab('accounting')}
          >
            💡 거래처별 회계
          </button>
          <button
            className={`tab-btn ${activeTab === 'schedule' ? 'active' : ''}`}
            onClick={() => handleSelectTab('schedule')}
          >
            📅 일정관리
          </button>
          <button
            className={`tab-btn ${activeTab === 'customers' ? 'active' : ''}`}
            onClick={() => handleSelectTab('customers')}
          >
            👥 고객관리
          </button>
          {userRole === 'admin' && (
            <button
              className={`tab-btn ${activeTab === 'suppliers' ? 'active' : ''}`}
              onClick={() => handleSelectTab('suppliers')}
            >
              🏢 공급자
            </button>
          )}
          <button
            className={`tab-btn ${activeTab === 'parts' ? 'active' : ''}`}
            onClick={() => handleSelectTab('parts')}
          >
            🛠️ 부품관리
          </button>
        </div>
      </div>

      {/* 📱 Full-Featured Luxury Mobile Slide Drawer */}
      {mobileMenuOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            zIndex: 999999,
            display: 'flex',
            justifyContent: 'flex-start',
            animation: 'drawerFade 0.2s ease'
          }}
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            style={{
              width: '85%',
              maxWidth: '340px',
              height: '100%',
              backgroundColor: '#FFFFFF',
              boxShadow: '10px 0 35px rgba(0, 27, 72, 0.35)',
              display: 'flex',
              flexDirection: 'column',
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
              animation: 'drawerSlide 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Top Branding Header */}
            <div
              style={{
                padding: '1.25rem 1.125rem 1rem',
                background: 'linear-gradient(145deg, #001B48 0%, #02457A 60%, #018ABE 100%)',
                color: '#FFFFFF',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                borderBottom: '1px solid rgba(151, 202, 219, 0.2)'
              }}
            >
              <div>
                <div style={{ fontSize: '1.35rem', fontWeight: '900', color: '#FFFFFF', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                  TEAM <span style={{ color: '#97CADB' }}>D.D</span>
                </div>
                <div style={{ fontSize: '0.6875rem', color: '#D6E8EE', opacity: 0.85, marginTop: '3px', fontWeight: '600' }}>
                  대한민국 건설기계 정비 1등
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.18)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '50%',
                  color: '#FFFFFF',
                  width: '34px',
                  height: '34px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                ✕
              </button>
            </div>

            {/* User Account Profile Card */}
            <div
              style={{
                padding: '0.875rem 1rem',
                backgroundColor: '#F8FAFC',
                borderBottom: '1px solid #E2E8F0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    backgroundColor: userRole === 'admin' ? '#fef3c7' : '#dbeafe',
                    border: `1.5px solid ${userRole === 'admin' ? '#fcd34d' : '#93c5fd'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.125rem'
                  }}
                >
                  {userRole === 'admin' ? '👑' : '🏢'}
                </div>
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: '800', color: '#0F172A' }}>
                    {userRole === 'admin' ? '통합 관리자 모드' : supplierDisplayName}
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: isConnected ? '#059669' : '#DC2626', fontWeight: '700', marginTop: '1px' }}>
                    {isConnected ? '🟢 DB 연결 정상' : '🔴 로컬저장 모드'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setMobileMenuOpen(false); onLogout(); }}
                className="btn btn-outline btn-sm"
                style={{ fontSize: '0.6875rem', padding: '4px 8px', color: '#DC2626', borderColor: '#FECACA', backgroundColor: '#FEF2F2' }}
              >
                로그아웃
              </button>
            </div>

            {/* Menu List Groups */}
            <div style={{ flex: 1, padding: '0.75rem 0.875rem', overflowY: 'auto' }}>
              {menuSections.map((sec, secIdx) => (
                <div key={secIdx} style={{ marginBottom: '1.125rem' }}>
                  <div
                    style={{
                      fontSize: '0.6875rem',
                      fontWeight: '800',
                      color: '#64748B',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      marginBottom: '0.375rem',
                      paddingLeft: '0.375rem'
                    }}
                  >
                    {sec.category}
                  </div>

                  <div
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '12px',
                      border: '1px solid #E2E8F0',
                      overflow: 'hidden',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                    }}
                  >
                    {sec.items.map((item, itemIdx) => (
                      <div
                        key={item.id}
                        onClick={item.onClick}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.75rem 0.875rem',
                          backgroundColor: item.isActive ? '#EFF6FF' : '#FFFFFF',
                          borderBottom: itemIdx < sec.items.length - 1 ? '1px solid #F1F5F9' : 'none',
                          borderLeft: item.isActive ? '4px solid #1D4ED8' : '4px solid transparent',
                          cursor: 'pointer',
                          transition: 'background-color 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                          <div
                            style={{
                              width: '34px',
                              height: '34px',
                              borderRadius: '8px',
                              backgroundColor: item.iconBg,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '1rem',
                              flexShrink: 0
                            }}
                          >
                            {item.icon}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div
                              style={{
                                fontSize: '0.875rem',
                                fontWeight: item.isActive ? '900' : '700',
                                color: item.isActive ? '#1D4ED8' : '#1E293B',
                                lineHeight: 1.2
                              }}
                            >
                              {item.title}
                            </div>
                            <div style={{ fontSize: '0.6875rem', color: '#64748B', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {item.sub}
                            </div>
                          </div>
                        </div>

                        <div style={{ fontSize: '1rem', color: item.isActive ? '#1D4ED8' : '#94A3B8', fontWeight: 'bold', marginLeft: '6px' }}>
                          {item.isActive ? '✓' : '›'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* System & DB Settings Row */}
              <div style={{ marginBottom: '0.5rem' }}>
                <div
                  style={{
                    fontSize: '0.6875rem',
                    fontWeight: '800',
                    color: '#64748B',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    marginBottom: '0.375rem',
                    paddingLeft: '0.375rem'
                  }}
                >
                  시스템 설정
                </div>
                <div
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setShowConfig(true);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 0.875rem',
                    backgroundColor: '#FFFFFF',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                    cursor: 'pointer',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '8px',
                        backgroundColor: '#F1F5F9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1rem'
                      }}
                    >
                      ⚙️
                    </div>
                    <div>
                      <div style={{ fontSize: '0.875rem', fontWeight: '700', color: '#1E293B' }}>
                        Supabase DB 연결 설정
                      </div>
                      <div style={{ fontSize: '0.6875rem', color: '#64748B', marginTop: '2px' }}>
                        클라우드 프로젝트 URL 및 키 관리
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: '1rem', color: '#94A3B8', fontWeight: 'bold' }}>›</div>
                </div>
              </div>
            </div>

            {/* Drawer Footer */}
            <div
              style={{
                padding: '0.875rem 1rem',
                borderTop: '1px solid #E2E8F0',
                backgroundColor: '#F8FAFC',
                textAlign: 'center',
                fontSize: '0.6875rem',
                color: '#94A3B8',
                fontWeight: '600'
              }}
            >
              TEAM D.D · v2.0.7 Mobile Edition
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
