import React, { useState, useMemo } from 'react';

export default function ScheduleTab({
  schedules = [],
  documentsList = [],
  selectedSupplierKey = 'sejin',
  suppliersList = [],
  onSaveSchedule,
  onDeleteSchedule,
  onLoadDocument
}) {
  const currentDate = new Date();
  const todayStr = currentDate.toISOString().split('T')[0];

  const [currentYear, setCurrentYear] = useState(currentDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(currentDate.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState(todayStr); // 🌟 기본 선택을 오늘 날짜로 지정하여 하단에 바로 표시
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);

  // 🔒 보안/공개 범위 필터: 기본은 'all'
  const [privacyFilter, setPrivacyFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState({
    schedule: true,
    repair_doc: true,
    payment: true,
    estimate: true
  });
  const [searchQuery, setSearchQuery] = useState('');

  // 🔒 일정 등록 폼: 기본값은 비공개(is_shared: false)
  const [form, setForm] = useState({
    title: '',
    event_date: todayStr,
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
    if (currentMonth === 1) { setCurrentYear(prev => prev - 1); setCurrentMonth(12); }
    else { setCurrentMonth(prev => prev - 1); }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) { setCurrentYear(prev => prev + 1); setCurrentMonth(1); }
    else { setCurrentMonth(prev => prev + 1); }
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth() + 1);
    setSelectedDate(todayStr);
  };

  // 1. 보안 필터링 적용된 등록 일정 목록
  const filteredSchedules = useMemo(() => {
    return (schedules || []).filter(item => {
      const isMine = item.supplier_key === selectedSupplierKey;
      const isPublic = item.is_shared === true;
      if (!isMine && !isPublic) return false;

      if (privacyFilter === 'private' && (!isMine || isPublic)) return false;
      if (privacyFilter === 'my_public' && (!isMine || !isPublic)) return false;
      if (privacyFilter === 'others_public' && (isMine || !isPublic)) return false;

      if (!categoryFilter.schedule) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const t = (item.title || '').toLowerCase();
        const c = (item.customer_name || '').toLowerCase();
        const m = (item.machine_info || '').toLowerCase();
        const memo = (item.memo || '').toLowerCase();
        if (!t.includes(q) && !c.includes(q) && !m.includes(q) && !memo.includes(q)) return false;
      }
      return true;
    });
  }, [schedules, selectedSupplierKey, privacyFilter, categoryFilter, searchQuery]);

  // 2. 보안 필터링 적용된 문서(명세서/결제일/견적서) 연동 일정
  const documentEvents = useMemo(() => {
    const events = [];
    (documentsList || []).forEach(doc => {
      if (doc.is_deleted) return;
      const isMine = doc.supplier_key === selectedSupplierKey;
      const isDocPublic = doc.is_shared === true;
      if (!isMine && !isDocPublic) return;

      const custName = doc.customer_name || doc.customer_data?.name || '고객';
      const machine = doc.customer_data?.selectedMachine || '';
      const itemsSum = (doc.items || []).map(i => i.name).filter(Boolean).join(', ');

      if (categoryFilter.repair_doc && doc.doc_date && (doc.doc_type === '거래명세서' || doc.doc_type === '청구서')) {
        events.push({
          id: `doc_repair_${doc.id}`,
          isDocEvent: true,
          rawDoc: doc,
          type: 'repair_doc',
          event_date: doc.doc_date,
          event_time: doc.doc_time || '',
          title: `📦 [${doc.doc_type}] ${custName}`,
          subtitle: machine ? `(${machine}) ${itemsSum}` : itemsSum,
          supplier_key: doc.supplier_key,
          is_shared: isDocPublic,
          isMine
        });
      }

      if (categoryFilter.payment && doc.payment_date && doc.doc_type !== '견적서') {
        const balance = (Number(doc.total_amount || 0) || (doc.items || []).reduce((s, i) => s + (i.qty * i.price), 0)) - (Number(doc.paid) || 0);
        const isPaidComplete = doc.payment_status === '입금완료' || balance <= 0;
        events.push({
          id: `doc_payment_${doc.id}`,
          isDocEvent: true,
          rawDoc: doc,
          type: 'payment',
          event_date: doc.payment_date,
          event_time: '',
          title: isPaidComplete ? `🟢 [완납] ${custName}` : `🔴 [결제/미수] ${custName}`,
          subtitle: `문서번호: ${doc.doc_no || ''}`,
          supplier_key: doc.supplier_key,
          is_shared: isDocPublic,
          isMine
        });
      }

      if (categoryFilter.estimate && doc.doc_date && doc.doc_type === '견적서') {
        events.push({
          id: `doc_estimate_${doc.id}`,
          isDocEvent: true,
          rawDoc: doc,
          type: 'estimate',
          event_date: doc.doc_date,
          event_time: doc.doc_time || '',
          title: `📋 [견적] ${custName}`,
          subtitle: machine ? `(${machine}) ${itemsSum}` : itemsSum,
          supplier_key: doc.supplier_key,
          is_shared: isDocPublic,
          isMine
        });
      }
    });
    return events;
  }, [documentsList, selectedSupplierKey, categoryFilter]);

  const eventsByDate = useMemo(() => {
    const map = {};
    filteredSchedules.forEach(sch => {
      const d = sch.event_date;
      if (!d) return;
      if (!map[d]) map[d] = [];
      map[d].push({ ...sch, isSchedule: true });
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
      if (onLoadDocument && ev.rawDoc) {
        onLoadDocument(ev.rawDoc);
      }
      return;
    }
    setForm({
      id: ev.id,
      title: ev.title || '',
      event_date: ev.event_date || '',
      event_time: ev.event_time || '',
      category: ev.category || 'repair',
      customer_name: ev.customer_name || '',
      customer_phone: ev.customer_phone || '',
      machine_info: ev.machine_info || '',
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
      alert('일정 날짜를 선택해 주세요.');
      return;
    }
    const payload = {
      ...form,
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
    if (!confirm('이 일정을 삭제하시겠습니까?')) return;
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
      cells.push({ dayNumber: d, dateStr, isCurrentMonth: false, events: eventsByDate[dateStr] || [] });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ dayNumber: d, dateStr, isCurrentMonth: true, events: eventsByDate[dateStr] || [] });
    }
    const totalCells = cells.length;
    const remaining = 35 - totalCells > 0 ? 35 - totalCells : (42 - totalCells > 0 ? 42 - totalCells : 0);
    for (let d = 1; d <= remaining; d++) {
      const m = currentMonth === 12 ? 1 : currentMonth + 1;
      const y = currentMonth === 12 ? currentYear + 1 : currentYear;
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ dayNumber: d, dateStr, isCurrentMonth: false, events: eventsByDate[dateStr] || [] });
    }
    return cells;
  }, [currentYear, currentMonth, firstDayOfMonth, daysInMonth, prevMonthDays, eventsByDate]);

  return (
    <div className="cal-container">
      {/* Header Toolbar */}
      <div className="card-box" style={{ marginBottom: '0.5rem', padding: '0.625rem 0.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: '900', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '4px', margin: 0 }}>
              <span>📅</span> {currentYear}년 {currentMonth}월
            </h2>
            <div style={{ display: 'flex', gap: '3px' }}>
              <button type="button" className="btn btn-outline" style={{ padding: '3px 7px', fontSize: '11px', minHeight: '28px' }} onClick={handlePrevMonth}>◀</button>
              <button type="button" className="btn btn-outline" style={{ padding: '3px 8px', fontSize: '11px', fontWeight: '700', minHeight: '28px' }} onClick={handleToday}>오늘</button>
              <button type="button" className="btn btn-outline" style={{ padding: '3px 7px', fontSize: '11px', minHeight: '28px' }} onClick={handleNextMonth}>▶</button>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            style={{ padding: '6px 12px', fontSize: '0.8125rem', fontWeight: '800', backgroundColor: '#1E6091', borderColor: '#1E6091', minHeight: '32px' }}
            onClick={() => handleOpenAddEvent()}
          >
            ➕ 새 일정 등록
          </button>
        </div>

        {/* Filters Bar */}
        <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px', fontSize: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: '800', color: '#334155', marginRight: '2px' }}>🔒 보안:</span>
            <button
              type="button"
              style={{ padding: '2px 7px', borderRadius: '4px', border: '1px solid #cbd5e1', cursor: 'pointer', backgroundColor: privacyFilter === 'all' ? '#1e293b' : '#f8fafc', color: privacyFilter === 'all' ? '#fff' : '#475569', fontWeight: privacyFilter === 'all' ? '800' : '500' }}
              onClick={() => setPrivacyFilter('all')}
            >
              전체
            </button>
            <button
              type="button"
              style={{ padding: '2px 7px', borderRadius: '4px', border: '1px solid #fed7aa', cursor: 'pointer', backgroundColor: privacyFilter === 'private' ? '#ea580c' : '#fff7ed', color: privacyFilter === 'private' ? '#fff' : '#c2410c', fontWeight: privacyFilter === 'private' ? '800' : '700' }}
              onClick={() => setPrivacyFilter('private')}
            >
              🔒 비공개
            </button>
            <button
              type="button"
              style={{ padding: '2px 7px', borderRadius: '4px', border: '1px solid #bbf7d0', cursor: 'pointer', backgroundColor: privacyFilter === 'my_public' ? '#16a34a' : '#f0fdf4', color: privacyFilter === 'my_public' ? '#fff' : '#15803d', fontWeight: privacyFilter === 'my_public' ? '800' : '700' }}
              onClick={() => setPrivacyFilter('my_public')}
            >
              🔓 공개
            </button>
            <button
              type="button"
              style={{ padding: '2px 7px', borderRadius: '4px', border: '1px solid #bfdbfe', cursor: 'pointer', backgroundColor: privacyFilter === 'others_public' ? '#2563eb' : '#eff6ff', color: privacyFilter === 'others_public' ? '#fff' : '#1d4ed8', fontWeight: privacyFilter === 'others_public' ? '800' : '700' }}
              onClick={() => setPrivacyFilter('others_public')}
            >
              🌐 공유
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer' }}>
              <input type="checkbox" checked={categoryFilter.schedule} onChange={e => setCategoryFilter({ ...categoryFilter, schedule: e.target.checked })} />
              <span>📌 일정</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer' }}>
              <input type="checkbox" checked={categoryFilter.repair_doc} onChange={e => setCategoryFilter({ ...categoryFilter, repair_doc: e.target.checked })} />
              <span>📦 명세서</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer' }}>
              <input type="checkbox" checked={categoryFilter.payment} onChange={e => setCategoryFilter({ ...categoryFilter, payment: e.target.checked })} />
              <span>💳 결제일</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer' }}>
              <input type="checkbox" checked={categoryFilter.estimate} onChange={e => setCategoryFilter({ ...categoryFilter, estimate: e.target.checked })} />
              <span>📋 견적</span>
            </label>
          </div>
        </div>
      </div>

      {/* Main Calendar Grid */}
      <div className="card-box" style={{ padding: '0', overflow: 'hidden' }}>
        {/* Day of Week Header */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'center', fontWeight: '800', fontSize: '0.75rem' }}>
          {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
            <div key={day} style={{ padding: '6px 0', color: idx === 0 ? '#ef4444' : (idx === 6 ? '#2563eb' : '#334155'), backgroundColor: idx === 0 ? '#fef2f2' : (idx === 6 ? '#eff6ff' : 'transparent') }}>
              {day}
            </div>
          ))}
        </div>

        {/* Grid Cells */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', backgroundColor: '#cbd5e1', gap: '1px' }}>
          {calendarCells.map((cell, idx) => {
            const isToday = cell.dateStr === todayStr;
            const isSelected = cell.dateStr === selectedDate;
            const dayOfWeek = idx % 7;

            return (
              <div
                key={idx}
                className="cal-cell"
                style={{
                  backgroundColor: cell.isCurrentMonth ? '#ffffff' : '#f8fafc',
                  outline: isSelected ? '2px solid #1E6091' : (isToday ? '2px solid #3b82f6' : 'none'),
                  outlineOffset: '-2px'
                }}
                onClick={() => setSelectedDate(cell.dateStr)}
              >
                {/* Day Number Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '1px' }}>
                  <span style={{
                    fontSize: '0.8125rem',
                    fontWeight: isToday ? '900' : '700',
                    color: !cell.isCurrentMonth ? '#cbd5e1' : (dayOfWeek === 0 ? '#ef4444' : (dayOfWeek === 6 ? '#2563eb' : '#1e293b')),
                    backgroundColor: isToday ? '#3b82f6' : 'transparent',
                    color: isToday ? '#ffffff' : undefined,
                    padding: isToday ? '1px 5px' : '0',
                    borderRadius: isToday ? '6px' : '0',
                    display: 'inline-block'
                  }}>
                    {cell.dayNumber}
                  </span>
                  {cell.events.length > 0 && (
                    <span style={{ fontSize: '9px', fontWeight: '800', color: '#64748b' }}>
                      {cell.events.length}건
                    </span>
                  )}
                </div>

                {/* 📱 [모바일 뷰] 컬러 점(Dot) 인디케이터 */}
                <div className="cal-dot-container">
                  {cell.events.slice(0, 4).map((ev, dIdx) => {
                    let dotColor = '#3b82f6';
                    if (ev.type === 'payment') dotColor = '#ef4444';
                    else if (ev.type === 'estimate') dotColor = '#ea580c';
                    else if (ev.is_shared) dotColor = '#10b981';
                    else dotColor = '#f59e0b';

                    return <span key={dIdx} className="cal-dot" style={{ backgroundColor: dotColor }} title={ev.title} />;
                  })}
                  {cell.events.length > 4 && (
                    <span style={{ fontSize: '8px', fontWeight: '900', color: '#64748b', lineHeight: 1 }}>+</span>
                  )}
                </div>

                {/* 💻 [PC 뷰] 텍스트 풀사이즈 뱃지 */}
                <div className="cal-desktop-badges">
                  {cell.events.slice(0, 3).map(ev => {
                    const isPrivate = !ev.is_shared;
                    let badgeBg = '#f1f5f9';
                    let badgeColor = '#334155';
                    let badgeBorder = '#cbd5e1';

                    if (ev.type === 'payment') {
                      badgeBg = '#fef2f2'; badgeColor = '#991b1b'; badgeBorder = '#fca5a5';
                    } else if (ev.type === 'estimate') {
                      badgeBg = '#fff7ed'; badgeColor = '#c2410c'; badgeBorder = '#fdba74';
                    } else if (ev.is_shared) {
                      badgeBg = '#eff6ff'; badgeColor = '#1d4ed8'; badgeBorder = '#bfdbfe';
                    } else {
                      badgeBg = '#fef3c7'; badgeColor = '#92400e'; badgeBorder = '#fde68a';
                    }

                    return (
                      <div
                        key={ev.id}
                        style={{
                          fontSize: '11px',
                          fontWeight: '700',
                          padding: '2px 4px',
                          borderRadius: '4px',
                          backgroundColor: badgeBg,
                          color: badgeColor,
                          border: `1px solid ${badgeBorder}`,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          lineHeight: '1.2'
                        }}
                        title={`${ev.title}\n${ev.subtitle || ''}\n${isPrivate ? '🔒 비공개' : '🔓 공개'}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditEvent(ev);
                        }}
                      >
                        {isPrivate ? '🔒' : '🔓'} {ev.title}
                      </div>
                    );
                  })}
                  {cell.events.length > 3 && (
                    <div style={{ fontSize: '10px', color: '#64748b', textAlign: 'center', fontWeight: '700' }}>
                      + {cell.events.length - 3}건 더보기
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 📅 [상시 상세 패널] 선택된 날짜 상세 일정 및 연동 문서 */}
      <div className="card-box" style={{ marginTop: '0.75rem', padding: '0.875rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', flexWrap: 'wrap', gap: '6px' }}>
          <h3 style={{ margin: 0, fontWeight: '900', fontSize: '0.9375rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>📅</span> {selectedDate || todayStr} 일정 내역 ({(eventsByDate[selectedDate] || []).length}건)
          </h3>
          <button
            type="button"
            className="btn btn-primary"
            style={{ fontSize: '0.75rem', padding: '5px 12px', minHeight: '30px', backgroundColor: '#1E6091', borderColor: '#1E6091', fontWeight: '800' }}
            onClick={() => handleOpenAddEvent(selectedDate)}
          >
            ➕ 이 날짜에 일정 추가
          </button>
        </div>

        {(eventsByDate[selectedDate] || []).length === 0 ? (
          <div style={{ textAlign: 'center', padding: '1.25rem', color: '#94a3b8', fontSize: '0.8125rem' }}>
            선택한 날짜에 등록된 일정이나 연동 문서가 없습니다. (상단 + 버튼을 눌러 새 일정을 등록해보세요)
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(eventsByDate[selectedDate] || []).map(ev => {
              const isPrivate = !ev.is_shared;
              return (
                <div
                  key={ev.id}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    backgroundColor: isPrivate ? '#fffbeb' : '#f0fdf4',
                    border: `1px solid ${isPrivate ? '#fde68a' : '#bbf7d0'}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '8px'
                  }}
                >
                  <div style={{ flex: 1, minWidth: '180px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: '800',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        backgroundColor: isPrivate ? '#fef3c7' : '#dcfce7',
                        color: isPrivate ? '#92400e' : '#15803d'
                      }}>
                        {isPrivate ? '🔒 비공개' : '🔓 공개'}
                      </span>
                      <span style={{ fontWeight: '800', fontSize: '0.875rem', color: '#1e293b' }}>
                        {ev.title}
                      </span>
                    </div>
                    {ev.event_time && <div style={{ fontSize: '11px', color: '#64748b' }}>⏰ 시간: {ev.event_time}</div>}
                    {ev.customer_name && <div style={{ fontSize: '11px', color: '#475569' }}>🏢 거래처: {ev.customer_name} ({ev.customer_phone || '-'})</div>}
                    {ev.machine_info && <div style={{ fontSize: '11px', color: '#1d4ed8' }}>🚜 기종: {ev.machine_info}</div>}
                    {ev.memo && <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>📝 메모: {ev.memo}</div>}
                  </div>

                  <div style={{ display: 'flex', gap: '4px' }}>
                    {ev.isDocEvent ? (
                      <button
                        type="button"
                        className="btn btn-outline"
                        style={{ fontSize: '11px', padding: '4px 8px', minHeight: '30px' }}
                        onClick={() => { onLoadDocument && onLoadDocument(ev.rawDoc); }}
                      >
                        문서 열기
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ fontSize: '11px', padding: '4px 8px', minHeight: '30px', backgroundColor: '#1E6091', borderColor: '#1E6091' }}
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

      {/* Add/Edit Event Modal */}
      {showEventModal && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="modal-content" style={{ maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ marginBottom: '1rem', fontWeight: '900' }}>
              {editingEvent ? '✏️ 일정 수정' : '➕ 새 일정 등록'}
            </h3>

            {/* 🔒 공개/비공개 선택 영역 */}
            <div style={{ padding: '10px 12px', backgroundColor: form.is_shared ? '#f0fdf4' : '#fffbeb', border: `2px solid ${form.is_shared ? '#86efac' : '#fde68a'}`, borderRadius: '8px', marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '900', color: '#1e293b', marginBottom: '6px' }}>
                🛡️ 공개 여부 설정 (타 공급자 노출 제어)
              </label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: '700', fontSize: '0.8125rem', color: '#c2410c' }}>
                  <input type="radio" name="is_shared" checked={form.is_shared === false} onChange={() => setForm({ ...form, is_shared: false })} />
                  <span>🔒 비공개 (나만 보기 - 기본값)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: '700', fontSize: '0.8125rem', color: '#15803d' }}>
                  <input type="radio" name="is_shared" checked={form.is_shared === true} onChange={() => setForm({ ...form, is_shared: true })} />
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
                <input type="text" className="form-input" placeholder="예: 현대 14톤 메인펌프 수리 출장" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} autoFocus />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label className="form-label">날짜 *</label>
                  <input type="date" className="form-input" value={form.event_date} onChange={e => setForm({ ...form, event_date: e.target.value })} />
                </div>
                <div>
                  <label className="form-label">시간</label>
                  <input type="time" className="form-input" value={form.event_time} onChange={e => setForm({ ...form, event_time: e.target.value })} />
                </div>
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
                <button type="button" className="btn btn-outline" style={{ color: '#dc2626', borderColor: '#fca5a5' }} onClick={() => handleDeleteEvent(editingEvent.id)}>
                  🗑️ 삭제
                </button>
              ) : <div />}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowEventModal(false)}>취소</button>
                <button type="button" className="btn btn-primary" style={{ backgroundColor: '#1E6091', borderColor: '#1E6091', fontWeight: '800' }} onClick={handleSaveEvent}>💾 일정 저장</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
