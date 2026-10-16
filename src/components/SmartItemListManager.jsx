// 🎨 TEAM D.D SMART ITEM LIST MANAGER COMPONENT
import React, { useState } from 'react';
import { normalizePartNo } from '../utils/partSecurity.js';

export default function SmartItemListManager({
  items = [],
  setItems,
  docType = '거래명세서',
  vatIncluded = true,
  parts = [],
  showPartNoColumn = true,
  onTogglePartNoColumn = () => {}
}) {
  // Input form state
  const [formMode, setFormMode] = useState('add'); // 'add' | 'edit' | 'insert_above'
  const [targetItemId, setTargetItemId] = useState(null);

  const [inputCode, setInputCode] = useState('');
  const [inputDate, setInputDate] = useState(new Date().toISOString().split('T')[0]);
  const [inputName, setInputName] = useState('');
  const [inputUnit, setInputUnit] = useState('EA');
  const [inputQty, setInputQty] = useState(1);
  const [inputPrice, setInputPrice] = useState('');
  const [inputMemo, setInputMemo] = useState('');

  // Parts autocomplete state
  const [matchedParts, setMatchedParts] = useState([]);
  const [showPartDropdown, setShowPartDropdown] = useState(false);

  // UI state
  const [expandedItemId, setExpandedItemId] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: null, confirmColor: '#1d4ed8' });

  // Filter out completely blank single initial item if empty
  const validItems = items.filter(it => it && (it.name || it.price > 0 || (it.qty && it.qty > 0)));
  const displayItems = validItems.length > 0 ? validItems : items;

  // Calculate totals
  const totalSupply = displayItems.reduce((sum, it) => sum + ((Number(it.qty) || 0) * (Number(it.price) || 0)), 0);
  const vatAmount = vatIncluded ? Math.round(totalSupply * 0.1) : 0;
  const grandTotal = totalSupply + vatAmount;

  // Reset form to blank 'add' state
  const resetForm = () => {
    setFormMode('add');
    setTargetItemId(null);
    setInputCode('');
    setInputName('');
    setInputUnit('EA');
    setInputQty(1);
    setInputPrice('');
    setInputMemo('');
    setInputDate(new Date().toISOString().split('T')[0]);
    setMatchedParts([]);
    setShowPartDropdown(false);
  };

  // Start editing an item
  const startEdit = (item) => {
    setFormMode('edit');
    setTargetItemId(item.id);
    setInputCode(item.code || '');
    setInputName(item.name || '');
    setInputUnit(item.unit || 'EA');
    setInputQty(item.qty || 1);
    setInputPrice(item.price !== undefined && item.price !== null ? String(item.price) : '');
    setInputMemo(item.memo || item.remark || '');
    setInputDate(item.date || new Date().toISOString().split('T')[0]);
    setExpandedItemId(null);
    setShowPartDropdown(false);

    // Scroll to input box
    const el = document.getElementById('smart-item-input-box');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // Start inserting above an item
  const startInsertAbove = (item) => {
    setFormMode('insert_above');
    setTargetItemId(item.id);
    setInputCode('');
    setInputName('');
    setInputUnit('EA');
    setInputQty(1);
    setInputPrice('');
    setInputMemo('');
    setInputDate(new Date().toISOString().split('T')[0]);
    setExpandedItemId(null);
    setShowPartDropdown(false);

    const el = document.getElementById('smart-item-input-box');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // 부품번호 또는 품명 입력 시 자동완성 제안
  const handleCodeOrNameChange = (val, field = 'code') => {
    if (field === 'code') {
      setInputCode(val);
    } else {
      setInputName(val);
    }

    if (!val || val.trim().length < 1) {
      setMatchedParts([]);
      setShowPartDropdown(false);
      return;
    }

    const q = val.toLowerCase().trim();
    const cleanQ = val.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

    const matches = (parts || []).filter(p => {
      const codeMatch = (p.code || '').toLowerCase().includes(q);
      const cleanMatch = cleanQ && (p.cleanKey || p.code || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase().includes(cleanQ);
      const nameMatch = (p.name || '').toLowerCase().includes(q);
      const specMatch = (p.spec || '').toLowerCase().includes(q);
      return codeMatch || cleanMatch || nameMatch || specMatch;
    }).slice(0, 6);

    setMatchedParts(matches);
    setShowPartDropdown(matches.length > 0);
  };

  // 자동완성에서 부품 선택
  const handleSelectAutocompletePart = (part) => {
    setInputCode(part.code || '');
    setInputName(part.name || '');
    if (part.unit) setInputUnit(part.unit);
    if (part.price) setInputPrice(String(part.price));
    if (part.spec) setInputMemo(prev => prev ? `${prev} / ${part.spec}` : part.spec);
    setShowPartDropdown(false);
  };

  // Delete item handler with confirmation
  const handleDeleteItem = (item, idx) => {
    const itemName = item.name ? `[${item.name}]` : `#${idx + 1}번 품목`;
    setConfirmDialog({
      isOpen: true,
      title: '품목 삭제 확인',
      message: `${itemName} 품목을 목록에서 삭제하시겠습니까?`,
      confirmColor: '#DC2626',
      onConfirm: () => {
        const next = items.filter(i => i.id !== item.id);
        if (next.length === 0) {
          setItems([{ id: Date.now().toString(), code: '', name: '', unit: 'EA', qty: 1, price: 0, memo: '' }]);
        } else {
          setItems(next);
        }
        if (targetItemId === item.id) resetForm();
        setExpandedItemId(null);
      }
    });
  };

  // Move item up / down
  const moveItem = (idx, direction) => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= items.length) return;
    const next = [...items];
    const temp = next[idx];
    next[idx] = next[targetIdx];
    next[targetIdx] = temp;
    setItems(next);
    setExpandedItemId(null);
  };

  // Submit item from input form
  const handleSubmitItem = () => {
    let effectiveName = inputName.trim();
    if (!effectiveName && inputCode.trim()) {
      effectiveName = inputCode.trim();
    }

    if (!effectiveName) {
      alert('품명 또는 부품번호를 입력해 주세요.');
      return;
    }

    const newItemData = {
      id: formMode === 'edit' ? targetItemId : Date.now().toString(),
      code: normalizePartNo(inputCode),
      date: inputDate,
      name: effectiveName,
      unit: inputUnit.trim() || 'EA',
      qty: Number(inputQty) || 1,
      price: Number(inputPrice) || 0,
      memo: inputMemo.trim(),
      remark: inputMemo.trim()
    };

    if (formMode === 'edit') {
      // Confirm edit
      setConfirmDialog({
        isOpen: true,
        title: '품목 수정 확인',
        message: `[${inputName.trim()}] 품목의 수정을 반영하시겠습니까?`,
        confirmColor: '#10B981',
        onConfirm: () => {
          setItems(items.map(it => it.id === targetItemId ? newItemData : it));
          resetForm();
        }
      });
    } else if (formMode === 'insert_above') {
      const idx = items.findIndex(it => it.id === targetItemId);
      if (idx !== -1) {
        const next = [...items];
        next.splice(idx, 0, newItemData);
        setItems(next);
      } else {
        setItems([...items, newItemData]);
      }
      resetForm();
    } else {
      // 'add' mode
      // If current items only have 1 single blank entry, replace it
      if (items.length === 1 && !items[0].name && (!items[0].price || items[0].price === 0)) {
        setItems([newItemData]);
      } else {
        setItems([...items, newItemData]);
      }
      resetForm();
    }
  };

  const getTargetItemIndex = () => {
    if (!targetItemId) return 0;
    const idx = items.findIndex(it => it.id === targetItemId);
    return idx !== -1 ? idx + 1 : 1;
  };

  return (
    <div className="form-section" style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '0.875rem', border: '1px solid var(--border-color)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      {/* ── 1. 등록된 품목 상단 요약 리스트 (1줄 누적 스택) ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.625rem', paddingBottom: '0.5rem', borderBottom: '1.5px solid #F1F5F9' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '13px', fontWeight: '700', color: '#0F172A' }}>
            품목 목록
          </span>
          <span style={{ fontSize: '11px', fontWeight: '600', backgroundColor: '#EFF6FF', color: '#1D4ED8', padding: '1px 7px', borderRadius: '10px', border: '1px solid #BFDBFE' }}>
            총 {displayItems.length}건
          </span>
        </div>
        <div style={{ fontSize: '12px', fontWeight: '700', color: '#028A3E' }}>
          합계: {totalSupply.toLocaleString()}원
        </div>
      </div>

      {/* Item Stack Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '0.875rem' }}>
        {displayItems.map((item, idx) => {
          const itemTotal = (Number(item.qty) || 0) * (Number(item.price) || 0);
          const isExpanded = expandedItemId === (item.id || idx);
          const isBeingEdited = formMode === 'edit' && targetItemId === item.id;

          return (
            <div
              key={item.id || idx}
              style={{
                backgroundColor: isBeingEdited ? '#FEF3C7' : (isExpanded ? '#F8FAFC' : '#FFFFFF'),
                border: isBeingEdited ? '1.5px solid #F59E0B' : (isExpanded ? '1.5px solid #93C5FD' : '1px solid #E2E8F0'),
                borderRadius: '8px',
                padding: '8px 10px',
                transition: 'all 0.15s ease',
                boxShadow: isExpanded ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
              }}
            >
              {/* Top 1-Line Item Summary */}
              <div
                style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', cursor: 'pointer', gap: '8px' }}
                onClick={() => setExpandedItemId(isExpanded ? null : (item.id || idx))}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', minWidth: 0, flex: 1 }}>
                  <span style={{ fontSize: '0.6875rem', fontWeight: '800', color: '#64748B', backgroundColor: '#F1F5F9', padding: '2px 5px', borderRadius: '4px', marginTop: '1px', flexShrink: 0 }}>
                    #{idx + 1}
                  </span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '0.8125rem', fontWeight: '800', color: '#1E293B', wordBreak: 'break-all', lineHeight: '1.3' }}>
                      {item.code && (
                        <span style={{ fontFamily: 'monospace', fontWeight: '900', color: '#1D4ED8', backgroundColor: '#EFF6FF', padding: '1px 5px', borderRadius: '4px', marginRight: '6px', fontSize: '0.75rem' }}>
                          {item.code}
                        </span>
                      )}
                      {item.name || '(품명 미입력)'}
                      {item.spec && <span style={{ fontSize: '0.6875rem', fontWeight: 'normal', color: '#64748B', marginLeft: '4px' }}>({item.spec})</span>}
                    </div>
                    <div style={{ fontSize: '0.6875rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px', flexWrap: 'wrap' }}>
                      <span style={{ whiteSpace: 'nowrap', fontWeight: '600' }}>{item.qty || 1} {item.unit || 'EA'}</span>
                      <span style={{ color: '#CBD5E1' }}>·</span>
                      <span style={{ whiteSpace: 'nowrap' }}>단가 {(Number(item.price) || 0).toLocaleString()}원</span>
                    </div>
                    {item.memo && (
                      <div style={{ 
                        fontSize: '0.6875rem', 
                        color: '#028A3E', 
                        backgroundColor: '#F0FDF4', 
                        border: '1px solid #DCFCE7', 
                        borderRadius: '4px', 
                        padding: '3px 6px', 
                        marginTop: '4px',
                        wordBreak: 'break-all',
                        lineHeight: '1.35'
                      }}>
                        메모: {item.memo}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, marginLeft: '4px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#1D4ED8', whiteSpace: 'nowrap' }}>
                    {itemTotal.toLocaleString()}원
                  </span>
                  <button
                    type="button"
                    style={{
                      background: isExpanded ? '#EFF6FF' : '#F1F5F9',
                      border: '1px solid #CBD5E1',
                      borderRadius: '4px',
                      padding: '2px 6px',
                      fontSize: '11px',
                      fontWeight: '600',
                      color: isExpanded ? '#1D4ED8' : '#475569',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {isExpanded ? '닫기 ▲' : '관리 ▾'}
                  </button>
                </div>
              </div>

              {/* Action Buttons Drawer (Expanded when tapped) */}
              {isExpanded && (
                <div
                  style={{
                    marginTop: '8px',
                    paddingTop: '8px',
                    borderTop: '1px dashed #CBD5E1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '4px',
                    flexWrap: 'wrap'
                  }}
                >
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); startEdit(item); }}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: '#EFF6FF',
                        border: '1px solid #BFDBFE',
                        color: '#1D4ED8',
                        borderRadius: '5px',
                        fontSize: '11px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center'
                      }}
                    >
                      수정
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); startInsertAbove(item); }}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: '#FAF5FF',
                        border: '1px solid #E9D5FF',
                        color: '#7E22CE',
                        borderRadius: '5px',
                        fontSize: '11px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center'
                      }}
                    >
                      위에 삽입
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleDeleteItem(item, idx); }}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: '#FEF2F2',
                        border: '1px solid #FECACA',
                        color: '#DC2626',
                        borderRadius: '5px',
                        fontSize: '11px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center'
                      }}
                    >
                      삭제
                    </button>
                  </div>

                  {/* Move Up/Down Order */}
                  <div style={{ display: 'flex', gap: '3px' }}>
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={(e) => { e.stopPropagation(); moveItem(idx, 'up'); }}
                      style={{
                        padding: '3px 8px',
                        backgroundColor: idx === 0 ? '#F1F5F9' : '#FFFFFF',
                        border: '1px solid #CBD5E1',
                        borderRadius: '4px',
                        fontSize: '0.6875rem',
                        fontWeight: '800',
                        color: idx === 0 ? '#94A3B8' : '#334155',
                        cursor: idx === 0 ? 'default' : 'pointer'
                      }}
                      title="위로 순서 변경"
                    >
                      ▲ 위로
                    </button>
                    <button
                      type="button"
                      disabled={idx === displayItems.length - 1}
                      onClick={(e) => { e.stopPropagation(); moveItem(idx, 'down'); }}
                      style={{
                        padding: '3px 8px',
                        backgroundColor: idx === displayItems.length - 1 ? '#F1F5F9' : '#FFFFFF',
                        border: '1px solid #CBD5E1',
                        borderRadius: '4px',
                        fontSize: '0.6875rem',
                        fontWeight: '800',
                        color: idx === displayItems.length - 1 ? '#94A3B8' : '#334155',
                        cursor: idx === displayItems.length - 1 ? 'default' : 'pointer'
                      }}
                      title="아래로 순서 변경"
                    >
                      ▼ 아래로
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── 2. 스마트 단일 입력창 (Compact Single Form) ── */}
      <div
        id="smart-item-input-box"
        style={{
          backgroundColor: formMode === 'edit' ? '#FFFBEB' : '#F8FAFC',
          border: formMode === 'edit' ? '1.5px solid #F59E0B' : '1px solid #CBD5E1',
          borderRadius: '10px',
          padding: '0.75rem',
          marginBottom: '0.75rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: '700', color: formMode === 'edit' ? '#B45309' : (formMode === 'insert_above' ? '#7E22CE' : '#0F172A') }}>
            {formMode === 'edit' ? `품목 수정 중 (#${getTargetItemIndex()})` : (formMode === 'insert_above' ? `상단 행 삽입 (#${getTargetItemIndex()})` : `새 품목 입력 (#${displayItems.length + 1})`)}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: '600', color: '#475569', cursor: 'pointer', userSelect: 'none' }} title="명세서/견적서/청구서 본문 표에 부품번호 독립 열을 표시합니다">
              <input
                type="checkbox"
                checked={showPartNoColumn}
                onChange={e => onTogglePartNoColumn(e.target.checked)}
                style={{ width: '13px', height: '13px', accentColor: '#1D4ED8', cursor: 'pointer' }}
              />
              <span>부품번호 열 사용</span>
            </label>
            {formMode !== 'add' && (
              <button
                type="button"
                onClick={resetForm}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748B',
                  fontSize: '11px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  padding: '2px 6px'
                }}
              >
                취소 (신규 입력)
              </button>
            )}
          </div>
        </div>

        {/* 1. Optional Part Number Row with Autocomplete (부품번호 열 사용 켜짐 시만 표시) */}
        {showPartNoColumn && (
          <div style={{ position: 'relative', marginBottom: '6px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '6px' }}>
              <div style={{ position: 'relative', display: 'flex' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="부품번호 (선택)"
                  value={inputCode}
                  onChange={e => handleCodeOrNameChange(e.target.value, 'code')}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      if (matchedParts.length > 0) {
                        e.preventDefault();
                        handleSelectAutocompletePart(matchedParts[0]);
                      } else {
                        document.getElementById('smart-item-name-input')?.focus();
                      }
                    }
                  }}
                  style={{ fontFamily: 'monospace', fontWeight: '700', fontSize: '12px', backgroundColor: '#F8FAFC', width: '100%', borderRadius: '6px' }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', fontSize: '11px', color: '#64748B' }}>
                부품번호 입력 시 자동완성 (Enter 선택)
              </div>
            </div>

          {/* Autocomplete Dropdown */}
          {showPartDropdown && matchedParts.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              backgroundColor: '#FFFFFF',
              border: '1.5px solid #3B82F6',
              borderRadius: '8px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
              zIndex: 100,
              marginTop: '2px',
              overflow: 'hidden'
            }}>
              {matchedParts.map(p => (
                <div
                  key={p.id || p.code}
                  onClick={() => handleSelectAutocompletePart(p)}
                  style={{
                    padding: '8px 12px',
                    borderBottom: '1px solid #F1F5F9',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.8125rem'
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#EFF6FF'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = '#FFFFFF'}
                >
                  <div>
                    <span style={{ fontFamily: 'monospace', fontWeight: '900', color: '#1D4ED8', marginRight: '8px' }}>
                      {p.code}
                    </span>
                    <strong style={{ color: '#0F172A' }}>{p.name}</strong>
                    {p.spec && <span style={{ color: '#64748B', fontSize: '0.75rem', marginLeft: '6px' }}>({p.spec})</span>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontWeight: '700', color: '#334155' }}>₩ {Number(p.price || 0).toLocaleString()}</span>
                    {p.purchase_price ? (
                      <span style={{ fontSize: '0.6875rem', color: '#0284C7', marginLeft: '6px', fontWeight: '800' }}>
                        (내원가: {Number(p.purchase_price).toLocaleString()})
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        )}

        {/* Date Row (for 청구서) + Item Name */}
        <div style={{ display: 'grid', gridTemplateColumns: docType === '청구서' ? '110px 1fr' : '1fr', gap: '6px', marginBottom: '6px' }}>
          {docType === '청구서' && (
            <input
              type="date"
              className="form-input"
              value={inputDate}
              onChange={e => setInputDate(e.target.value)}
              style={{ fontSize: '12px', padding: '0.4rem', borderRadius: '6px' }}
            />
          )}
          <input
            id="smart-item-name-input"
            type="text"
            className="form-input"
            placeholder="품명 및 규격 (예: EC140EL 유압펌프 교환)"
            value={inputName}
            onChange={e => handleCodeOrNameChange(e.target.value, 'name')}
            onKeyDown={e => { if (e.key === 'Enter') handleSubmitItem(); }}
            style={{ fontWeight: '600', borderRadius: '6px', fontSize: '12px' }}
          />
        </div>

        {/* Unit + Qty + Price */}
        <div style={{ display: 'grid', gridTemplateColumns: '65px 75px 1fr', gap: '6px', marginBottom: '6px' }}>
          <input
            type="text"
            className="form-input"
            placeholder="단위"
            value={inputUnit}
            onChange={e => setInputUnit(e.target.value)}
            style={{ textAlign: 'center', borderRadius: '6px', fontSize: '12px' }}
          />
          <input
            type="number"
            className="form-input"
            placeholder="수량"
            value={inputQty === 0 ? '' : inputQty}
            onChange={e => setInputQty(e.target.value === '' ? '' : Number(e.target.value))}
            style={{ textAlign: 'center', fontWeight: '600', borderRadius: '6px', fontSize: '12px' }}
          />
          <input
            type="number"
            className="form-input"
            placeholder="단가 (금액)"
            value={inputPrice}
            onChange={e => setInputPrice(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSubmitItem(); }}
            style={{ textAlign: 'right', fontWeight: '700', color: '#1D4ED8', borderRadius: '6px', fontSize: '12px' }}
          />
        </div>

        {/* Memo Input */}
        <input
          type="text"
          className="form-input"
          placeholder="품목 비고 / 메모 (선택사항)"
          value={inputMemo}
          onChange={e => setInputMemo(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSubmitItem(); }}
          style={{ fontSize: '12px', borderRadius: '6px' }}
        />
      </div>

      {/* ── 3. 액션 버튼 바 (등록 60% + 전체 리스트 팝업 40%) ── */}
      <div style={{ display: 'flex', gap: '6px' }}>
        {/* Left Action Button (60%) */}
        <button
          type="button"
          onClick={handleSubmitItem}
          style={{
            flex: '3',
            height: '38px',
            borderRadius: '7px',
            backgroundColor: formMode === 'edit' ? '#10B981' : (formMode === 'insert_above' ? '#7E22CE' : '#1D4ED8'),
            color: '#FFFFFF',
            border: 'none',
            fontSize: '13px',
            fontWeight: '700',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s ease'
          }}
        >
          <span>{formMode === 'edit' ? '수정 완료' : (formMode === 'insert_above' ? '위에 삽입 완료' : '품목 추가')}</span>
        </button>

        {/* Right Action Button (40%): [ 목록 미리보기 ] */}
        <button
          type="button"
          onClick={() => setShowPreviewModal(true)}
          style={{
            flex: '2',
            height: '38px',
            borderRadius: '7px',
            backgroundColor: '#0F172A',
            color: '#FFFFFF',
            border: 'none',
            fontSize: '12px',
            fontWeight: '700',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(15,23,42,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            whiteSpace: 'nowrap'
          }}
          title="전체 품목 리스트를 팝업창으로 한눈에 확인"
        >
          <span>목록 미리보기</span>
        </button>
      </div>

      {/* ── 4. [ 👁️ 전체 품목 리스트 팝업 모달 ] (시인성 극대화) ── */}
      {showPreviewModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(5px)',
            WebkitBackdropFilter: 'blur(5px)',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            animation: 'modalFadeIn 0.2s ease'
          }}
          onClick={() => setShowPreviewModal(false)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '650px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
              overflow: 'hidden',
              animation: 'modalSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '1rem 1.25rem',
                background: 'linear-gradient(135deg, #001B48 0%, #02457A 100%)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: '700' }}>
                    전체 품목 목록
                  </div>
                  <div style={{ fontSize: '11px', color: '#D6E8EE', opacity: 0.9, marginTop: '2px' }}>
                    {docType} 품목 리스트 · 총 {displayItems.length}건
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  borderRadius: '50%',
                  color: '#FFFFFF',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body: Table / Card List */}
            <div style={{ flex: 1, padding: '1rem', overflowY: 'auto' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {displayItems.map((item, idx) => {
                  const itemTotal = (Number(item.qty) || 0) * (Number(item.price) || 0);
                  return (
                    <div
                      key={item.id || idx}
                      style={{
                        backgroundColor: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        borderRadius: '10px',
                        padding: '10px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', minWidth: 0, flex: 1 }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: '900', color: '#475569', backgroundColor: '#E2E8F0', padding: '2px 6px', borderRadius: '4px', marginTop: '2px' }}>
                          #{idx + 1}
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '0.9375rem', fontWeight: '800', color: '#0F172A', lineHeight: 1.3 }}>
                            {item.name || '(품명 미입력)'}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '3px' }}>
                            <span>수량: <strong>{item.qty || 1} {item.unit || 'EA'}</strong></span>
                            <span style={{ margin: '0 6px' }}>|</span>
                            <span>단가: <strong>{(Number(item.price) || 0).toLocaleString()}원</strong></span>
                          </div>
                          {item.memo && (
                            <div style={{ fontSize: '0.6875rem', color: '#028A3E', marginTop: '2px', fontWeight: '600' }}>
                              📝 {item.memo}
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: '1rem', fontWeight: '900', color: '#1D4ED8' }}>
                          {itemTotal.toLocaleString()}원
                        </div>
                        <div style={{ display: 'flex', gap: '4px', marginTop: '4px', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setShowPreviewModal(false);
                              startEdit(item);
                            }}
                            style={{
                              padding: '2px 8px',
                              backgroundColor: '#EFF6FF',
                              border: '1px solid #BFDBFE',
                              color: '#1D4ED8',
                              borderRadius: '4px',
                              fontSize: '0.6875rem',
                              fontWeight: '700',
                              cursor: 'pointer'
                            }}
                          >
                            수정
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item, idx)}
                            style={{
                              padding: '2px 8px',
                              backgroundColor: '#FEF2F2',
                              border: '1px solid #FECACA',
                              color: '#DC2626',
                              borderRadius: '4px',
                              fontSize: '0.6875rem',
                              fontWeight: '700',
                              cursor: 'pointer'
                            }}
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer: Total Summary */}
            <div
              style={{
                padding: '0.875rem 1.25rem',
                backgroundColor: '#F8FAFC',
                borderTop: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                  공급가액: {totalSupply.toLocaleString()}원 {vatIncluded ? `+ 부가세: ${vatAmount.toLocaleString()}원` : ''}
                </div>
                <div style={{ fontSize: '1.125rem', fontWeight: '900', color: '#0F172A', marginTop: '1px' }}>
                  총 금액: <span style={{ color: '#1D4ED8' }}>{grandTotal.toLocaleString()}원</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                style={{
                  padding: '8px 18px',
                  backgroundColor: '#0F172A',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.8125rem',
                  fontWeight: '800',
                  cursor: 'pointer'
                }}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 5. 전용 확인 알림 모달 (Confirm Dialog) ── */}
      {confirmDialog.isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            zIndex: 9999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem'
          }}
          onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '14px',
              padding: '1.25rem',
              width: '100%',
              maxWidth: '360px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
              textAlign: 'center'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: '1.75rem', marginBottom: '6px' }}>⚠️</div>
            <div style={{ fontSize: '1rem', fontWeight: '900', color: '#0F172A', marginBottom: '6px' }}>
              {confirmDialog.title}
            </div>
            <div style={{ fontSize: '0.8125rem', color: '#475569', marginBottom: '1.25rem', lineHeight: 1.4 }}>
              {confirmDialog.message}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                style={{
                  flex: 1,
                  height: '38px',
                  borderRadius: '8px',
                  backgroundColor: '#F1F5F9',
                  border: '1px solid #CBD5E1',
                  color: '#475569',
                  fontSize: '0.8125rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirmDialog.onConfirm) confirmDialog.onConfirm();
                  setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                }}
                style={{
                  flex: 1,
                  height: '38px',
                  borderRadius: '8px',
                  backgroundColor: confirmDialog.confirmColor || '#1D4ED8',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '0.8125rem',
                  fontWeight: '900',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                }}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
