// 🎨 TEAM D.D CUSTOMER EDIT & DETAIL MODAL
import React, { useState, useEffect } from 'react';

export default function CustomerEditModal({
  isOpen,
  onClose,
  modalMode = 'add',
  initialData = null,
  customers = [],
  onSaveCustomer,
  onDeleteCustomer,
  onSelectAfterSave = null
}) {
  if (!isOpen) return null;

  const [form, setForm] = useState({
    id: initialData?.id || null,
    code: initialData?.code || `C${String(customers.length + 1).padStart(4, '0')}`,
    name: initialData?.name || '',
    person: initialData?.person || '',
    phone: initialData?.phone || '',
    addr: initialData?.addr || '',
    bizno: initialData?.bizno || '',
    repName: initialData?.repName || '',
    bizType: initialData?.bizType || '',
    bizItem: initialData?.bizItem || '',
    email: initialData?.email || '',
    fax: initialData?.fax || '',
    machine: initialData?.machine || '',
    memo: initialData?.memo || ''
  });
  const [machineInput, setMachineInput] = useState('');
  const [machineNoInput, setMachineNoInput] = useState('');
  const [machineList, setMachineList] = useState(() => {
    return initialData?.machine ? initialData.machine.split(',').map(s => s.trim()).filter(Boolean) : [];
  });
  const [currentMode, setCurrentMode] = useState(modalMode);

  useEffect(() => {
    if (initialData) {
      setForm({
        id: initialData.id || null,
        code: initialData.code || `C${String(customers.length + 1).padStart(4, '0')}`,
        name: initialData.name || '',
        person: initialData.person || '',
        phone: initialData.phone || '',
        addr: initialData.addr || '',
        bizno: initialData.bizno || '',
        repName: initialData.repName || '',
        bizType: initialData.bizType || '',
        bizItem: initialData.bizItem || '',
        email: initialData.email || '',
        fax: initialData.fax || '',
        machine: initialData.machine || '',
        memo: initialData.memo || ''
      });
      setMachineList(initialData.machine ? initialData.machine.split(',').map(s => s.trim()).filter(Boolean) : []);
    } else {
      setForm({
        id: null,
        code: `C${String(customers.length + 1).padStart(4, '0')}`,
        name: '',
        person: '',
        phone: '',
        addr: '',
        bizno: '',
        repName: '',
        bizType: '',
        bizItem: '',
        email: '',
        fax: '',
        machine: '',
        memo: ''
      });
      setMachineList([]);
    }
    setCurrentMode(modalMode);
  }, [initialData, modalMode, isOpen, customers.length]);

  const handleAddMachine = () => {
    if (!machineInput.trim() && !machineNoInput.trim()) return;
    let combined = machineInput.trim();
    if (machineNoInput.trim()) {
      combined = combined ? `${combined} / ${machineNoInput.trim()}` : machineNoInput.trim();
    }
    setMachineList([...machineList, combined]);
    setMachineInput('');
    setMachineNoInput('');
  };

  const handleRemoveMachine = (idx) => {
    setMachineList(machineList.filter((_, i) => i !== idx));
  };

  const handleImportContact = async () => {
    if (!('contacts' in navigator && 'ContactsManager' in window)) {
      alert('이 기기/브라우저에서는 연락처 불러오기 기능을 지원하지 않습니다.');
      return;
    }
    try {
      const contacts = await navigator.contacts.select(['name', 'tel'], { multiple: false });
      if (contacts && contacts.length > 0) {
        const contact = contacts[0];
        const name = contact.name && contact.name.length > 0 ? contact.name[0] : '';
        const tel = contact.tel && contact.tel.length > 0 ? contact.tel[0] : '';
        setForm(prev => ({
          ...prev,
          name: name || prev.name,
          phone: tel || prev.phone
        }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async () => {
    if (!form.name || !form.name.trim()) {
      alert('상호명은 필수입니다.');
      return;
    }
    const finalMachine = machineList.join(',');
    const customerPayload = {
      ...form,
      name: form.name.trim(),
      machine: finalMachine
    };
    const isEdit = (currentMode === 'edit' || currentMode === 'add') ? form.id != null : false;
    await onSaveCustomer(customerPayload, isEdit);
    if (onSelectAfterSave) {
      onSelectAfterSave(customerPayload);
    }
    onClose();
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1000 }}>
      <div className="modal-content" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        <h3 style={{ marginBottom: '1rem', fontWeight: '900' }}>
          {currentMode === 'add' ? '➕ 새 거래처(고객) 등록' : (currentMode === 'edit' ? '✏️ 고객(거래처) 정보 수정' : '🔍 고객(거래처) 상세 조회')}
        </h3>

        {/* 기본 정보 */}
        <div className="form-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '2px solid #2563eb', paddingBottom: '0.5rem' }}>
            <div className="section-title" style={{ borderBottom: 'none', paddingBottom: '0', marginBottom: '0' }}>
              🏢 기본 정보
            </div>
            {(currentMode === 'add' || currentMode === 'edit') && (
              <button
                type="button"
                className="btn btn-outline"
                style={{ padding: '4px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                onClick={handleImportContact}
              >
                📞 연락처 불러오기
              </button>
            )}
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">상호명 *</label>
              {currentMode === 'view' ? (
                <div className="view-value" style={{ fontWeight: '700' }}>{form.name}</div>
              ) : (
                <input
                  type="text"
                  className="form-input"
                  placeholder="상호명 입력"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  autoFocus
                />
              )}
            </div>
            <div className="form-group">
              <label className="form-label">담당자</label>
              {currentMode === 'view' ? (
                <div className="view-value">{form.person || '-'}</div>
              ) : (
                <input
                  type="text"
                  className="form-input"
                  placeholder="담당자/대표자 성명"
                  value={form.person}
                  onChange={e => setForm({ ...form, person: e.target.value })}
                />
              )}
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">연락처</label>
              {currentMode === 'view' ? (
                <div className="view-value">{form.phone || '-'}</div>
              ) : (
                <input
                  type="text"
                  className="form-input"
                  placeholder="010-0000-0000"
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                />
              )}
            </div>
            <div className="form-group">
              <label className="form-label">팩스번호</label>
              {currentMode === 'view' ? (
                <div className="view-value">{form.fax || '-'}</div>
              ) : (
                <input
                  type="text"
                  className="form-input"
                  placeholder="063-000-0000"
                  value={form.fax}
                  onChange={e => setForm({ ...form, fax: e.target.value })}
                />
              )}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">기종 (보유 장비 목록)</label>
            {currentMode === 'view' ? (
              machineList && machineList.length > 0 ? (
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                  {machineList.map((m, idx) => (
                    <span
                      key={idx}
                      style={{
                        backgroundColor: '#eff6ff',
                        color: '#1d4ed8',
                        border: '1px solid #93c5fd',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '0.8125rem',
                        fontWeight: '700',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      🚜 {m}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="view-value" style={{ color: '#94a3b8' }}>- (등록된 보유 기종 없음)</div>
              )
            ) : (
              <>
                <div style={{ display: 'flex', gap: '4px', marginBottom: '8px', flexWrap: 'wrap' }}>
                  {machineList.map((m, idx) => (
                    <span
                      key={idx}
                      style={{
                        backgroundColor: '#eff6ff',
                        color: '#1d4ed8',
                        border: '1px solid #bfdbfe',
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      {m}
                      <button
                        type="button"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontWeight: 'bold' }}
                        onClick={() => handleRemoveMachine(idx)}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
                  <input
                    type="text"
                    className="form-input"
                    style={{ flex: 1 }}
                    placeholder="기종명 (예: DX140W)"
                    value={machineInput}
                    onChange={e => setMachineInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddMachine()}
                  />
                  <input
                    type="text"
                    className="form-input"
                    style={{ flex: 1 }}
                    placeholder="호기수 (예: 1호기)"
                    value={machineNoInput}
                    onChange={e => setMachineNoInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddMachine()}
                  />
                  <button type="button" className="btn btn-outline" onClick={handleAddMachine}>
                    추가
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* 세금계산서 정보 */}
        <div className="form-section">
          <div className="section-title">📜 세금계산서 정보</div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">사업자등록번호</label>
              {currentMode === 'view' ? (
                <div className="view-value">{form.bizno || '-'}</div>
              ) : (
                <input
                  type="text"
                  className="form-input"
                  placeholder="000-00-00000"
                  value={form.bizno}
                  onChange={e => setForm({ ...form, bizno: e.target.value })}
                />
              )}
            </div>
            <div className="form-group">
              <label className="form-label">대표자명</label>
              {currentMode === 'view' ? (
                <div className="view-value">{form.repName || '-'}</div>
              ) : (
                <input
                  type="text"
                  className="form-input"
                  placeholder="대표자 성명"
                  value={form.repName}
                  onChange={e => setForm({ ...form, repName: e.target.value })}
                />
              )}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">사업장 주소</label>
            {currentMode === 'view' ? (
              <div className="view-value">{form.addr || '-'}</div>
            ) : (
              <input
                type="text"
                className="form-input"
                placeholder="사업장 주소"
                value={form.addr}
                onChange={e => setForm({ ...form, addr: e.target.value })}
              />
            )}
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">업태</label>
              {currentMode === 'view' ? (
                <div className="view-value">{form.bizType || '-'}</div>
              ) : (
                <input
                  type="text"
                  className="form-input"
                  placeholder="업태"
                  value={form.bizType}
                  onChange={e => setForm({ ...form, bizType: e.target.value })}
                />
              )}
            </div>
            <div className="form-group">
              <label className="form-label">종목</label>
              {currentMode === 'view' ? (
                <div className="view-value">{form.bizItem || '-'}</div>
              ) : (
                <input
                  type="text"
                  className="form-input"
                  placeholder="종목"
                  value={form.bizItem}
                  onChange={e => setForm({ ...form, bizItem: e.target.value })}
                />
              )}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">이메일</label>
            {currentMode === 'view' ? (
              <div className="view-value">{form.email || '-'}</div>
            ) : (
              <input
                type="email"
                className="form-input"
                placeholder="email@domain.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
              />
            )}
          </div>
        </div>

        {/* 메모 / 특이사항 */}
        <div className="form-section" style={{ borderBottom: 'none' }}>
          <div className="section-title">📝 메모 / 특이사항</div>
          <div className="form-group">
            {currentMode === 'view' ? (
              <div className="view-value" style={{ whiteSpace: 'pre-wrap', minHeight: '40px' }}>{form.memo || '-'}</div>
            ) : (
              <textarea
                className="form-textarea"
                rows="2"
                placeholder="특이사항 메모"
                value={form.memo}
                onChange={e => setForm({ ...form, memo: e.target.value })}
              />
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
          {currentMode === 'view' ? (
            <>
              <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={onClose}>
                닫기
              </button>
              <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={() => setCurrentMode('edit')}>
                수정
              </button>
              {onDeleteCustomer && (
                <button
                  type="button"
                  className="btn btn-red-outline"
                  style={{ flex: 1 }}
                  onClick={() => {
                    if (window.confirm('정말로 이 고객을 삭제하시겠습니까?')) {
                      onDeleteCustomer(form.id);
                      onClose();
                    }
                  }}
                >
                  삭제
                </button>
              )}
            </>
          ) : (
            <>
              <button type="button" className="btn btn-primary" style={{ flex: 2 }} onClick={handleSave}>
                {currentMode === 'edit' ? '💾 수정 내용 저장' : '💾 저장 및 거래처 즉시 적용'}
              </button>
              <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={onClose}>
                취소
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
