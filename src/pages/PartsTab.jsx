// 🎨 TEAM D.D SECURE PARTS & INVENTORY TAB
import React, { useState, useMemo } from 'react';
import { PART_CATEGORIES, savePartWithPricing, unlinkPartFromMyPricing } from '../services/partsService.js';
import { normalizePartNo } from '../utils/partSecurity.js';

export default function PartsTab({
  parts = [],
  setParts,
  selectedSupplierKey = 'sejin',
  userRole = 'supplier',
  onSelectPart = () => {}
}) {
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyMyPriced, setOnlyMyPriced] = useState(false);
  
  // 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' | 'edit'
  const [formData, setFormData] = useState({
    id: '',
    code: '',
    name: '',
    spec: '',
    category: '기타소모품',
    unit: 'EA',
    machine_models: '',
    price: '',
    purchase_price: '',
    vendor_name: '',
    stock: 0,
    min_stock: 0,
    bin_location: '',
    private_memo: ''
  });

  // 필터링된 부품 목록
  const filteredParts = useMemo(() => {
    return parts.filter(p => {
      // 카테고리 필터
      if (selectedCategory !== '전체' && p.category !== selectedCategory) {
        return false;
      }
      // 내 매입가 있는 부품만 보기
      if (onlyMyPriced && !p.purchase_price) {
        return false;
      }
      // 검색어 필터
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const codeMatch = (p.code || '').toLowerCase().includes(q);
        const nameMatch = (p.name || '').toLowerCase().includes(q);
        const specMatch = (p.spec || '').toLowerCase().includes(q);
        const modelMatch = (p.machine_models || '').toLowerCase().includes(q);
        return codeMatch || nameMatch || specMatch || modelMatch;
      }
      return true;
    });
  }, [parts, selectedCategory, searchQuery, onlyMyPriced]);

  // 등록 모달 열기
  const handleOpenAdd = () => {
    setModalMode('add');
    setFormData({
      id: '',
      code: '',
      name: '',
      spec: '',
      category: '유압계통',
      unit: 'EA',
      machine_models: '',
      price: '',
      purchase_price: '',
      vendor_name: '',
      stock: 0,
      min_stock: 2,
      bin_location: '',
      private_memo: ''
    });
    setIsModalOpen(true);
  };

  // 수정 모달 열기
  const handleOpenEdit = (p) => {
    setModalMode('edit');
    setFormData({
      id: p.id || '',
      code: p.code ? String(p.code).replace(/^PART[-_]?/i, '') : '',
      name: p.name || '',
      spec: p.spec || '',
      category: p.category || '기타소모품',
      unit: p.unit || 'EA',
      machine_models: p.machine_models || '',
      price: p.price ? String(p.price) : '',
      purchase_price: p.purchase_price ? String(p.purchase_price) : '',
      vendor_name: p.vendor_name || '',
      stock: p.stock !== undefined ? p.stock : 0,
      min_stock: p.min_stock !== undefined ? p.min_stock : 0,
      bin_location: p.bin_location || '',
      private_memo: p.private_memo || ''
    });
    setIsModalOpen(true);
  };

  // 저장 처리
  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.code.trim()) {
      alert('부품번호를 입력해 주세요.');
      return;
    }
    if (!formData.name.trim()) {
      alert('품명을 입력해 주세요.');
      return;
    }

    try {
      const updatedList = await savePartWithPricing({
        partData: {
          ...formData,
          price: Number(formData.price) || 0,
          purchase_price: formData.purchase_price ? Number(formData.purchase_price) : null,
          stock: Number(formData.stock) || 0,
          min_stock: Number(formData.min_stock) || 0
        },
        selectedSupplierKey,
        isEdit: modalMode === 'edit',
        currentList: parts
      });

      if (setParts) setParts(updatedList);
      setIsModalOpen(false);
      alert('부품 정보가 안전하게 저장되었습니다.');
    } catch (err) {
      alert('저장 중 오류: ' + err.message);
    }
  };

  // 내 목록에서 단가/재고 연동 해제 (안전 소프트 삭제)
  const handleUnlink = async (part) => {
    if (!window.confirm(`[${part.code}] ${part.name}\n내 사업자의 매입단가 및 재고 설정을 초기화하시겠습니까?\n(공용 부품 마스터는 보존됩니다)`)) {
      return;
    }
    try {
      const updatedList = await unlinkPartFromMyPricing(part.code, selectedSupplierKey);
      if (setParts) setParts(updatedList);
    } catch (err) {
      alert('처리 중 오류: ' + err.message);
    }
  };

  return (
    <div className="management-container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem' }}>
      {/* ── 상단 헤더 & 컨트롤 바 ── */}
      <div className="card-box" style={{ marginBottom: '1rem', padding: '1.25rem', backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '900', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <span>🛠️</span> 부품 및 재고 마스터 관리
            </h2>
            <p style={{ fontSize: '0.8125rem', color: '#64748B', marginTop: '4px', margin: 0 }}>
              부품번호/규격은 전체 파트너와 공유되며, <strong style={{ color: '#0284C7' }}>매입원가는 본인 사업자에게만 비밀 보장</strong>됩니다.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleOpenAdd}
            style={{ fontWeight: '800', fontSize: '0.875rem', padding: '8px 16px', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <span>➕</span> 새 부품 등록
          </button>
        </div>

        {/* 검색 및 필터 컨트롤 바 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
          <input
            type="text"
            className="form-input"
            placeholder="🔍 부품번호, 품명, 규격, 기종 검색..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ fontSize: '0.875rem', padding: '0.55rem 0.75rem', borderRadius: '8px' }}
          />

          <select
            className="form-input"
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            style={{ fontSize: '0.875rem', padding: '0.55rem 0.75rem', borderRadius: '8px' }}
          >
            {PART_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat === '전체' ? '📂 전체 카테고리' : cat}</option>
            ))}
          </select>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', fontWeight: '700', color: '#334155', cursor: 'pointer', padding: '0 0.5rem' }}>
            <input
              type="checkbox"
              checked={onlyMyPriced}
              onChange={e => setOnlyMyPriced(e.target.checked)}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <span>내 매입단가 등록된 부품만 보기</span>
          </label>
        </div>
      </div>

      {/* ── 부품 목록 리스트 ── */}
      <div className="card-box" style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '1rem', overflowX: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '1.5px solid #F1F5F9' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: '800', color: '#475569' }}>
            검색 결과 총 <strong style={{ color: '#0284C7' }}>{filteredParts.length}</strong>개 품목
          </span>
        </div>

        {/* 데스크탑 테이블 뷰 */}
        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
          <thead>
            <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '2px solid #E2E8F0', color: '#475569', textAlign: 'left' }}>
              <th style={{ padding: '10px 12px' }}>부품번호(Part No)</th>
              <th style={{ padding: '10px 12px' }}>품명 및 규격</th>
              <th style={{ padding: '10px 12px' }}>적용기종</th>
              <th style={{ padding: '10px 12px' }}>분류</th>
              <th style={{ padding: '10px 12px', textAlign: 'right' }}>기준 판매가</th>
              <th style={{ padding: '10px 12px', textAlign: 'right', backgroundColor: '#F0F9FF', color: '#0369A1' }}>
                🔒 내 매입단가
              </th>
              <th style={{ padding: '10px 12px', textAlign: 'center' }}>내 재고</th>
              <th style={{ padding: '10px 12px', textAlign: 'center' }}>작업</th>
            </tr>
          </thead>
          <tbody>
            {filteredParts.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '2.5rem', color: '#94A3B8' }}>
                  등록되거나 검색된 부품이 없습니다.
                </td>
              </tr>
            ) : (
              filteredParts.map(p => (
                <tr key={p.id || p.code} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: '900', color: '#1E293B', backgroundColor: '#F1F5F9', padding: '2px 6px', borderRadius: '4px' }}>
                      {p.code ? String(p.code).replace(/^PART[-_]?/i, '') : '-'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ fontWeight: '800', color: '#0F172A' }}>{p.name}</div>
                    {p.spec && <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{p.spec}</div>}
                  </td>
                  <td style={{ padding: '10px 12px', color: '#475569', fontSize: '0.75rem' }}>
                    {p.machine_models || '-'}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '9999px', backgroundColor: '#F3F4F6', color: '#374151', fontWeight: '700' }}>
                      {p.category}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '700', color: '#334155' }}>
                    {p.price ? `₩ ${Number(p.price).toLocaleString()}` : '-'}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', backgroundColor: '#F0F9FF', fontWeight: '900', color: p.purchase_price ? '#0284C7' : '#94A3B8' }}>
                    {p.purchase_price ? `₩ ${Number(p.purchase_price).toLocaleString()}` : '미등록'}
                    {p.vendor_name && <div style={{ fontSize: '0.6875rem', color: '#0284C7', fontWeight: '500' }}>({p.vendor_name})</div>}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: '800',
                      backgroundColor: (p.stock || 0) > 0 ? '#DCFCE7' : '#FEE2E2',
                      color: (p.stock || 0) > 0 ? '#166534' : '#991B1B'
                    }}>
                      {p.stock || 0} {p.unit}
                    </span>
                    {p.bin_location && <div style={{ fontSize: '0.6875rem', color: '#64748B' }}>위치: {p.bin_location}</div>}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '4px' }}>
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ fontSize: '0.6875rem', padding: '3px 8px', fontWeight: '800' }}
                        onClick={() => onSelectPart(p)}
                        title="작성 중인 거래명세서 품목으로 추가"
                      >
                        명세서 선택
                      </button>
                      <button
                        type="button"
                        style={{ fontSize: '0.6875rem', padding: '3px 6px', border: '1px solid #CBD5E1', borderRadius: '4px', backgroundColor: '#FFFFFF', cursor: 'pointer' }}
                        onClick={() => handleOpenEdit(p)}
                        title="단가 및 재고 수정"
                      >
                        ✏️
                      </button>
                      {p.has_my_pricing && (
                        <button
                          type="button"
                          style={{ fontSize: '0.6875rem', padding: '3px 6px', border: '1px solid #FECACA', borderRadius: '4px', backgroundColor: '#FEF2F2', color: '#DC2626', cursor: 'pointer' }}
                          onClick={() => handleUnlink(p)}
                          title="내 매입단가 연동 해제"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── 부품 등록 및 단가/재고 수정 모달 ── */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '560px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            padding: '1.5rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '900', color: '#0F172A', margin: 0 }}>
                {modalMode === 'add' ? '➕ 새 부품 등록' : '✏️ 부품 정보 및 내 단가/재고 수정'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748B' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave}>
              {/* 1. 공용 마스터 정보 영역 (공유) */}
              <div style={{ backgroundColor: '#F8FAFC', padding: '1rem', borderRadius: '10px', marginBottom: '1rem', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '0.8125rem', fontWeight: '900', color: '#0284C7', marginBottom: '0.75rem' }}>
                  🌐 공용 부품 정보 (모든 파트너 공유)
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: '#334155', marginBottom: '4px' }}>
                      부품번호 (Part No) *
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="예: VOE14532101"
                      value={formData.code}
                      onChange={e => setFormData({ ...formData, code: normalizePartNo(e.target.value) })}
                      required
                      style={{ fontFamily: 'monospace', fontWeight: '800' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: '#334155', marginBottom: '4px' }}>
                      카테고리 *
                    </label>
                    <select
                      className="form-input"
                      value={formData.category}
                      onChange={e => setFormData({ ...formData, category: e.target.value })}
                    >
                      {PART_CATEGORIES.filter(c => c !== '전체').map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: '#334155', marginBottom: '4px' }}>
                    표준 품명 *
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="예: 메인펌프 비례제어밸브"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: '#334155', marginBottom: '4px' }}>
                      규격 / 사양
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="예: 24V 2W-08"
                      value={formData.spec}
                      onChange={e => setFormData({ ...formData, spec: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: '#334155', marginBottom: '4px' }}>
                      적용 장비 (호환 기종)
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="예: EC140EL, DX140"
                      value={formData.machine_models}
                      onChange={e => setFormData({ ...formData, machine_models: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: '#334155', marginBottom: '4px' }}>
                      단위
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="EA, SET 등"
                      value={formData.unit}
                      onChange={e => setFormData({ ...formData, unit: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: '#334155', marginBottom: '4px' }}>
                      기준 판매단가 (공개)
                    </label>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="고객 판매 기준가"
                      value={formData.price}
                      onChange={e => setFormData({ ...formData, price: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* 2. 내 사업자 전용 격리 정보 영역 (비공개) */}
              <div style={{ backgroundColor: '#F0F9FF', padding: '1rem', borderRadius: '10px', marginBottom: '1.25rem', border: '1px solid #BAE6FD' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: '0.8125rem', fontWeight: '900', color: '#0369A1', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>🔒</span> 내 사업자 전용 정보 (타 사업자 절대 비공개)
                  </div>
                  <span style={{ fontSize: '0.6875rem', backgroundColor: '#E0F2FE', color: '#0284C7', padding: '2px 6px', borderRadius: '4px', fontWeight: '800' }}>
                    보안 격리
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: '#0369A1', marginBottom: '4px' }}>
                      🔒 실제 매입단가 (원가)
                    </label>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="내가 구매한 단가"
                      value={formData.purchase_price}
                      onChange={e => setFormData({ ...formData, purchase_price: e.target.value })}
                      style={{ fontWeight: '800', borderColor: '#7DD3FC' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: '#0369A1', marginBottom: '4px' }}>
                      주 매입처 상호
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="구매처 상호"
                      value={formData.vendor_name}
                      onChange={e => setFormData({ ...formData, vendor_name: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: '#0369A1', marginBottom: '4px' }}>
                      현재 보유 재고
                    </label>
                    <input
                      type="number"
                      className="form-input"
                      value={formData.stock}
                      onChange={e => setFormData({ ...formData, stock: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: '#0369A1', marginBottom: '4px' }}>
                      보관 위치 (선반/랙 번호)
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="예: 창고 B열-2번"
                      value={formData.bin_location}
                      onChange={e => setFormData({ ...formData, bin_location: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: '#0369A1', marginBottom: '4px' }}>
                    나만의 비밀 메모
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="타인에게 보이지 않는 내부 메모"
                    value={formData.private_memo}
                    onChange={e => setFormData({ ...formData, private_memo: e.target.value })}
                  />
                </div>
              </div>

              {/* 버튼 액션 */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setIsModalOpen(false)}
                  style={{ backgroundColor: '#F1F5F9', color: '#475569', fontWeight: '700' }}
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ fontWeight: '800' }}
                >
                  {modalMode === 'add' ? '등록 완료' : '수정사항 저장'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
