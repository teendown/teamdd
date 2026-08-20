// 🎨 TEAM D.D PARTS INVENTORY TAB
import React from 'react';

export default function PartsTab({
  parts = [],
  onSelectPart
}) {
  return (
    <div className="management-container">
      <div className="card-box">
        <div className="card-box-header">
          <h2 style={{ fontSize: '1.125rem', fontWeight: '900' }}>🛠️ 부품 및 재고 관리</h2>
        </div>

        {/* Mobile Cards View */}
        <div className="mobile-cards-view">
          {parts.map(p => (
            <div key={p.id} className="mobile-data-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                <span style={{ fontWeight: '900', fontSize: '0.9375rem' }}>{p.name}</span>
                <span style={{ fontSize: '0.6875rem', backgroundColor: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: '9999px', fontWeight: '700' }}>
                  재고 {p.stock}
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#4b5563', marginBottom: '0.5rem' }}>
                <div>단가: ₩ {Number(p.price).toLocaleString()} | 분류: {p.category}</div>
              </div>
              <button
                className="btn btn-primary"
                style={{ width: '100%', minHeight: '36px', fontSize: '0.75rem' }}
                onClick={() => onSelectPart(p)}
              >
                명세서 항목으로 선택
              </button>
            </div>
          ))}
        </div>

        {/* Desktop Table View */}
        <div className="desktop-table-view">
          <table className="data-table">
            <thead>
              <tr>
                <th>코드</th>
                <th>품명</th>
                <th>카테고리</th>
                <th>단가</th>
                <th>재고</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody>
              {parts.map(p => (
                <tr key={p.id}>
                  <td>{p.code}</td>
                  <td style={{ fontWeight: '700' }}>{p.name}</td>
                  <td>{p.category}</td>
                  <td>₩ {Number(p.price).toLocaleString()}</td>
                  <td>{p.stock}</td>
                  <td>
                    <button
                      className="btn btn-primary"
                      style={{ fontSize: '10px', padding: '2px 6px' }}
                      onClick={() => onSelectPart(p)}
                    >
                      명세서 선택
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
