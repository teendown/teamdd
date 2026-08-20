// 🎨 TEAM D.D DOCUMENT PREVIEW MODAL
import React from 'react';
import { DEFAULT_SUPPLIERS } from '../config/defaults.js';
import { areSupplierKeysEquivalent } from '../utils/validation.js';

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

  return (
    <div
      className="modal-backdrop"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1rem'
      }}
      onClick={onClose}
    >
      <div
        className="modal-content card-box"
        style={{
          maxWidth: '860px',
          width: '100%',
          maxHeight: '92vh',
          overflowY: 'auto',
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          padding: '0',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div
          style={{
            padding: '1rem 1.25rem',
            backgroundColor: 'var(--c-navy-dark)',
            color: '#FFFFFF',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTopLeftRadius: '16px',
            borderTopRightRadius: '16px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.25rem' }}>📄</span>
            <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: '900', color: '#FFFFFF' }}>
              {`[${docType}] ${customer.name || '고객'} (${docNo})`}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#FFFFFF',
              fontSize: '1.25rem',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            ✕
          </button>
        </div>

        {/* Body Content */}
        <div style={{ padding: '1.5rem', flex: 1, backgroundColor: '#F8FAFC' }}>
          {/* Top Info Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1rem',
              marginBottom: '1.25rem'
            }}
          >
            {/* 공급자 정보 박스 */}
            <div
              style={{
                padding: '1rem',
                backgroundColor: '#FFFFFF',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                position: 'relative'
              }}
            >
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', fontWeight: '900', color: 'var(--c-navy-primary)' }}>
                🏢 공급자 정보
              </h4>
              <div style={{ fontSize: '0.8125rem', display: 'flex', flexDirection: 'column', gap: '3px', color: 'var(--c-navy-dark)' }}>
                <div><strong>상호: </strong>{supplier.name || supplier.company || '세진중기'}</div>
                <div><strong>등록번호: </strong>{supplier.bizno || '123-45-67890'}</div>
                <div><strong>대표자: </strong>{supplier.person || supplier.owner || '허강'}</div>
                <div><strong>연락처: </strong>{supplier.phone || supplier.tel || '010-0000-0000'}</div>
                <div><strong>주소: </strong>{supplier.addr || '전북 김제시'}</div>
              </div>
              {hasStamp && (
                <div
                  style={{
                    position: 'absolute',
                    right: '15px',
                    bottom: '15px',
                    width: '52px',
                    height: '52px',
                    borderRadius: '50%',
                    border: '2px solid #DC2626',
                    color: '#DC2626',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '900',
                    fontSize: '11px',
                    transform: 'rotate(-10deg)',
                    backgroundColor: 'rgba(254, 226, 226, 0.3)'
                  }}
                >
                  인
                </div>
              )}
            </div>

            {/* 공급받는자(거래처) 정보 박스 */}
            <div
              style={{
                padding: '1rem',
                backgroundColor: '#FFFFFF',
                borderRadius: '10px',
                border: '1px solid var(--border-color)'
              }}
            >
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', fontWeight: '900', color: 'var(--c-navy-primary)' }}>
                👤 공급받는자(거래처)
              </h4>
              <div style={{ fontSize: '0.8125rem', display: 'flex', flexDirection: 'column', gap: '3px', color: 'var(--c-navy-dark)' }}>
                <div><strong>상호: </strong>{customer.name || '미지정'}</div>
                <div><strong>담당자: </strong>{customer.person || '-'}</div>
                <div><strong>연락처: </strong>{customer.phone || '-'}</div>
                <div><strong>발행일시: </strong>{`${docDate} ${docTime}`}</div>
                <div><strong>문서번호: </strong>{docNo}</div>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '10px',
              border: '1px solid var(--border-color)',
              overflow: 'hidden',
              marginBottom: '1.25rem'
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

          {/* Financial Summary Bar */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '8px',
              padding: '1rem',
              backgroundColor: '#FFFFFF',
              borderRadius: '10px',
              border: '1px solid var(--border-color)',
              textAlign: 'center',
              marginBottom: '1rem'
            }}
          >
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>공급가액</div>
              <div style={{ fontSize: '0.9375rem', fontWeight: '800', color: 'var(--c-navy-dark)' }}>{totalSupply.toLocaleString()}원</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>부가세 (10%)</div>
              <div style={{ fontSize: '0.9375rem', fontWeight: '800', color: 'var(--c-navy-dark)' }}>{vatAmount.toLocaleString()}원</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--c-blue-accent)', fontWeight: '800' }}>총 합계금액</div>
              <div style={{ fontSize: '1.0625rem', fontWeight: '900', color: 'var(--c-blue-accent)' }}>{grandTotal.toLocaleString()}원</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#028A3E' }}>입금/수금액</div>
              <div style={{ fontSize: '0.9375rem', fontWeight: '800', color: '#028A3E' }}>{paid.toLocaleString()}원</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: balance > 0 ? '#D92D20' : 'var(--text-muted)' }}>미수 잔액</div>
              <div style={{ fontSize: '1.0625rem', fontWeight: '900', color: balance > 0 ? '#D92D20' : '#028A3E' }}>
                {balance > 0 ? `${balance.toLocaleString()}원` : '0원 (완납)'}
              </div>
            </div>
          </div>

          {/* 특이사항 */}
          {doc.remark && (
            <div
              style={{
                padding: '0.75rem 1rem',
                backgroundColor: '#FFFFFF',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                fontSize: '0.8125rem'
              }}
            >
              <strong style={{ color: 'var(--c-navy-primary)' }}>📝 특이사항: </strong>
              {doc.remark}
            </div>
          )}
        </div>

        {/* Footer Action Bar */}
        <div
          style={{
            padding: '1rem 1.25rem',
            backgroundColor: '#FFFFFF',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.5rem',
            borderBottomLeftRadius: '16px',
            borderBottomRightRadius: '16px'
          }}
        >
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-outline"
              style={{ height: '36px', fontSize: '0.8125rem', fontWeight: '800' }}
              onClick={handlePrint}
            >
              🖨️ 인쇄 / PDF 저장
            </button>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {onCopy && (
              <button
                type="button"
                className="btn btn-outline"
                style={{ height: '36px', fontSize: '0.8125rem', fontWeight: '800' }}
                onClick={() => {
                  onCopy(doc);
                  onClose();
                }}
              >
                📑 새 명세서로 복사
              </button>
            )}
            {onEdit && (
              <button
                type="button"
                className="btn btn-primary"
                style={{ height: '36px', fontSize: '0.8125rem', fontWeight: '900' }}
                onClick={() => {
                  onEdit(doc);
                  onClose();
                }}
              >
                ✏️ 이 문서 편집하기 (작성 탭)
              </button>
            )}
            <button
              type="button"
              className="btn btn-outline"
              style={{ height: '36px', fontSize: '0.8125rem' }}
              onClick={onClose}
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
