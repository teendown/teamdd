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
  suppliersList = []
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
      {/* Left: Mobile Drawer Trigger + Active Page Title */}
      <div className="header-left">
        <button
          type="button"
          className="mobile-menu-trigger"
          onClick={onOpenSidebar}
          aria-label="메뉴 열기"
        >
          ☰
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.25rem' }}>{page.icon}</span>
          <h1 className="header-page-title">{page.title}</h1>
        </div>
      </div>

      {/* Right: Quick Status */}
      <div className="header-right">
        {/* Quick Database Status Badge */}
        <span
          className={`status-badge ${isConnected ? 'connected' : 'disconnected'}`}
          title={connectionMessage || (isConnected ? '클라우드 DB 정상 연결됨' : '로컬 모드')}
          onClick={() => setActiveTab('settings')}
        >
          <span>{isConnected ? '🟢' : '🔴'}</span>
          <span>{isConnected ? '클라우드 동기화' : '로컬 오프라인'}</span>
        </span>
      </div>
    </header>
  );
}
