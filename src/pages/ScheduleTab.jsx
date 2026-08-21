// 🎨 TEAM D.D SCHEDULE & CALENDAR TAB (MULTI-DAY & PRIVACY SUPPORT)
import React, { useState, useMemo } from 'react';
import { areSupplierKeysEquivalent } from '../utils/validation.js';

function getDatesInRange(startDateStr, endDateStr) {
  if (!startDateStr) return [];
  if (!endDateStr || endDateStr <= startDateStr) return [startDateStr];
  const dates = [];
  try {
    let curr = new Date(startDateStr);
    const end = new Date(endDateStr);
    let count = 0;
    while (curr <= end && count < 90) {
      const y = curr.getFullYear();
      const m = String(curr.getMonth() + 1).padStart(2, '0');
      const d = String(curr.getDate()).padStart(2, '0');
      dates.push(`${y}-${m}-${d}`);
      curr.setDate(curr.getDate() + 1);
      count++;
    }
  } catch (err) {
    return [startDateStr];
  }
  return dates.length > 0 ? dates : [startDateStr];
}

export default function ScheduleTab({
  schedules = [],
  documentsList = [],
  selectedSupplierKey = 'sejin',
  suppliersList = [],
  onSaveSchedule,
  onDeleteSchedule,
  onUpdateScheduleStatus,
  onNavigateToDoc,
  onLoadDocument,
  onPreviewDocument
}) {
  const currentDate = new Date();
  const todayStr = currentDate.toISOString().split('T')[0];

  const [currentYear, setCurrentYear] = useState(currentDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(currentDate.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);

  const [privacyFilter, setPrivacyFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState({
    schedule: true,
    repair_doc: true,
    payment: true,
    estimate: true
  });
  const [searchQuery, setSearchQuery] = useState('');

  const [form, setForm] = useState({
    title: '',
    event_date: todayStr,
    end_date: todayStr,
    is_period: false,
    event_time: '10:00',
    category: 'repair',
    customer_name: '',
    customer_phone: '',
    machine_info: '',
    amount: '',
    memo: '',
    is_shared: false
  });

  const firstDayOfMonth = new Date(currentYear, currentMonth - 1, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const prevMonthDays = new Date(currentYear, currentMonth - 1, 0).getDate();

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentYear(prev => prev - 1);
      setCurrentMonth(12);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentYear(prev => prev + 1);
      setCurrentMonth(1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth() + 1);
    setSelectedDate(todayStr);
  };

  const filteredSchedules = useMemo(() => {
    const userRole = sessionStorage.getItem('dd_user_role') || 'supplier';
    return (schedules || []).filter(item => {
      const isMine = userRole === 'admin' || areSupplierKeysEquivalent(item.supplier_key, selectedSupplierKey);
      const isPublic = item.is_shared === true;
      if (userRole !== 'admin' && !isMine && !isPublic) return false;

      if (privacyFilter === 'private' && (!isMine || isPublic)) return false;
      if (privacyFilter === 'my_public' && (!isMine || !isPublic)) return false;
      if (privacyFilter === 'others_public' && (isMine || !isPublic)) return false;

      if (!categoryFilter.schedule) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const t = (item.title || '').toLowerCase();
        const c = (item.customer_name || '').toLowerCase();
        const m = (item.machine_info || item.machine || '').toLowerCase();
        const memo = (item.memo || '').toLowerCase();
        if (!t.includes(q) && !c.includes(q) && !m.includes(q) && !memo.includes(q)) return false;
      }
      return true;
    });
  }, [schedules, selectedSupplierKey, privacyFilter, categoryFilter, searchQuery]);

  const documentEvents = useMemo(() => {
    const userRole = sessionStorage.getItem('dd_user_role') || 'supplier';
    const events = [];
    (documentsList || []).forEach(doc => {
      if (doc.is_deleted) return;
      const isMine = userRole === 'admin' || areSupplierKeysEquivalent(doc.supplier_key || doc.supplierKey, selectedSupplierKey);
      const isDocPublic = doc.is_shared === true;
      if (userRole !== 'admin' && !isMine && !isDocPublic) return;

      const custName = doc.customer_name || doc.customer_data?.name || doc.customer?.name || '고객';
      const machine = doc.customer_data?.selectedMachine || '';
      const itemsSum = (doc.items || []).map(i => i.name).filter(Boolean).join(', ');
      const dDate = doc.doc_date || doc.docDate;
      const dType = doc.doc_type || doc.docType;

      if (categoryFilter.repair_doc && dDate && (dType === '거래명세서' || dType === '청구서')) {
        events.push({
          id: 'doc_repair_' + doc.id,
          isDocEvent: true,
          rawDoc: doc,
          type: 'repair_doc',
          event_date: dDate,
          event_time: doc.doc_time || doc.docTime || '',
          title: `📦 [${dType}] ${custName}`,
          subtitle: machine ? `(${machine}) ${itemsSum}` : itemsSum,
          supplier_key: doc.supplier_key || doc.supplierKey,
          is_shared: isDocPublic,
          isMine: isMine
        });
      }

      if (categoryFilter.payment && doc.payment_date && dType !== '견적서') {
        const balance = (Number(doc.total_amount || 0) || (doc.items || []).reduce((s, i) => s + (i.qty * i.price), 0)) - (Number(doc.paid) || 0);
        const isPaidComplete = doc.payment_status === '입금완료' || balance <= 0;
        events.push({
          id: 'doc_payment_' + doc.id,
          isDocEvent: true,
          rawDoc: doc,
          type: 'payment',
          event_date: doc.payment_date,
          event_time: '',
          title: isPaidComplete ? `🟢 [완납] ${custName}` : `🔴 [결제/미수] ${custName}`,
          subtitle: `문서번호: ${doc.doc_no || doc.docNo || ''}`,
          supplier_key: doc.supplier_key || doc.supplierKey,
          is_shared: isDocPublic,
          isMine: isMine
        });
      }

      if (categoryFilter.estimate && dDate && dType === '견적서') {
        events.push({
          id: 'doc_estimate_' + doc.id,
          isDocEvent: true,
          rawDoc: doc,
          type: 'estimate',
          event_date: dDate,
          event_time: doc.doc_time || doc.docTime || '',
          title: `📋 [견적] ${custName}`,
          subtitle: machine ? `(${machine}) ${itemsSum}` : itemsSum,
          supplier_key: doc.supplier_key || doc.supplierKey,
          is_shared: isDocPublic,
          isMine: isMine
        });
      }
    });
    return events;
  }, [documentsList, selectedSupplierKey, categoryFilter]);

  const eventsByDate = useMemo(() => {
    const map = {};
    filteredSchedules.forEach(sch => {
      const start = sch.start_date || sch.event_date || sch.date;
      if (!start) return;
      const end = sch.end_date || start;
      const isPeriod = end && end > start;
      const dateList = isPeriod ? getDatesInRange(start, end) : [start];

      dateList.forEach((d, idx) => {
        if (!map[d]) map[d] = [];
        map[d].push({
          ...sch,
          isSchedule: true,
          isPeriod: isPeriod,
          periodInfo: isPeriod ? `${start.slice(5)} ~ ${end.slice(5)}` : null,
          isPeriodStart: idx === 0,
          isPeriodEnd: idx === dateList.length - 1
        });
      });
    });
    documentEvents.forEach(docEv => {
      const d = docEv.event_date;
      if (!d) return;
      if (!map[d]) map[d] = [];
      map[d].push(docEv);
    });
    return map;
  }, [filteredSchedules, documentEvents]);

  const handleOpenAddEvent = (dateStr = null) => {
    const targetDate = dateStr || selectedDate || todayStr;
    setForm({
      id: null,
      title: '',
      event_date: targetDate,
      end_date: targetDate,
      is_period: false,
      event_time: '10:00',
      category: 'repair',
      customer_name: '',
      customer_phone: '',
      machine_info: '',
      amount: '',
      memo: '',
      is_shared: false
    });
    setEditingEvent(null);
    setShowEventModal(true);
  };

  const handleOpenEditEvent = (ev) => {
    if (ev.isDocEvent) {
      if (onPreviewDocument && ev.rawDoc) {
        onPreviewDocument(ev.rawDoc);
      } else if (onLoadDocument && ev.rawDoc) {
        onLoadDocument(ev.rawDoc);
      }
      return;
    }
    const hasPeriod = Boolean(ev.end_date && ev.end_date > (ev.event_date || ev.start_date));
    setForm({
      id: ev.id,
      title: ev.title || '',
      event_date: ev.event_date || ev.start_date || '',
      end_date: ev.end_date || ev.event_date || ev.start_date || '',
      is_period: hasPeriod,
      event_time: ev.event_time || ev.schedule_time || '',
      category: ev.category || 'repair',
      customer_name: ev.customer_name || '',
      customer_phone: ev.customer_phone || ev.phone || '',
      machine_info: ev.machine_info || ev.machine || '',
      amount: ev.amount || '',
      memo: ev.memo || '',
      is_shared: ev.is_shared === true
    });
    setEditingEvent(ev);
    setShowEventModal(true);
  };

  const handleSaveEvent = async () => {
    if (!form.title.trim()) {
      alert('일정 제목을 입력해 주세요.');
      return;
    }
    if (!form.event_date) {
      alert('일정 시작 날짜를 선택해 주세요.');
      return;
    }
    const finalEndDate = form.is_period ? (form.end_date || form.event_date) : form.event_date;
    const payload = {
      ...form,
      start_date: form.event_date,
      end_date: finalEndDate,
      id: form.id || `sch_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      supplier_key: selectedSupplierKey,
      amount: Number(form.amount) || 0
    };
    if (onSaveSchedule) {
      await onSaveSchedule(payload, !!editingEvent);
    }
    setShowEventModal(false);
  };

  const handleDeleteEvent = async (id) => {
    if (!window.confirm('이 일정을 삭제하시겠습니까?')) return;
    if (onDeleteSchedule) {
      await onDeleteSchedule(id);
    }
    setShowEventModal(false);
  };

  const calendarCells = useMemo(() => {
    const cells = [];
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const m = currentMonth === 1 ? 12 : currentMonth - 1;
      const y = currentMonth === 1 ? currentYear - 1 : currentYear;
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ dayNumber: d, dateStr: dateStr, isCurrentMonth: false, events: eventsByDate[dateStr] || [] });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ dayNumber: d, dateStr: dateStr, isCurrentMonth: true, events: eventsByDate[dateStr] || [] });
    }
    const totalCells = cells.length;
    const remaining = 35 - totalCells > 0 ? 35 - totalCells : (42 - totalCells > 0 ? 42 - totalCells : 0);
    for (let d = 1; d <= remaining; d++) {
      const m = currentMonth === 12 ? 1 : currentMonth + 1;
      const y = currentMonth === 12 ? currentYear + 1 : currentYear;
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ dayNumber: d, dateStr: dateStr, isCurrentMonth: false, events: eventsByDate[dateStr] || [] });
    }
    return cells;
  }, [currentYear, currentMonth, firstDayOfMonth, daysInMonth, prevMonthDays, eventsByDate]);

  return (
    <div className="cal-container">
      {/* Header Toolbar */}
      <div className="card-box" style={{ marginBottom: '0.5rem', padding: '0.625rem 0.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: '900', color: 'var(--c-navy-dark)', display: 'flex', alignItems: 'center', gap: '4px', margin: 0 }}>
              <span>📅</span> {`${currentYear}년 ${currentMonth}월`}
            </h2>
            <button type="button" className="btn btn-outline btn-sm" onClick={handlePrevMonth} title="이전 달">◀</button>
            <button type="button" className="btn btn-outline btn-sm" onClick={handleToday}>오늘</button>
            <button type="button" className="btn btn-outline btn-sm" onClick={handleNextMonth} title="다음 달">▶</button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap' }}>
            {sessionStorage.getItem('dd_user_role') === 'admin' && (
              <select
                className="form-select"
                style={{ width: '130px', height: '34px', fontSize: '0.8125rem' }}
                value={selectedSupplierKey}
                onChange={e => {
                  const val = e.target.value;
                  if (val) sessionStorage.setItem('dd_selected_supplier_key', val);
                }}
              >
                {suppliersList.map(s => (
                  <option key={s.id} value={s.id}>{s.name || s.company}</option>
                ))}
              </select>
            )}
            <select
              className="form-select"
              style={{ width: '140px', height: '34px', fontSize: '0.8125rem' }}
              value={privacyFilter}
              onChange={e => setPrivacyFilter(e.target.value)}
            >
              <option value="all">🛡️ 전체 일정 보기</option>
              <option value="private">🔒 내 비공개 일정</option>
              <option value="my_public">🔓 내 공개 일정</option>
              <option value="others_public">🌐 타공급자 공유</option>
            </select>
            <input
              type="text"
              className="form-input"
              style={{ width: '140px', height: '34px', fontSize: '0.8125rem' }}
              placeholder="🔍 일정 검색..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            <button
              type="button"
              className="btn btn-primary"
              style={{ height: '34px', fontSize: '0.8125rem', fontWeight: '800' }}
              onClick={() => handleOpenAddEvent()}
            >
              + 새 일정 등록
            </button>
          </div>
        </div>
      </div>

      {/* Main Dual-Responsive Calendar Grid */}
      <div className="cal-grid-wrap card-box" style={{ padding: '0', overflow: 'hidden' }}>
        {/* Weekday Headers */}
        <div className="cal-grid-header" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', backgroundColor: 'var(--c-blue-lightest)', borderBottom: '1px solid var(--border-color)', textAlign: 'center', fontWeight: '800', fontSize: '0.8125rem' }}>
          <div style={{ padding: '0.5rem', color: '#D92D20' }}>일</div>
          <div style={{ padding: '0.5rem', color: 'var(--c-navy-dark)' }}>월</div>
          <div style={{ padding: '0.5rem', color: 'var(--c-navy-dark)' }}>화</div>
          <div style={{ padding: '0.5rem', color: 'var(--c-navy-dark)' }}>수</div>
          <div style={{ padding: '0.5rem', color: 'var(--c-navy-dark)' }}>목</div>
          <div style={{ padding: '0.5rem', color: 'var(--c-navy-dark)' }}>금</div>
          <div style={{ padding: '0.5rem', color: 'var(--c-blue-accent)' }}>토</div>
        </div>

        {/* Calendar Month Cells */}
        <div className="cal-cells-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {calendarCells.map((cell, idx) => {
            const isToday = cell.dateStr === todayStr;
            const isSelected = cell.dateStr === selectedDate;
            const hasEvents = cell.events && cell.events.length > 0;
            return (
              <div
                key={`${cell.dateStr}_${idx}`}
                className={`cal-day-cell ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''} ${!cell.isCurrentMonth ? 'other-month' : ''}`}
                style={{
                  minHeight: '80px',
                  padding: '4px',
                  borderRight: (idx + 1) % 7 === 0 ? 'none' : '1px solid var(--border-color)',
                  borderBottom: '1px solid var(--border-color)',
                  backgroundColor: isSelected ? 'var(--c-blue-light)' : (isToday ? '#FFFBEB' : (cell.isCurrentMonth ? '#FFFFFF' : '#FAFAFA')),
                  cursor: 'pointer',
                  position: 'relative'
                }}
                onClick={() => setSelectedDate(cell.dateStr)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: isToday || isSelected ? '900' : '700',
                      color: isToday ? '#D92D20' : (cell.isCurrentMonth ? 'var(--c-navy-dark)' : 'var(--text-muted)'),
                      width: '20px',
                      height: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '50%',
                      backgroundColor: isToday ? '#FEE4E2' : 'transparent'
                    }}
                  >
                    {cell.dayNumber}
                  </span>
                  {hasEvents && (
                    <span className="cal-event-count" style={{ fontSize: '10px', fontWeight: '800', color: 'var(--c-blue-accent)' }}>
                      {`${cell.events.length}건`}
                    </span>
                  )}
                </div>

                {/* PC Desktop Badge List */}
                <div className="cal-desktop-badges" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {(cell.events || []).slice(0, 3).map((ev, eIdx) => {
                    const isPrivate = ev.is_shared === false;
                    const isPeriod = ev.isPeriod;
                    let badgeBg = '#E8F8F0';
                    let badgeColor = '#028A3E';
                    if (ev.type === 'payment') { badgeBg = '#FEF3F2'; badgeColor = '#D92D20'; }
                    else if (ev.type === 'estimate') { badgeBg = '#EFF4FE'; badgeColor = '#1B64DA'; }
                    else if (isPrivate) { badgeBg = '#FFFBEB'; badgeColor = '#92400E'; }
                    else if (isPeriod) { badgeBg = 'var(--c-blue-light)'; badgeColor = 'var(--c-navy-primary)'; }

                    return (
                      <div
                        key={`${ev.id}_${eIdx}`}
                        className="cal-badge-item"
                        style={{ backgroundColor: badgeBg, color: badgeColor }}
                        title={(ev.periodInfo ? `[${ev.periodInfo}] ` : '') + ev.title}
                        onClick={(e) => { e.stopPropagation(); handleOpenEditEvent(ev); }}
                      >
                        {(isPeriod ? '📅 ' : (isPrivate ? '🔒 ' : '')) + ev.title}
                      </div>
                    );
                  })}
                  {(cell.events || []).length > 3 && (
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'right', fontWeight: '700' }}>
                      {`+${cell.events.length - 3}개 더보기`}
                    </div>
                  )}
                </div>

                {/* Mobile Dot Indicators */}
                <div className="cal-dot-container" style={{ display: 'flex', gap: '3px', flexWrap: 'wrap', marginTop: '2px' }}>
                  {(cell.events || []).slice(0, 4).map((ev, eIdx) => {
                    let dotColor = 'var(--c-blue-accent)';
                    if (ev.type === 'payment') dotColor = '#D92D20';
                    else if (ev.type === 'estimate') dotColor = '#1B64DA';
                    else if (ev.is_shared === false) dotColor = '#F59E0B';
                    return (
                      <span
                        key={`dot_${ev.id}_${eIdx}`}
                        style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: dotColor, display: 'inline-block' }}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day's Detailed Events List Panel */}
      {selectedDate && (
        <div className="card-box" style={{ marginTop: '0.75rem', padding: '0.75rem 1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.375rem' }}>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: '900', color: 'var(--c-navy-dark)', margin: 0 }}>
              {`📋 ${selectedDate} 일정 내역 (${(eventsByDate[selectedDate] || []).length}건)`}
            </h3>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => handleOpenAddEvent(selectedDate)}
            >
              + 이 날짜에 일정 추가
            </button>
          </div>
          {(eventsByDate[selectedDate] || []).length === 0 ? (
            <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
              등록된 일정이 없습니다. '+ 이 날짜에 일정 추가' 버튼으로 일정을 등록해보세요.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {(eventsByDate[selectedDate] || []).map((ev, idx) => {
                const isPrivate = ev.is_shared === false;
                return (
                  <div
                    key={`detail_${ev.id}_${idx}`}
                    style={{
                      padding: '0.625rem 0.75rem',
                      borderRadius: '8px',
                      backgroundColor: 'var(--bg-muted)',
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '8px'
                    }}
                  >
                    <div style={{ flex: 1, minWidth: '180px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: '800',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            backgroundColor: isPrivate ? '#FFFBEB' : '#E8F8F0',
                            color: isPrivate ? '#92400E' : '#028A3E',
                            border: `1px solid ${isPrivate ? '#FDE68A' : '#A3E9C4'}`
                          }}
                        >
                          {isPrivate ? '🔒 비공개' : '🔓 공개'}
                        </span>
                        {ev.periodInfo && (
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: '800',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              backgroundColor: 'var(--c-blue-light)',
                              color: 'var(--c-navy-primary)',
                              border: '1px solid var(--c-blue-soft)'
                            }}
                          >
                            {`📅 기간: ${ev.periodInfo}`}
                          </span>
                        )}
                        <span style={{ fontWeight: '800', fontSize: '0.875rem', color: 'var(--c-navy-dark)' }}>{ev.title}</span>
                      </div>
                      {ev.event_time && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{`⏰ 시간: ${ev.event_time}`}</div>}
                      {ev.customer_name && <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{`🏢 거래처: ${ev.customer_name} (${ev.customer_phone || ev.phone || '-'})`}</div>}
                      {(ev.machine_info || ev.machine) && <div style={{ fontSize: '11px', color: 'var(--c-blue-accent)' }}>{`🚜 기종: ${ev.machine_info || ev.machine}`}</div>}
                      {ev.memo && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{`📝 메모: ${ev.memo}`}</div>}
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {ev.isDocEvent ? (
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => { onLoadDocument && onLoadDocument(ev.rawDoc); }}
                        >
                          문서 열기
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => handleOpenEditEvent(ev)}
                        >
                          수정
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Event Modal */}
      {showEventModal && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="modal-content" style={{ maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ marginBottom: '1rem', fontWeight: '900', color: 'var(--c-navy-dark)' }}>
              {editingEvent ? '✏️ 일정 수정' : '➕ 새 일정 등록'}
            </h3>

            {/* 공개/비공개 선택 */}
            <div style={{ padding: '10px 12px', backgroundColor: form.is_shared ? '#E8F8F0' : '#FFFBEB', border: `2px solid ${form.is_shared ? '#A3E9C4' : '#FDE68A'}`, borderRadius: '8px', marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '900', color: 'var(--c-navy-dark)', marginBottom: '6px' }}>
                🛡️ 공개 여부 설정 (타 공급자 노출 제어)
              </label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: '700', fontSize: '0.8125rem', color: '#92400E' }}>
                  <input
                    type="radio"
                    name="is_shared"
                    checked={form.is_shared === false}
                    onChange={() => setForm({ ...form, is_shared: false })}
                  />
                  <span>🔒 비공개 (나만 보기 - 기본값)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: '700', fontSize: '0.8125rem', color: '#028A3E' }}>
                  <input
                    type="radio"
                    name="is_shared"
                    checked={form.is_shared === true}
                    onChange={() => setForm({ ...form, is_shared: true })}
                  />
                  <span>🔓 공개 (다른 공급자와 공유)</span>
                </label>
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                {form.is_shared ? '✓ 세진, 디에스 등 모든 공급자의 캘린더에 함께 노출됩니다.' : '🔒 오직 내 업체에만 표시되며 다른 공급자에게는 일체 노출되지 않습니다.'}
              </div>
            </div>

            {/* Form Inputs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label className="form-label">일정 제목 *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="예: 현대 14톤 메인펌프 수리 출장"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  autoFocus
                />
              </div>

              {/* 날짜 및 기간 설정 */}
              <div style={{ padding: '10px 12px', backgroundColor: 'var(--c-blue-lightest)', border: '1.5px solid var(--c-blue-soft)', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.8125rem', fontWeight: '800', color: 'var(--c-navy-dark)', margin: 0 }}>
                    📅 일정 날짜 / 기간 선택
                  </label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '700', color: !form.is_period ? 'var(--c-navy-primary)' : 'var(--text-muted)' }}>
                      <input
                        type="radio"
                        name="schedule_date_mode"
                        checked={!form.is_period}
                        onChange={() => setForm({ ...form, is_period: false, end_date: form.event_date })}
                      />
                      당일 (하루)
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '800', color: form.is_period ? 'var(--c-blue-accent)' : 'var(--text-muted)' }}>
                      <input
                        type="radio"
                        name="schedule_date_mode"
                        checked={form.is_period === true}
                        onChange={() => setForm({ ...form, is_period: true, end_date: form.end_date || form.event_date })}
                      />
                      기간 설정 (여러 날짜)
                    </label>
                  </div>
                </div>

                {form.is_period ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '6px', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--c-navy-primary)', marginBottom: '2px' }}>시작일 *</div>
                        <input type="date" className="form-input" value={form.event_date} onChange={e => setForm({ ...form, event_date: e.target.value })} />
                      </div>
                      <span style={{ fontWeight: '900', color: 'var(--c-navy-dark)', marginTop: '16px' }}>~</span>
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--c-navy-primary)', marginBottom: '2px' }}>종료일 *</div>
                        <input type="date" className="form-input" min={form.event_date} value={form.end_date || form.event_date} onChange={e => setForm({ ...form, end_date: e.target.value })} />
                      </div>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--c-navy-primary)', backgroundColor: 'var(--c-blue-light)', padding: '4px 8px', borderRadius: '4px', marginTop: '2px' }}>
                      {`💡 ${form.event_date}부터 ${form.end_date || form.event_date}까지 달력 모든 날짜에 연속 표시됩니다.`}
                    </div>
                    <div style={{ marginTop: '4px' }}>
                      <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '2px' }}>시간 (선택사항)</div>
                      <input type="time" className="form-input" value={form.event_time} onChange={e => setForm({ ...form, event_time: e.target.value })} />
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--c-navy-primary)', marginBottom: '2px' }}>일정 날짜 *</div>
                      <input type="date" className="form-input" value={form.event_date} onChange={e => setForm({ ...form, event_date: e.target.value, end_date: e.target.value })} />
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--c-navy-primary)', marginBottom: '2px' }}>시간</div>
                      <input type="time" className="form-input" value={form.event_time} onChange={e => setForm({ ...form, event_time: e.target.value })} />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="form-label">일정 분류</label>
                <select className="form-select" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                  <option value="repair">🚜 정비 / 출장 / 수리</option>
                  <option value="payment">💳 수금 / 결제 예정일</option>
                  <option value="estimate">📋 견적 제출 / 상담</option>
                  <option value="general">📌 일반 업무 / 기타</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label className="form-label">거래처명 (고객명)</label>
                  <input type="text" className="form-input" placeholder="예: 대성건설기계" value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })} />
                </div>
                <div>
                  <label className="form-label">연락처</label>
                  <input type="text" className="form-input" placeholder="010-0000-0000" value={form.customer_phone} onChange={e => setForm({ ...form, customer_phone: e.target.value })} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label className="form-label">장비/기종</label>
                  <input type="text" className="form-input" placeholder="예: DX140W 1호기" value={form.machine_info} onChange={e => setForm({ ...form, machine_info: e.target.value })} />
                </div>
                <div>
                  <label className="form-label">관련 금액 (원)</label>
                  <input type="number" className="form-input" placeholder="0" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
                </div>
              </div>

              <div>
                <label className="form-label">상세 메모</label>
                <textarea className="form-input" style={{ minHeight: '60px' }} placeholder="특이사항, 챙길 부품, 현장 위치 등" value={form.memo} onChange={e => setForm({ ...form, memo: e.target.value })} />
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0' }}>
              {editingEvent ? (
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ color: '#dc2626', borderColor: '#fca5a5' }}
                  onClick={() => handleDeleteEvent(editingEvent.id)}
                >
                  🗑️ 삭제
                </button>
              ) : (
                <div />
              )}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowEventModal(false)}>취소</button>
                <button type="button" className="btn btn-primary" style={{ backgroundColor: '#03C75A', borderColor: '#03C75A', fontWeight: '800' }} onClick={handleSaveEvent}>
                  💾 일정 저장
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
