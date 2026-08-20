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
  const [currentYear, setCurrentYear] = useState(currentDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(currentDate.getMonth() + 1); // 1-12
  const [selectedDate, setSelectedDate] = useState(null); // 'YYYY-MM-DD'
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [showDayDetailModal, setShowDayDetailModal] = useState(false);

  // Filters
  const [privacyFilter, setPrivacyFilter] = useState('all'); // 'all' | 'private' | 'my_public' | 'others_public'
  const [categoryFilter, setCategoryFilter] = useState({
    schedule: true,
    repair_doc: true,
    payment: true,
    estimate: true
  });
  const [searchQuery, setSearchQuery] = useState('');

  // Form State (Default: is_shared = false [비공개])
  const [form, setForm] = useState({
    title: '',
    event_date: currentDate.toISOString().split('T')[0],
    event_time: '10:00',
    category: 'repair', // repair | payment | estimate | general
    customer_name: '',
    customer_phone: '',
    machine_info: '',
    amount: '',
    memo: '',
    is_shared: false // 🔒 기본값은 비공개(나만 보기)!
  });

  // Calendar calculations
  const firstDayOfMonth = new Date(currentYear, currentMonth - 1, 1).getDay(); // 0: Sun
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
    setSelectedDate(now.toISOString().split('T')[0]);
  };

  // 1. Process Schedules with Strict Privacy Filtering
  const filteredSchedules = useMemo(() => {
    return schedules.filter(item => {
      // Security Check: 내가 쓴 것이거나, 타사가 작성한 공개(is_shared === true) 일정만 접근 가능
      const isMine = item.supplier_key === selectedSupplierKey;
      const isPublic = item.is_shared === true;
      if (!isMine && !isPublic) return false;

      // Privacy Filter
      if (privacyFilter === 'private' && (!isMine || isPublic)) return false;
      if (privacyFilter === 'my_public' && (!isMine || !isPublic)) return false;
      if (privacyFilter === 'others_public' && (isMine || !isPublic)) return false;

      // Category Filter
      if (!categoryFilter.schedule) return false;

      // Search Query
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

  // 2. Process Linked Documents (Invoices, Estimates, Payment Dates) with Privacy Filtering
  const documentEvents = useMemo(() => {
    const events = [];

    documentsList.forEach(doc => {
      if (doc.is_deleted) return false;
      const isMine = doc.supplier_key === selectedSupplierKey;
      const isDocPublic = doc.is_shared === true;

      // 타사 문서는 오직 작성자가 공개로 설정한 것만 노출 (기본 비공개 보호)
      if (!isMine && !isDocPublic) return;

      const custName = doc.customer_name || doc.customer_data?.name || '고객';
      const machine = doc.customer_data?.selectedMachine || '';
      const itemsSum = (doc.items || []).map(i => i.name).filter(Boolean).join(', ');

      // A. 거래명세서/청구서 정비 발행일
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

      // B. 결제 예정일 / 수금일
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
          title: isPaidComplete ? `🟢 [완납] ${custName}` : `🔴 [결제/미수] ${custName} (${(Number(doc.paid) || 0).toLocaleString()}원)`,
          subtitle: `문서: ${doc.doc_no || ''}`,
          supplier_key: doc.supplier_key,
          is_shared: isDocPublic,
          isMine
        });
      }

      // C. 견적서 발행일
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

  // Combine and Group Events by Date: { "YYYY-MM-DD": [ ...events ] }
  const eventsByDate = useMemo(() => {
    const map = {};
    
    // Add User Schedules
    filteredSchedules.forEach(sch => {
      const d = sch.event_date;
      if (!d) return;
      if (!map[d]) map[d] = [];
      map[d].push({ ...sch, isSchedule: true });
    });

    // Add Document Events
    documentEvents.forEach(docEv => {
      const d = docEv.event_date;
      if (!d) return;
      if (!map[d]) map[d] = [];
      map[d].push(docEv);
    });

    return map;
  }, [filteredSchedules, documentEvents]);

  // Open Modal for New Event
  const handleOpenAddEvent = (dateStr = null) => {
    const targetDate = dateStr || selectedDate || `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
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
      is_shared: false // 🔒 항상 비공개가 기본값!
    });
    setEditingEvent(null);
    setShowEventModal(true);
  };

  // Open Modal for Edit Event
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

  // Save Event
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
    setShowDayDetailModal(false);
  };

  // Generate Calendar Grid Cells
  const calendarCells = useMemo(() => {
    const cells = [];
    
    // 1. Previous Month Trail Days
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const m = currentMonth === 1 ? 12 : currentMonth - 1;
      const y = currentMonth === 1 ? currentYear - 1 : currentYear;
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ dayNumber: d, dateStr, isCurrentMonth: false, events: eventsByDate[dateStr] || [] });
    }

    // 2. Current Month Days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ dayNumber: d, dateStr, isCurrentMonth: true, events: eventsByDate[dateStr] || [] });
    }

    // 3. Next Month Trail Days
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

  const todayStr = currentDate.toISOString().split('T')[0];

  return (
    <div className="management-container" style={{ padding: '0.75rem', maxWidth: '1440px', margin: '0 auto' }}>
      
      {/* Header & Month Navigation Toolbar */}
      <div className="card-box" style={{ marginBottom: '0.75rem', padding: '0.875rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          
          {/* Year/Month Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '900', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <span>📅</span> {currentYear}년 {currentMonth}월
            </h2>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button type="button" className="btn btn-outline" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={handlePrevMonth}>◀ 이전달</button>
              <button type="button" className="btn btn-outline" style={{ padding: '4px 10px', fontSize: '12px', fontWeight: '700' }} onClick={handleToday}>오늘</button>
              <button type="button" className="btn btn-outline" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={handleNextMonth}>다음달 ▶</button>
            </div>
          </div>

          {/* Quick Action Button */}
          <button
            type="button"
            className="btn btn-primary"
            style={{
              padding: '8px 16px',
              fontSize: '0.875rem',
              fontWeight: '800',
              backgroundColor: '#1E6091',
              borderColor: '#1E6091',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            onClick={() => handleOpenAddEvent()}
          >
            ➕ 새 일정 등록 (비공개/공개 선택)
          </button>
        </div>

        {/* Privacy & Category Filters Bar */}
        <div style={{
          marginTop: '0.75rem',
          paddingTop: '0.75rem',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
          fontSize: '0.75rem'
        }}>
          {/* 1. Privacy Scope Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: '800', color: '#334155' }}>🔒 보안/공개 범위:</span>
            <button
              type="button"
              style={{
                padding: '3px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', cursor: 'pointer',
                backgroundColor: privacyFilter === 'all' ? '#1e293b' : '#f8fafc',
                color: privacyFilter === 'all' ? '#fff' : '#475569',
                fontWeight: privacyFilter === 'all' ? '800' : '500'
              }}
              onClick={() => setPrivacyFilter('all')}
            >
              전체 보기
            </button>
            <button
              type="button"
              style={{
                padding: '3px 8px', borderRadius: '6px', border: '1px solid #fed7aa', cursor: 'pointer',
                backgroundColor: privacyFilter === 'private' ? '#ea580c' : '#fff7ed',
                color: privacyFilter === 'private' ? '#fff' : '#c2410c',
                fontWeight: privacyFilter === 'private' ? '800' : '700'
              }}
              onClick={() => setPrivacyFilter('private')}
            >
              🔒 내 비공개만
            </button>
            <button
              type="button"
              style={{
                padding: '3px 8px', borderRadius: '6px', border: '1px solid #bbf7d0', cursor: 'pointer',
                backgroundColor: privacyFilter === 'my_public' ? '#16a34a' : '#f0fdf4',
                color: privacyFilter === 'my_public' ? '#fff' : '#15803d',
                fontWeight: privacyFilter === 'my_public' ? '800' : '700'
              }}
              onClick={() => setPrivacyFilter('my_public')}
            >
              🔓 내 공개(공유)만
            </button>
            <button
              type="button"
              style={{
                padding: '3px 8px', borderRadius: '6px', border: '1px solid #bfdbfe', cursor: 'pointer',
                backgroundColor: privacyFilter === 'others_public' ? '#2563eb' : '#eff6ff',
                color: privacyFilter === 'others_public' ? '#fff' : '#1d4ed8',
                fontWeight: privacyFilter === 'others_public' ? '800' : '700'
              }}
              onClick={() => setPrivacyFilter('others_public')}
            >
              🌐 타사 공유 일정만
            </button>
          </div>

          {/* 2. Category Checkboxes */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={categoryFilter.schedule}
                onChange={e => setCategoryFilter({ ...categoryFilter, schedule: e.target.checked })}
              />
              <span>📌 등록일정</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={categoryFilter.repair_doc}
                onChange={e => setCategoryFilter({ ...categoryFilter, repair_doc: e.target.checked })}
              />
              <span>📦 명세서(정비)</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={categoryFilter.payment}
                onChange={e => setCategoryFilter({ ...categoryFilter, payment: e.target.checked })}
              />
              <span>💳 결제/수금일</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={categoryFilter.estimate}
                onChange={e => setCategoryFilter({ ...categoryFilter, estimate: e.target.checked })}
              />
              <span>📋 견적서</span>
            </label>
          </div>
        </div>
      </div>

      {/* Main Calendar Grid */}
      <div className="card-box" style={{ padding: '0', overflow: 'hidden' }}>
        
        {/* Days of Week Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          backgroundColor: '#f8fafc',
          borderBottom: '2px solid #e2e8f0',
          textAlign: 'center',
          fontWeight: '800',
          fontSize: '0.8125rem'
        }}>
          {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
            <div
              key={day}
              style={{
                padding: '10px 0',
                color: idx === 0 ? '#ef4444' : (idx === 6 ? '#2563eb' : '#334155'),
                backgroundColor: idx === 0 ? '#fef2f2' : (idx === 6 ? '#eff6ff' : 'transparent')
              }}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Day Cells */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          backgroundColor: '#cbd5e1',
          gap: '1px'
        }}>
          {calendarCells.map((cell, idx) => {
            const isToday = cell.dateStr === todayStr;
            const isSelected = cell.dateStr === selectedDate;
            const dayOfWeek = idx % 7;

            return (
              <div
                key={idx}
                style={{
                  minHeight: '115px',
                  backgroundColor: cell.isCurrentMonth ? '#ffffff' : '#f8fafc',
                  padding: '6px',
                  display: 'flex',
                  flexDirection: 'column',
                  cursor: 'pointer',
                  position: 'relative',
                  outline: isSelected ? '2px solid #1E6091' : (isToday ? '2px solid #3b82f6' : 'none'),
                  outlineOffset: '-2px'
                }}
                onClick={() => {
                  setSelectedDate(cell.dateStr);
                  if (cell.events.length > 0) {
                    setShowDayDetailModal(true);
                  } else {
                    handleOpenAddEvent(cell.dateStr);
                  }
                }}
              >
                {/* Day Header */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '4px'
                }}>
                  <span style={{
                    fontSize: '0.8125rem',
                    fontWeight: isToday ? '900' : '700',
                    color: !cell.isCurrentMonth ? '#94a3b8' : (dayOfWeek === 0 ? '#ef4444' : (dayOfWeek === 6 ? '#2563eb' : '#1e293b')),
                    backgroundColor: isToday ? '#3b82f6' : 'transparent',
                    color: isToday ? '#ffffff' : undefined,
                    padding: isToday ? '1px 6px' : '0',
                    borderRadius: isToday ? '10px' : '0'
                  }}>
                    {cell.dayNumber}
                  </span>

                  {cell.events.length > 0 && (
                    <span style={{ fontSize: '10px', fontWeight: '800', color: '#64748b' }}>
                      {cell.events.length}건
                    </span>
                  )}
                </div>

                {/* Event Badges List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1, overflowY: 'hidden' }}>
                  {cell.events.slice(0, 3).map((ev) => {
                    const isPrivate = !ev.is_shared;
                    let badgeBg = '#f1f5f9';
                    let badgeColor = '#334155';
                    let badgeBorder = '#cbd5e1';

                    if (ev.type === 'payment') {
                      badgeBg = '#fef2f2';
                      badgeColor = '#991b1b';
                      badgeBorder = '#fca5a5';
                    } else if (ev.type === 'estimate') {
                      badgeBg = '#fff7ed';
                      badgeColor = '#c2410c';
                      badgeBorder = '#fdba74';
                    } else if (ev.is_shared) {
                      badgeBg = '#eff6ff';
                      badgeColor = '#1d4ed8';
                      badgeBorder = '#bfdbfe';
                    } else {
                      // 비공개 일정
                      badgeBg = '#fef3c7';
                      badgeColor = '#92400e';
                      badgeBorder = '#fde68a';
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

      {/* ── [Modal 1] 일자별 상세 일정 팝업 ── */}
      {showDayDetailModal && selectedDate && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="modal-content" style={{ maxWidth: '520px', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, fontWeight: '900', fontSize: '1.125rem' }}>
                📅 {selectedDate} 일정 내역 ({eventsByDate[selectedDate]?.length || 0}건)
              </h3>
              <button
                type="button"
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#94a3b8' }}
                onClick={() => setShowDayDetailModal(false)}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1.25rem' }}>
              {(eventsByDate[selectedDate] || []).map((ev) => {
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
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: '800',
                          padding: '1px 5px',
                          borderRadius: '4px',
                          backgroundColor: isPrivate ? '#fef3c7' : '#dcfce7',
                          color: isPrivate ? '#92400e' : '#15803d'
                        }}>
                          {isPrivate ? '🔒 비공개(나만보기)' : '🔓 공개(전체공유)'}
                        </span>
                        <span style={{ fontWeight: '800', fontSize: '0.875rem', color: '#1e293b' }}>
                          {ev.title}
                        </span>
                      </div>
                      {ev.event_time && <div style={{ fontSize: '11px', color: '#64748b' }}>⏰ 시간: {ev.event_time}</div>}
                      {ev.customer_name && <div style={{ fontSize: '11px', color: '#475569' }}>🏢 거래처: {ev.customer_name} ({ev.customer_phone || '-'})</div>}
                      {ev.machine_info && <div style={{ fontSize: '11px', color: '#1d4ed8' }}>🚜 기종: {ev.machine_info}</div>}
                      {ev.memo && <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>📝 메모: {ev.memo}</div>}
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      {ev.isDocEvent ? (
                        <button
                          type="button"
                          className="btn btn-outline"
                          style={{ fontSize: '11px', padding: '4px 8px' }}
                          onClick={() => {
                            setShowDayDetailModal(false);
                            onLoadDocument && onLoadDocument(ev.rawDoc);
                          }}
                        >
                          문서 열기
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-primary"
                          style={{ fontSize: '11px', padding: '4px 8px', backgroundColor: '#1E6091', borderColor: '#1E6091' }}
                          onClick={() => {
                            setShowDayDetailModal(false);
                            handleOpenEditEvent(ev);
                          }}
                        >
                          수정
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-primary"
                style={{ flex: 1, backgroundColor: '#1E6091', borderColor: '#1E6091', padding: '8px 12px', fontSize: '0.8125rem' }}
                onClick={() => {
                  setShowDayDetailModal(false);
                  handleOpenAddEvent(selectedDate);
                }}
              >
                ➕ 이 날짜에 새 일정 추가
              </button>
              <button
                type="button"
                className="btn btn-outline"
                style={{ padding: '8px 16px', fontSize: '0.8125rem' }}
                onClick={() => setShowDayDetailModal(false)}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── [Modal 2] 일정 등록 및 수정 모달 (🔒 기본값: 비공개) ── */}
      {showEventModal && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="modal-content" style={{ maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ marginBottom: '1rem', fontWeight: '900' }}>
              {editingEvent ? '✏️ 일정 수정' : '➕ 새 일정 등록'}
            </h3>

            {/* 🌟 핵심 요구사항: 공개/비공개 선택 스위치 (기본값: 🔒 비공개) */}
            <div style={{
              padding: '10px 12px',
              backgroundColor: form.is_shared ? '#f0fdf4' : '#fffbeb',
              border: `2px solid ${form.is_shared ? '#86efac' : '#fde68a'}`,
              borderRadius: '8px',
              marginBottom: '1rem'
            }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: '900', color: '#1e293b', marginBottom: '6px' }}>
                🛡️ 공개 여부 설정 (타 공급자 노출 제어)
              </label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: '700', fontSize: '0.8125rem', color: '#c2410c' }}>
                  <input
                    type="radio"
                    name="is_shared"
                    checked={form.is_shared === false}
                    onChange={() => setForm({ ...form, is_shared: false })}
                  />
                  <span>🔒 비공개 (나만 보기 - 기본값)</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: '700', fontSize: '0.8125rem', color: '#15803d' }}>
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
                {form.is_shared
                  ? '✓ 세진, 디에스 등 모든 공급자의 캘린더에 함께 노출됩니다.'
                  : '🔒 오직 내 업체에만 표시되며 다른 공급자에게는 일체 노출되지 않습니다.'}
              </div>
            </div>

            {/* Form Fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              
              {/* 일정 제목 */}
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

              {/* 날짜 & 시간 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label className="form-label">날짜 *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={form.event_date}
                    onChange={e => setForm({ ...form, event_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">시간</label>
                  <input
                    type="time"
                    className="form-input"
                    value={form.event_time}
                    onChange={e => setForm({ ...form, event_time: e.target.value })}
                  />
                </div>
              </div>

              {/* 분류 (Category) */}
              <div>
                <label className="form-label">일정 분류</label>
                <select
                  className="form-select"
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                >
                  <option value="repair">🚜 정비 / 출장 / 수리</option>
                  <option value="payment">💳 수금 / 결제 예정일</option>
                  <option value="estimate">📋 견적 제출 / 상담</option>
                  <option value="general">📌 일반 업무 / 기타</option>
                </select>
              </div>

              {/* 거래처명 & 연락처 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label className="form-label">거래처명 (고객명)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="예: 대성건설기계"
                    value={form.customer_name}
                    onChange={e => setForm({ ...form, customer_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">연락처</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="010-0000-0000"
                    value={form.customer_phone}
                    onChange={e => setForm({ ...form, customer_phone: e.target.value })}
                  />
                </div>
              </div>

              {/* 장비/기종 & 금액 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label className="form-label">장비/기종</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="예: DX140W 1호기"
                    value={form.machine_info}
                    onChange={e => setForm({ ...form, machine_info: e.target.value })}
                  />
                </div>
                <div>
                  <label className="form-label">관련 금액 (원)</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="0"
                    value={form.amount}
                    onChange={e => setForm({ ...form, amount: e.target.value })}
                  />
                </div>
              </div>

              {/* 메모 */}
              <div>
                <label className="form-label">상세 메모</label>
                <textarea
                  className="form-input"
                  style={{ minHeight: '60px' }}
                  placeholder="특이사항, 챙길 부품, 현장 위치 등"
                  value={form.memo}
                  onChange={e => setForm({ ...form, memo: e.target.value })}
                />
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
              ) : <div />}

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowEventModal(false)}
                >
                  취소
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ backgroundColor: '#1E6091', borderColor: '#1E6091', fontWeight: '800' }}
                  onClick={handleSaveEvent}
                >
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
