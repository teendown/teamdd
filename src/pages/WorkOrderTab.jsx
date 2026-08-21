// 🎨 TEAM D.D WORK ORDER MANAGEMENT TAB (정비/출장 작업 관리)
import React, { useState, useMemo } from 'react';
import { areSupplierKeysEquivalent } from '../utils/validation.js';

export default function WorkOrderTab({
  schedules = [],
  customersList = [],
  selectedSupplierKey = 'sejin',
  onSaveSchedule,
  onDeleteSchedule,
  onUpdateScheduleStatus,
  onNavigateToDoc
}) {
  const currentDate = new Date();
  const todayStr = currentDate.toISOString().split('T')[0];

  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // 신규 작업 등록 모달 폼 상태
  const [form, setForm] = useState({
    title: '',
    customer_name: '',
    customer_phone: '',
    machine: '',
    mechanic: '정비1팀',
    priority: 'normal',
    status: 'in_progress',
    start_date: todayStr,
    schedule_time: '10:00',
    estimated_hours: '2',
    category: 'repair',
    memo: '',
    is_shared: false
  });

  // 내 사업자의 작업 목록 필터
  const myWorkOrders = useMemo(() => {
    return schedules.filter(s => {
      const isMine = areSupplierKeysEquivalent(s.supplier_key, selectedSupplierKey);
      if (!isMine) return false;

      // 정비 관련 카테고리
      const status = s.status || 'in_progress';
      if (statusFilter !== 'all' && status !== statusFilter) return false;

      const priority = s.priority || (s.title?.includes('긴급') ? 'urgent' : 'normal');
      if (priorityFilter !== 'all' && priority !== priorityFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const title = (s.title || '').toLowerCase();
        const cust = (s.customer_name || '').toLowerCase();
        const machine = (s.machine || s.machine_info || '').toLowerCase();
        const memo = (s.memo || '').toLowerCase();
        if (!title.includes(q) && !cust.includes(q) && !machine.includes(q) && !memo.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [schedules, selectedSupplierKey, statusFilter, priorityFilter, searchQuery]);

  const handleOpenAdd = () => {
    setForm({
      title: '',
      customer_name: '',
      customer_phone: '',
      machine: '',
      mechanic: '정비1팀',
      priority: 'normal',
      status: 'in_progress',
      start_date: todayStr,
      schedule_time: '10:00',
      estimated_hours: '2',
      category: 'repair',
      memo: '',
      is_shared: false
    });
    setShowAddModal(true);
  };

  const handleSaveForm = (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      alert('작업명을 입력해주세요.');
      return;
    }

    const payload = {
      ...form,
      id: Date.now().toString(),
      supplier_key: selectedSupplierKey,
      event_date: form.start_date
    };

    if (onSaveSchedule) {
      onSaveSchedule(payload, false);
    }
    setShowAddModal(false);
    alert('✓ 작업이 성공적으로 등록되었습니다.');
  };

  return (
    <div className="management-container">
      <div className="card-box">
        {/* Header Bar */}
        <div className="card-box-header">
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              ⚙️ 작업 관리 및 정비 현황
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              입고 정비, 출장 정비 및 작업 배정 상태를 실시간으로 관리합니다.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleOpenAdd}
            >
              + 신규 작업 등록
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div style={{ padding: '1rem 1.25rem', backgroundColor: 'var(--bg-muted)', borderBottom: '1px solid var(--border-color)', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            <button
              type="button"
              className={`btn ${statusFilter === 'all' ? 'btn-primary' : 'btn-outline'}`}
              style={{ fontSize: '0.75rem', padding: '0.375rem 0.625rem' }}
              onClick={() => setStatusFilter('all')}
            >
              전체 ({myWorkOrders.length})
            </button>
            <button
              type="button"
              className={`btn ${statusFilter === 'in_progress' ? 'btn-primary' : 'btn-outline'}`}
              style={{ fontSize: '0.75rem', padding: '0.375rem 0.625rem' }}
              onClick={() => setStatusFilter('in_progress')}
            >
              ⚙️ 작업중
            </button>
            <button
              type="button"
              className={`btn ${statusFilter === 'pending' ? 'btn-primary' : 'btn-outline'}`}
              style={{ fontSize: '0.75rem', padding: '0.375rem 0.625rem' }}
              onClick={() => setStatusFilter('pending')}
            >
              ⏳ 대기중
            </button>
            <button
              type="button"
              className={`btn ${statusFilter === 'completed' ? 'btn-primary' : 'btn-outline'}`}
              style={{ fontSize: '0.75rem', padding: '0.375rem 0.625rem' }}
              onClick={() => setStatusFilter('completed')}
            >
              ✅ 완료
            </button>
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', flex: '1', maxWidth: '360px' }}>
            <input
              type="text"
              className="form-input"
              placeholder="작업명, 거래처, 기종 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ fontSize: '0.75rem' }}
            />
          </div>
        </div>

        {/* Work Orders Table */}
        {myWorkOrders.length === 0 ? (
          <div style={{ padding: '3.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🔧</div>
            <div style={{ fontWeight: '700', fontSize: '1rem' }}>등록된 작업 내역이 없습니다.</div>
          </div>
        ) : (
          <div className="work-table-wrapper">
            <table className="work-table">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>우선순위</th>
                  <th>작업 일자</th>
                  <th>장비명 / 모델</th>
                  <th>고객명</th>
                  <th>작업 내용</th>
                  <th>담당 정비사</th>
                  <th>소요시간</th>
                  <th>상태</th>
                  <th style={{ textAlign: 'center', width: '130px' }}>관리 / 발행</th>
                </tr>
              </thead>
              <tbody>
                {myWorkOrders.map(work => {
                  const priority = work.priority || (work.title?.includes('긴급') ? 'urgent' : 'normal');
                  const status = work.status || 'in_progress';
                  const mechanic = work.mechanic || '정비팀';

                  return (
                    <tr key={work.id}>
                      <td>
                        {priority === 'urgent' && <span className="priority-pill urgent">🚨 긴급</span>}
                        {priority === 'high' && <span className="priority-pill high">⚡ 당일</span>}
                        {priority === 'normal' && <span className="priority-pill normal">보통</span>}
                      </td>
                      <td style={{ fontSize: '0.75rem', fontWeight: '600' }}>
                        {work.start_date || work.event_date}
                      </td>
                      <td style={{ fontWeight: '800' }}>
                        {work.machine || work.machine_info || '굴착기'}
                      </td>
                      <td style={{ fontWeight: '700', color: 'var(--primary)' }}>
                        {work.customer_name || '일반 고객'}
                      </td>
                      <td style={{ maxWidth: '280px' }}>
                        <div style={{ fontWeight: '700' }}>{work.title}</div>
                        {work.memo && <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{work.memo}</div>}
                      </td>
                      <td>
                        <span style={{ fontSize: '0.75rem', backgroundColor: 'var(--bg-muted)', padding: '2px 6px', borderRadius: '4px' }}>
                          🧑‍🔧 {mechanic}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.75rem' }}>
                        ⏱️ {work.estimated_hours ? `${work.estimated_hours}시간` : (work.schedule_time || '당일')}
                      </td>
                      <td>
                        <select
                          className={`status-select ${status}`}
                          value={status}
                          onChange={(e) => onUpdateScheduleStatus && onUpdateScheduleStatus(work.id, e.target.value)}
                        >
                          <option value="pending">⏳ 대기중</option>
                          <option value="in_progress">⚙️ 작업중</option>
                          <option value="completed">✅ 작업완료</option>
                        </select>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                          <button
                            type="button"
                            className="btn btn-outline"
                            style={{ fontSize: '0.6875rem', padding: '2px 6px' }}
                            onClick={() => onNavigateToDoc && onNavigateToDoc(work)}
                            title="이 작업으로 거래명세서 작성"
                          >
                            명세서
                          </button>
                          {onDeleteSchedule && (
                            <button
                              type="button"
                              className="btn btn-red-outline"
                              style={{ fontSize: '0.6875rem', padding: '2px 6px' }}
                              onClick={() => {
                                if (window.confirm('이 작업을 삭제하시겠습니까?')) {
                                  onDeleteSchedule(work.id);
                                }
                              }}
                            >
                              삭제
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 신규 작업 등록 모달 */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.0625rem', fontWeight: '900' }}>🔧 신규 정비 작업 등록</h3>
              <button
                type="button"
                className="btn btn-outline"
                style={{ padding: '2px 8px' }}
                onClick={() => setShowAddModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveForm}>
              <div className="form-group">
                <label className="form-label">작업명 (증상 및 정비 내용) *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="예: 메인 펌프 유압유 누유 수리 및 씰 교체"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div className="form-group">
                  <label className="form-label">고객(거래처)명</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="고객명"
                    value={form.customer_name}
                    onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                    list="work-cust-list"
                  />
                  <datalist id="work-cust-list">
                    {customersList.map(c => <option key={c.id || c.name} value={c.name} />)}
                  </datalist>
                </div>

                <div className="form-group">
                  <label className="form-label">장비명 / 모델</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="예: 볼보 EC140E, 두산 DX300LC"
                    value={form.machine}
                    onChange={(e) => setForm({ ...form, machine: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                <div className="form-group">
                  <label className="form-label">우선순위</label>
                  <select
                    className="form-select"
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  >
                    <option value="normal">보통</option>
                    <option value="high">⚡ 당일</option>
                    <option value="urgent">🚨 긴급</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">담당 정비사</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="정비사명"
                    value={form.mechanic}
                    onChange={(e) => setForm({ ...form, mechanic: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">예상시간(h)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={form.estimated_hours}
                    onChange={(e) => setForm({ ...form, estimated_hours: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div className="form-group">
                  <label className="form-label">작업 일자</label>
                  <input
                    type="date"
                    className="form-input"
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">작업 분류</label>
                  <select
                    className="form-select"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  >
                    <option value="repair">🏭 공장 작업</option>
                    <option value="field">🚚 출장 정비</option>
                    <option value="inspection">🔍 정기 점검</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">특이사항 및 메모</label>
                <textarea
                  className="form-textarea"
                  rows="3"
                  placeholder="증상 상세, 교체 부품 메모 등"
                  value={form.memo}
                  onChange={(e) => setForm({ ...form, memo: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowAddModal(false)}
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  작업 등록 완료
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
