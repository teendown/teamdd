// 🎨 TEAM D.D SUPPLIER MANAGEMENT TAB
import React, { useState, useEffect } from 'react';
import { registerBackHandler } from '../utils/navigationManager.js';
import { compressImageFile } from '../utils/imageUtils.js';

export default function SupplierTab({
  suppliers = [],
  onSaveSupplier,
  onDeleteSupplier,
  onSelectSupplier
}) {
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add');

  // Auto close modal on mobile back button
  useEffect(() => {
    if (!showModal) return;
    return registerBackHandler(() => { setShowModal(false); return true; }, 'SupplierTabModal');
  }, [showModal]);
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
    stamp_image: '',
    hasStamp: false,
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
      stamp_image: '',
      hasStamp: false,
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
      stamp_image: s.stamp_image || s.stampUrl || s.stamp || '',
      hasStamp: !!(s.stamp_image || s.stampUrl || s.stamp || s.hasStamp),
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
          {filtered.map(s => {
            const hasStampImg = !!(s.stamp_image || s.stampUrl || s.stamp);
            return (
              <div key={s.id} className="mobile-data-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontWeight: '900', fontSize: '0.9375rem' }}>{s.name || s.company}</span>
                    {hasStampImg ? (
                      <span style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '4px', backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', fontWeight: '800' }}>
                        🔴 직인등록됨
                      </span>
                    ) : (
                      <span style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '4px', backgroundColor: '#f8fafc', color: '#94a3b8', border: '1px solid #e2e8f0' }}>
                        ⚪ 직인미등록
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '0.6875rem', color: '#6b7280', fontFamily: 'monospace' }}>{s.bizno}</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#4b5563', marginBottom: '0.5rem' }}>
                  <div>대표자: {s.person || s.owner || '-'} (인)</div>
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
            );
          })}
        </div>

        {/* Desktop Table View */}
        <div className="desktop-table-view">
          <table className="data-table">
            <thead>
              <tr>
                <th>상호명 / 대표자</th>
                <th>직인(도장)</th>
                <th>사업자번호</th>
                <th>연락처 / 팩스</th>
                <th>주소</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => {
                const stampSrc = s.stamp_image || s.stampUrl || s.stamp;
                return (
                  <tr key={s.id}>
                    <td>
                      <div style={{ fontWeight: '700' }}>{s.name || s.company}</div>
                      <div style={{ fontSize: '10px', color: '#6b7280' }}>{s.person || s.owner} (인)</div>
                    </td>
                    <td>
                      {stampSrc ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <img
                            src={stampSrc}
                            alt="직인"
                            style={{ width: '28px', height: '28px', objectFit: 'contain', border: '1px solid #e2e8f0', borderRadius: '4px', backgroundColor: '#fff' }}
                          />
                          <span style={{ fontSize: '10px', color: '#dc2626', fontWeight: '700' }}>등록</span>
                        </div>
                      ) : (
                        <span style={{ fontSize: '10px', color: '#94a3b8' }}>미등록</span>
                      )}
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
                );
              })}
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

            {/* 대표자 직인 / 도장 등록 섹션 */}
            <div className="form-section">
              <div className="section-title">🔴 대표자 직인 / 도장 파일</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                {/* 도장 미리보기 박스 */}
                <div
                  style={{
                    width: '84px',
                    height: '84px',
                    border: '2px dashed #cbd5e1',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#f8fafc',
                    position: 'relative',
                    overflow: 'hidden',
                    flexShrink: 0
                  }}
                >
                  {form.stamp_image ? (
                    <img
                      src={form.stamp_image}
                      alt="직인 미리보기"
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  ) : (
                    <div style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'center', fontWeight: '700' }}>
                      도장 없음<br /><span style={{ fontSize: '9px' }}>(인영 미등록)</span>
                    </div>
                  )}
                </div>

                {modalMode !== 'view' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: '220px' }}>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <label
                        className="btn btn-outline"
                        style={{
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: '700',
                          color: '#1d4ed8',
                          borderColor: '#bfdbfe',
                          backgroundColor: '#eff6ff',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px'
                        }}
                      >
                        📁 {form.stamp_image ? '도장 이미지 변경' : '도장 이미지 파일 선택 (PNG/JPG)'}
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              try {
                                const dataUrl = await compressImageFile(file, 300);
                                setForm({ ...form, stamp_image: dataUrl, hasStamp: true });
                              } catch (err) {
                                alert('도장 이미지 처리 실패: ' + err.message);
                              }
                            }
                          }}
                        />
                      </label>
                      {form.stamp_image && (
                        <button
                          type="button"
                          className="btn btn-outline"
                          style={{ fontSize: '11px', color: '#dc2626', borderColor: '#fca5a5', padding: '4px 8px' }}
                          onClick={() => setForm({ ...form, stamp_image: '', hasStamp: false })}
                        >
                          🗑️ 도장 삭제
                        </button>
                      )}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', lineHeight: '1.4' }}>
                      * 배경이 투명한 PNG 이미지 파일 권장<br />
                      * 거래명세서, 견적서, 청구서 출력 시 대표자명 뒤 <b>(인)</b> 자리에 자동으로 날인됩니다.
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    {form.stamp_image ? '✓ 직인 도장이 등록되어 명세서 출력 시 대표자명에 자동 날인됩니다.' : '현재 등록된 도장 파일이 없습니다.'}
                  </div>
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
