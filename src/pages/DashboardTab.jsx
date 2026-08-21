// 🎨 TEAM D.D HEAVY MACHINERY DASHBOARD (기획안 최종 반영)
import React, { useState, useMemo } from 'react';
import { areSupplierKeysEquivalent } from '../utils/validation.js';

export default function DashboardTab({
  documentsList = [],
  schedulesList = [],
  customersList = [],
  selectedSupplierKey = 'sejin',
  currentSupplier = {},
  onNavigateTab,
  onUpdateScheduleStatus,
  onSelectCustomer,
  onOpenNewScheduleModal
}) {
  const currentDate = new Date();
  const todayStr = currentDate.toISOString().split('T')[0];
  const currentMonthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

  // 중간 영역 일정 탭 상태: 'factory' (공장 작업) | 'field' (출장) | 'customer' (고객관리) | 'shared' (공유 일정)
  const [scheduleSubTab, setScheduleSubTab] = useState('factory');

  // 1. 내 사업자의 문서 필터링 (완전 격리)
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
    // 1) 오늘 작업 (schedules 중 날짜가 오늘 포함 또는 시작일이 오늘인 작업)
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

      // 오늘 입금 예정 (dueDate 또는 paymentDate가 오늘이고 미수금이 있는 경우)
      const payDue = doc.dueDate || doc.paymentDate || doc.docDate;
      if (payDue === todayStr && balance > 0) {
        todayExpectedPayment += balance;
      }

      // 연체 미수금 (지급기일이 지났거나, 발행일로부터 30일 이상 경과한 미수금)
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

    // 오늘부터 향후 7일간 일정 필터
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

    // 날짜별 그룹핑
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
        // 고객 마스터 정보 매칭
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

  return (
    <div className="dashboard-container">
      {/* 1. 상단 요약 카드 4개 */}
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

      {/* 2. 메인 영역: 오늘 작업 현황 (최우선) */}
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
              전체 작업보기 →
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
          <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📋</div>
            <div style={{ fontWeight: '700', fontSize: '0.9375rem', marginBottom: '0.25rem' }}>오늘 예정된 정비/출장 작업이 없습니다.</div>
            <div style={{ fontSize: '0.8125rem' }}>신규 작업 등록 버튼을 눌러 정비 일정을 생성해보세요.</div>
          </div>
        ) : (
          <div className="work-table-wrapper">
            <table className="work-table">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>우선순위</th>
                  <th>장비명 / 모델</th>
                  <th>고객(거래처)명</th>
                  <th>작업 내용</th>
                  <th>담당 정비사</th>
                  <th>예상시간</th>
                  <th style={{ width: '130px' }}>작업 상태</th>
                  <th style={{ width: '90px', textAlign: 'center' }}>바로가기</th>
                </tr>
              </thead>
              <tbody>
                {metrics.todayWorks.map(work => {
                  const priority = work.priority || (work.title?.includes('긴급') ? 'urgent' : 'normal');
                  const status = work.status || 'in_progress';
                  const mechanic = work.mechanic || work.person || '정비팀';
                  const duration = work.estimated_hours ? `${work.estimated_hours}시간` : (work.schedule_time || '당일');

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
                      <td style={{ maxWidth: '300px' }}>
                        <div style={{ fontWeight: '600' }}>{work.title}</div>
                        {work.memo && <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{work.memo}</div>}
                      </td>
                      <td>
                        <span style={{ fontSize: '0.75rem', backgroundColor: 'var(--bg-muted)', padding: '2px 6px', borderRadius: '4px' }}>
                          🧑‍🔧 {mechanic}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        ⏱️ {duration}
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
                          onClick={() => onNavigateTab('doc')}
                          title="거래명세서 작성으로 이동"
                        >
                          명세서 발행
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

      {/* 3. 중간 영역: 오늘 ~ 이번 주 일정 (4개 탭) */}
      <section className="dash-section-card">
        <div className="dash-section-header">
          <div className="dash-section-title-group">
            <span style={{ fontSize: '1.25rem' }}>📅</span>
            <h2 className="dash-section-title">주간 일정 및 현황</h2>
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

        {/* 4개 탭 네비게이션 */}
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
            🤝 고객 관리 / 상담
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
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              {scheduleSubTab === 'shared' 
                ? '현재 다른 사업자가 공개 설정한 공유 일정이 없습니다.' 
                : '해당 탭에 등록된 이번 주 일정이 없습니다.'}
            </div>
          ) : (
            weeklyScheduleGroups.map(group => {
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
                          {item.customer_name && <span>👤 거래처: <b>{item.customer_name}</b></span>}
                          {item.machine && <span>🚜 기종: {item.machine}</span>}
                          {item.phone && <span>📞 {item.phone}</span>}
                          {item.is_shared && <span style={{ color: 'var(--accent-blue)', fontWeight: '700' }}>[공개일정]</span>}
                        </div>
                        {item.memo && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            메모: {item.memo}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* 4. 하단 영역: 미수금 상세 */}
      <section className="dash-section-card">
        <div className="dash-section-header">
          <div className="dash-section-title-group">
            <span style={{ fontSize: '1.25rem' }}>💰</span>
            <h2 className="dash-section-title">거래처별 미수금 현황</h2>
            <span className="dash-section-badge" style={{ backgroundColor: 'var(--accent-red-bg)', color: 'var(--accent-red)' }}>
              총 {unpaidCustomers.length}곳
            </span>
          </div>
          <button
            type="button"
            className="btn btn-outline"
            style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem' }}
            onClick={() => onNavigateTab('accounting')}
          >
            회계장부 전체보기 →
          </button>
        </div>

        {/* 오늘 입금 예정 강조 배너 */}
        {metrics.todayExpectedPayment > 0 && (
          <div className="unpaid-highlight-banner">
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: '700' }}>⚡ 오늘 입금 예정 총액</div>
              <div style={{ fontSize: '1.25rem', fontWeight: '900', color: 'var(--text-main)' }}>
                ₩ {metrics.todayExpectedPayment.toLocaleString()}
              </div>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              style={{ fontSize: '0.75rem' }}
              onClick={() => onNavigateTab('accounting')}
            >
              입금 확인 및 수납 처리
            </button>
          </div>
        )}

        {/* 미수금 카드 그리드 */}
        {unpaidCustomers.length === 0 ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎉</div>
            <div style={{ fontWeight: '700' }}>미수금 없이 모든 거래처 정산이 완료되었습니다!</div>
          </div>
        ) : (
          <div className="unpaid-cards-grid">
            {unpaidCustomers.slice(0, 6).map(cust => (
              <div
                key={cust.name}
                className="unpaid-card"
                onClick={() => {
                  if (onSelectCustomer) onSelectCustomer(cust);
                  onNavigateTab('accounting');
                }}
              >
                <div>
                  <div className="unpaid-card-header">
                    <span className="unpaid-customer-name">{cust.name}</span>
                    <span className="unpaid-overdue-tag">
                      {cust.overdueDays > 0 ? `${cust.overdueDays}일 경과` : '신규 발생'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                    담당: {cust.person} | 연락처: {cust.phone}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>미수 잔액 (총 {cust.docCount}건)</div>
                  <div className="unpaid-amount">₩ {cust.totalUnpaid.toLocaleString()}</div>
                </div>

                {cust.memo && (
                  <div className="unpaid-memo-box">
                    📝 {cust.memo}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
