// 🎨 TEAM D.D PURCHASE MANAGEMENT TAB (매입전표 / 영수증 / 매입원장 관리)
import React, { useState, useMemo, useEffect } from 'react';
import { areSupplierKeysEquivalent } from '../utils/validation.js';
import { registerBackHandler } from '../utils/navigationManager.js';

export default function PurchaseTab({
  purchasesList = [],
  suppliersList = [],
  selectedSupplierKey = 'sejin',
  onOpenOcrModal,
  onDeletePurchase
}) {
  const [supplierFilter, setSupplierFilter] = useState('all'); // all or supplier id
  const [search, setSearch] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null); // 상세 조회 모달
  const [viewReceiptImage, setViewReceiptImage] = useState(null); // 영수증 원본 확대 모달

  // 모바일 뒤로가기 키 닫기
  useEffect(() => {
    if (!selectedInvoice && !viewReceiptImage) return;
    return registerBackHandler(() => {
      if (viewReceiptImage) {
        setViewReceiptImage(null);
        return true;
      }
      setSelectedInvoice(null);
      return true;
    }, 'PurchaseTabDetailModal');
  }, [selectedInvoice, viewReceiptImage]);

  // 필터링된 매입전표 목록
  const filteredPurchases = useMemo(() => {
    return purchasesList.filter(p => {
      // 내 사업자 필터
      if (supplierFilter !== 'all') {
        if (!areSupplierKeysEquivalent(p.supplier_key, supplierFilter)) return false;
      }
      // 검색어 필터
      if (search && search.trim() !== '') {
        const q = search.toLowerCase();
        const vendorMatch = (p.vendor_name || '').toLowerCase().includes(q);
        const biznoMatch = (p.vendor_bizno || '').includes(q);
        const memoMatch = (p.memo || '').toLowerCase().includes(q);
        const itemMatch = Array.isArray(p.items) && p.items.some(it => (it.name || '').toLowerCase().includes(q));
        return vendorMatch || biznoMatch || memoMatch || itemMatch;
      }
      return true;
    });
  }, [purchasesList, supplierFilter, search]);

  // 통계 계산
  const stats = useMemo(() => {
    const totalAmount = filteredPurchases.reduce((sum, p) => sum + (Number(p.total_amount) || 0), 0);
    const totalCount = filteredPurchases.length;
    const vendorSet = new Set(filteredPurchases.map(p => p.vendor_name).filter(Boolean));
    return {
      totalAmount,
      totalCount,
      vendorCount: vendorSet.size
    };
  }, [filteredPurchases]);

  // 엑셀 내보내기
  const handleExportExcel = () => {
    if (filteredPurchases.length === 0) {
      alert('출력할 매입 내역이 없습니다.');
      return;
    }

    const ExcelJS = window.ExcelJS;
    if (!ExcelJS) {
      alert('엑셀 변환 라이브러리가 준비되지 않았습니다.');
      return;
    }

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('매입전표내역');

    ws.columns = [
      { header: '전표일자', key: 'invoice_date', width: 14 },
      { header: '내 사업자', key: 'my_supplier', width: 16 },
      { header: '매입처 상호', key: 'vendor_name', width: 20 },
      { header: '매입처 사업자번호', key: 'vendor_bizno', width: 18 },
      { header: '품목 내역', key: 'items_summary', width: 30 },
      { header: '공급가액', key: 'supply_amount', width: 15 },
      { header: '부가세', key: 'vat_amount', width: 15 },
      { header: '총 매입금액', key: 'total_amount', width: 16 },
      { header: '메모', key: 'memo', width: 25 }
    ];

    filteredPurchases.forEach(p => {
      const mySupp = suppliersList.find(s => areSupplierKeysEquivalent(s.id, p.supplier_key));
      const itemsSummary = Array.isArray(p.items) 
        ? p.items.map(it => `${it.name}${it.qty > 1 ? `(${it.qty})` : ''}`).join(', ')
        : '';

      ws.addRow({
        invoice_date: p.invoice_date || '',
        my_supplier: mySupp?.name || mySupp?.company || p.supplier_key || '',
        vendor_name: p.vendor_name || '',
        vendor_bizno: p.vendor_bizno || '',
        items_summary: itemsSummary,
        supply_amount: Number(p.supply_amount) || 0,
        vat_amount: Number(p.vat_amount) || 0,
        total_amount: Number(p.total_amount) || 0,
        memo: p.memo || ''
      });
    });

    wb.xlsx.writeBuffer().then(buffer => {
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `매입전표내역_${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  return (
    <div className="management-container">
      {/* 상단 통계 카드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
        <div className="card-box" style={{ padding: '1rem', borderLeft: '4px solid #2563EB' }}>
          <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: '700' }}>총 매입 금액</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#1E293B', marginTop: '4px' }}>
            {stats.totalAmount.toLocaleString()}원
          </div>
        </div>
        <div className="card-box" style={{ padding: '1rem', borderLeft: '4px solid #16A34A' }}>
          <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: '700' }}>총 매입 건수</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#1E293B', marginTop: '4px' }}>
            {stats.totalCount}건
          </div>
        </div>
        <div className="card-box" style={{ padding: '1rem', borderLeft: '4px solid #9333EA' }}>
          <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: '700' }}>거래 매입처 수</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#1E293B', marginTop: '4px' }}>
            {stats.vendorCount}곳
          </div>
        </div>
      </div>

      <div className="card-box">
        {/* 상단 헤더 & 컨트롤 바 */}
        <div className="card-box-header" style={{ flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.25rem' }}>🧾</span>
            <div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: '900', margin: 0 }}>매입전표 및 영수증 관리</h2>
              <p style={{ fontSize: '0.6875rem', color: '#64748B', margin: 0 }}>
                외부 구매 전표(PDF/사진)를 사업자별로 보관하고 부품 원가를 관리합니다.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-outline"
              style={{ fontSize: '0.8125rem', padding: '0.4rem 0.75rem', borderColor: '#CBD5E1', color: '#334155' }}
              onClick={handleExportExcel}
            >
              📊 엑셀 다운로드
            </button>
            <button
              type="button"
              className="btn btn-primary"
              style={{ fontSize: '0.8125rem', padding: '0.4rem 0.875rem', fontWeight: '800' }}
              onClick={onOpenOcrModal}
            >
              ➕ 전표 / 영수증 AI 등록
            </button>
          </div>
        </div>

        {/* 필터 바 */}
        <div style={{ padding: '0.75rem 1rem', backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#475569' }}>🏢 내 사업자:</span>
            <select
              className="form-input"
              style={{ width: 'auto', fontSize: '12px', padding: '4px 8px', fontWeight: '700' }}
              value={supplierFilter}
              onChange={(e) => setSupplierFilter(e.target.value)}
            >
              <option value="all">전체 사업자 매입</option>
              {suppliersList.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name || s.company}
                </option>
              ))}
            </select>
          </div>

          <div style={{ flex: 1, minWidth: '200px' }}>
            <input
              type="text"
              className="form-input"
              style={{ fontSize: '12px', padding: '4px 8px' }}
              placeholder="🔍 매입처 상호, 사업자번호, 품목명 검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* 모바일 카드 뷰 */}
        <div className="mobile-cards-view">
          {filteredPurchases.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94A3B8', fontSize: '0.875rem' }}>
              등록된 매입전표가 없습니다.<br />
              상단의 <b>[➕ 전표 / 영수증 AI 등록]</b>을 눌러 전표 사진이나 PDF를 올려보세요!
            </div>
          ) : (
            filteredPurchases.map(p => {
              const mySupp = suppliersList.find(s => areSupplierKeysEquivalent(s.id, p.supplier_key));
              const itemsCount = Array.isArray(p.items) ? p.items.length : 0;
              const firstItem = p.items?.[0]?.name || '품목';

              return (
                <div key={p.id} className="mobile-data-card" onClick={() => setSelectedInvoice(p)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontWeight: '900', fontSize: '0.9375rem', color: '#0F172A' }}>{p.vendor_name}</span>
                      <span style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '4px', backgroundColor: '#EFF6FF', color: '#1D4ED8', fontWeight: '700' }}>
                        {mySupp?.name || mySupp?.company || '세진'}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#64748B', fontFamily: 'monospace' }}>{p.invoice_date}</span>
                  </div>

                  <div style={{ fontSize: '0.75rem', color: '#475569', marginBottom: '0.5rem' }}>
                    <div>📦 {firstItem} {itemsCount > 1 ? `외 ${itemsCount - 1}건` : ''}</div>
                    {p.vendor_bizno && <div style={{ color: '#64748B', fontSize: '0.6875rem' }}>사업자: {p.vendor_bizno}</div>}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed #E2E8F0', paddingTop: '6px', marginTop: '6px' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                      {p.receipt_image ? '📷 증빙사진 있음' : '증빙 미첨부'}
                    </span>
                    <span style={{ fontSize: '0.9375rem', fontWeight: '900', color: '#2563EB' }}>
                      {(Number(p.total_amount) || 0).toLocaleString()}원
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 데스크톱 테이블 뷰 */}
        <div className="desktop-table-view">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '110px' }}>전표일자</th>
                <th style={{ width: '130px' }}>내 사업자</th>
                <th>매입처 상호 / 사업자번호</th>
                <th>품목 요약</th>
                <th style={{ width: '130px', textAlign: 'right' }}>총 매입금액</th>
                <th style={{ width: '80px', textAlign: 'center' }}>증빙</th>
                <th style={{ width: '120px', textAlign: 'center' }}>작업</th>
              </tr>
            </thead>
            <tbody>
              {filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: '#94A3B8' }}>
                    등록된 매입전표가 없습니다. 상단의 <b>[➕ 전표 / 영수증 AI 등록]</b>을 눌러 등록해 보세요!
                  </td>
                </tr>
              ) : (
                filteredPurchases.map(p => {
                  const mySupp = suppliersList.find(s => areSupplierKeysEquivalent(s.id, p.supplier_key));
                  const itemsCount = Array.isArray(p.items) ? p.items.length : 0;
                  const firstItem = p.items?.[0]?.name || '품목';

                  return (
                    <tr key={p.id}>
                      <td style={{ fontFamily: 'monospace', color: '#64748B' }}>{p.invoice_date}</td>
                      <td>
                        <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#EFF6FF', color: '#1D4ED8', fontWeight: '700' }}>
                          {mySupp?.name || mySupp?.company || p.supplier_key}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: '700', color: '#0F172A' }}>{p.vendor_name}</div>
                        {p.vendor_bizno && <div style={{ fontSize: '10px', color: '#64748B', fontFamily: 'monospace' }}>{p.vendor_bizno}</div>}
                      </td>
                      <td style={{ fontSize: '12px' }}>
                        <span style={{ fontWeight: '600' }}>{firstItem}</span>
                        {itemsCount > 1 && (
                          <span style={{ color: '#2563EB', fontWeight: '700', marginLeft: '4px' }}>
                            외 {itemsCount - 1}건
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: '800', color: '#1E293B' }}>
                        {(Number(p.total_amount) || 0).toLocaleString()}원
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {p.receipt_image ? (
                          <button
                            type="button"
                            style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '14px' }}
                            onClick={() => setViewReceiptImage(p.receipt_image)}
                            title="증빙 사진 보기"
                          >
                            📷
                          </button>
                        ) : (
                          <span style={{ color: '#CBD5E1', fontSize: '11px' }}>-</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                          <button
                            type="button"
                            className="btn btn-outline"
                            style={{ fontSize: '11px', padding: '3px 8px', fontWeight: '600' }}
                            onClick={() => setSelectedInvoice(p)}
                          >
                            상세
                          </button>
                          <button
                            type="button"
                            className="btn btn-red-outline"
                            style={{ fontSize: '11px', padding: '3px 6px' }}
                            onClick={() => {
                              if (window.confirm(`[${p.vendor_name}] 매입전표를 삭제하시겠습니까?`)) {
                                onDeletePurchase(p.id);
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

      {/* 전표 상세 내역 모달 */}
      {selectedInvoice && (
        <div
          className="modal-overlay"
          style={{ zIndex: 10060, backgroundColor: 'rgba(15, 23, 42, 0.75)', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setSelectedInvoice(null)}
        >
          <div
            className="modal-content"
            style={{ maxWidth: '720px', width: '100%', maxHeight: '90vh', backgroundColor: '#FFFFFF', borderRadius: '18px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC' }}>
              <h3 style={{ fontSize: '1.0625rem', fontWeight: '900', margin: 0, color: '#0F172A' }}>
                🧾 매입전표 상세 내역
              </h3>
              <button
                type="button"
                className="btn btn-outline"
                style={{ padding: '4px 8px', fontSize: '11px' }}
                onClick={() => setSelectedInvoice(null)}
              >
                ✕ 닫기
              </button>
            </div>

            <div style={{ padding: '1.25rem', overflowY: 'auto', flex: 1 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '1rem', backgroundColor: '#F8FAFC', padding: '12px', borderRadius: '10px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>매입처 상호</div>
                  <div style={{ fontWeight: '800', color: '#0F172A' }}>{selectedInvoice.vendor_name}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>사업자번호</div>
                  <div style={{ fontFamily: 'monospace', fontWeight: '600' }}>{selectedInvoice.vendor_bizno || '-'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>전표 일자</div>
                  <div style={{ fontFamily: 'monospace', fontWeight: '600' }}>{selectedInvoice.invoice_date}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>총 매입금액</div>
                  <div style={{ fontWeight: '900', color: '#2563EB', fontSize: '14px' }}>
                    {(Number(selectedInvoice.total_amount) || 0).toLocaleString()}원
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '12px', fontWeight: '800', marginBottom: '6px', color: '#1E293B' }}>
                  📦 세부 품목 목록
                </div>
                <div style={{ border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#F1F5F9', borderBottom: '1px solid #E2E8F0', color: '#475569' }}>
                        <th style={{ padding: '6px 8px', textAlign: 'left' }}>품목명</th>
                        <th style={{ padding: '6px 8px', textAlign: 'left' }}>규격</th>
                        <th style={{ padding: '6px 8px', textAlign: 'right' }}>수량</th>
                        <th style={{ padding: '6px 8px', textAlign: 'right' }}>매입단가</th>
                        <th style={{ padding: '6px 8px', textAlign: 'right' }}>금액</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.isArray(selectedInvoice.items) && selectedInvoice.items.map((it, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '6px 8px', fontWeight: '700' }}>{it.name}</td>
                          <td style={{ padding: '6px 8px', color: '#64748B' }}>{it.spec || '-'}</td>
                          <td style={{ padding: '6px 8px', textAlign: 'right' }}>{it.qty}</td>
                          <td style={{ padding: '6px 8px', textAlign: 'right' }}>{(Number(it.unit_price) || 0).toLocaleString()}원</td>
                          <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: '700' }}>{(Number(it.amount) || 0).toLocaleString()}원</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {selectedInvoice.receipt_image && (
                <div style={{ marginTop: '1rem' }}>
                  <div style={{ fontSize: '12px', fontWeight: '800', marginBottom: '6px', color: '#1E293B' }}>
                    📷 첨부된 원본 전표 사진
                  </div>
                  <div style={{ textAlign: 'center', backgroundColor: '#0F172A', padding: '10px', borderRadius: '10px' }}>
                    <img
                      src={selectedInvoice.receipt_image}
                      alt="전표 원본"
                      style={{ maxWidth: '100%', maxHeight: '280px', objectFit: 'contain', cursor: 'pointer' }}
                      onClick={() => setViewReceiptImage(selectedInvoice.receipt_image)}
                      title="클릭 시 원본 크게보기"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 영수증 원본 사진 확대 모달 */}
      {viewReceiptImage && (
        <div
          className="modal-overlay"
          style={{ zIndex: 10070, backgroundColor: 'rgba(0,0,0,0.85)', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setViewReceiptImage(null)}
        >
          <div
            className="modal-content"
            style={{ maxWidth: '850px', width: '100%', maxHeight: '92vh', backgroundColor: '#FFFFFF', borderRadius: '16px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ padding: '10px 16px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: '800', fontSize: '13px' }}>📷 원본 전표/영수증 증빙</span>
              <button className="btn btn-outline" style={{ padding: '3px 8px', fontSize: '11px' }} onClick={() => setViewReceiptImage(null)}>✕ 닫기</button>
            </div>
            <div style={{ flex: 1, padding: '10px', backgroundColor: '#0F172A', textAlign: 'center', overflowY: 'auto' }}>
              <img src={viewReceiptImage} alt="영수증 원본" style={{ maxWidth: '100%', maxHeight: '75vh', objectFit: 'contain' }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
