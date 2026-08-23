// 🎨 TEAM D.D LEFT SIDEBAR NAVIGATION
import React, { useEffect } from 'react';
import { areSupplierKeysEquivalent } from '../utils/validation.js';
import { registerBackHandler } from '../utils/navigationManager.js';

export default function Sidebar({
  activeTab,
  docType,
  onSelectTab,
  onSelectDocType,
  isOpen = false,
  onClose = () => {},
  userRole = 'supplier',
  loggedInSupplier,
  currentSupplier,
  selectedSupplierKey = 'sejin',
  setSelectedSupplierKey,
  suppliersList = [],
  onLogout,
  onOpenExitModal,
  badgeCounts = {
    todayWork: 0,
    unpaidCount: 0
  }
}) {
  // Automatically close sidebar on mobile back button
  useEffect(() => {
    if (!isOpen) return;
    const unregister = registerBackHandler(() => {
      onClose();
      return true;
    }, 'MobileSidebarDrawer');
    return unregister;
  }, [isOpen, onClose]);

  const isAdmin = userRole === 'admin';
  const displayUser = loggedInSupplier || currentSupplier;

  const supplierDisplayName = isAdmin
    ? '통합 관리자'
    : (displayUser?.company || displayUser?.name || 
      (suppliersList.find(s => areSupplierKeysEquivalent(s.id, selectedSupplierKey))?.name) || 
      (selectedSupplierKey === 'sejin' ? '세진건설기계' : (selectedSupplierKey === 'ds' ? '디에스건설기계' : '대성건설기계')));

  const handleMenuClick = (item) => {
    if (item.isDoc) {
      if (onSelectDocType) {
        onSelectDocType(item.docType);
      } else {
        onSelectTab('doc');
      }
    } else {
      onSelectTab(item.id);
    }
    if (onClose) onClose();
  };

  const navItems = [
    { id: 'dashboard', label: '대시보드', icon: '📊', isDoc: false, isActive: activeTab === 'dashboard' },
    { id: 'doc_statement', label: '거래명세서 작성', icon: '📄', isDoc: true, docType: '거래명세서', isActive: activeTab === 'doc' && docType === '거래명세서' },
    { id: 'doc_estimate', label: '견적서 작성', icon: '📑', isDoc: true, docType: '견적서', isActive: activeTab === 'doc' && docType === '견적서' },
    { id: 'doc_invoice', label: '청구서 작성', icon: '🧾', isDoc: true, docType: '청구서', isActive: activeTab === 'doc' && docType === '청구서' },
    { id: 'history', label: '문서조회 (발행내역)', icon: '📁', isDoc: false, isActive: activeTab === 'history' },
    { id: 'schedule', label: '일정 / 예약', icon: '📅', isDoc: false, isActive: activeTab === 'schedule', badge: badgeCounts.todayWork > 0 ? `${badgeCounts.todayWork}건` : null },
    { id: 'customers', label: '고객관리', icon: '👥', isDoc: false, isActive: activeTab === 'customers' },
    ...(isAdmin ? [{ id: 'suppliers', label: '공급자 관리', icon: '🏢', isDoc: false, isActive: activeTab === 'suppliers' }] : []),
    { id: 'accounting', label: '미수금 / 회계', icon: '💡', isDoc: false, isActive: activeTab === 'accounting', badge: badgeCounts.unpaidCount > 0 ? `${badgeCounts.unpaidCount}건` : null },
    { id: 'parts', label: '부품재고', icon: '🛠️', isDoc: false, isActive: activeTab === 'parts' },
    { id: 'settings', label: '설정', icon: '⚙️', isDoc: false, isActive: activeTab === 'settings' }
  ];

  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}
      <aside className={`sidebar-container ${isOpen ? 'open' : ''}`}>
        {/* Sidebar Header with TEAM D.D (No icon) */}
        <div className="sidebar-header" style={{ padding: '1.25rem 1.125rem' }}>
          <div className="sidebar-brand-text">
            <div className="sidebar-brand-name" style={{ fontSize: '1.25rem', fontWeight: '900', letterSpacing: '-0.02em', color: '#ffffff' }}>
              TEAM D.D
            </div>
            <div className="sidebar-brand-sub" style={{ fontSize: '0.6875rem', color: '#94a3b8', marginTop: '2px' }}>
              중장비 관리 시스템
            </div>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="sidebar-nav-list">
          {navItems.map(item => (
            <button
              key={item.id}
              type="button"
              className={`sidebar-nav-item ${item.isActive ? 'active' : ''}`}
              onClick={() => handleMenuClick(item)}
            >
              <div className="sidebar-item-left">
                <span className="sidebar-item-icon">{item.icon}</span>
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="sidebar-badge alert">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="sidebar-footer">
          {/* User Profile Info (Admin Support) */}
          <div className="sidebar-user-box" style={{ backgroundColor: isAdmin ? 'rgba(234, 179, 8, 0.15)' : 'rgba(255, 255, 255, 0.04)', border: isAdmin ? '1px solid rgba(234, 179, 8, 0.3)' : 'none' }}>
            <div className="sidebar-user-avatar" style={{ backgroundColor: isAdmin ? '#ca8a04' : '#2563eb' }}>
              {isAdmin ? '👑' : (supplierDisplayName ? supplierDisplayName.slice(0, 1) : '공')}
            </div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name" style={{ color: isAdmin ? '#fef08a' : '#ffffff' }} title={supplierDisplayName}>
                {supplierDisplayName}
              </div>
              <div className="sidebar-user-role" style={{ color: isAdmin ? '#fde047' : '#94a3b8' }}>
                {isAdmin ? '전체 관리자 모드' : (displayUser?.person ? `${displayUser.person} 대표` : '사업자 계정')}
              </div>
            </div>
          </div>

          {/* Admin Switch Supplier Selector */}
          {isAdmin && setSelectedSupplierKey && suppliersList.length > 0 && (
            <div style={{ padding: '0 2px' }}>
              <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '2px', fontWeight: '700' }}>사업자 데이터 전환:</div>
              <select
                className="form-select"
                style={{ width: '100%', height: '30px', fontSize: '0.75rem', backgroundColor: '#1e293b', color: '#f8fafc', borderColor: '#334155' }}
                value={selectedSupplierKey}
                onChange={e => setSelectedSupplierKey(e.target.value)}
              >
                {suppliersList.map(s => (
                  <option key={s.id} value={s.id}>{s.name || s.company}</option>
                ))}
              </select>
            </div>
          )}

          {/* Actions: Exit App & Logout */}
          <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
            {onOpenExitModal && (
              <button
                type="button"
                className="btn btn-outline"
                style={{
                  flex: 1,
                  fontSize: '0.75rem',
                  padding: '0.4rem 0.5rem',
                  color: '#f87171',
                  borderColor: '#475569',
                  backgroundColor: '#1e293b',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px'
                }}
                onClick={() => {
                  if (onClose) onClose();
                  onOpenExitModal();
                }}
                title="프로그램 나가기 / 종료"
              >
                <span>🚪</span>
                <span>종료</span>
              </button>
            )}

            {onLogout && (
              <button
                type="button"
                className="btn btn-outline"
                style={{
                  flex: 1,
                  fontSize: '0.75rem',
                  padding: '0.4rem 0.5rem',
                  color: '#94a3b8',
                  borderColor: '#475569',
                  backgroundColor: '#1e293b',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px'
                }}
                onClick={onLogout}
                title="로그아웃"
              >
                <span>🔒</span>
                <span>로그아웃</span>
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
