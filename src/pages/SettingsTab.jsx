// 🎨 TEAM D.D SETTINGS TAB (사업자 설정, 데이터 공개 범위 & 클라우드 연동)
import React, { useState, useEffect } from 'react';
import { SQL_ALL, DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_KEY } from '../config/constants.js';
import { compressImageFile } from '../utils/imageUtils.js';

export default function SettingsTab({
  currentSupplier = {},
  selectedSupplierKey = 'sejin',
  suppliersList = [],
  onSaveSupplier,
  onNavigateToSuppliers,
  supabaseUrl,
  setSupabaseUrl,
  supabaseKey,
  setSupabaseKey,
  isConnected,
  isTesting,
  connectionMessage,
  onTestConnection,
  userRole = 'supplier',
  isAdmin = false
}) {
  const isUserAdmin = isAdmin || userRole === 'admin' || sessionStorage.getItem('dd_user_role') === 'admin';
  const [copiedSQL, setCopiedSQL] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [geminiSaved, setGeminiSaved] = useState(false);

  const targetId = currentSupplier.id || selectedSupplierKey;
  const initialPwd = currentSupplier.pwd || (targetId ? localStorage.getItem('dd_pwd_' + targetId) : '') || '0000';

  // 사업자 폼 정보
  const [form, setForm] = useState({
    id: targetId,
    name: currentSupplier.name || currentSupplier.company || '',
    person: currentSupplier.person || currentSupplier.owner || '',
    bizno: currentSupplier.bizno || '',
    phone: currentSupplier.phone || currentSupplier.tel || '',
    fax: currentSupplier.fax || '',
    addr: currentSupplier.addr || '',
    email: currentSupplier.email || '',
    bank: currentSupplier.bank || '',
    stamp_image: currentSupplier.stamp_image || currentSupplier.stampUrl || currentSupplier.stamp || '',
    hasStamp: !!(currentSupplier.stamp_image || currentSupplier.stampUrl || currentSupplier.stamp || currentSupplier.hasStamp),
    pwd: initialPwd,
    defaultShared: false
  });

  useEffect(() => {
    const tId = currentSupplier.id || selectedSupplierKey;
    const sPwd = currentSupplier.pwd || (tId ? localStorage.getItem('dd_pwd_' + tId) : '') || '0000';
    setForm({
      id: tId,
      name: currentSupplier.name || currentSupplier.company || '',
      person: currentSupplier.person || currentSupplier.owner || '',
      bizno: currentSupplier.bizno || '',
      phone: currentSupplier.phone || currentSupplier.tel || '',
      fax: currentSupplier.fax || '',
      addr: currentSupplier.addr || '',
      email: currentSupplier.email || '',
      bank: currentSupplier.bank || '',
      stamp_image: currentSupplier.stamp_image || currentSupplier.stampUrl || currentSupplier.stamp || '',
      hasStamp: !!(currentSupplier.stamp_image || currentSupplier.stampUrl || currentSupplier.stamp || currentSupplier.hasStamp),
      pwd: sPwd,
      defaultShared: false
    });
  }, [currentSupplier, selectedSupplierKey]);

  const handleCopySQL = () => {
    navigator.clipboard.writeText(SQL_ALL).then(() => {
      setCopiedSQL(true);
      setTimeout(() => setCopiedSQL(false), 2500);
    });
  };

  const handleSaveGeminiKey = (e) => {
    e.preventDefault();
    localStorage.setItem('gemini_api_key', geminiApiKey.trim());
    setGeminiSaved(true);
    setTimeout(() => setGeminiSaved(false), 2500);
  };

  const handleSaveSupplierProfile = (e) => {
    e.preventDefault();
    if (form.pwd && form.pwd.length !== 4) {
      alert('❌ 로그인 비밀번호는 반드시 4자리 숫자여야 합니다.');
      return;
    }
    const tId = form.id || currentSupplier.id || selectedSupplierKey;
    if (onSaveSupplier) {
      onSaveSupplier({
        ...currentSupplier,
        ...form,
        id: tId,
        company: form.name,
        owner: form.person,
        tel: form.phone,
        pwd: form.pwd
      });
      if (tId && form.pwd) {
        localStorage.setItem('dd_pwd_' + tId, form.pwd);
      }
    }
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleOpenAdminPwdChange = () => {
    const currentAdminPwd = localStorage.getItem('dd_pwd_admin') || '0000';
    const newPwd = window.prompt('🔑 새로운 관리자 마스터 비밀번호를 입력해주세요 (4자리 숫자):', currentAdminPwd);
    if (newPwd === null) return;
    const cleaned = newPwd.replace(/[^0-9]/g, '');
    if (cleaned.length !== 4) {
      alert('❌ 비밀번호는 반드시 4자리 숫자여야 합니다.');
      return;
    }
    localStorage.setItem('dd_pwd_admin', cleaned);
    alert('✓ 관리자 비밀번호가 성공적으로 변경되었습니다!');
  };

  const handleResetToDefaults = () => {
    setSupabaseUrl(DEFAULT_SUPABASE_URL);
    setSupabaseKey(DEFAULT_SUPABASE_KEY);
    localStorage.setItem('supabase_url', DEFAULT_SUPABASE_URL);
    localStorage.setItem('supabase_anon_key', DEFAULT_SUPABASE_KEY);
    setTimeout(() => {
      if (onTestConnection) onTestConnection(DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_KEY);
    }, 50);
  };

  return (
    <div className="management-container">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '900px', margin: '0 auto' }}>
        
        {/* 1. 사업자 프로필 설정 */}
        <div className="card-box">
          <div className="card-box-header">
            <div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: '900' }}>🏢 내 사업자(공급자) 정보 관리</h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                거래명세서, 견적서, 청구서 상단에 인쇄되는 사업자 공급자 정보 및 로그인 비밀번호입니다.
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveSupplierProfile} style={{ padding: '1.25rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">상호(사업자명) *</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">대표자 성명 *</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.person}
                  onChange={(e) => setForm({ ...form, person: e.target.value })}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">사업자등록번호</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="000-00-00000"
                  value={form.bizno}
                  onChange={(e) => setForm({ ...form, bizno: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">대표 전화번호</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="010-0000-0000"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">사업장 주소</label>
              <input
                type="text"
                className="form-input"
                value={form.addr}
                onChange={(e) => setForm({ ...form, addr: e.target.value })}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">이메일</label>
                <input
                  type="email"
                  className="form-input"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">입금 계좌번호 (은행 / 예금주)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="예: 기업은행 123-456-789012 (예금주: 홍길동)"
                  value={form.bank}
                  onChange={(e) => setForm({ ...form, bank: e.target.value })}
                />
              </div>
            </div>

            {/* 대표자 직인 / 도장 등록 */}
            <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '0.875rem', marginTop: '0.5rem' }}>
              <label className="form-label" style={{ fontWeight: '800', color: '#dc2626', marginBottom: '0.5rem' }}>
                🔴 대표자 직인 / 도장 파일 (명세서 출력 시 대표자명 (인) 자리에 자동 날인)
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <div
                  style={{
                    width: '84px',
                    height: '84px',
                    border: '2px dashed #cbd5e1',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#f8fafc',
                    position: 'relative',
                    overflow: 'hidden',
                    flexShrink: 0
                  }}
                >
                  {form.stamp_image ? (
                    <img
                      src={form.stamp_image}
                      alt="직인 미리보기"
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  ) : (
                    <div style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'center', fontWeight: '700' }}>
                      도장 없음<br /><span style={{ fontSize: '9px' }}>(인영 미등록)</span>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: '220px' }}>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <label
                      className="btn btn-outline"
                      style={{
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: '700',
                        color: '#1d4ed8',
                        borderColor: '#bfdbfe',
                        backgroundColor: '#eff6ff',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px'
                      }}
                    >
                      📁 {form.stamp_image ? '도장 이미지 변경' : '도장 이미지 파일 선택 (PNG/JPG)'}
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            try {
                              const dataUrl = await compressImageFile(file, 300);
                              setForm({ ...form, stamp_image: dataUrl, hasStamp: true });
                            } catch (err) {
                              alert('도장 이미지 처리 실패: ' + err.message);
                            }
                          }
                        }}
                      />
                    </label>
                    {form.stamp_image && (
                      <button
                        type="button"
                        className="btn btn-outline"
                        style={{ fontSize: '11px', color: '#dc2626', borderColor: '#fca5a5', padding: '4px 8px' }}
                        onClick={() => setForm({ ...form, stamp_image: '', hasStamp: false })}
                      >
                        🗑️ 도장 삭제
                      </button>
                    )}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', lineHeight: '1.4' }}>
                    * 배경이 투명한 PNG 이미지 권장<br />
                    * 거래명세서, 견적서, 청구서 작성 및 출력 시 대표자 이름 뒤 <b>(인)</b> 자리에 자동으로 날인됩니다.
                  </div>
                </div>
              </div>
            </div>

            {/* 로그인 비밀번호 설정 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', borderTop: '1px dashed var(--border-color)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: '800', color: '#1d4ed8' }}>
                  🔑 내 로그인 접속 비밀번호 (4자리 숫자)
                </label>
                <input
                  type="text"
                  maxLength={4}
                  className="form-input"
                  style={{ fontFamily: 'monospace', letterSpacing: '2px', fontWeight: 'bold', width: '160px' }}
                  placeholder="0000"
                  value={form.pwd || ''}
                  onChange={(e) => setForm({ ...form, pwd: e.target.value.replace(/[^0-9]/g, '') })}
                />
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>
                  스플래시 화면에서 내 사업자 선택 시 입력할 4자리 비밀번호입니다.
                </span>
              </div>
              <div className="form-group" />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
              {saveSuccess && (
                <span style={{ color: 'var(--accent-green)', fontWeight: '700', fontSize: '0.8125rem', display: 'flex', alignItems: 'center' }}>
                  ✓ 사업자 정보 및 비밀번호가 성공적으로 저장되었습니다!
                </span>
              )}
              <button type="submit" className="btn btn-primary">
                사업자 정보 및 비밀번호 저장
              </button>
            </div>
          </form>
        </div>

        {/* 2. 관리자 전용: 전체 공급자 관리 & 비밀번호 제어 카드 */}
        {isUserAdmin && (
          <div className="card-box" style={{ border: '1.5px solid #2563eb', boxShadow: '0 4px 15px rgba(37, 99, 235, 0.08)' }}>
            <div className="card-box-header" style={{ backgroundColor: 'rgba(37, 99, 235, 0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.25rem' }}>👑</span>
                <div>
                  <h2 style={{ fontSize: '1.125rem', fontWeight: '900', color: '#1e40af' }}>전체 공급자 관리 & 비밀번호 제어</h2>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    등록된 모든 사업자의 접속 비밀번호를 일괄 확인하고 관리할 수 있습니다.
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ fontSize: '0.75rem', borderColor: '#cbd5e1', color: '#334155' }}
                  onClick={handleOpenAdminPwdChange}
                >
                  🔑 관리자 비번 변경
                </button>
                {onNavigateToSuppliers && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ fontSize: '0.75rem' }}
                    onClick={onNavigateToSuppliers}
                  >
                    🏢 공급자 전체 상세관리 열기 →
                  </button>
                )}
              </div>
            </div>

            <div style={{ padding: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.75rem' }}>
                {suppliersList.map(s => {
                  const sPwd = s.pwd || localStorage.getItem('dd_pwd_' + s.id) || '0000';
                  return (
                    <div key={s.id} style={{ padding: '0.75rem 1rem', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#f8fafc' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <strong style={{ fontSize: '0.875rem', color: '#0f172a' }}>{s.name || s.company}</strong>
                        <span style={{ fontSize: '0.75rem', padding: '2px 8px', backgroundColor: '#dbeafe', color: '#1e40af', borderRadius: '4px', fontFamily: 'monospace', fontWeight: 'bold' }}>
                          PW: {sPwd}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        <div>대표: {s.person || s.owner || '-'}</div>
                        <div>연락처: {s.phone || s.tel || '-'}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 3. 데이터 보안 및 공개 범위 설정 */}
        <div className="card-box">
          <div className="card-box-header">
            <h2 style={{ fontSize: '1.125rem', fontWeight: '900' }}>🔒 데이터 보안 및 공개 범위 설정</h2>
          </div>
          <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ padding: '0.875rem 1rem', backgroundColor: 'var(--bg-muted)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: '800', fontSize: '0.875rem' }}>고객 거래명세서 / 회계 / 미수금 데이터</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>사업자별 완전 비공개 격리 원칙 (타 사업자 열람 절대 불가)</div>
              </div>
              <span className="priority-pill urgent" style={{ fontSize: '0.75rem', padding: '4px 8px' }}>
                🔒 강제 비공개 (안전)
              </span>
            </div>

            <div style={{ padding: '0.875rem 1rem', backgroundColor: 'var(--bg-muted)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: '800', fontSize: '0.875rem' }}>정비 및 예약 일정 공개 여부</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>개별 일정 생성 시 [공유 일정] 체크박스로 선택적 공개 가능</div>
              </div>
              <span style={{ fontSize: '0.75rem', backgroundColor: 'var(--accent-blue-bg)', color: 'var(--accent-blue)', padding: '4px 8px', borderRadius: '4px', fontWeight: '800' }}>
                🌐 선택적 공개 지원
              </span>
            </div>
          </div>
        </div>

        {/* 4. 클라우드 데이터베이스 및 API 설정 (관리자 전용 제어) */}
        {isUserAdmin ? (
          <div className="card-box" style={{ border: '1.5px solid #ca8a04', boxShadow: '0 4px 15px rgba(202, 138, 4, 0.1)' }}>
            <div className="card-box-header" style={{ backgroundColor: 'rgba(254, 240, 138, 0.25)', borderBottom: '1px solid rgba(202, 138, 4, 0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '1.25rem' }}>👑</span>
                <h2 style={{ fontSize: '1.125rem', fontWeight: '900', color: '#854d0e' }}>시스템 관리자 설정 (DB & AI API)</h2>
                <span className={`status-badge ${isConnected ? 'connected' : 'disconnected'}`}>
                  {isConnected ? '🟢 클라우드 동기화 완료' : '🔴 로컬 모드 (오프라인)'}
                </span>
              </div>
              <button
                type="button"
                className="btn btn-outline"
                style={{ fontSize: '0.75rem', borderColor: '#ca8a04', color: '#854d0e' }}
                onClick={handleResetToDefaults}
              >
                기본 서버 주소로 복원
              </button>
            </div>

            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Supabase DB 설정 */}
              <div>
                <h3 style={{ fontSize: '0.9375rem', fontWeight: '800', color: '#1e293b', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  ☁️ 클라우드 DB (Supabase) 연동
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label">Supabase Project URL</label>
                    <input
                      type="text"
                      className="form-input"
                      value={supabaseUrl}
                      onChange={(e) => setSupabaseUrl(e.target.value)}
                      placeholder="https://your-project.supabase.co"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Supabase Anon Key</label>
                    <input
                      type="password"
                      className="form-input"
                      value={supabaseKey}
                      onChange={(e) => setSupabaseKey(e.target.value)}
                      placeholder="sb_publishable_..."
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => onTestConnection && onTestConnection(supabaseUrl, supabaseKey)}
                      disabled={isTesting}
                    >
                      {isTesting ? '연결 테스트 중...' : '⚡ 연결 테스트 및 즉시 동기화'}
                    </button>

                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={handleCopySQL}
                    >
                      {copiedSQL ? '✓ SQL 클립보드 복사 완료!' : '📋 Supabase 테이블 생성 SQL 복사'}
                    </button>
                  </div>

                  {connectionMessage && (
                    <div style={{ fontSize: '0.8125rem', color: isConnected ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: '700', marginTop: '0.25rem' }}>
                      {connectionMessage}
                    </div>
                  )}
                </div>
              </div>

              {/* Gemini Vision OCR AI API 설정 */}
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1rem', marginTop: '0.5rem' }}>
                <h3 style={{ fontSize: '0.9375rem', fontWeight: '800', color: '#1e293b', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  🤖 Google Gemini Vision OCR AI 키 설정
                </h3>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                  명함 및 사업자등록증 초고속 이미지 인식에 사용되는 Google Gemini API 키입니다.
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="AIzaSy... (미입력 시 기본 내장 키 작동)"
                    value={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleSaveGeminiKey}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    AI 키 저장
                  </button>
                </div>
                {geminiSaved && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--accent-green)', fontWeight: '700', marginTop: '4px' }}>
                    ✓ Gemini API 키가 성공적으로 저장되었습니다!
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="card-box">
            <div className="card-box-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h2 style={{ fontSize: '1.125rem', fontWeight: '900' }}>☁️ 클라우드 DB 연동 상태</h2>
                <span className={`status-badge ${isConnected ? 'connected' : 'disconnected'}`}>
                  {isConnected ? '🟢 클라우드 정상 연동 중' : '🔴 로컬 모드 (오프라인)'}
                </span>
              </div>
            </div>
            <div style={{ padding: '1.25rem', color: 'var(--text-muted)', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🔒</span>
              <span>데이터베이스 접속 주소, 보안 키 및 AI API 설정은 <strong>시스템 관리자(Admin)</strong> 전용 제어 항목입니다.</span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
