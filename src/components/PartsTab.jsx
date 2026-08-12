import React, { useState } from 'react';
import { PART_CATEGORIES } from '../services/defaults.js';

export default function PartsTab({
  parts,
  onSavePart,
  onDeletePart,
  onSelectPart
}) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('전체');
  const [showModal, setShowModal] = useState(false);
  const [editingPart, setEditingPart] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    category: '필터/오일',
    unit: 'EA',
    price: 0,
    stock: 0,
    min_stock: 5,
    location: '',
    memo: ''
  });

  const filteredParts = parts.filter(p => {
    const matchesCat = activeCategory === '전체' || p.category === activeCategory;
    const matchesSearch = (p.code || '').toLowerCase().includes(search.toLowerCase()) ||
                          (p.name || '').toLowerCase().includes(search.toLowerCase()) ||
                          (p.category || '').toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleOpenAdd = () => {
    let maxId = 0;
    parts.forEach(p => {
      const match = String(p.code || '').match(/\d+/);
      if (match) {
        const num = parseInt(match[0], 10);
        if (num > maxId) maxId = num;
      }
    });
    const nextCode = `P${String(maxId + 1).padStart(4, '0')}`;

    setEditingPart(null);
    setFormData({
      code: nextCode,
      name: '',
      category: '필터/오일',
      unit: 'EA',
      price: 0,
      stock: 0,
      min_stock: 5,
      location: '',
      memo: ''
    });
    setShowModal(true);
  };

  const handleOpenEdit = (part) => {
    setEditingPart(part);
    setFormData({ ...part });
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('부품명은 필수입니다.');
      return;
    }
    onSavePart(formData, !!editingPart);
    setShowModal(false);
  };

  return (
    <div className="management-container">
      <div className="card-box">
        <div className="card-box-header">
          <div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: '900' }}>🛠️ 부품 및 재고 관리</h2>
            <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>
              총 {parts.length}건 • 품목 선택 시 명세서 작성 항목으로 즉시 추가됩니다.
            </p>
          </div>
          <div>
            <button className="btn btn-primary" onClick={handleOpenAdd}>
              + 부품 추가
            </button>
          </div>
        </div>

        {/* Category Pill Filters & Search */}
        <div style={{ padding: '0.75rem 1.25rem', backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
            {PART_CATEGORIES.map(cat => (
              <button
                key={cat}
                className={`btn ${activeCategory === cat ? 'btn-primary' : 'btn-outline'}`}
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem', borderRadius: '9999px', whiteSpace: 'nowrap' }}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          <input
            type="text"
            className="form-input"
            placeholder="검색: 코드, 품명, 카테고리"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Table View */}
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>부품번호</th>
                <th>품명</th>
                <th>카테고리</th>
                <th>단위</th>
                <th style={{ textAlign: 'right' }}>단가 (원)</th>
                <th style={{ textAlign: 'center' }}>재고수량</th>
                <th style={{ textAlign: 'center' }}>작업</th>
              </tr>
            </thead>
            <tbody>
              {filteredParts.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
                    등록된 부품이 없습니다.
                  </td>
                </tr>
              ) : (
                filteredParts.map(p => {
                  const isOut = Number(p.stock) <= 0;
                  const isLow = !isOut && Number(p.stock) <= Number(p.min_stock || 5);

                  return (
                    <tr key={p.id} style={{ backgroundColor: isOut ? '#fef2f2' : isLow ? '#fefce8' : 'transparent' }}>
                      <td style={{ fontFamily: 'monospace', fontWeight: '700' }}>{p.code || '-'}</td>
                      <td>
                        <div style={{ fontWeight: '800' }}>{p.name}</div>
                        {p.memo && <div style={{ fontSize: '0.6875rem', color: '#6b7280' }}>{p.memo}</div>}
                      </td>
                      <td>
                        <span style={{ fontSize: '0.6875rem', padding: '0.125rem 0.5rem', borderRadius: '9999px', backgroundColor: '#f3f4f6', border: '1px solid #e5e7eb' }}>
                          {p.category || '기타'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>{p.unit || 'EA'}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: '700' }}>
                        {Number(p.price || 0).toLocaleString()}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: '800',
                          padding: '0.25rem 0.625rem',
                          borderRadius: '9999px',
                          backgroundColor: isOut ? '#dc2626' : isLow ? '#facc15' : '#dcfce7',
                          color: isOut ? '#ffffff' : isLow ? '#000000' : '#166534'
                        }}>
                          {p.stock ?? 0} {isOut ? '(품절)' : isLow ? '(저재고)' : ''}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                          <button
                            className="btn btn-primary"
                            style={{ fontSize: '0.6875rem', padding: '0.25rem 0.5rem' }}
                            onClick={() => onSelectPart(p)}
                          >
                            명세서에 선택
                          </button>
                          <button
                            className="btn btn-outline"
                            style={{ fontSize: '0.6875rem', padding: '0.25rem 0.5rem' }}
                            onClick={() => handleOpenEdit(p)}
                          >
                            수정
                          </button>
                          <button
                            className="btn btn-red-outline"
                            style={{ fontSize: '0.6875rem', padding: '0.25rem 0.5rem' }}
                            onClick={() => {
                              if (window.confirm(`"${p.name}" 부품을 삭제하시겠습니까?`)) {
                                onDeletePart(p.id);
                              }
                            }}
                          >
                            삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
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
              {editingPart ? '✏️ 부품 정보 수정' : '➕ 새 부품 등록'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">부품 코드</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">품명 *</label>
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
                  <label className="form-label">카테고리</label>
                  <select
                    className="form-select"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    {PART_CATEGORIES.filter(c => c !== '전체').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">단위</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">단가 (원)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) || 0 })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">재고 수량</label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">최소 재고 경고기준</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.min_stock}
                  onChange={(e) => setFormData({ ...formData, min_stock: Number(e.target.value) || 0 })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">비고 / 메모</label>
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
