import React, { useState } from 'react';

export default function CustomerTab({
  customers,
  onSaveCustomer,
  onDeleteCustomer,
  onSelectCustomer
}) {
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    person: '',
    phone: '',
    addr: '',
    bizno: '',
    memo: ''
  });

  const filteredCustomers = customers.filter(c =>
    (c.code || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.phone || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.person || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenAdd = () => {
    // Generate next code e.g. C0003
    let maxId = 0;
    customers.forEach(c => {
      const match = String(c.code || '').match(/\d+/);
      if (match) {
        const num = parseInt(match[0], 10);
        if (num > maxId) maxId = num;
      }
    });
    const nextCode = `C${String(maxId + 1).padStart(4, '0')}`;

    setEditingCustomer(null);
    setFormData({
      code: nextCode,
      name: '',
      person: '',
      phone: '',
      addr: '',
      bizno: '',
      memo: ''
    });
    setShowModal(true);
  };

  const handleOpenEdit = (customer) => {
    setEditingCustomer(customer);
    setFormData({ ...customer });
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('거래처명은 필수 항목입니다.');
      return;
    }
    onSaveCustomer(formData, !!editingCustomer);
    setShowModal(false);
  };

  return (
    <div className="management-container">
      <div className="card-box">
        <div className="card-box-header">
          <div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: '900' }}>👥 고객 (거래처) 관리</h2>
            <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>
              총 {customers.length}건 • 명세서 작성 시 거래처 자동 검색 및 선택에 연동됩니다.
            </p>
          </div>
          <div>
            <button className="btn btn-primary" onClick={handleOpenAdd}>
              + 거래처 추가
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div style={{ padding: '0.75rem 1.25rem', backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
          <input
            type="text"
            className="form-input"
            placeholder="검색: 코드, 거래처명, 담당자, 연락처"
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
                <th>상호명 / 거래처</th>
                <th>담당자</th>
                <th>연락처</th>
                <th>주소</th>
                <th style={{ textAlign: 'center' }}>작업</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
                    등록된 거래처가 없습니다.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map(c => (
                  <tr key={c.id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: '700' }}>{c.code || '-'}</td>
                    <td>
                      <div style={{ fontWeight: '800' }}>{c.name}</div>
                      {c.bizno && <div style={{ fontSize: '0.6875rem', color: '#6b7280' }}>{c.bizno}</div>}
                    </td>
                    <td>{c.person || '-'}</td>
                    <td style={{ fontFamily: 'monospace' }}>{c.phone || '-'}</td>
                    <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.addr || '-'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                        <button
                          className="btn btn-primary"
                          style={{ fontSize: '0.6875rem', padding: '0.25rem 0.5rem' }}
                          onClick={() => onSelectCustomer(c)}
                        >
                          명세서에 선택
                        </button>
                        <button
                          className="btn btn-outline"
                          style={{ fontSize: '0.6875rem', padding: '0.25rem 0.5rem' }}
                          onClick={() => handleOpenEdit(c)}
                        >
                          수정
                        </button>
                        <button
                          className="btn btn-red-outline"
                          style={{ fontSize: '0.6875rem', padding: '0.25rem 0.5rem' }}
                          onClick={() => {
                            if (window.confirm(`"${c.name}" 거래처를 삭제하시겠습니까?`)) {
                              onDeleteCustomer(c.id);
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
              {editingCustomer ? '✏️ 거래처 정보 수정' : '➕ 새 거래처 등록'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">거래처 코드</label>
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
                    placeholder="123-45-67890"
                    value={formData.bizno}
                    onChange={(e) => setFormData({ ...formData, bizno: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">담당자성명</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.person}
                    onChange={(e) => setFormData({ ...formData, person: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">연락처</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="010-0000-0000"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">주소</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.addr}
                  onChange={(e) => setFormData({ ...formData, addr: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">메모</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.memo}
                  onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
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
