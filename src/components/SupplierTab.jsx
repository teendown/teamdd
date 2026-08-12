import React, { useState } from 'react';

export default function SupplierTab({
  suppliers,
  onSaveSupplier,
  onDeleteSupplier,
  onSelectSupplier
}) {
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    bizno: '',
    person: '',
    phone: '',
    addr: '',
    email: '',
    bank: '',
    memo: ''
  });

  const filteredSuppliers = suppliers.filter(s =>
    (s.code || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.bizno || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.phone || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenAdd = () => {
    let maxId = 0;
    suppliers.forEach(s => {
      const match = String(s.code || '').match(/\d+/);
      if (match) {
        const num = parseInt(match[0], 10);
        if (num > maxId) maxId = num;
      }
    });
    const nextCode = `S${String(maxId + 1).padStart(4, '0')}`;

    setEditingSupplier(null);
    setFormData({
      code: nextCode,
      name: '',
      bizno: '',
      person: '',
      phone: '',
      addr: '',
      email: '',
      bank: '',
      memo: ''
    });
    setShowModal(true);
  };

  const handleOpenEdit = (supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      ...supplier,
      person: supplier.person || supplier.name || ''
    });
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('공급자 상호명은 필수입니다.');
      return;
    }
    onSaveSupplier(formData, !!editingSupplier);
    setShowModal(false);
  };

  return (
    <div className="management-container">
      <div className="card-box">
        <div className="card-box-header">
          <div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: '900' }}>🏢 공급자 관리</h2>
            <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>
              총 {suppliers.length}건 • 세진건설기계, 디에스건설기계 김제점 및 커스텀 공급자 설정
            </p>
          </div>
          <div>
            <button className="btn btn-primary" onClick={handleOpenAdd}>
              + 공급자 추가
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div style={{ padding: '0.75rem 1.25rem', backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
          <input
            type="text"
            className="form-input"
            placeholder="검색: 코드, 상호명, 사업자번호, 연락처"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Table View */}
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>상호명</th>
                <th>사업자번호</th>
                <th>대표자/담당자</th>
                <th>연락처</th>
                <th>입금계좌</th>
                <th style={{ textAlign: 'center' }}>작업</th>
              </tr>
            </thead>
            <tbody>
              {filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
                    등록된 공급자가 없습니다.
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: '700' }}>{s.code || '-'}</td>
                    <td>
                      <div style={{ fontWeight: '800' }}>{s.name}</div>
                      {s.email && <div style={{ fontSize: '0.6875rem', color: '#6b7280' }}>{s.email}</div>}
                    </td>
                    <td style={{ fontFamily: 'monospace' }}>{s.bizno || '-'}</td>
                    <td>{s.person || s.name || '-'}</td>
                    <td style={{ fontFamily: 'monospace' }}>{s.phone || s.tel || '-'}</td>
                    <td style={{ fontSize: '0.75rem' }}>{s.bank || '-'}</td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                        <button
                          className="btn btn-primary"
                          style={{ fontSize: '0.6875rem', padding: '0.25rem 0.5rem' }}
                          onClick={() => onSelectSupplier(s)}
                        >
                          명세서에 선택
                        </button>
                        <button
                          className="btn btn-outline"
                          style={{ fontSize: '0.6875rem', padding: '0.25rem 0.5rem' }}
                          onClick={() => handleOpenEdit(s)}
                        >
                          수정
                        </button>
                        <button
                          className="btn btn-red-outline"
                          style={{ fontSize: '0.6875rem', padding: '0.25rem 0.5rem' }}
                          onClick={() => {
                            if (window.confirm(`"${s.name}" 공급자를 삭제하시겠습니까?`)) {
                              onDeleteSupplier(s.id);
                            }
                          }}
                        >
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ fontSize: '1rem', fontWeight: '900', marginBottom: '1rem' }}>
              {editingSupplier ? '✏️ 공급자 정보 수정' : '➕ 새 공급자 등록'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">공급자 코드</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">상호명 *</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">사업자등록번호</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.bizno}
                    onChange={(e) => setFormData({ ...formData, bizno: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">대표자명</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.person}
                    onChange={(e) => setFormData({ ...formData, person: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">연락처</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">이메일</label>
                  <input
                    type="email"
                    className="form-input"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">사업장주소</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.addr}
                  onChange={(e) => setFormData({ ...formData, addr: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">입금계좌 정보</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="은행 계좌번호 예금주"
                  value={formData.bank}
                  onChange={(e) => setFormData({ ...formData, bank: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  저장
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ flex: 1 }}
                  onClick={() => setShowModal(false)}
                >
                  취소
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
