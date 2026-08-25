// 🎨 TEAM D.D DOCUMENT CANVAS COMPONENT (A4 PAPER SPECIFICATION RENDERER)
import React, { useState, useEffect, useRef } from 'react';
import { areSupplierKeysEquivalent } from '../utils/validation.js';

export default function DocumentCanvas({
  docType,
  docNo,
  docDate,
  docTime,
  supplier = {},
  customer = {},
  items = [],
  vat,
  vatIncluded,
  paid,
  remark,
  validityPeriod,
  deliveryDate,
  deliveryLocation,
  paymentTerms,
  bankAccount,
  dueDate,
  receiverName,
  receiveDate,
  setItems,
  setCustomer,
  setRemark
}) {
  const [scale, setScale] = useState(1);
  const containerRef = useRef(null);

  const updateItem = (itemIdx, field, value) => {
    if (!setItems) return;
    const newItems = [...items];
    while (newItems.length <= itemIdx) {
      newItems.push({ id: (Date.now() + Math.random()).toString(), code: '', name: '', unit: 'EA', qty: 1, price: 0 });
    }
    newItems[itemIdx] = { ...newItems[itemIdx], [field]: value };
    setItems(newItems);
  };

  const totalSupply = items.reduce((sum, item) => sum + (Number(item.qty) || 0) * (Number(item.price) || 0), 0);
  const vatAmount = vatIncluded ? Math.floor(totalSupply * 0.1) : (Number(vat) || 0);
  const grandTotal = totalSupply + vatAmount;

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth - 16;
        if (width > 0 && width < 800) {
          setScale(width / 800);
        } else {
          setScale(1);
        }
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const ITEMS_PER_PAGE_LAST = 18;
  const ITEMS_PER_PAGE_MIDDLE = 24;

  const calculateDocumentPages = () => {
    if (items.length <= ITEMS_PER_PAGE_LAST) {
      return [{
        pageIndex: 0,
        items: items,
        isLastPage: true,
        maxRows: ITEMS_PER_PAGE_LAST,
        startIndex: 0
      }];
    }

    const resultPages = [];
    let currentIdx = 0;

    while (currentIdx < items.length) {
      const remaining = items.length - currentIdx;

      if (remaining <= ITEMS_PER_PAGE_LAST) {
        resultPages.push({
          pageIndex: resultPages.length,
          items: items.slice(currentIdx, currentIdx + remaining),
          isLastPage: true,
          maxRows: ITEMS_PER_PAGE_LAST,
          startIndex: currentIdx
        });
        break;
      }

      if (remaining <= ITEMS_PER_PAGE_MIDDLE) {
        const firstChunk = Math.min(remaining - 1, 14);
        resultPages.push({
          pageIndex: resultPages.length,
          items: items.slice(currentIdx, currentIdx + firstChunk),
          isLastPage: false,
          maxRows: ITEMS_PER_PAGE_MIDDLE,
          startIndex: currentIdx
        });
        currentIdx += firstChunk;
      } else {
        resultPages.push({
          pageIndex: resultPages.length,
          items: items.slice(currentIdx, currentIdx + ITEMS_PER_PAGE_MIDDLE),
          isLastPage: false,
          maxRows: ITEMS_PER_PAGE_MIDDLE,
          startIndex: currentIdx
        });
        currentIdx += ITEMS_PER_PAGE_MIDDLE;
      }
    }

    return resultPages.length > 0 ? resultPages : [{ pageIndex: 0, items: [], isLastPage: true, maxRows: ITEMS_PER_PAGE_LAST, startIndex: 0 }];
  };

  const pages = calculateDocumentPages();
  const supplierName = supplier.company || supplier.name || '디에스건설기계 김제점';
  const supplierRep = supplier.person || supplier.owner || (supplier.name !== supplier.company ? supplier.name : '-') || '-';

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
        overflow: 'hidden'
      }}
    >
      {pages.map((pageInfo, pageIdx) => (
        <div
          key={pageIdx}
          className="document-page-wrapper"
          style={{
            width: `${800 * scale}px`,
            height: `${1131 * scale}px`,
            marginBottom: '1.5rem',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div
            className="document-page"
            style={{
              width: '800px',
              minHeight: '1131px',
              transform: scale !== 1 ? `scale(${scale})` : 'none',
              transformOrigin: 'top left'
            }}
          >
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '8px'
                }}
              >
                <div>
                  <h1
                    style={{
                      fontSize: '28px',
                      fontWeight: '900',
                      color: '#0f172a',
                      margin: 0,
                      letterSpacing: '-0.5px',
                      fontFamily: 'Pretendard, sans-serif'
                    }}
                  >
                    {docType || '거래명세서'}
                  </h1>
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: '700',
                      color: '#94a3b8',
                      letterSpacing: '1px',
                      marginTop: '2px'
                    }}
                  >
                    {docType === '견적서' ? 'ESTIMATE' : docType === '청구서' ? 'INVOICE' : 'TRANSACTION STATEMENT'}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      backgroundColor: '#1d6bf3',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      fontWeight: '900',
                      fontSize: '18px',
                      boxShadow: '0 2px 6px rgba(29,107,243,0.3)'
                    }}
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="12 2 2 7 12 12 22 7 12 2" />
                      <polyline points="2 17 12 22 22 17" />
                      <polyline points="2 12 12 17 22 12" />
                    </svg>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
                      {supplierName}
                    </div>
                    <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '500' }}>
                      최고의 품질과 신뢰로 보답하겠습니다.
                    </div>
                  </div>
                </div>
              </div>

              <hr style={{ border: 'none', height: '2px', backgroundColor: '#334155', opacity: 0.15, margin: '8px 0 14px 0' }} />

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '14px',
                  padding: '0 4px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      backgroundColor: '#eff6ff',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#1d6bf3'
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '600' }}>일자</div>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#1e293b' }}>
                      {docDate || '2026-08-12'} {docTime}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      backgroundColor: '#eff6ff',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#1d6bf3'
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '600' }}>문서번호</div>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#1e293b' }}>
                      {docNo || '자동발행'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      backgroundColor: '#eff6ff',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#1d6bf3'
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '600' }}>페이지</div>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#1e293b' }}>
                      {pageIdx + 1} / {pages.length}
                    </div>
                  </div>
                </div>
              </div>

              {/* 공급받는자 / 공급자 정보 테이블 */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  marginBottom: '16px'
                }}
              >
                {/* 공급받는자 */}
                <div
                  style={{
                    border: '1px solid #cbd5e1',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    backgroundColor: '#ffffff'
                  }}
                >
                  <div
                    style={{
                      padding: '6px 10px',
                      backgroundColor: '#f8fafc',
                      borderBottom: '1px solid #cbd5e1',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <div
                      style={{
                        width: '22px',
                        height: '22px',
                        backgroundColor: '#1d6bf3',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff'
                      }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: '800', color: '#1d6bf3' }}>공급받는자</span>
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <th style={{ width: '85px', padding: '5px 8px', backgroundColor: '#f8fafc', color: '#475569', fontWeight: '600', textAlign: 'center', borderRight: '1px solid #f1f5f9' }}>
                          성명/상호
                        </th>
                        <td style={{ padding: '2px 4px', color: '#0f172a', fontWeight: '600' }}>
                          {setCustomer ? (
                            <input
                              className="canvas-input"
                              style={{ fontWeight: '700', color: '#0f172a' }}
                              value={customer.name || ''}
                              onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                              placeholder="거래처 상호명"
                            />
                          ) : (
                            customer.name || '-'
                          )}
                        </td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <th style={{ padding: '5px 8px', backgroundColor: '#f8fafc', color: '#475569', fontWeight: '600', textAlign: 'center', borderRight: '1px solid #f1f5f9' }}>
                          담당자
                        </th>
                        <td style={{ padding: '2px 4px', color: '#0f172a' }}>
                          {setCustomer ? (
                            <input
                              className="canvas-input"
                              value={customer.person || ''}
                              onChange={(e) => setCustomer({ ...customer, person: e.target.value })}
                              placeholder="담당자"
                            />
                          ) : (
                            customer.person || '-'
                          )}
                        </td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <th style={{ padding: '5px 8px', backgroundColor: '#f8fafc', color: '#475569', fontWeight: '600', textAlign: 'center', borderRight: '1px solid #f1f5f9' }}>
                          연락처
                        </th>
                        <td style={{ padding: '2px 4px', color: '#0f172a' }}>
                          {setCustomer ? (
                            <input
                              className="canvas-input"
                              value={customer.phone || ''}
                              onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                              placeholder="연락처"
                            />
                          ) : (
                            customer.phone || '-'
                          )}
                        </td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <th style={{ padding: '5px 8px', backgroundColor: '#f8fafc', color: '#475569', fontWeight: '600', textAlign: 'center', borderRight: '1px solid #f1f5f9' }}>
                          기종
                        </th>
                        <td style={{ padding: '5px 8px', color: '#0f172a', fontWeight: '700' }}>
                          {customer.selectedMachine || '-'}
                        </td>
                      </tr>
                      <tr>
                        <th style={{ padding: '5px 8px', backgroundColor: '#f8fafc', color: '#475569', fontWeight: '600', textAlign: 'center', borderRight: '1px solid #f1f5f9' }}>
                          주소
                        </th>
                        <td style={{ padding: '2px 4px', color: '#0f172a', fontSize: '10.5px' }}>
                          {setCustomer ? (
                            <input
                              className="canvas-input"
                              style={{ fontSize: '10.5px' }}
                              value={customer.addr || ''}
                              onChange={(e) => setCustomer({ ...customer, addr: e.target.value })}
                              placeholder="주소"
                            />
                          ) : (
                            customer.addr || '-'
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 공급자 */}
                <div
                  style={{
                    border: '1px solid #cbd5e1',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    backgroundColor: '#ffffff'
                  }}
                >
                  <div
                    style={{
                      padding: '6px 10px',
                      backgroundColor: '#f8fafc',
                      borderBottom: '1px solid #cbd5e1',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <div
                      style={{
                        width: '22px',
                        height: '22px',
                        backgroundColor: '#0f172a',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff'
                      }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
                        <path d="M9 22v-4h6v4" />
                        <path d="M8 6h.01" />
                        <path d="M16 6h.01" />
                        <path d="M12 6h.01" />
                        <path d="M12 10h.01" />
                        <path d="M12 14h.01" />
                        <path d="M16 10h.01" />
                        <path d="M16 14h.01" />
                        <path d="M8 10h.01" />
                        <path d="M8 14h.01" />
                      </svg>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: '800', color: '#0f172a' }}>공급자</span>
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <th style={{ width: '85px', padding: '5px 8px', backgroundColor: '#f8fafc', color: '#475569', fontWeight: '600', textAlign: 'center', borderRight: '1px solid #f1f5f9' }}>
                          등록번호
                        </th>
                        <td style={{ padding: '5px 8px', color: '#0f172a', fontWeight: '700' }}>
                          {supplier.bizno || '-'}
                        </td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <th style={{ padding: '5px 8px', backgroundColor: '#f8fafc', color: '#475569', fontWeight: '600', textAlign: 'center', borderRight: '1px solid #f1f5f9' }}>
                          상호명
                        </th>
                        <td style={{ padding: '5px 8px', color: '#0f172a', fontWeight: '700' }}>
                          {supplierName}
                        </td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <th style={{ padding: '5px 8px', backgroundColor: '#f8fafc', color: '#475569', fontWeight: '600', textAlign: 'center', borderRight: '1px solid #f1f5f9' }}>
                          대표자
                        </th>
                        <td style={{ padding: '5px 8px', color: '#0f172a', position: 'relative' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', position: 'relative' }}>
                            <span style={{ fontWeight: '700' }}>{supplierRep}</span>
                            <span style={{ marginLeft: '4px', fontWeight: '700', color: '#475569' }}>(인)</span>
                            {(supplier.stamp_image || supplier.stampUrl || supplier.stamp) ? (
                              <img
                                src={supplier.stamp_image || supplier.stampUrl || supplier.stamp}
                                alt="직인"
                                style={{
                                  position: 'absolute',
                                  left: 'calc(100% - 24px)',
                                  top: '50%',
                                  transform: 'translateY(-50%)',
                                  width: '42px',
                                  height: '42px',
                                  objectFit: 'contain',
                                  pointerEvents: 'none',
                                  mixBlendMode: 'multiply'
                                }}
                              />
                            ) : (areSupplierKeysEquivalent(supplier.id, 'sejin') || supplier.hasStamp) ? (
                              <div
                                style={{
                                  position: 'absolute',
                                  left: 'calc(100% - 22px)',
                                  top: '50%',
                                  transform: 'translateY(-50%) rotate(-10deg)',
                                  width: '38px',
                                  height: '38px',
                                  borderRadius: '50%',
                                  border: '2px solid #DC2626',
                                  color: '#DC2626',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: '900',
                                  fontSize: '11px',
                                  backgroundColor: 'rgba(254, 226, 226, 0.4)',
                                  pointerEvents: 'none'
                                }}
                              >
                                인
                              </div>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <th style={{ padding: '5px 8px', backgroundColor: '#f8fafc', color: '#475569', fontWeight: '600', textAlign: 'center', borderRight: '1px solid #f1f5f9' }}>
                          연락처/메일
                        </th>
                        <td style={{ padding: '5px 8px', color: '#0f172a' }}>
                          {supplier.tel || supplier.phone || '-'}{supplier.email ? ` / ${supplier.email}` : ''}
                        </td>
                      </tr>
                      <tr>
                        <th style={{ padding: '5px 8px', backgroundColor: '#f8fafc', color: '#475569', fontWeight: '600', textAlign: 'center', borderRight: '1px solid #f1f5f9' }}>
                          사업장주소
                        </th>
                        <td style={{ padding: '5px 8px', color: '#0f172a', fontSize: '10.5px' }}>
                          {supplier.addr || '-'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 품목 테이블 */}
              <div style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
                <table className="items-table-modern" style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#1d6bf3', color: '#ffffff', fontSize: '12px', height: '30px' }}>
                      <th style={{ width: '40px', textAlign: 'center', fontWeight: '700', borderRight: '1px solid rgba(255,255,255,0.2)' }}>No</th>
                      {docType === '청구서' && (
                        <th style={{ width: '45px', textAlign: 'center', fontWeight: '700', borderRight: '1px solid rgba(255,255,255,0.2)' }}>일자</th>
                      )}
                      <th style={{ textAlign: 'center', fontWeight: '700', borderRight: '1px solid rgba(255,255,255,0.2)' }}>품명 및 규격</th>
                      <th style={{ width: '55px', textAlign: 'center', fontWeight: '700', borderRight: '1px solid rgba(255,255,255,0.2)' }}>단위</th>
                      <th style={{ width: '45px', textAlign: 'center', fontWeight: '700', borderRight: '1px solid rgba(255,255,255,0.2)' }}>수량</th>
                      <th style={{ width: '110px', textAlign: 'center', fontWeight: '700', borderRight: '1px solid rgba(255,255,255,0.2)' }}>단가</th>
                      <th style={{ width: '120px', textAlign: 'center', fontWeight: '700', borderRight: '1px solid rgba(255,255,255,0.2)' }}>공급가액</th>
                      <th style={{ width: '80px', textAlign: 'center', fontWeight: '700' }}>비고</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: pageInfo.maxRows }).map((_, idx) => {
                      const realIdx = pageInfo.startIndex + idx;
                      const item = items[realIdx];
                      const amount = item ? (Number(item.qty) || 0) * (Number(item.price) || 0) : 0;
                      return (
                        <tr
                          key={idx}
                          style={{
                            height: '26px',
                            backgroundColor: idx % 2 === 1 ? '#f8fafc' : '#ffffff',
                            borderBottom: '1px solid #e2e8f0'
                          }}
                        >
                          <td style={{ textAlign: 'center', color: '#64748b', fontSize: '11px', borderRight: '1px solid #e2e8f0' }}>
                            {item ? realIdx + 1 : ''}
                          </td>
                          {docType === '청구서' && (
                            <td style={{ textAlign: 'center', color: '#64748b', fontSize: '10px', borderRight: '1px solid #e2e8f0' }}>
                              {item && item.date ? item.date.substring(5).replace('-', '/') : ''}
                            </td>
                          )}
                          <td style={{ padding: '0 2px', fontWeight: item ? '700' : 'normal', fontSize: '12px', color: '#0f172a', borderRight: '1px solid #e2e8f0' }}>
                            {setItems ? (
                              <input
                                className="canvas-input"
                                style={{ fontWeight: item ? '700' : 'normal', fontSize: '12px' }}
                                value={(item && item.name) || ''}
                                onChange={(e) => updateItem(realIdx, 'name', e.target.value)}
                                placeholder={realIdx === 0 && !(item && item.name) ? '품명 입력...' : ''}
                              />
                            ) : (
                              (item && item.name) || ''
                            )}
                          </td>
                          <td style={{ textAlign: 'center', fontSize: '11px', color: '#475569', borderRight: '1px solid #e2e8f0' }}>
                            {setItems ? (
                              <input
                                className="canvas-input"
                                style={{ textAlign: 'center', fontSize: '11px' }}
                                value={(item && item.unit) || ''}
                                onChange={(e) => updateItem(realIdx, 'unit', e.target.value)}
                                placeholder={(item && item.name) ? 'EA' : ''}
                              />
                            ) : (
                              (item && item.unit) || ''
                            )}
                          </td>
                          <td style={{ padding: '0 4px', textAlign: 'right', fontFamily: 'monospace', fontSize: '12px', color: '#0f172a', borderRight: '1px solid #e2e8f0' }}>
                            {setItems ? (
                              <input
                                className="canvas-input"
                                style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: '12px' }}
                                type="number"
                                value={(item && item.qty) ? item.qty : ''}
                                onChange={(e) => updateItem(realIdx, 'qty', Number(e.target.value) || 0)}
                              />
                            ) : (
                              (item && item.qty) ? Number(item.qty).toLocaleString() : ''
                            )}
                          </td>
                          <td style={{ padding: '0 4px', textAlign: 'right', fontFamily: 'monospace', fontSize: '12px', color: '#0f172a', borderRight: '1px solid #e2e8f0' }}>
                            {setItems ? (
                              <input
                                className="canvas-input"
                                style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: '12px' }}
                                type="number"
                                value={(item && item.price) ? item.price : ''}
                                onChange={(e) => updateItem(realIdx, 'price', Number(e.target.value) || 0)}
                                placeholder={(item && item.name) ? '0' : ''}
                              />
                            ) : (
                              (item && item.price) ? Number(item.price).toLocaleString() : ''
                            )}
                          </td>
                          <td style={{ padding: '0 4px', textAlign: 'right', fontWeight: '700', fontFamily: 'monospace', fontSize: '12px', color: '#0f172a', borderRight: '1px solid #e2e8f0' }}>
                            {item && amount > 0 ? amount.toLocaleString() : ''}
                          </td>
                          <td style={{ padding: '0 4px', fontSize: '10.5px', color: '#64748b' }}>
                            {setItems ? (
                              <input
                                className="canvas-input"
                                style={{ fontSize: '10.5px' }}
                                value={(item && (item.memo || item.remark)) || ''}
                                onChange={(e) => updateItem(realIdx, 'memo', e.target.value)}
                              />
                            ) : (
                              (item && (item.memo || item.remark)) || ''
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 마지막 페이지 하단 합계 및 비고, 입금계좌 */}
            {pageInfo.isLastPage ? (
              <div>
                <div
                  style={{
                    border: '1px solid #cbd5e1',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'stretch',
                    marginTop: '16px',
                    backgroundColor: '#ffffff'
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderRight: '1px solid #e2e8f0'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1d6bf3" strokeWidth="2.2">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                      </svg>
                      <span style={{ fontSize: '12px', fontWeight: '800', color: '#1e293b' }}>공급가액</span>
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: '800', fontFamily: 'monospace', color: '#0f172a' }}>
                      {totalSupply.toLocaleString()}
                    </span>
                  </div>

                  <div
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderRight: '1px solid #e2e8f0'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1d6bf3" strokeWidth="2.2">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                      <span style={{ fontSize: '12px', fontWeight: '800', color: '#1e293b' }}>
                        {vatIncluded ? '부가세 (10%)' : '부가세'}
                      </span>
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: '800', fontFamily: 'monospace', color: '#0f172a' }}>
                      {vatAmount.toLocaleString()}
                    </span>
                  </div>

                  <div
                    style={{
                      backgroundColor: '#1d6bf3',
                      color: '#ffffff',
                      padding: '10px 20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      minWidth: '220px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                      </svg>
                      <span style={{ fontSize: '13px', fontWeight: '800' }}>합계금액</span>
                    </div>
                    <span style={{ fontSize: '18px', fontWeight: '900', fontFamily: 'monospace' }}>
                      {grandTotal.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div
                    style={{
                      padding: '7px 14px',
                      backgroundColor: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      fontSize: '11px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <div
                      style={{
                        width: '22px',
                        height: '22px',
                        backgroundColor: '#eff6ff',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#1d6bf3',
                        flexShrink: 0
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </div>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ color: '#475569', minWidth: '40px' }}>비고</strong>
                      {setRemark ? (
                        <input
                          className="canvas-input"
                          style={{ fontWeight: '700', color: '#0f172a', flex: 1 }}
                          value={remark || ''}
                          onChange={(e) => setRemark(e.target.value)}
                          placeholder="특이사항 입력"
                        />
                      ) : (
                        <span style={{ fontWeight: '700', color: '#0f172a' }}>
                          {remark || '특이사항 없음'}
                        </span>
                      )}
                    </div>
                  </div>

                  <div
                    style={{
                      padding: '7px 14px',
                      backgroundColor: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      borderRadius: '8px',
                      fontSize: '11px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <div
                      style={{
                        width: '22px',
                        height: '22px',
                        backgroundColor: '#1d6bf3',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff',
                        flexShrink: 0
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <rect x="2" y="5" width="20" height="14" rx="2" />
                        <line x1="2" y1="10" x2="22" y2="10" />
                      </svg>
                    </div>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ color: '#1e3a8a', minWidth: '40px' }}>입금계좌</strong>
                      <span style={{ fontWeight: '800', color: '#1d6bf3', fontFamily: 'monospace', fontSize: '11.5px' }}>
                        {supplier.bank || '문의바람'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div
                style={{
                  marginTop: '8px',
                  padding: '7px 12px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '6px',
                  border: '1px dashed #cbd5e1',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '11px',
                  color: '#475569',
                  fontWeight: '700'
                }}
              >
                <span>※ 품목 내역이 다음 페이지로 계속 이어집니다. ({pageIdx + 1} / {pages.length} 페이지)</span>
                <span style={{ color: '#1d6bf3', fontWeight: '800' }}>
                  (다음 {pageIdx + 2}페이지에 계속 ➡️)
                </span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
