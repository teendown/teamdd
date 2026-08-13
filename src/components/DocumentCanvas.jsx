import React from 'react';

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
  setItems,
  setCustomer,
  setRemark
}) {
  const ITEMS_PER_PAGE = 15;
  
  // Calculate totals
  const totalSupply = items.reduce((sum, item) => sum + (Number(item.qty) || 0) * (Number(item.price) || 0), 0);
  const vatAmount = vatIncluded ? Math.floor(totalSupply * 0.1) : Number(vat) || 0;
  const grandTotal = totalSupply + vatAmount;
  const balance = grandTotal - (Number(paid) || 0);

  // Helper for direct cell editing
  const updateItem = (itemIdx, field, value) => {
    if (!setItems) return;
    const newItems = [...items];
    while (newItems.length <= itemIdx) {
      newItems.push({ id: (Date.now() + Math.random()).toString(), code: '', name: '', unit: 'EA', qty: 1, price: 0 });
    }
    newItems[itemIdx] = { ...newItems[itemIdx], [field]: value };
    setItems(newItems);
  };

  // Paginate items
  const pages = [];
  for (let i = 0; i < items.length; i += ITEMS_PER_PAGE) {
    pages.push(items.slice(i, i + ITEMS_PER_PAGE));
  }
  if (pages.length === 0) pages.push([]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      {/* Notice Hint for PC Users */}
      <div className="no-print" style={{
        marginBottom: '0.75rem',
        padding: '0.4rem 0.875rem',
        backgroundColor: '#eff6ff',
        border: '1px solid #bfdbfe',
        borderRadius: '20px',
        fontSize: '0.75rem',
        color: '#1d4ed8',
        fontWeight: '700',
        display: 'flex',
        alignItems: 'center',
        gap: '0.375rem'
      }}>
        <span>💡 팁: 오른쪽 명세서 양식의 각 칸(품명, 수량, 단가, 거래처 등)을 <b>직접 클릭하여 바로 수정</b>할 수 있습니다!</span>
      </div>

      {pages.map((pageItems, pageIdx) => (
        <div key={pageIdx} className="document-page-wrapper">
          <div className="document-page">
            {/* Header Title */}
            <div>
              <div className="doc-title-main">
                {docType || '거 래 명 세 서'}
              </div>

              {/* Doc Metadata & Date */}
              <div className="doc-info-bar">
                <div>일자: {docDate || '2026-08-12'} {docTime}</div>
                <div>문서번호: {docNo || '자동발행'}</div>
                <div>페이지: {pageIdx + 1} / {pages.length}</div>
              </div>

              {/* Supplier & Customer Header Tables */}
              <table className="parties-table">
                <tbody>
                  <tr>
                    {/* Customer (공급받는자) */}
                    <th style={{ width: '40px' }} rowSpan="4">
                      공<br/>급<br/>받<br/>는<br/>자
                    </th>
                    <th style={{ width: '70px' }}>성명/상호</th>
                    <td>
                      {setCustomer ? (
                        <input
                          className="canvas-input"
                          style={{ fontWeight: '800' }}
                          value={customer.name || ''}
                          onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                          placeholder="거래처 상호명 입력"
                        />
                      ) : (
                        customer.name || '-'
                      )}
                    </td>
                    
                    {/* Supplier (공급자) */}
                    <th style={{ width: '40px' }} rowSpan="4">
                      공<br/>급<br/>자
                    </th>
                    <th style={{ width: '70px' }}>등록번호</th>
                    <td style={{ fontWeight: '800' }}>{supplier.bizno || '-'}</td>
                  </tr>
                  <tr>
                    <th>담당자</th>
                    <td>
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
                    <th>상호명</th>
                    <td style={{ fontWeight: '800' }}>{supplier.company || supplier.name || '-'}</td>
                  </tr>
                  <tr>
                    <th>연락처</th>
                    <td>
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
                    <th>대표자</th>
                    <td>{supplier.name || '-'}</td>
                  </tr>
                  <tr>
                    <th>주소</th>
                    <td style={{ fontSize: '10px' }}>
                      {setCustomer ? (
                        <input
                          className="canvas-input"
                          style={{ fontSize: '10px' }}
                          value={customer.addr || ''}
                          onChange={(e) => setCustomer({ ...customer, addr: e.target.value })}
                          placeholder="주소"
                        />
                      ) : (
                        customer.addr || '-'
                      )}
                    </td>
                    <th>사업장주소</th>
                    <td style={{ fontSize: '10px' }}>{supplier.addr || '-'}</td>
                  </tr>
                </tbody>
              </table>

              {/* Items Table */}
              <table className="items-table">
                <thead>
                  <tr>
                    <th style={{ width: '35px' }}>No</th>
                    <th>품명 및 규격</th>
                    <th style={{ width: '50px' }}>단위</th>
                    <th style={{ width: '60px' }}>수량</th>
                    <th style={{ width: '90px' }}>단가</th>
                    <th style={{ width: '100px' }}>공급가액</th>
                    <th style={{ width: '90px' }}>비고</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: ITEMS_PER_PAGE }).map((_, idx) => {
                    const realIdx = pageIdx * ITEMS_PER_PAGE + idx;
                    const item = items[realIdx];
                    const amount = item ? (Number(item.qty) || 0) * (Number(item.price) || 0) : 0;

                    return (
                      <tr key={idx} style={{ height: '28px' }}>
                        <td style={{ textAlign: 'center', color: '#6b7280' }}>
                          {(item?.name || setItems) ? realIdx + 1 : ''}
                        </td>
                        <td style={{ fontWeight: item?.name ? '700' : 'normal' }}>
                          {setItems ? (
                            <input
                              className="canvas-input"
                              style={{ fontWeight: item?.name ? '700' : 'normal' }}
                              value={item?.name || ''}
                              onChange={(e) => updateItem(realIdx, 'name', e.target.value)}
                              placeholder={realIdx === 0 && !item?.name ? "클릭하여 품명 입력..." : ""}
                            />
                          ) : (
                            item?.name || ''
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {setItems ? (
                            <input
                              className="canvas-input"
                              style={{ textAlign: 'center' }}
                              value={item?.unit || ''}
                              onChange={(e) => updateItem(realIdx, 'unit', e.target.value)}
                              placeholder={item?.name ? "EA" : ""}
                            />
                          ) : (
                            item?.unit || ''
                          )}
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                          {setItems ? (
                            <input
                              className="canvas-input"
                              style={{ textAlign: 'right', fontFamily: 'monospace' }}
                              type="number"
                              value={item?.qty !== undefined && item?.qty !== 0 ? item.qty : (item?.name ? 1 : '')}
                              onChange={(e) => updateItem(realIdx, 'qty', Number(e.target.value) || 0)}
                            />
                          ) : (
                            item?.qty ? Number(item.qty).toLocaleString() : ''
                          )}
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                          {setItems ? (
                            <input
                              className="canvas-input"
                              style={{ textAlign: 'right', fontFamily: 'monospace' }}
                              type="number"
                              value={item?.price !== undefined && item?.price !== 0 ? item.price : ''}
                              onChange={(e) => updateItem(realIdx, 'price', Number(e.target.value) || 0)}
                              placeholder={item?.name ? "0" : ""}
                            />
                          ) : (
                            item?.price ? Number(item.price).toLocaleString() : ''
                          )}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: '700', fontFamily: 'monospace' }}>
                          {amount > 0 ? amount.toLocaleString() : ''}
                        </td>
                        <td style={{ fontSize: '10px', color: '#6b7280' }}>
                          {setItems ? (
                            <input
                              className="canvas-input"
                              style={{ fontSize: '10px' }}
                              value={item?.code || ''}
                              onChange={(e) => updateItem(realIdx, 'code', e.target.value)}
                            />
                          ) : (
                            item?.code || ''
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Stamp / Seal Rendering */}
            {supplier.hasStamp && (
              <div className="stamp-box">
                {supplier.company ? supplier.company.slice(0, 2) : '직인'}
              </div>
            )}

            {/* Totals Summary Footer */}
            <div>
              <table className="doc-totals-table">
                <tbody>
                  <tr>
                    <td style={{ backgroundColor: '#f3f4f6', width: '90px', textAlign: 'center' }}>공급가액</td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>₩ {totalSupply.toLocaleString()}</td>
                    <td style={{ backgroundColor: '#f3f4f6', width: '90px', textAlign: 'center' }}>부가세</td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>₩ {vatAmount.toLocaleString()}</td>
                    <td style={{ backgroundColor: '#111827', color: '#ffffff', width: '90px', textAlign: 'center' }}>합계금액</td>
                    <td style={{ textAlign: 'right', fontWeight: '900', fontSize: '14px', fontFamily: 'monospace' }}>
                      ₩ {grandTotal.toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Extra Bank & Remark Footer */}
              <div style={{
                marginTop: '8px',
                padding: '6px 8px',
                border: '1px solid #000000',
                fontSize: '10.5px',
                display: 'flex',
                justify-content: 'space-between',
                backgroundColor: '#fafafa'
              }}>
                <div>
                  <strong>입금계좌:</strong> {supplier.bank || '문의바람'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1, justifyContent: 'flex-end', marginLeft: '12px' }}>
                  <strong>비고:</strong>
                  {setRemark ? (
                    <input
                      className="canvas-input"
                      style={{ fontSize: '10.5px', maxWidth: '250px' }}
                      value={remark || ''}
                      onChange={(e) => setRemark(e.target.value)}
                      placeholder="특이사항 직접 입력"
                    />
                  ) : (
                    <span>{remark || '특이사항 없음'}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
