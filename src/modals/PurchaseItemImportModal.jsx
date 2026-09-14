// 🎨 TEAM D.D PURCHASE ITEM IMPORT MODAL (매입 품목 명세서/견적서 불러오기)
import React, { useState, useMemo, useEffect } from 'react';
import { registerBackHandler } from '../utils/navigationManager.js';

export default function PurchaseItemImportModal({
  isOpen,
  onClose,
  purchasesList = [],
  selectedSupplierKey = 'sejin',
  onImportItems
}) {
  const [search, setSearch] = useState('');
  const [selectedItems, setSelectedItems] = useState([]); // [{ key, item, vendor_name, invoice_date, sell_price, qty }]
  const [marginPercent, setMarginPercent] = useState(25); // 기본 마진 25%

  // 모바일 뒤로가기 키 닫기
  useEffect(() => {
    if (!isOpen) return;
    return registerBackHandler(() => {
      onClose();
      return true;
    }, 'PurchaseItemImportModal');
  }, [isOpen, onClose]);

  // 모달 열릴 때 초기화
  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setSelectedItems([]);
    }
  }, [isOpen]);

  // 전체 매입전표에서 개별 품목 목록 플랫화(최신 전표순)
  const allPurchasedItems = useMemo(() => {
    const list = [];
    // 최신 전표 우선 정렬
    const sorted = [...purchasesList].sort((a, b) => (b.invoice_date || '').localeCompare(a.invoice_date || ''));

    sorted.forEach((p, pIdx) => {
      if (Array.isArray(p.items)) {
        p.items.forEach((it, itIdx) => {
          if (it && it.name) {
            list.push({
              key: `${p.id || pIdx}_${itIdx}`,
              name: it.name,
              spec: it.spec || '',
              purchase_price: Number(it.unit_price) || 0,
              qty: Number(it.qty) || 1,
              vendor_name: p.vendor_name || '매입처 미기재',
              invoice_date: p.invoice_date || '',
              supplier_key: p.supplier_key
            });
          }
        });
      }
    });
    return list;
  }, [purchasesList]);

  // 검색 필터링
  const filteredItems = useMemo(() => {
    if (!search || search.trim() === '') return allPurchasedItems.slice(0, 50);
    const q = search.toLowerCase();
    return allPurchasedItems.filter(it => 
      it.name.toLowerCase().includes(q) ||
      it.spec.toLowerCase().includes(q) ||
      it.vendor_name.toLowerCase().includes(q)
    ).slice(0, 50);
  }, [allPurchasedItems, search]);

  if (!isOpen) return null;

  // 체크박스 토글
  const handleToggleSelect = (item) => {
    const exists = selectedItems.find(x => x.key === item.key);
    if (exists) {
      setSelectedItems(selectedItems.filter(x => x.key !== item.key));
    } else {
      // 마진 계산된 판매단가
      const calcSellPrice = Math.round((item.purchase_price * (1 + marginPercent / 100)) / 100) * 100;
      setSelectedItems([
        ...selectedItems,
        {
          ...item,
          sell_price: calcSellPrice,
          import_qty: 1
        }
      ]);
    }
  };

  // 선택된 품목의 수량 / 판매단가 수정
  const handleUpdateSelected = (key, field, value) => {
    setSelectedItems(selectedItems.map(it => {
      if (it.key === key) {
        return { ...it, [field]: Number(value) || 0 };
      }
      return it;
    }));
  };

  // 마진율 변경 시 선택된 품목들의 판매단가 일괄 재계산
  const handleApplyMargin = (percent) => {
    setMarginPercent(percent);
    setSelectedItems(selectedItems.map(it => ({
      ...it,
      sell_price: Math.round((it.purchase_price * (1 + percent / 100)) / 100) * 100
    })));
  };

  // 명세서에 삽입
  const handleConfirmImport = () => {
    if (selectedItems.length === 0) {
      alert('추가할 품목을 1개 이상 선택해 주세요.');
      return;
    }

    const itemsToImport = selectedItems.map(it => ({
      name: it.name,
      spec: it.spec,
      qty: it.import_qty || 1,
      price: it.sell_price || it.purchase_price,
      amount: (it.import_qty || 1) * (it.sell_price || it.purchase_price),
      memo: it.vendor_name ? `[매입: ${it.vendor_name} (${(it.purchase_price).toLocaleString()}원)]` : ''
    }));

    if (onImportItems) {
      onImportItems(itemsToImport);
    }
    onClose();
  };

  return (
    <div
      className="modal-overlay"
      style={{
        zIndex: 10050,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
      onClick={onClose}
    >
      <div
        className="modal-content"
        style={{
          maxWidth: '880px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#FFFFFF',
          borderRadius: '20px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div
          style={{
            padding: '1rem 1.25rem',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#F8FAFC'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.25rem' }}>📦</span>
            <div>
              <h3 style={{ fontSize: '1.0625rem', fontWeight: '900', color: '#0F172A', margin: 0 }}>
                과거 매입 품목 불러오기 (원가 확인 및 마진 책정)
              </h3>
              <p style={{ fontSize: '0.6875rem', color: '#64748B', margin: 0 }}>
                타 업체에서 구매했던 부품의 매입단가를 조회하고, 마진을 적용해 견적서/명세서에 즉시 추가합니다.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-outline"
            style={{ padding: '4px 8px', fontSize: '11px', borderColor: '#CBD5E1' }}
            onClick={onClose}
          >
            ✕ 닫기
          </button>
        </div>

        {/* 상단 검색 & 마진율 프리셋 */}
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #F1F5F9', backgroundColor: '#FFFFFF' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <input
              type="text"
              className="form-input"
              placeholder="🔍 과거 매입 품목명, 규격, 매입처 상호 검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#475569' }}>💡 판매가 마진율:</span>
              {[15, 20, 25, 30, 40].map(p => (
                <button
                  key={p}
                  type="button"
                  style={{
                    padding: '2px 8px',
                    fontSize: '11px',
                    borderRadius: '6px',
                    border: marginPercent === p ? '1.5px solid #2563EB' : '1px solid #CBD5E1',
                    backgroundColor: marginPercent === p ? '#EFF6FF' : '#FFFFFF',
                    color: marginPercent === p ? '#1D4ED8' : '#64748B',
                    fontWeight: marginPercent === p ? '800' : '500',
                    cursor: 'pointer'
                  }}
                  onClick={() => handleApplyMargin(p)}
                >
                  +{p}%
                </button>
              ))}
            </div>

            <div style={{ fontSize: '11px', color: '#64748B' }}>
              검색 결과: <b>{filteredItems.length}</b>건 (선택됨: <b style={{ color: '#2563EB' }}>{selectedItems.length}</b>건)
            </div>
          </div>
        </div>

        {/* 품목 목록 테이블 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 1.25rem' }}>
          {filteredItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94A3B8', fontSize: '0.875rem' }}>
              등록된 매입전표 품목이 없거나 검색 결과가 없습니다.<br />
              [매입 관리] 탭에서 전표 사진이나 PDF를 먼저 등록해 보세요!
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1.5px solid #CBD5E1', color: '#475569', backgroundColor: '#F8FAFC' }}>
                  <th style={{ padding: '8px 6px', width: '36px', textAlign: 'center' }}>선택</th>
                  <th style={{ padding: '8px 6px' }}>품목명 / 규격</th>
                  <th style={{ padding: '8px 6px', width: '130px' }}>최근 매입처</th>
                  <th style={{ padding: '8px 6px', width: '90px' }}>매입일자</th>
                  <th style={{ padding: '8px 6px', width: '100px', textAlign: 'right' }}>매입단가</th>
                  <th style={{ padding: '8px 6px', width: '120px', textAlign: 'right', color: '#2563EB' }}>
                    판매단가 (+{marginPercent}%)
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map(it => {
                  const isSelected = selectedItems.some(x => x.key === it.key);
                  const selectedObj = selectedItems.find(x => x.key === it.key);
                  const calcSell = Math.round((it.purchase_price * (1 + marginPercent / 100)) / 100) * 100;

                  return (
                    <tr
                      key={it.key}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        backgroundColor: isSelected ? '#EFF6FF' : 'transparent',
                        cursor: 'pointer'
                      }}
                      onClick={() => handleToggleSelect(it)}
                    >
                      <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          style={{ width: '16px', height: '16px', accentColor: '#2563EB' }}
                        />
                      </td>
                      <td style={{ padding: '8px 6px' }}>
                        <div style={{ fontWeight: '800', color: '#1E293B' }}>{it.name}</div>
                        {it.spec && <div style={{ fontSize: '10px', color: '#64748B' }}>{it.spec}</div>}
                      </td>
                      <td style={{ padding: '8px 6px', color: '#475569', fontSize: '11px' }}>
                        {it.vendor_name}
                      </td>
                      <td style={{ padding: '8px 6px', color: '#64748B', fontSize: '11px', fontFamily: 'monospace' }}>
                        {it.invoice_date || '-'}
                      </td>
                      <td style={{ padding: '8px 6px', textAlign: 'right', fontWeight: '700', color: '#0F172A' }}>
                        {it.purchase_price.toLocaleString()}원
                      </td>
                      <td
                        style={{ padding: '8px 6px', textAlign: 'right' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {isSelected ? (
                          <input
                            type="number"
                            className="form-input"
                            style={{ width: '100px', textAlign: 'right', padding: '2px 6px', fontSize: '11px', fontWeight: '800', color: '#1D4ED8' }}
                            value={selectedObj?.sell_price || 0}
                            onChange={(e) => handleUpdateSelected(it.key, 'sell_price', e.target.value)}
                          />
                        ) : (
                          <span style={{ fontWeight: '800', color: '#2563EB' }}>
                            {calcSell.toLocaleString()}원
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* 하단 확인 버튼 바 */}
        <div
          style={{
            padding: '0.875rem 1.25rem',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#F8FAFC'
          }}
        >
          <div style={{ fontSize: '12px', color: '#475569' }}>
            선택된 품목: <b style={{ color: '#2563EB' }}>{selectedItems.length}</b>개
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-outline"
              style={{ padding: '6px 14px', fontSize: '12px' }}
              onClick={onClose}
            >
              취소
            </button>
            <button
              type="button"
              className="btn btn-primary"
              style={{ padding: '6px 20px', fontSize: '12px', fontWeight: '800' }}
              onClick={handleConfirmImport}
              disabled={selectedItems.length === 0}
            >
              📥 명세서에 품목 추가하기 ({selectedItems.length})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
