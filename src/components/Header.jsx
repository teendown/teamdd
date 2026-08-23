// 🎨 TEAM D.D TOP HEADER & ACTION BAR
import React from 'react';
import { areSupplierKeysEquivalent } from '../utils/validation.js';

export default function Header({
  activeTab,
  setActiveTab,
  isConnected,
  isTesting,
  connectionMessage,
  docType,
  onSelectDocType,
  onOpenSidebar,
  currentSupplier,
  selectedSupplierKey,
  suppliersList = [],
  canGoBack = false,
  onBack,
  onOpenExitModal
}) {
  const getPageTitle = () => {
    switch (activeTab) {
      case 'dashboard': return { title: '통합 대시보드', icon: '📊' };
      case 'schedule': return { title: '일정 및 예약 관리', icon: '📅' };
      case 'customers': return { title: '고객(거래처) 관리', icon: '👥' };
      case 'accounting': return { title: '미수금 및 회계 장부', icon: '💡' };
      case 'doc': return { 
        title: docType === '견적서' ? '견적서 작성' : (docType === '청구서' ? '청구서 작성' : '거래명세서 작성'), 
        icon: docType === '견적서' ? '📑' : (docType === '청구서' ? '🧾' : '📄')
      };
      case 'history': return { title: '문서 조회 및 발행 내역', icon: '📁' };
      case 'parts': return { title: '부품 및 재고 관리', icon: '🛠️' };
      case 'suppliers': return { title: '공급자 관리', icon: '🏢' };
      case 'settings': return { title: '시스템 및 사업자 설정', icon: '⚙️' };
      default: return { title: 'TEAM D.D 중장비 관리', icon: '🚜' };
    }
  };

  const page = getPageTitle();

  return (
    <header className="top-header no-print">
      {/* Left: Back Button (if history exists) + Mobile Drawer Trigger + Active Page Title */}
      <div className="header-left" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
        {canGoBack && onBack && (
          <button
            type="button"
            className="btn btn-outline"
            style={{
              padding: '0.35rem 0.5rem',
              fontSize: '0.8125rem',
              fontWeight: '800',
              color: '#0284c7',
              borderColor: '#bae6fd',
              backgroundColor: '#f0f9ff',
              borderRadius: '8px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '2px'
            }}
            onClick={onBack}
            title="이전 화면으로 이동"
            aria-label="이전 화면으로 이동"
          >
            <span>⬅️</span>
            <span className="hide-on-mobile-sm" style={{ fontSize: '0.75rem' }}>뒤로</span>
          </button>
        )}

        <button
          type="button"
          className="mobile-menu-trigger"
          onClick={onOpenSidebar}
          aria-label="메뉴 열기"
        >
          ☰
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
          <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>{page.icon}</span>
          <h1 className="header-page-title" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {page.title}
          </h1>
        </div>
      </div>

      {/* Right: Quick Status & Exit Button */}
      <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {/* Quick Database Status Badge */}
        <span
          className={`status-badge ${isConnected ? 'connected' : 'disconnected'}`}
          title={connectionMessage || (isConnected ? '클라우드 DB 정상 연결됨' : '로컬 모드')}
          onClick={() => setActiveTab('settings')}
        >
          <span>{isConnected ? '🟢' : '🔴'}</span>
          <span className="hide-on-mobile-xs">{isConnected ? '동기화됨' : '오프라인'}</span>
        </span>

        {/* Explicit Exit / Leave Button */}
        {onOpenExitModal && (
          <button
            type="button"
            className="btn btn-outline"
            style={{
              padding: '0.35rem 0.625rem',
              fontSize: '0.75rem',
              fontWeight: '800',
              color: '#dc2626',
              borderColor: '#fca5a5',
              backgroundColor: '#fff5f5',
              borderRadius: '8px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer'
            }}
            onClick={onOpenExitModal}
            title="프로그램 나가기 / 종료"
            aria-label="프로그램 나가기 / 종료"
          >
            <span>🚪</span>
            <span>나가기</span>
          </button>
        )}
      </div>
    </header>
  );
}
