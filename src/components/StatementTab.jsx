import React, { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import DocumentCanvas from './DocumentCanvas.jsx';
import { DOC_TYPES } from '../services/defaults.js';

export default function StatementTab({
  docType,
  setDocType,
  docNo,
  setDocNo,
  docDate,
  setDocDate,
  docTime,
  setDocTime,
  selectedSupplierKey,
  setSelectedSupplierKey,
  suppliersList,
  currentSupplier,
  setCurrentSupplier,
  customer,
  setCustomer,
  customersList,
  items,
  setItems,
  vat,
  setVat,
  vatIncluded,
  setVatIncluded,
  paid,
  setPaid,
  remark,
  setRemark,
  onResetForm,
  onSaveDocument,
  onSelectCustomerFromTab
}) {
  const [showSupplierEdit, setShowSupplierEdit] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const fileInputRef = useRef(null);

  // Filter autocomplete customers
  const matchingCustomers = searchQuery.trim()
    ? customersList.filter(c => 
        (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.person || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const handleAddItem = () => {
    setItems([
      ...items,
      { id: Date.now().toString(), code: '', name: '', unit: 'EA', qty: 1, price: 0 }
    ]);
  };

  const handleUpdateItem = (id, field, value) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleRemoveItem = (id) => {
    if (items.length === 1) {
      setItems([{ id: Date.now().toString(), code: '', name: '', unit: 'EA', qty: 1, price: 0 }]);
    } else {
      setItems(items.filter(item => item.id !== id));
    }
  };

  // Export A4 image as PNG
  const handleExportPNG = async () => {
    const pages = document.querySelectorAll('.document-page');
    if (!pages || pages.length === 0) return;

    try {
      for (let i = 0; i < pages.length; i++) {
        const canvas = await html2canvas(pages[i], {
          scale: 2,
          backgroundColor: '#ffffff',
          useCORS: true
        });

        const link = document.createElement('a');
        link.download = `${docType}_${docNo || '명세서'}_${i + 1}페이지.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      }
    } catch (err) {
      alert('이미지 저장 중 오류가 발생했습니다: ' + err.message);
    }
  };

  // Share via Web Share API
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `TEAM D.D ${docType}`,
          text: `[${docType}] ${customer.name || '거래처'} 명세서 (문서번호: ${docNo || '-'})`,
          url: window.location.href
        });
      } catch (e) {
        console.log('Share canceled');
      }
    } else {
      alert('이 브라우저는 웹 공유 기능을 지원하지 않아 이미지 다운로드로 대체합니다.');
      handleExportPNG();
    }
  };

  // Export JSON file
  const handleExportJSON = () => {
    const payload = {
      docType,
      docNo,
      docDate,
      docTime,
      selectedSupplierKey,
      supplier: currentSupplier,
      customer,
      items,
      vat,
      vatIncluded,
      paid,
      remark,
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${docType}_${docNo || '명세서'}_데이터.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import JSON file
  const handleImportJSON = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (data.docType) setDocType(data.docType);
        if (data.docNo) setDocNo(data.docNo);
        if (data.docDate) setDocDate(data.docDate);
        if (data.docTime) setDocTime(data.docTime);
        if (data.customer) setCustomer(data.customer);
        if (data.items) setItems(data.items);
        if (data.vat !== undefined) setVat(data.vat);
        if (data.vatIncluded !== undefined) setVatIncluded(data.vatIncluded);
        if (data.paid !== undefined) setPaid(data.paid);
        if (data.remark !== undefined) setRemark(data.remark);
        alert('✓ 명세서 데이터 불러오기 완료!');
      } catch (err) {
        alert('JSON 파일 형식이 올바르지 않습니다.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="generator-split">
      {/* Left Input Control Form */}
      <div className="form-panel">
        {/* Document Meta Section */}
        <div className="form-section">
          <div className="section-title">📄 문서 기본 설정</div>
          
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">문서 종류</label>
              <select
                className="form-select"
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
              >
                {DOC_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label className="form-label">공급자 선택</label>
              <select
                className="form-select"
                value={selectedSupplierKey}
                onChange={(e) => setSelectedSupplierKey(e.target.value)}
              >
                {suppliersList.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.code || '기본'})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">문서번호</label>
              <input
                type="text"
                className="form-input"
                placeholder="예: 20260812-001"
                value={docNo}
                onChange={(e) => setDocNo(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">일자</label>
              <input
                type="date"
                className="form-input"
                value={docDate}
                onChange={(e) => setDocDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Supplier Edit Accordion */}
        <div className="form-section">
          <button
            className="btn btn-outline"
            style={{ width: '100%', justifyContent: 'space-between', marginBottom: '0.5rem' }}
            onClick={() => setShowSupplierEdit(!showSupplierEdit)}
          >
            <span>🏢 공급자 정보 (수정하려면 클릭)</span>
            <span>{showSupplierEdit ? '▲' : '▼'}</span>
          </button>

          {showSupplierEdit && (
            <div style={{ backgroundColor: '#fafafa', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <div className="form-group">
                <label className="form-label">상호명</label>
                <input
                  type="text"
                  className="form-input"
                  value={currentSupplier.company || currentSupplier.name || ''}
                  onChange={(e) => setCurrentSupplier({ ...currentSupplier, company: e.target.value, name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">사업자등록번호</label>
                <input
                  type="text"
                  className="form-input"
                  value={currentSupplier.bizno || ''}
                  onChange={(e) => setCurrentSupplier({ ...currentSupplier, bizno: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">대표자명</label>
                <input
                  type="text"
                  className="form-input"
                  value={currentSupplier.person || currentSupplier.name || ''}
                  onChange={(e) => setCurrentSupplier({ ...currentSupplier, person: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">연락처</label>
                <input
                  type="text"
                  className="form-input"
                  value={currentSupplier.tel || currentSupplier.phone || ''}
                  onChange={(e) => setCurrentSupplier({ ...currentSupplier, tel: e.target.value, phone: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">입금계좌</label>
                <input
                  type="text"
                  className="form-input"
                  value={currentSupplier.bank || ''}
                  onChange={(e) => setCurrentSupplier({ ...currentSupplier, bank: e.target.value })}
                />
              </div>
            </div>
          )}
        </div>

        {/* Customer Section with Autocomplete */}
        <div className="form-section">
          <div className="section-title">👥 공급받는자 (거래처)</div>
          
          <div className="form-group" style={{ position: 'relative' }}>
            <label className="form-label">거래처명 검색 / 입력</label>
            <input
              type="text"
              className="form-input"
              placeholder="거래처 검색 (ilike 자동완성)"
              value={customer.name || searchQuery}
              onChange={(e) => {
                setCustomer({ ...customer, name: e.target.value });
                setSearchQuery(e.target.value);
                setShowAutocomplete(true);
              }}
              onFocus={() => setShowAutocomplete(true)}
            />

            {showAutocomplete && matchingCustomers.length > 0 && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                backgroundColor: '#ffffff',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                boxShadow: 'var(--shadow-md)',
                zIndex: 20,
                maxHeight: '160px',
                overflowY: 'auto'
              }}>
                {matchingCustomers.map(c => (
                  <button
                    key={c.id}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '0.5rem 0.75rem',
                      background: 'none',
                      border: 'none',
                      borderBottom: '1px solid #f3f4f6',
                      cursor: 'pointer'
                    }}
                    onClick={() => {
                      setCustomer({
                        name: c.name || '',
                        person: c.person || '',
                        phone: c.phone || '',
                        addr: c.addr || ''
                      });
                      setShowAutocomplete(false);
                    }}
                  >
                    <div style={{ fontSize: '0.8125rem', fontWeight: '700' }}>{c.name}</div>
                    <div style={{ fontSize: '0.6875rem', color: '#6b7280' }}>
                      {c.person} • {c.phone}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">담당자</label>
              <input
                type="text"
                className="form-input"
                value={customer.person || ''}
                onChange={(e) => setCustomer({ ...customer, person: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">연락처</label>
              <input
                type="text"
                className="form-input"
                value={customer.phone || ''}
                onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">주소</label>
            <input
              type="text"
              className="form-input"
              value={customer.addr || ''}
              onChange={(e) => setCustomer({ ...customer, addr: e.target.value })}
            />
          </div>
        </div>

        {/* Items List Entry */}
        <div className="form-section">
          <div className="section-title" style={{ justifyContent: 'space-between' }}>
            <span>📦 품목 리스트 ({items.length}건)</span>
            <button className="btn btn-outline" style={{ fontSize: '0.6875rem', padding: '0.25rem 0.5rem' }} onClick={handleAddItem}>
              + 행 추가
            </button>
          </div>

          {items.map((item, idx) => (
            <div key={item.id} className="item-card">
              <div className="item-card-header">
                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#6b7280' }}>#{idx + 1}</span>
                <button
                  style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '0.75rem' }}
                  onClick={() => handleRemoveItem(item.id)}
                >
                  삭제
                </button>
              </div>

              <div style={{ marginBottom: '0.375rem' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="품명 및 규격"
                  value={item.name}
                  onChange={(e) => handleUpdateItem(item.id, 'name', e.target.value)}
                />
              </div>

              <div className="item-grid">
                <input
                  type="text"
                  className="form-input"
                  placeholder="단위"
                  value={item.unit}
                  onChange={(e) => handleUpdateItem(item.id, 'unit', e.target.value)}
                />
                <input
                  type="number"
                  className="form-input"
                  placeholder="수량"
                  value={item.qty}
                  onChange={(e) => handleUpdateItem(item.id, 'qty', Number(e.target.value) || 0)}
                />
                <input
                  type="number"
                  className="form-input"
                  placeholder="단가"
                  value={item.price}
                  onChange={(e) => handleUpdateItem(item.id, 'price', Number(e.target.value) || 0)}
                />
              </div>
            </div>
          ))}
        </div>

        {/* VAT & Totals Control */}
        <div className="form-section">
          <div className="section-title">💰 세액 및 비고</div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <input
                  type="checkbox"
                  checked={vatIncluded}
                  onChange={(e) => setVatIncluded(e.target.checked)}
                />
                부가세 10% 자동입력
              </label>
            </div>
            <div className="form-group">
              <label className="form-label">기납부액 / 입금액</label>
              <input
                type="number"
                className="form-input"
                value={paid}
                onChange={(e) => setPaid(Number(e.target.value) || 0)}
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">비고란</label>
            <textarea
              className="form-textarea"
              rows="2"
              placeholder="특이사항 또는 전달사항"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
            />
          </div>
        </div>

        {/* Action Controls Toolbar */}
        <div className="action-buttons-bar" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <button className="btn btn-green" onClick={handleExportPNG}>
              📸 이미지 저장
            </button>
            <button className="btn btn-primary" onClick={handleShare}>
              📤 공유하기
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <button className="btn btn-outline" onClick={() => window.print()}>
              🖨️ 인쇄 / PDF
            </button>
            <button className="btn btn-outline" onClick={onSaveDocument}>
              💾 DB/로컬 저장
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <button className="btn btn-outline" onClick={handleExportJSON}>
              📂 JSON 저장
            </button>
            <button className="btn btn-outline" onClick={() => fileInputRef.current?.click()}>
              📥 JSON 불러오기
            </button>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept=".json"
              onChange={handleImportJSON}
            />
          </div>

          <button className="btn btn-red-outline" style={{ marginTop: '0.5rem' }} onClick={onResetForm}>
            🔄 새 명세서 시작 (초기화)
          </button>
        </div>
      </div>

      {/* Right Canvas Preview */}
      <div className="preview-panel">
        <DocumentCanvas
          docType={docType}
          docNo={docNo}
          docDate={docDate}
          docTime={docTime}
          supplier={currentSupplier}
          customer={customer}
          items={items}
          vat={vat}
          vatIncluded={vatIncluded}
          paid={paid}
          remark={remark}
        />
      </div>
    </div>
  );
}
