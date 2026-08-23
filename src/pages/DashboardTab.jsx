// 🎨 TEAM D.D HEAVY MACHINERY DASHBOARD & MOBILE LAUNCHER
import React, { useState, useMemo } from 'react';
import { areSupplierKeysEquivalent } from '../utils/validation.js';

export default function DashboardTab({
  documentsList = [],
  schedulesList = [],
  customersList = [],
  selectedSupplierKey = 'sejin',
  currentSupplier = {},
  onNavigateTab,
  onSelectDocType,
  onUpdateScheduleStatus,
  onSelectCustomer,
  onOpenNewScheduleModal
}) {
  const currentDate = new Date();
  const todayStr = currentDate.toISOString().split('T')[0];
  const currentMonthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

  // 모바일에서 대시보드 상세 현황판 펼치기 상태 (기본은 빠른 메뉴가 먼저 보임)
  const [showMobileDashboard, setShowMobileDashboard] = useState(false);

  // 주간 일정 서브 탭: 'factory' (공장 작업) | 'field' (출장) | 'customer' (고객관리) | 'shared' (공유 일정)
  const [scheduleSubTab, setScheduleSubTab] = useState('factory');

  // 1. 내 사업자의 문서 필터링
  const myDocuments = useMemo(() => {
    return documentsList.filter(doc => {
      if (doc.is_deleted) return false;
      const suppKey = doc.supplier_key || doc.supplierKey || '';
      return areSupplierKeysEquivalent(suppKey, selectedSupplierKey);
    });
  }, [documentsList, selectedSupplierKey]);

  // 2. 내 사업자의 일정 및 공유 일정 필터링
  const { mySchedules, sharedSchedules } = useMemo(() => {
    const my = [];
    const shared = [];
    schedulesList.forEach(sch => {
      const isMine = areSupplierKeysEquivalent(sch.supplier_key, selectedSupplierKey);
      if (isMine) {
        my.push(sch);
      } else if (sch.is_shared === true) {
        shared.push(sch);
      }
    });
    return { mySchedules: my, sharedSchedules: shared };
  }, [schedulesList, selectedSupplierKey]);

  // 3. 상단 4대 핵심 지표 계산
  const metrics = useMemo(() => {
    // 1) 오늘 작업
    const todayWorks = mySchedules.filter(s => {
      const sDate = s.start_date || s.event_date;
      const eDate = s.end_date || sDate;
      return sDate <= todayStr && todayStr <= eDate;
    });

    const totalTodayWork = todayWorks.length;
    const inProgressWork = todayWorks.filter(s => s.status === 'in_progress' || (!s.status && s.category === 'repair')).length;
    const completedWork = todayWorks.filter(s => s.status === 'completed').length;
    const pendingWork = totalTodayWork - inProgressWork - completedWork;

    // 2) 이번 달 매출 & 오늘 입금 예정 & 연체 미수금
    let thisMonthSales = 0;
    let todayExpectedPayment = 0;
    let overdueUnpaidAmount = 0;
    let overdueUnpaidCount = 0;

    myDocuments.forEach(doc => {
      const isEstimate = (doc.doc_type || doc.docType) === '견적서';
      if (isEstimate) return;

      const items = doc.items || [];
      const totalSupply = items.reduce((sum, i) => sum + (Number(i.qty) || 0) * (Number(i.price) || 0), 0);
      const vat = doc.vat_included !== false ? Math.floor(totalSupply * 0.1) : (Number(doc.vat) || 0);
      const grandTotal = totalSupply + vat;
      const paid = Number(doc.paid) || 0;
      const balance = grandTotal - paid;

      const dDate = doc.doc_date || doc.docDate || '';
      if (dDate.startsWith(currentMonthStr)) {
        thisMonthSales += grandTotal;
      }

      const payDue = doc.dueDate || doc.paymentDate || doc.docDate;
      if (payDue === todayStr && balance > 0) {
        todayExpectedPayment += balance;
      }

      if (balance > 0) {
        const targetDate = doc.dueDate || doc.docDate || dDate;
        if (targetDate && targetDate < todayStr) {
          overdueUnpaidAmount += balance;
          overdueUnpaidCount += 1;
        }
      }
    });

    return {
      todayWorks,
      totalTodayWork,
      inProgressWork,
      completedWork,
      pendingWork: pendingWork > 0 ? pendingWork : 0,
      thisMonthSales,
      todayExpectedPayment,
      overdueUnpaidAmount,
      overdueUnpaidCount
    };
  }, [mySchedules, myDocuments, todayStr, currentMonthStr]);

  // 4. 주간 일정 탭 데이터 필터링 및 날짜별 그룹핑
  const weeklyScheduleGroups = useMemo(() => {
    let targetList = [];

    if (scheduleSubTab === 'shared') {
      targetList = sharedSchedules;
    } else if (scheduleSubTab === 'factory') {
      targetList = mySchedules.filter(s => s.category === 'repair' || s.category === 'inspection' || !s.category);
    } else if (scheduleSubTab === 'field') {
      targetList = mySchedules.filter(s => s.category === 'field' || s.category === 'business_trip');
    } else if (scheduleSubTab === 'customer') {
      targetList = mySchedules.filter(s => s.category === 'meeting' || s.category === 'customer' || s.category === 'delivery');
    }

    const next7Days = [];
    const d = new Date();
    for (let i = 0; i < 7; i++) {
      const cur = new Date(d);
      cur.setDate(d.getDate() + i);
      next7Days.push(cur.toISOString().split('T')[0]);
    }

    const filtered = targetList.filter(s => {
      const sDate = s.start_date || s.event_date;
      const eDate = s.end_date || sDate;
      return next7Days.some(day => sDate <= day && day <= eDate);
    });

    const groupMap = {};
    filtered.forEach(item => {
      const sDate = item.start_date || item.event_date || todayStr;
      if (!groupMap[sDate]) groupMap[sDate] = [];
      groupMap[sDate].push(item);
    });

    return Object.keys(groupMap).sort().map(date => ({
      date,
      items: groupMap[date]
    }));
  }, [scheduleSubTab, mySchedules, sharedSchedules, todayStr]);

  // 5. 미수금 고객 요약 리스트
  const unpaidCustomers = useMemo(() => {
    const map = new Map();

    myDocuments.forEach(doc => {
      const isEstimate = (doc.doc_type || doc.docType) === '견적서';
      if (isEstimate) return;

      const items = doc.items || [];
      const totalSupply = items.reduce((sum, i) => sum + (Number(i.qty) || 0) * (Number(i.price) || 0), 0);
      const vat = doc.vat_included !== false ? Math.floor(totalSupply * 0.1) : (Number(doc.vat) || 0);
      const grandTotal = totalSupply + vat;
      const paid = Number(doc.paid) || 0;
      const balance = grandTotal - paid;

      if (balance <= 0) return;

      const custName = doc.customer_name || doc.customer_data?.name || doc.customer?.name || '미지정';
      const docDate = doc.doc_date || doc.docDate || todayStr;

      if (!map.has(custName)) {
        const custMaster = customersList.find(c => c.name === custName) || {};
        map.set(custName, {
          name: custName,
          phone: doc.customer_data?.phone || custMaster.phone || '-',
          person: doc.customer_data?.person || custMaster.person || '-',
          totalUnpaid: 0,
          oldestDocDate: docDate,
          docCount: 0,
          memo: custMaster.memo || '',
          lastContactDate: custMaster.last_contact_date || docDate
        });
      }

      const existing = map.get(custName);
      existing.totalUnpaid += balance;
      existing.docCount += 1;
      if (docDate < existing.oldestDocDate) {
        existing.oldestDocDate = docDate;
      }
    });

    return Array.from(map.values())
      .map(item => {
        const oldest = new Date(item.oldestDocDate);
        const today = new Date(todayStr);
        const diffDays = Math.max(0, Math.floor((today - oldest) / (1000 * 60 * 60 * 24)));
        return {
          ...item,
          overdueDays: diffDays
        };
      })
      .sort((a, b) => b.totalUnpaid - a.totalUnpaid);
  }, [myDocuments, customersList, todayStr]);

  const handleStatusChange = (schId, newStatus) => {
    if (onUpdateScheduleStatus) {
      onUpdateScheduleStatus(schId, newStatus);
    }
  };

  const handleDocNavigate = (type) => {
    if (onSelectDocType) {
      onSelectDocType(type);
    } else if (onNavigateTab) {
      onNavigateTab('doc');
    }
  };

  return (
    <div className="dashboard-container">
      {/* ====================================================================
          1. 📱 [휴대폰/모바일 전용] 스마트 앱 런처 퀵 메뉴 그리드
          ==================================================================== */}
      <section className="mobile-quick-launcher">
        <div className="mobile-launcher-header">
          <div className="mobile-launcher-greeting">
            <span className="mobile-greeting-badge">TEAM D.D 모바일</span>
            <h2 className="mobile-greeting-title">{currentSupplier?.name || '중장비 관리 시스템'}</h2>
          </div>
          <div className="mobile-today-date">
            📅 {todayStr}
          </div>
        </div>

        {/* 퀵 메뉴 타일 그리드 */}
        <div className="mobile-menu-grid">
          {/* 1) 거래명세서 작성 (Primary 강조) */}
          <button
            type="button"
            className="mobile-menu-card primary-action"
            onClick={() => handleDocNavigate('거래명세서')}
          >
            <div className="menu-card-icon-wrap">📄</div>
            <div className="menu-card-info">
              <span className="menu-card-name">거래명세서 작성</span>
              <span className="menu-card-desc">가장 빠른 문서 발행</span>
            </div>
            <span className="menu-card-tag highlight">자주 사용</span>
          </button>

          {/* 2) 견적서 작성 */}
          <button
            type="button"
            className="mobile-menu-card"
            onClick={() => handleDocNavigate('견적서')}
          >
            <div className="menu-card-icon-wrap">📑</div>
            <div className="menu-card-info">
              <span className="menu-card-name">견적서 작성</span>
              <span className="menu-card-desc">신규 견적서 발급</span>
            </div>
          </button>

          {/* 3) 청구서 작성 */}
          <button
            type="button"
            className="mobile-menu-card"
            onClick={() => handleDocNavigate('청구서')}
          >
            <div className="menu-card-icon-wrap">🧾</div>
            <div className="menu-card-info">
              <span className="menu-card-name">청구서 작성</span>
              <span className="menu-card-desc">청구서 및 정산</span>
            </div>
          </button>

          {/* 4) 일정 / 작업 관리 */}
          <button
            type="button"
            className="mobile-menu-card"
            onClick={() => onNavigateTab('schedule')}
          >
            <div className="menu-card-icon-wrap">📅</div>
            <div className="menu-card-info">
              <span className="menu-card-name">일정 및 작업</span>
              <span className="menu-card-desc">공장·출장 정비 일정</span>
            </div>
            {metrics.totalTodayWork > 0 && (
              <span className="menu-card-badge blue">{metrics.totalTodayWork}건</span>
            )}
          </button>

          {/* 5) 미수금 / 회계 */}
          <button
            type="button"
            className="mobile-menu-card"
            onClick={() => onNavigateTab('accounting')}
          >
            <div className="menu-card-icon-wrap">💰</div>
            <div className="menu-card-info">
              <span className="menu-card-name">미수금 / 회계</span>
              <span className="menu-card-desc">장부 및 정산 관리</span>
            </div>
            {metrics.overdueUnpaidCount > 0 && (
              <span className="menu-card-badge red">{metrics.overdueUnpaidCount}건 연체</span>
            )}
          </button>

          {/* 6) 고객(거래처) 관리 */}
          <button
            type="button"
            className="mobile-menu-card"
            onClick={() => onNavigateTab('customers')}
          >
            <div className="menu-card-icon-wrap">👥</div>
            <div className="menu-card-info">
              <span className="menu-card-name">거래처 관리</span>
              <span className="menu-card-desc">고객 장비 및 이력</span>
            </div>
          </button>

          {/* 7) 문서 조회 (발행내역) */}
          <button
            type="button"
            className="mobile-menu-card"
            onClick={() => onNavigateTab('history')}
          >
            <div className="menu-card-icon-wrap">📁</div>
            <div className="menu-card-info">
              <span className="menu-card-name">문서 조회</span>
              <span className="menu-card-desc">발행 내역 및 재인쇄</span>
            </div>
          </button>

          {/* 8) 부품 재고 관리 */}
          <button
            type="button"
            className="mobile-menu-card"
            onClick={() => onNavigateTab('parts')}
          >
            <div className="menu-card-icon-wrap">🛠️</div>
            <div className="menu-card-info">
              <span className="menu-card-name">부품 재고</span>
              <span className="menu-card-desc">품목 및 단가</span>
            </div>
          </button>
        </div>

        {/* 모바일 대시보드 종합 현황 토글 버튼 */}
        <div className="mobile-toggle-wrapper">
          <button
            type="button"
            className={`mobile-toggle-btn ${showMobileDashboard ? 'active' : ''}`}
            onClick={() => setShowMobileDashboard(prev => !prev)}
          >
            <span>{showMobileDashboard ? '▲' : '📊'}</span>
            <span style={{ fontWeight: '800' }}>
              {showMobileDashboard ? '대시보드 종합 현황 접기' : '오늘 종합 현황판(대시보드) 보기'}
            </span>
            <span className="mobile-toggle-arrow">{showMobileDashboard ? '▲' : '▼'}</span>
          </button>
        </div>
      </section>

      {/* ====================================================================
          2. 💻 [PC 상시 표시 & 모바일 토글 시 표시] 종합 대시보드 현황판
          ==================================================================== */}
      <div className={`dashboard-main-content ${showMobileDashboard ? 'mobile-visible' : ''}`}>
        {/* 1) 4대 핵심 지표 요약 카드 */}
        <section className="summary-cards-grid">
          {/* 카드 1: 오늘 작업 */}
          <div className="summary-card" onClick={() => onNavigateTab('schedule', 'work_orders')} style={{ cursor: 'pointer' }}>
            <div className="summary-card-header">
              <span className="summary-card-title">오늘 작업 현황</span>
              <div className="summary-card-icon blue">⚙️</div>
            </div>
            <div className="summary-card-value">
              {metrics.totalTodayWork} <span style={{ fontSize: '1rem', fontWeight: '600' }}>건</span>
            </div>
            <div className="summary-card-sub">
              <span style={{ color: 'var(--accent-blue)', fontWeight: '700' }}>진행 {metrics.inProgressWork}</span>
              <span>•</span>
              <span style={{ color: 'var(--accent-green)', fontWeight: '700' }}>완료 {metrics.completedWork}</span>
              <span>•</span>
              <span style={{ color: 'var(--accent-yellow)', fontWeight: '700' }}>대기 {metrics.pendingWork}</span>
            </div>
          </div>

          {/* 카드 2: 오늘 입금 예정 */}
          <div className="summary-card" onClick={() => onNavigateTab('accounting')} style={{ cursor: 'pointer' }}>
            <div className="summary-card-header">
              <span className="summary-card-title">오늘 입금 예정</span>
              <div className="summary-card-icon green">💵</div>
            </div>
            <div className="summary-card-value" style={{ color: metrics.todayExpectedPayment > 0 ? 'var(--accent-green)' : 'inherit' }}>
              ₩ {metrics.todayExpectedPayment.toLocaleString()}
            </div>
            <div className="summary-card-sub">
              <span>약정일 기준 입금 대기액</span>
            </div>
          </div>

          {/* 카드 3: 이번 달 매출 */}
          <div className="summary-card" onClick={() => onNavigateTab('accounting')} style={{ cursor: 'pointer' }}>
            <div className="summary-card-header">
              <span className="summary-card-title">이번 달 매출 실적</span>
              <div className="summary-card-icon yellow">📈</div>
            </div>
            <div className="summary-card-value">
              ₩ {metrics.thisMonthSales.toLocaleString()}
            </div>
            <div className="summary-card-sub">
              <span>{currentMonthStr} 누적 합계</span>
            </div>
          </div>

          {/* 카드 4: 연체 미수금 */}
          <div className="summary-card" onClick={() => onNavigateTab('accounting')} style={{ cursor: 'pointer' }}>
            <div className="summary-card-header">
              <span className="summary-card-title">연체 미수금 현황</span>
              <div className="summary-card-icon red">⚠️</div>
            </div>
            <div className="summary-card-value" style={{ color: 'var(--accent-red)' }}>
              ₩ {metrics.overdueUnpaidAmount.toLocaleString()}
            </div>
            <div className="summary-card-sub">
              <span style={{ color: 'var(--accent-red)', fontWeight: '700' }}>총 {metrics.overdueUnpaidCount}건 연체 관리 필요</span>
            </div>
          </div>
        </section>

        {/* 2) PC 데스크톱 깔끔한 2열 레이아웃 */}
        <div className="dash-desktop-grid">
          {/* === 좌측 메인 컬럼: 오늘 작업 현황 & 주간 일정 === */}
          <div className="dash-col-main">
            {/* 오늘 작업 현황 */}
            <section className="dash-section-card">
              <div className="dash-section-header">
                <div className="dash-section-title-group">
                  <span style={{ fontSize: '1.25rem' }}>🔧</span>
                  <h2 className="dash-section-title">오늘 작업 현황</h2>
                  <span className="dash-section-badge">{metrics.totalTodayWork}건</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem' }}
                    onClick={() => onNavigateTab('schedule', 'work_orders')}
                  >
                    전체보기 →
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem' }}
                    onClick={() => onNavigateTab('schedule', 'work_orders')}
                  >
                    + 작업 등록
                  </button>
                </div>
              </div>

              {metrics.todayWorks.length === 0 ? (
                <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '2.25rem', marginBottom: '0.5rem' }}>📋</div>
                  <div style={{ fontWeight: '700', fontSize: '0.9375rem', marginBottom: '0.25rem' }}>오늘 예정된 정비/출장 작업이 없습니다.</div>
                  <div style={{ fontSize: '0.8125rem' }}>신규 작업 등록 버튼을 눌러 정비 일정을 생성해보세요.</div>
                </div>
              ) : (
                <div className="work-table-wrapper">
                  <table className="work-table">
                    <thead>
                      <tr>
                        <th style={{ width: '75px' }}>우선순위</th>
                        <th>장비명 / 모델</th>
                        <th>고객(거래처)명</th>
                        <th>작업 내용</th>
                        <th>담당 정비사</th>
                        <th style={{ width: '120px' }}>작업 상태</th>
                        <th style={{ width: '85px', textAlign: 'center' }}>바로가기</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.todayWorks.map(work => {
                        const priority = work.priority || (work.title?.includes('긴급') ? 'urgent' : 'normal');
                        const status = work.status || 'in_progress';
                        const mechanic = work.mechanic || work.person || '정비팀';

                        return (
                          <tr key={work.id}>
                            <td>
                              {priority === 'urgent' && <span className="priority-pill urgent">🚨 긴급</span>}
                              {priority === 'high' && <span className="priority-pill high">⚡ 당일</span>}
                              {priority === 'normal' && <span className="priority-pill normal">보통</span>}
                            </td>
                            <td style={{ fontWeight: '800' }}>
                              {work.machine || work.machine_info || '굴착기 (기종미지정)'}
                            </td>
                            <td style={{ fontWeight: '700', color: 'var(--primary)' }}>
                              {work.customer_name || '일반 고객'}
                            </td>
                            <td style={{ maxWidth: '240px' }}>
                              <div style={{ fontWeight: '600' }}>{work.title}</div>
                              {work.memo && <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{work.memo}</div>}
                            </td>
                            <td>
                              <span style={{ fontSize: '0.75rem', backgroundColor: 'var(--bg-muted)', padding: '2px 6px', borderRadius: '4px' }}>
                                🧑‍🔧 {mechanic}
                              </span>
                            </td>
                            <td>
                              <select
                                className={`status-select ${status}`}
                                value={status}
                                onChange={(e) => handleStatusChange(work.id, e.target.value)}
                              >
                                <option value="pending">⏳ 대기중</option>
                                <option value="in_progress">⚙️ 작업중</option>
                                <option value="completed">✅ 작업완료</option>
                              </select>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <button
                                type="button"
                                className="btn btn-outline"
                                style={{ fontSize: '0.6875rem', padding: '2px 6px' }}
                                onClick={() => handleDocNavigate('거래명세서')}
                                title="거래명세서 작성으로 이동"
                              >
                                발행
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* 주간 일정 및 현황 */}
            <section className="dash-section-card" style={{ marginTop: '1.25rem' }}>
              <div className="dash-section-header">
                <div className="dash-section-title-group">
                  <span style={{ fontSize: '1.25rem' }}>📅</span>
                  <h2 className="dash-section-title">주간 일정 현황</h2>
                </div>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem' }}
                  onClick={() => onNavigateTab('schedule')}
                >
                  캘린더 전체보기 →
                </button>
              </div>

              {/* 4개 서브 탭 */}
              <div className="schedule-subtabs-nav">
                <button
                  type="button"
                  className={`subtab-btn ${scheduleSubTab === 'factory' ? 'active' : ''}`}
                  onClick={() => setScheduleSubTab('factory')}
                >
                  🏭 공장 작업
                </button>
                <button
                  type="button"
                  className={`subtab-btn ${scheduleSubTab === 'field' ? 'active' : ''}`}
                  onClick={() => setScheduleSubTab('field')}
                >
                  🚚 출장 정비
                </button>
                <button
                  type="button"
                  className={`subtab-btn ${scheduleSubTab === 'customer' ? 'active' : ''}`}
                  onClick={() => setScheduleSubTab('customer')}
                >
                  🤝 고객 관리
                </button>
                <button
                  type="button"
                  className={`subtab-btn ${scheduleSubTab === 'shared' ? 'active' : ''}`}
                  onClick={() => setScheduleSubTab('shared')}
                >
                  🌐 공유 일정 {sharedSchedules.length > 0 && <span style={{ color: 'var(--primary)', fontWeight: '800' }}>({sharedSchedules.length})</span>}
                </button>
              </div>

              {/* 일정 리스트 */}
              <div className="schedule-cards-list">
                {weeklyScheduleGroups.length === 0 ? (
                  <div style={{ padding: '1.75rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    {scheduleSubTab === 'shared' 
                      ? '공개 설정된 공유 일정이 없습니다.' 
                      : '등록된 이번 주 일정이 없습니다.'}
                  </div>
                ) : (
                  weeklyScheduleGroups.slice(0, 3).map(group => {
                    const isToday = group.date === todayStr;
                    return (
                      <div key={group.date} className="schedule-day-group">
                        <div className="schedule-day-header">
                          <span>{isToday ? '🔴 오늘' : '📌'} {group.date}</span>
                          <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>({group.items.length}건)</span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {group.items.map(item => (
                            <div key={item.id} className="schedule-item-card">
                              <div className="schedule-item-top">
                                <span className="schedule-item-title">{item.title}</span>
                                <span className="schedule-item-time">{item.schedule_time || '시간 미지정'}</span>
                              </div>
                              <div className="schedule-item-meta">
                                {item.customer_name && <span>👤 <b>{item.customer_name}</b></span>}
                                {item.machine && <span>🚜 {item.machine}</span>}
                                {item.phone && <span>📞 {item.phone}</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </div>

          {/* === 우측 사이드 컬럼: 미수금 현황 & 빠른 작업 위젯 === */}
          <div className="dash-col-side">
            {/* 거래처별 미수금 현황 카드 */}
            <section className="dash-section-card">
              <div className="dash-section-header">
                <div className="dash-section-title-group">
                  <span style={{ fontSize: '1.25rem' }}>💰</span>
                  <h2 className="dash-section-title">미수금 관리</h2>
                  <span className="dash-section-badge" style={{ backgroundColor: 'var(--accent-red-bg)', color: 'var(--accent-red)' }}>
                    {unpaidCustomers.length}곳
                  </span>
                </div>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem' }}
                  onClick={() => onNavigateTab('accounting')}
                >
                  장부 전체보기 →
                </button>
              </div>

              {/* 오늘 입금 예정 배너 */}
              {metrics.todayExpectedPayment > 0 && (
                <div className="unpaid-highlight-banner">
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: '700' }}>⚡ 오늘 입금 예정 총액</div>
                    <div style={{ fontSize: '1.125rem', fontWeight: '900', color: 'var(--text-main)' }}>
                      ₩ {metrics.todayExpectedPayment.toLocaleString()}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ fontSize: '0.6875rem', padding: '0.25rem 0.5rem' }}
                    onClick={() => onNavigateTab('accounting')}
                  >
                    수납 처리
                  </button>
                </div>
              )}

              {/* 미수금 카드 리스트 */}
              {unpaidCustomers.length === 0 ? (
                <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>🎉</div>
                  <div style={{ fontWeight: '700', fontSize: '0.875rem' }}>미수금 없이 모든 정산이 완료되었습니다!</div>
                </div>
              ) : (
                <div className="unpaid-side-list">
                  {unpaidCustomers.slice(0, 5).map(cust => (
                    <div
                      key={cust.name}
                      className="unpaid-side-item"
                      onClick={() => {
                        if (onSelectCustomer) onSelectCustomer(cust);
                        onNavigateTab('accounting');
                      }}
                    >
                      <div className="unpaid-side-item-top">
                        <span className="unpaid-side-name">{cust.name}</span>
                        <span className="unpaid-overdue-tag">
                          {cust.overdueDays > 0 ? `${cust.overdueDays}일 연체` : '신규 미수'}
                        </span>
                      </div>
                      <div className="unpaid-side-item-bottom">
                        <span className="unpaid-side-sub">담당 {cust.person} | {cust.docCount}건</span>
                        <span className="unpaid-side-amount">₩ {cust.totalUnpaid.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* PC 퀵 액션 가이드 패널 */}
            <section className="dash-section-card" style={{ marginTop: '1.25rem', padding: '1.25rem' }}>
              <h3 style={{ fontSize: '0.875rem', fontWeight: '800', marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>
                ⚡ 빠른 업무 실행
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ fontSize: '0.75rem', padding: '0.625rem 0.5rem', justifyContent: 'center' }}
                  onClick={() => handleDocNavigate('거래명세서')}
                >
                  📄 거래명세서 작성
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ fontSize: '0.75rem', padding: '0.625rem 0.5rem', justifyContent: 'center' }}
                  onClick={() => handleDocNavigate('견적서')}
                >
                  📑 견적서 작성
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ fontSize: '0.75rem', padding: '0.625rem 0.5rem', justifyContent: 'center' }}
                  onClick={() => onNavigateTab('schedule', 'work_orders')}
                >
                  🔧 새 작업 등록
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ fontSize: '0.75rem', padding: '0.625rem 0.5rem', justifyContent: 'center' }}
                  onClick={() => onNavigateTab('customers')}
                >
                  👥 거래처 관리
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
