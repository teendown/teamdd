import React from 'react';
import { DEFAULT_SUPPLIERS } from '../config/defaults.js';
import { areSupplierKeysEquivalent, normalizePartners } from '../utils/validation.js';
import { shareDocumentImage, exportPagesToPNG } from '../utils/exportUtils.js';

export default function DocumentPreviewModal({
  doc,
  onClose,
  onEdit,
  onCopy,
  suppliersList = []
}) {
  if (!doc) return null;

  const docType = doc.doc_type || doc.docType || '거래명세서';
  const docNo = doc.doc_no || '미지정';
  const docDate = doc.doc_date || (doc.created_at ? doc.created_at.split('T')[0] : '');
  const docTime = doc.doc_time || '';
  const customer = doc.customer_data || { name: doc.customer_name || '미지정' };
  const items = doc.items || [];
  
  const supplier = doc.supplier_data || 
    suppliersList.find(s => areSupplierKeysEquivalent(s.id, doc.supplier_key)) || 
    DEFAULT_SUPPLIERS[doc.supplier_key] || 
    DEFAULT_SUPPLIERS.sejin;
    
  const hasStamp = areSupplierKeysEquivalent(doc.supplier_key, 'sejin') || supplier?.hasStamp;

  const totalSupply = items.reduce((sum, i) => sum + ((Number(i.qty) || 0) * (Number(i.price) || 0)), 0);
  const vatAmount = doc.vat_included !== false ? Math.floor(totalSupply * 0.1) : (Number(doc.vat) || 0);
  const grandTotal = totalSupply + vatAmount;
  const paid = Number(doc.paid) || 0;
  const balance = grandTotal - paid;

  const handlePrint = () => {
    window.print();
  };

  const handleShareModal = async () => {
    const previewBody = document.querySelector('.doc-preview-body');
    await shareDocumentImage(previewBody, `${docType}_${docNo || '명세서'}_${customer.name || '고객'}`);
  };

  const handleDownloadImageModal = async () => {
    const previewBody = document.querySelector('.doc-preview-body');
    await exportPagesToPNG([previewBody], `${docType}_${docNo || '명세서'}_${customer.name || '고객'}`);
  };

  const cleanRemark = (doc.remark || '').split('---EXT---')[0].trim();
  
  const partners = normalizePartners(doc);
  const isDocShared = !!(doc.is_shared || doc.isDocShared || doc.partner_key || partners.length > 0);
  const totalPartnerAmount = partners.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  return (
    <div
      className="doc-preview-backdrop"
      onClick={onClose}
    >
      <div
        className="doc-preview-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header Bar */}
        <div className="doc-preview-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>📄</span>
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{
                  backgroundColor: docType === '견적서' ? '#9333ea' : (docType === '청구서' ? '#2563eb' : '#0284c7'),
                  color: '#ffffff',
                  fontSize: '0.6875rem',
                  fontWeight: '800',
                  padding: '2px 6px',
                  borderRadius: '4px'
                }}>
                  {docType}
                </span>
                <span style={{
                  fontSize: '1rem',
                  fontWeight: '900',
                  color: '#FFFFFF',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {customer.name || '고객'}
                </span>
              </div>
              <span style={{ fontSize: '0.6875rem', color: '#97CADB', fontFamily: 'monospace', marginTop: '1px' }}>
                {docNo}{doc.revision > 0 && ` (Rev.${doc.revision})`}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              borderRadius: '50%',
              color: '#FFFFFF',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.125rem',
              cursor: 'pointer',
              fontWeight: 'bold',
              flexShrink: 0,
              marginLeft: '8px'
            }}
          >
            ✕
          </button>
        </div>

        {/* Scrollable Body Content */}
        <div className="doc-preview-body">
          {/* Top Info Grid */}
          <div className="doc-preview-grid">
            {/* 공급자 정보 박스 */}
            <div
              style={{
                padding: '0.875rem 1rem',
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
                position: 'relative',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: '900', color: 'var(--c-navy-primary)' }}>
                  🏢 공급자 정보
                </h4>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{supplier.code || 'S0001'}</span>
              </div>
              <div style={{ fontSize: '0.8125rem', display: 'flex', flexDirection: 'column', gap: '3px', color: 'var(--c-navy-dark)' }}>
                <div><strong>상호: </strong>{supplier.name || supplier.company || '세진중기'}</div>
                <div><strong>등록번호: </strong>{supplier.bizno || '568-23-00015'}</div>
                <div><strong>대표자: </strong>{supplier.person || supplier.owner || '허강'}</div>
                <div><strong>연락처: </strong>{supplier.phone || supplier.tel || '010-2644-2921'}</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}><strong>주소: </strong>{supplier.addr || '전북 전주시 덕진구'}</div>
              </div>
              {hasStamp && (
                <div
                  style={{
                    position: 'absolute',
                    right: '12px',
                    bottom: '12px',
                    width: '46px',
                    height: '46px',
                    borderRadius: '50%',
                    border: '2px solid #DC2626',
                    color: '#DC2626',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '900',
                    fontSize: '11px',
                    transform: 'rotate(-10deg)',
                    backgroundColor: 'rgba(254, 226, 226, 0.4)'
                  }}
                >
                  인
                </div>
              )}
            </div>

            {/* 공급받는자(거래처) 정보 박스 */}
            <div
              style={{
                padding: '0.875rem 1rem',
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: '900', color: 'var(--c-navy-primary)' }}>
                  👤 공급받는자 (거래처)
                </h4>
                <span style={{ fontSize: '0.6875rem', color: '#2563eb', fontWeight: '700' }}>
                  {docDate} {docTime}
                </span>
              </div>
              <div style={{ fontSize: '0.8125rem', display: 'flex', flexDirection: 'column', gap: '3px', color: 'var(--c-navy-dark)' }}>
                <div><strong style={{ fontSize: '0.875rem' }}>상호: </strong><span style={{ fontWeight: '800' }}>{customer.name || '미지정'}</span></div>
                <div><strong>담당자: </strong>{customer.person || '-'}</div>
                <div><strong>연락처: </strong>{customer.phone || '-'}</div>
                {customer.selectedMachine && <div><strong>기종: </strong><span style={{ color: '#2563eb', fontWeight: '700' }}>{customer.selectedMachine}</span></div>}
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}><strong>주소: </strong>{customer.addr || '-'}</div>
              </div>
            </div>
          </div>

          {/* Items Section: Desktop Table (>=640px) */}
          <div className="preview-items-desktop">
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                <thead style={{ backgroundColor: 'var(--c-blue-lightest)', borderBottom: '1px solid var(--border-color)', textAlign: 'center', fontWeight: '800' }}>
                  <tr>
                    <th style={{ padding: '8px 6px', width: '40px' }}>No</th>
                    <th style={{ padding: '8px 8px', textAlign: 'left' }}>품목 / 정비내역</th>
                    <th style={{ padding: '8px 6px', width: '50px' }}>단위</th>
                    <th style={{ padding: '8px 6px', width: '50px' }}>수량</th>
                    <th style={{ padding: '8px 8px', textAlign: 'right', width: '90px' }}>단가</th>
                    <th style={{ padding: '8px 8px', textAlign: 'right', width: '100px' }}>공급가액</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        등록된 품목 내역이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    items.map((item, idx) => {
                      const itemQty = Number(item.qty) || 0;
                      const itemPrice = Number(item.price) || 0;
                      const itemSupply = itemQty * itemPrice;
                      return (
                        <tr
                          key={item.id || idx}
                          style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: idx % 2 === 1 ? '#FAFAFA' : '#FFFFFF' }}
                        >
                          <td style={{ padding: '6px 4px', textAlign: 'center', color: 'var(--text-muted)' }}>{idx + 1}</td>
                          <td style={{ padding: '6px 8px', fontWeight: '700' }}>{item.name || '-'}</td>
                          <td style={{ padding: '6px 4px', textAlign: 'center' }}>{item.unit || 'EA'}</td>
                          <td style={{ padding: '6px 4px', textAlign: 'center', fontWeight: '700' }}>{itemQty.toLocaleString()}</td>
                          <td style={{ padding: '6px 8px', textAlign: 'right' }}>{itemPrice.toLocaleString()}</td>
                          <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: '800', color: 'var(--c-navy-primary)' }}>
                            {itemSupply.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Items Section: Mobile Cards List (<640px) */}
          <div className="preview-items-mobile">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: '800', color: 'var(--c-navy-primary)' }}>
                📦 품목 / 정비내역 ({items.length}건)
              </span>
            </div>
            {items.length === 0 ? (
              <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                등록된 품목 내역이 없습니다.
              </div>
            ) : (
              items.map((item, idx) => {
                const itemQty = Number(item.qty) || 0;
                const itemPrice = Number(item.price) || 0;
                const itemSupply = itemQty * itemPrice;
                return (
                  <div key={item.id || idx} className="preview-item-mobile-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.6875rem', fontWeight: '800', color: '#64748b', backgroundColor: '#f1f5f9', padding: '1px 5px', borderRadius: '4px' }}>
                          #{idx + 1}
                        </span>
                        <span style={{ fontWeight: '800', fontSize: '0.875rem', color: '#0f172a', lineHeight: 1.3 }}>
                          {item.name || '품목명 없음'}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.6875rem', color: '#64748b' }}>{item.unit || 'EA'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px', fontSize: '0.75rem', color: '#475569' }}>
                      <div>{`수량: ${itemQty.toLocaleString()} ${item.unit || 'EA'}  |  단가: ${itemPrice.toLocaleString()}원`}</div>
                      <div style={{ fontWeight: '900', fontSize: '0.875rem', color: '#1d4ed8' }}>
                        {itemSupply.toLocaleString()}원
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Financial Summary Grid */}
          <div
            className="doc-preview-summary-grid"
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
              padding: '0.75rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}
          >
            <div style={{ textAlign: 'center', padding: '4px' }}>
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>공급가액</div>
              <div style={{ fontSize: '0.875rem', fontWeight: '800', color: 'var(--c-navy-dark)' }}>{totalSupply.toLocaleString()}원</div>
            </div>
            <div style={{ textAlign: 'center', padding: '4px' }}>
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>부가세 (10%)</div>
              <div style={{ fontSize: '0.875rem', fontWeight: '800', color: 'var(--c-navy-dark)' }}>{vatAmount.toLocaleString()}원</div>
            </div>
            <div style={{ textAlign: 'center', padding: '6px 4px', gridColumn: 'span 2', backgroundColor: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
              <div style={{ fontSize: '0.6875rem', color: '#1e40af', fontWeight: '800' }}>총 합계금액</div>
              <div style={{ fontSize: '1.125rem', fontWeight: '900', color: '#1d4ed8' }}>{grandTotal.toLocaleString()}원</div>
            </div>
            <div style={{ textAlign: 'center', padding: '4px' }}>
              <div style={{ fontSize: '0.6875rem', color: '#028A3E' }}>수금/입금액</div>
              <div style={{ fontSize: '0.875rem', fontWeight: '800', color: '#028A3E' }}>{paid.toLocaleString()}원</div>
            </div>
            <div style={{ textAlign: 'center', padding: '4px' }}>
              <div style={{ fontSize: '0.6875rem', color: balance > 0 ? '#D92D20' : '#028A3E' }}>미수 잔액</div>
              <div style={{ fontSize: '0.875rem', fontWeight: '900', color: balance > 0 ? '#D92D20' : '#028A3E' }}>
                {balance > 0 ? `${balance.toLocaleString()}원` : '0원 (완납)'}
              </div>
            </div>
          </div>

          {/* 🤝 공동작업 / 협력 파트너 정산 정보 카드 */}
          {isDocShared && (
            <div
              style={{
                padding: '0.875rem 1rem',
                backgroundColor: '#f5f7ff',
                borderRadius: '12px',
                border: '1px solid #c7d2fe',
                marginTop: '0.75rem',
                boxShadow: '0 1px 3px rgba(79, 70, 229, 0.05)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '1rem' }}>🤝</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: '900', color: '#3730a3' }}>
                    공동작업 및 협력 파트너 정산 내역
                  </span>
                  <span style={{ fontSize: '10px', fontWeight: '800', backgroundColor: '#4f46e5', color: '#ffffff', padding: '1px 6px', borderRadius: '9999px' }}>
                    {`${partners.length}개사 참여`}
                  </span>
                </div>
                <div style={{ fontSize: '0.8125rem', fontWeight: '800', color: '#4338ca' }}>
                  {`총 정산 배분: ${totalPartnerAmount.toLocaleString()}원`}
                </div>
              </div>

              {partners.length === 0 ? (
                <div style={{ fontSize: '0.75rem', color: '#64748b', backgroundColor: '#ffffff', padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  공동작업으로 지정되었으나 세부 파트너 정보가 등록되지 않았습니다.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {partners.map((p, idx) => (
                    <div
                      key={p.key || p.id || idx}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: '#ffffff',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid #e0e7ff',
                        fontSize: '0.8125rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '10px', fontWeight: '800', backgroundColor: '#e0e7ff', color: '#3730a3', padding: '1px 5px', borderRadius: '4px' }}>
                          {`#${idx + 1}`}
                        </span>
                        <span style={{ fontWeight: '800', color: '#1e293b' }}>
                          {p.name || p.company || p.key}
                        </span>
                        {p.memo && (
                          <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '4px' }}>
                            ({p.memo})
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: '800', color: '#1d4ed8' }}>
                          {`${(Number(p.amount) || 0).toLocaleString()}원`}
                        </span>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: '700',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            backgroundColor: p.status === '정산완료' ? '#dcfce7' : '#fef3c7',
                            color: p.status === '정산완료' ? '#166534' : '#92400e',
                            border: `1px solid ${p.status === '정산완료' ? '#86efac' : '#fde68a'}`
                          }}
                        >
                          {p.status || '정산대기'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ fontSize: '0.6875rem', color: '#6366f1', marginTop: '6px', lineHeight: 1.4 }}>
                ℹ️ 고객용 출력물에는 대표 공급자({supplier.company || supplier.name || '본사'}) 단일 정보로 표기되며, 각 협력사에 실시간 자동 공유 및 개별 정산 관리됩니다.
              </div>
            </div>
          )}

          {/* 특이사항 / 비고 */}
          {cleanRemark && (
            <div
              style={{
                padding: '0.75rem 1rem',
                backgroundColor: '#FFFFFF',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                fontSize: '0.8125rem',
                lineHeight: '1.5',
                marginTop: '0.75rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
              }}
            >
              <strong style={{ color: 'var(--c-navy-primary)' }}>📝 특이사항: </strong>
              {cleanRemark}
            </div>
          )}
        </div>

        {/* Sticky Footer Action Bar */}
        <div className="doc-preview-footer">
          <button
            type="button"
            className="btn btn-outline"
            style={{ flex: 1, minHeight: '38px', fontSize: '0.8125rem', fontWeight: '800', whiteSpace: 'nowrap' }}
            onClick={handlePrint}
          >
            🖨️ 인쇄
          </button>
          <button
            type="button"
            className="btn btn-outline"
            style={{ flex: 1, minHeight: '38px', fontSize: '0.8125rem', fontWeight: '800', whiteSpace: 'nowrap', color: '#0284c7', borderColor: '#bae6fd' }}
            onClick={handleShareModal}
            title="스마트폰 카톡/문자 공유 또는 이미지 다운로드"
          >
            📱 모바일 공유
          </button>
          <button
            type="button"
            className="btn btn-outline"
            style={{ flex: 1, minHeight: '38px', fontSize: '0.8125rem', fontWeight: '800', whiteSpace: 'nowrap', color: '#059669', borderColor: '#a7f3d0' }}
            onClick={handleDownloadImageModal}
            title="이미지(PNG) 사진 파일 저장"
          >
            📸 사진저장
          </button>
          {onCopy && (
            <button
              type="button"
              className="btn btn-outline"
              style={{ flex: 1, minHeight: '38px', fontSize: '0.8125rem', fontWeight: '800', whiteSpace: 'nowrap' }}
              onClick={() => {
                onCopy(doc);
                onClose();
              }}
            >
              📑 복사
            </button>
          )}
          {onEdit && (
            <button
              type="button"
              className="btn btn-primary"
              style={{ flex: 1.2, minHeight: '38px', fontSize: '0.8125rem', fontWeight: '900', whiteSpace: 'nowrap', backgroundColor: '#1d4ed8' }}
              onClick={() => {
                onEdit(doc);
                onClose();
              }}
            >
              ✏️ 편집
            </button>
          )}
          <button
            type="button"
            className="btn btn-outline"
            style={{ minHeight: '38px', fontSize: '0.8125rem', padding: '0 12px' }}
            onClick={onClose}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
