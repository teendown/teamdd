// 🎨 TEAM D.D SUPPLIER MANAGEMENT TAB
import React, { useState } from 'react';

export default function SupplierTab({
  suppliers = [],
  onSaveSupplier,
  onDeleteSupplier,
  onSelectSupplier
}) {
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [form, setForm] = useState({
    id: null,
    code: '',
    name: '',
    bizno: '',
    person: '',
    phone: '',
    fax: '',
    email: '',
    bank: '',
    addr: '',
    bizType: '',
    bizItem: '',
    memo: '',
    pwd: '0000'
  });
  
  const filtered = suppliers.filter(s => 
    (s.name || s.company || '').toLowerCase().includes(search.toLowerCase()) || 
    (s.bizno || '').includes(search) || 
    (s.phone || '').includes(search) || 
    (s.tel || '').includes(search)
  );
  
  const resetFormState = () => {
    setForm({
      id: null,
      code: `S${String(suppliers.length + 1).padStart(4, '0')}`,
      name: '',
      bizno: '',
      person: '',
      phone: '',
      fax: '',
      email: '',
      bank: '',
      addr: '',
      bizType: '',
      bizItem: '',
      memo: '',
      pwd: '0000'
    });
  };

  const handleOpenAdminPwdChange = () => {
    const currentAdminPwd = localStorage.getItem('dd_pwd_admin') || '0000';
    const newPwd = window.prompt('🔑 새로운 관리자 비밀번호를 입력해주세요 (4자리 숫자):', currentAdminPwd);
    if (newPwd === null) return;
    const cleaned = newPwd.replace(/[^0-9]/g, '');
    if (cleaned.length !== 4) {
      alert('❌ 비밀번호는 반드시 4자리 숫자여야 합니다.');
      return;
    }
    localStorage.setItem('dd_pwd_admin', cleaned);
    alert('✓ 관리자 비밀번호가 성공적으로 변경되었습니다!');
  };

  const handleOpenAdd = () => {
    setModalMode('add');
    resetFormState();
    setShowModal(true);
  };
  
  const handleOpenView = (s) => {
    setModalMode('view');
    setForm({
      id: s.id,
      code: s.code || '',
      name: s.name || s.company || '',
      bizno: s.bizno || '',
      person: s.person || s.owner || '',
      phone: s.phone || s.tel || '',
      fax: s.fax || '',
      email: s.email || '',
      bank: s.bank || '',
      addr: s.addr || '',
      bizType: s.bizType || '',
      bizItem: s.bizItem || '',
      memo: s.memo || '',
      pwd: s.pwd || localStorage.getItem('dd_pwd_' + s.id) || '0000'
    });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.name) {
      alert('상호명은 필수입니다.');
      return;
    }
    onSaveSupplier(form, modalMode === 'edit' || modalMode === 'add' ? form.id != null : false);
    setShowModal(false);
  };

  return (
    <div className="management-container">
      <div className="card-box">
        <div className="card-box-header">
          <h2 style={{ fontSize: '1.125rem', fontWeight: '900' }}>🏢 공급자 관리</h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn btn-outline"
              style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem', borderColor: '#cbd5e1', color: '#334155' }}
              onClick={handleOpenAdminPwdChange}
            >
              🔑 관리자 비번 변경
            </button>
            <button className="btn btn-primary" onClick={handleOpenAdd}>
              + 공급자 추가
            </button>
          </div>
        </div>

        <div style={{ padding: '0.75rem', backgroundColor: '#f9fafb' }}>
          <input
            type="text"
            className="form-input"
            placeholder="상호명, 사업자번호, 연락처 검색..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Mobile Cards View */}
        <div className="mobile-cards-view">
          {filtered.map(s => (
            <div key={s.id} className="mobile-data-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                <span style={{ fontWeight: '900', fontSize: '0.9375rem' }}>{s.name || s.company}</span>
                <span style={{ fontSize: '0.6875rem', color: '#6b7280', fontFamily: 'monospace' }}>{s.bizno}</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#4b5563', marginBottom: '0.5rem' }}>
                <div>대표자: {s.person || s.owner || '-'}</div>
                <div>연락처: {s.phone || s.tel || '-'}</div>
                <div style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  주소: {s.addr || '-'}
                </div>
                <div style={{ fontSize: '0.6875rem', color: '#9ca3af', marginTop: '2px' }}>
                  계좌: {s.bank || '-'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.5rem' }}>
                <button
                  className="btn btn-outline"
                  style={{ flex: 1, minHeight: '36px', fontSize: '0.8125rem', fontWeight: '700' }}
                  onClick={() => handleOpenView(s)}
                >
                  🔍 상세조회 / 정보수정
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Table View */}
        <div className="desktop-table-view">
          <table className="data-table">
            <thead>
              <tr>
                <th>상호명 / 대표자</th>
                <th>사업자번호</th>
                <th>연락처 / 팩스</th>
                <th>주소</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id}>
                  <td>
                    <div style={{ fontWeight: '700' }}>{s.name || s.company}</div>
                    <div style={{ fontSize: '10px', color: '#6b7280' }}>{s.person || s.owner}</div>
                  </td>
                  <td style={{ fontFamily: 'monospace' }}>{s.bizno}</td>
                  <td>
                    <div>{s.phone || s.tel}</div>
                    <div style={{ fontSize: '10px', color: '#6b7280' }}>{s.fax}</div>
                  </td>
                  <td style={{ fontSize: '11px' }}>{s.addr}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        className="btn btn-outline"
                        style={{ fontSize: '11px', padding: '4px 8px', fontWeight: '600' }}
                        onClick={() => handleOpenView(s)}
                      >
                        🔍 상세조회 / 수정
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ marginBottom: '1rem', fontWeight: '900' }}>
              {modalMode === 'add' ? '➕ 새 공급자 등록' : (modalMode === 'edit' ? '✏️ 공급자 정보 수정' : '🔍 공급자 상세 조회')}
            </h3>

            <div className="form-section">
              <div className="section-title">🏢 기본 정보</div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">상호명 *</label>
                  {modalMode === 'view' ? (
                    <div className="view-value" style={{ fontWeight: '700' }}>{form.name}</div>
                  ) : (
                    <input type="text" className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">대표자</label>
                  {modalMode === 'view' ? (
                    <div className="view-value">{form.person || '-'}</div>
                  ) : (
                    <input type="text" className="form-input" value={form.person} onChange={e => setForm({ ...form, person: e.target.value })} />
                  )}
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">연락처</label>
                  {modalMode === 'view' ? (
                    <div className="view-value">{form.phone || '-'}</div>
                  ) : (
                    <input type="text" className="form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">팩스번호</label>
                  {modalMode === 'view' ? (
                    <div className="view-value">{form.fax || '-'}</div>
                  ) : (
                    <input type="text" className="form-input" value={form.fax} onChange={e => setForm({ ...form, fax: e.target.value })} />
                  )}
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">🔑 로그인 필수 비밀번호 (4자리 숫자)</label>
                  {modalMode === 'view' ? (
                    <div className="view-value" style={{ fontFamily: 'monospace', letterSpacing: '2px', fontWeight: 'bold', color: '#1d4ed8' }}>
                      {form.pwd || '0000'}
                    </div>
                  ) : (
                    <input
                      type="text"
                      maxLength={4}
                      className="form-input"
                      style={{ fontFamily: 'monospace', letterSpacing: '2px', fontWeight: 'bold' }}
                      placeholder="0000"
                      value={form.pwd}
                      onChange={e => setForm({ ...form, pwd: e.target.value.replace(/[^0-9]/g, '') })}
                    />
                  )}
                </div>
                <div className="form-group" />
              </div>
            </div>

            <div className="form-section">
              <div className="section-title">📜 세금계산서 / 계좌 정보</div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">사업자등록번호</label>
                  {modalMode === 'view' ? (
                    <div className="view-value">{form.bizno || '-'}</div>
                  ) : (
                    <input type="text" className="form-input" value={form.bizno} onChange={e => setForm({ ...form, bizno: e.target.value })} />
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">이메일</label>
                  {modalMode === 'view' ? (
                    <div className="view-value">{form.email || '-'}</div>
                  ) : (
                    <input type="email" className="form-input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                  )}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">사업장 주소</label>
                {modalMode === 'view' ? (
                  <div className="view-value">{form.addr || '-'}</div>
                ) : (
                  <input type="text" className="form-input" value={form.addr} onChange={e => setForm({ ...form, addr: e.target.value })} />
                )}
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">업태</label>
                  {modalMode === 'view' ? (
                    <div className="view-value">{form.bizType || '-'}</div>
                  ) : (
                    <input type="text" className="form-input" value={form.bizType} onChange={e => setForm({ ...form, bizType: e.target.value })} />
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">종목</label>
                  {modalMode === 'view' ? (
                    <div className="view-value">{form.bizItem || '-'}</div>
                  ) : (
                    <input type="text" className="form-input" value={form.bizItem} onChange={e => setForm({ ...form, bizItem: e.target.value })} />
                  )}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">계좌번호 (은행명 포함)</label>
                {modalMode === 'view' ? (
                  <div className="view-value">{form.bank || '-'}</div>
                ) : (
                  <input type="text" className="form-input" value={form.bank} onChange={e => setForm({ ...form, bank: e.target.value })} />
                )}
              </div>
            </div>

            <div className="form-section" style={{ borderBottom: 'none' }}>
              <div className="section-title">📝 메모 / 특이사항</div>
              <div className="form-group">
                {modalMode === 'view' ? (
                  <div className="view-value" style={{ whiteSpace: 'pre-wrap', minHeight: '40px' }}>{form.memo || '-'}</div>
                ) : (
                  <textarea className="form-textarea" rows="2" value={form.memo} onChange={e => setForm({ ...form, memo: e.target.value })} />
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
              {modalMode === 'view' ? (
                <>
                  <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowModal(false)}>
                    닫기
                  </button>
                  <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => setModalMode('edit')}>
                    수정
                  </button>
                  <button
                    className="btn btn-red-outline"
                    style={{ flex: 1 }}
                    onClick={() => {
                      if (window.confirm('정말로 이 공급자를 삭제하시겠습니까?')) {
                        onDeleteSupplier(form.id);
                        setShowModal(false);
                      }
                    }}
                  >
                    삭제
                  </button>
                </>
              ) : (
                <>
                  <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSave}>
                    {modalMode === 'edit' ? '저장' : '등록 완료'}
                  </button>
                  <button
                    className="btn btn-outline"
                    style={{ flex: 1 }}
                    onClick={() => {
                      if (modalMode === 'edit') {
                        const originalSupplier = suppliers.find(s => s.id === form.id);
                        if (originalSupplier) handleOpenView(originalSupplier);
                        else setShowModal(false);
                      } else {
                        setShowModal(false);
                      }
                    }}
                  >
                    취소
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
