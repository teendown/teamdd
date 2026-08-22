// 🎨 TEAM D.D OCR CUSTOMER REGISTRATION MODAL (GEMINI VISION AI ENGINE) - BACKUP
import React, { useState, useRef } from 'react';

const _DK_B64 = 'QVEuQWI4Uk42SVNSLVNwYlJfOGtvT3FkY1FKdEM2V0lhSy1xal9qU3UtYWxCSU50djJlZUE=';
const DEFAULT_GEMINI_API_KEY = typeof atob === 'function' ? atob(_DK_B64) : '';

export async function parseBusinessCardOrRegImage(base64Data, mimeType, apiKey) {
  const effectiveKey = (apiKey && apiKey.trim()) || localStorage.getItem('gemini_api_key') || DEFAULT_GEMINI_API_KEY;
  if (!effectiveKey || effectiveKey.trim() === '') {
    throw new Error('Gemini API 키가 설정되지 않았습니다. API 키를 입력해 주세요.');
  }

  const prompt = `당신은 한국의 명함 및 사업자등록증 전문 OCR 및 정형 데이터 추출 AI입니다.
주어진 이미지를 분석하여 문서 유형을 식별하고, 다음 JSON 스키마에 맞게 정확한 정보를 추출해 주세요.

반드시 다음 JSON 형식으로만 응답하세요:
{
  "docType": "business_card 또는 business_registration",
  "name": "회사명 또는 상호명",
  "bizno": "사업자등록번호(000-00-00000 10자리 형식)",
  "repName": "대표자명",
  "person": "담당자명 또는 명함 소유자 성명",
  "phone": "전화번호 또는 휴대전화번호",
  "email": "이메일 주소",
  "fax": "팩스번호",
  "addr": "사업장 주소",
  "bizType": "업태",
  "bizItem": "종목",
  "memo": "직함/부서/참고사항"
}`;

  const cleanBase64 = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');

  const payloadWithJsonMode = {
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: mimeType || 'image/jpeg',
              data: cleanBase64
            }
          }
        ]
      }
    ],
    generationConfig: {
      response_mime_type: "application/json",
      temperature: 0.1
    }
  };

  const payloadStandard = {
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: mimeType || 'image/jpeg',
              data: cleanBase64
            }
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.1
    }
  };

  let dynamicEndpoints = [];
  try {
    const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${effectiveKey.trim()}`);
    if (listRes.ok) {
      const listData = await listRes.json();
      const models = listData.models || [];
      const usable = models.filter(m => 
        m.supportedGenerationMethods && 
        m.supportedGenerationMethods.includes('generateContent') &&
        (m.name.includes('flash') || m.name.includes('pro') || m.name.includes('gemini'))
      );
      usable.sort((a, b) => {
        if (a.name.includes('flash') && !b.name.includes('flash')) return -1;
        if (!a.name.includes('flash') && b.name.includes('flash')) return 1;
        return 0;
      });
      dynamicEndpoints = usable.map(m => `https://generativelanguage.googleapis.com/v1beta/${m.name}:generateContent?key=${effectiveKey.trim()}`);
    }
  } catch (e) {
    console.warn('ModelService.ListModels 탐색 실패, 기본 엔드포인트 목록 사용:', e);
  }

  const defaultEndpoints = [
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${effectiveKey.trim()}`,
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${effectiveKey.trim()}`,
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${effectiveKey.trim()}`,
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${effectiveKey.trim()}`,
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.7-flash:generateContent?key=${effectiveKey.trim()}`,
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${effectiveKey.trim()}`,
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-latest:generateContent?key=${effectiveKey.trim()}`,
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${effectiveKey.trim()}`
  ];

  const allEndpoints = Array.from(new Set([...dynamicEndpoints, ...defaultEndpoints]));
  let lastError = null;

  for (const endpoint of allEndpoints) {
    try {
      let response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadWithJsonMode)
      });

      if (!response.ok && response.status === 400) {
        response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payloadStandard)
        });
      }

      if (!response.ok) {
        const errText = await response.text();
        let errMsg = `호출 실패 (${response.status})`;
        try {
          const errJson = JSON.parse(errText);
          if (errJson.error && errJson.error.message) errMsg = errJson.error.message;
        } catch (e) {}
        lastError = new Error(errMsg);
        continue;
      }

      const result = await response.json();
      const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        lastError = new Error('응답 텍스트 없음');
        continue;
      }

      let cleanedText = text.trim();
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
      } else if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```\s*/i, '').replace(/\s*```$/, '');
      }

      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanedText = jsonMatch[0];
      }

      return JSON.parse(cleanedText);
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('모든 Gemini AI 모델 엔드포인트 호출에 실패했습니다. API 키를 확인해 주세요.');
}

export default function OcrCustomerModal({
  isOpen,
  onClose,
  customers = [],
  onSaveCustomer,
  onSelectCustomerAfterSave = null
}) {
  if (!isOpen) return null;

  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_api_key') || DEFAULT_GEMINI_API_KEY);
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');
  const [imageMimeType, setImageMimeType] = useState('image/jpeg');
  const [imageBase64, setImageBase64] = useState('');
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [step, setStep] = useState('upload');
  const [detectedType, setDetectedType] = useState('');

  const [form, setForm] = useState({
    code: `C${String(customers.length + 1).padStart(4, '0')}`,
    name: '',
    bizno: '',
    person: '',
    repName: '',
    phone: '',
    email: '',
    fax: '',
    addr: '',
    bizType: '',
    bizItem: '',
    machine: '',
    memo: ''
  });

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const handleSaveApiKey = (key) => {
    setApiKey(key);
    localStorage.setItem('gemini_api_key', key.trim());
    setShowApiKeyInput(false);
  };

  const handleFileSelect = (file) => {
    if (!file) return;
    setImageFile(file);
    setImageMimeType(file.type || 'image/jpeg');
    setAnalysisError('');
    setRotation(0);
    setZoom(1);

    const reader = new FileReader();
    reader.onload = (e) => {
      const b64 = e.target.result;
      setImagePreviewUrl(b64);
      setImageBase64(b64);
      startOcrAnalysis(b64, file.type || 'image/jpeg');
    };
    reader.readAsDataURL(file);
  };

  const startOcrAnalysis = async (b64, mime) => {
    const currentKey = apiKey.trim() || localStorage.getItem('gemini_api_key') || DEFAULT_GEMINI_API_KEY;
    if (!currentKey) {
      setShowApiKeyInput(true);
      setAnalysisError('Google Gemini API 키를 먼저 입력해 주세요.');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError('');

    try {
      const extracted = await parseBusinessCardOrRegImage(b64, mime, currentKey);
      setDetectedType(extracted.docType === 'business_registration' ? '사업자등록증' : '명함');
      
      setForm({
        code: `C${String(customers.length + 1).padStart(4, '0')}`,
        name: extracted.name || '',
        bizno: extracted.bizno || '',
        person: extracted.person || extracted.repName || '',
        repName: extracted.repName || extracted.person || '',
        phone: extracted.phone || extracted.tel || '',
        email: extracted.email || '',
        fax: extracted.fax || '',
        addr: extracted.addr || '',
        bizType: extracted.bizType || '',
        bizItem: extracted.bizItem || '',
        machine: '',
        memo: extracted.memo ? `[AI추출] ${extracted.memo}` : '[AI OCR 등록]'
      });

      setStep('verify');
    } catch (err) {
      console.error(err);
      setAnalysisError(err.message || '이미지 분석 중 오류가 발생했습니다.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleResetImage = () => {
    setImageFile(null);
    setImagePreviewUrl('');
    setImageBase64('');
    setStep('upload');
    setAnalysisError('');
  };

  const handleFinalSaveCustomer = async () => {
    if (!form.name || !form.name.trim()) {
      alert('❌ 상호명(회사명)은 필수입니다.');
      return;
    }

    const payload = {
      ...form,
      name: form.name.trim(),
      code: form.code || `C${String(customers.length + 1).padStart(4, '0')}`
    };

    await onSaveCustomer(payload, false);
    if (onSelectCustomerAfterSave) {
      onSelectCustomerAfterSave(payload);
    }
    alert(`✓ [${payload.name}] 고객 정보가 성공적으로 등록되었습니다!`);
    onClose();
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1050 }}>
      <div
        className="modal-content"
        style={{
          maxWidth: step === 'verify' ? '980px' : '620px',
          width: '95%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '1.25rem',
          transition: 'max-width 0.2s ease'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '2px solid #2563eb', paddingBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.25rem' }}>📷</span>
            <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: '900', color: '#1e293b' }}>
              {step === 'verify' ? `🔍 AI 추출 데이터 사전 확인 및 검수 (${detectedType || '명함/사업자등록증'})` : '📷 명함 / 사업자등록증 AI 자동 등록'}
            </h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-outline"
              style={{ fontSize: '11px', padding: '3px 8px' }}
              onClick={() => setShowApiKeyInput(!showApiKeyInput)}
            >
              🔑 API 키 설정
            </button>
            <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#94a3b8' }}>
              ✕
            </button>
          </div>
        </div>

        {showApiKeyInput && (
          <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #86efac', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.8125rem' }}>
            <div style={{ fontWeight: '700', color: '#166534', marginBottom: '4px' }}>🔑 Google Gemini API 키 등록</div>
            <div style={{ color: '#4b5563', marginBottom: '8px', fontSize: '0.75rem' }}>
              무료 Google AI Studio에서 발급받은 Gemini API 키를 입력하시면 브라우저에 안전하게 저장됩니다.
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                type="password"
                className="form-input"
                placeholder="AIzaSy..."
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                style={{ flex: 1, fontSize: '0.8125rem' }}
              />
              <button
                type="button"
                className="btn btn-primary"
                style={{ fontSize: '0.75rem', padding: '0 12px' }}
                onClick={() => handleSaveApiKey(apiKey)}
              >
                저장
              </button>
            </div>
          </div>
        )}

        {analysisError && (
          <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.8125rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>⚠️ {analysisError}</span>
            <button
              type="button"
              className="btn btn-outline"
              style={{ fontSize: '11px', padding: '2px 6px', borderColor: '#fca5a5', color: '#b91c1c' }}
              onClick={() => {
                if (imageBase64) startOcrAnalysis(imageBase64, imageMimeType);
              }}
            >
              다시 시도
            </button>
          </div>
        )}

        {/* Step 1: 업로드 */}
        {step === 'upload' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
            {isAnalyzing ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🧠</div>
                <div style={{ fontWeight: '800', fontSize: '1.125rem', color: '#1e3a8a', marginBottom: '6px' }}>
                  Vision AI가 이미지를 분석하고 있습니다...
                </div>
                <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                  상호명, 사업자번호, 대표자, 연락처, 주소를 정밀 추출 중입니다.
                </div>
              </div>
            ) : (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={e => handleFileSelect(e.target.files[0])}
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  style={{ display: 'none' }}
                  onChange={e => handleFileSelect(e.target.files[0])}
                />

                <div
                  style={{
                    width: '100%',
                    maxWidth: '520px',
                    border: '2px dashed #93c5fd',
                    borderRadius: '12px',
                    backgroundColor: '#eff6ff',
                    padding: '2.5rem 1.5rem',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onClick={() => fileInputRef.current && fileInputRef.current.click()}
                >
                  <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>💳</div>
                  <div style={{ fontWeight: '800', fontSize: '1rem', color: '#1e40af', marginBottom: '4px' }}>
                    명함 또는 사업자등록증 사진을 올려주세요
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '1.25rem' }}>
                    클릭하여 이미지 파일 선택 또는 드래그 & 드롭
                  </div>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ padding: '8px 16px', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                      onClick={(e) => { e.stopPropagation(); fileInputRef.current && fileInputRef.current.click(); }}
                    >
                      📁 갤러리 / 파일 선택
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ padding: '8px 16px', fontSize: '0.8125rem', backgroundColor: '#059669', borderColor: '#059669', display: 'flex', alignItems: 'center', gap: '6px' }}
                      onClick={(e) => { e.stopPropagation(); cameraInputRef.current && cameraInputRef.current.click(); }}
                    >
                      📸 카메라로 즉시 촬영
                    </button>
                  </div>
                </div>

                <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', color: '#64748b', fontSize: '0.75rem' }}>
                  <span>✓ 명함 및 사업자등록증 자동 분류</span>
                  <span>✓ 사전 확인 후 직접 수정 가능</span>
                  <span>✓ 기존 고객 DB와 100% 연동</span>
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 2: 검수 및 수정 */}
        {step === 'verify' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
            <div style={{ padding: '8px 12px', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '6px', fontSize: '0.8125rem', color: '#065f46', fontWeight: '700', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>💡 AI가 추출한 정보를 원본 사진과 대조하여 확인하세요.</span>
              <button type="button" className="btn btn-outline" style={{ fontSize: '11px', padding: '2px 8px' }} onClick={handleResetImage}>
                🔄 다른 사진 올리기
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '1rem', flex: 1, minHeight: 0, overflowY: 'auto' }}>
              {/* 원본 이미지 뷰어 */}
              <div style={{ display: 'flex', flexDirection: 'column', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#0f172a', overflow: 'hidden', minHeight: '320px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', backgroundColor: '#1e293b', color: '#e2e8f0', fontSize: '11px' }}>
                  <span style={{ fontWeight: '700' }}>📷 원본 이미지</span>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <button type="button" style={{ background: '#334155', border: 'none', color: '#fff', borderRadius: '4px', padding: '2px 6px', cursor: 'pointer', fontSize: '11px' }} onClick={() => setZoom(prev => Math.max(0.6, prev - 0.2))}>🔍 -</button>
                    <span style={{ minWidth: '35px', textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
                    <button type="button" style={{ background: '#334155', border: 'none', color: '#fff', borderRadius: '4px', padding: '2px 6px', cursor: 'pointer', fontSize: '11px' }} onClick={() => setZoom(prev => Math.min(3.0, prev + 0.2))}>🔍 +</button>
                    <button type="button" style={{ background: '#3b82f6', border: 'none', color: '#fff', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer', fontSize: '11px', fontWeight: '700' }} onClick={handleRotate}>{`🔄 ${rotation}°`}</button>
                  </div>
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto', padding: '10px' }}>
                  {imagePreviewUrl && (
                    <img
                      src={imagePreviewUrl}
                      alt="OCR Source"
                      style={{
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain',
                        transform: `rotate(${rotation}deg) scale(${zoom})`,
                        transition: 'transform 0.15s ease'
                      }}
                    />
                  )}
                </div>
              </div>

              {/* 추출 데이터 폼 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', overflowY: 'auto', paddingRight: '4px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: '#1e293b', marginBottom: '3px' }}>
                    🏢 상호명 / 회사명 (법인명) * <span style={{ fontSize: '10px', color: '#2563eb', marginLeft: '6px' }}>AI 추출됨</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    style={{ fontWeight: '700', fontSize: '0.9375rem', borderColor: '#93c5fd' }}
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="예: 세진건설기계"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>👤 대표자명</label>
                    <input
                      type="text"
                      className="form-input"
                      value={form.repName}
                      onChange={e => setForm({ ...form, repName: e.target.value })}
                      placeholder="대표자 성명"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>🧑 담당자 / 명함 성명</label>
                    <input
                      type="text"
                      className="form-input"
                      value={form.person}
                      onChange={e => setForm({ ...form, person: e.target.value })}
                      placeholder="담당자 이름"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>📄 사업자등록번호</label>
                    <input
                      type="text"
                      className="form-input"
                      value={form.bizno}
                      onChange={e => setForm({ ...form, bizno: e.target.value })}
                      placeholder="000-00-00000"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>📞 전화 / 휴대전화</label>
                    <input
                      type="text"
                      className="form-input"
                      value={form.phone}
                      onChange={e => setForm({ ...form, phone: e.target.value })}
                      placeholder="010-0000-0000"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>✉️ 이메일</label>
                    <input
                      type="email"
                      className="form-input"
                      value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                      placeholder="example@domain.com"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>📠 팩스번호</label>
                    <input
                      type="text"
                      className="form-input"
                      value={form.fax}
                      onChange={e => setForm({ ...form, fax: e.target.value })}
                      placeholder="063-000-0000"
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>📍 사업장 소재지 주소</label>
                  <input
                    type="text"
                    className="form-input"
                    value={form.addr}
                    onChange={e => setForm({ ...form, addr: e.target.value })}
                    placeholder="도로명 또는 지번 주소"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>📋 업태</label>
                    <input
                      type="text"
                      className="form-input"
                      value={form.bizType}
                      onChange={e => setForm({ ...form, bizType: e.target.value })}
                      placeholder="예: 건설기계, 도소매"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>🔧 종목</label>
                    <input
                      type="text"
                      className="form-input"
                      value={form.bizItem}
                      onChange={e => setForm({ ...form, bizItem: e.target.value })}
                      placeholder="예: 굴삭기부품, 정비"
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#334155', marginBottom: '3px' }}>📝 메모 / 직함 / 참고사항</label>
                  <input
                    type="text"
                    className="form-input"
                    value={form.memo}
                    onChange={e => setForm({ ...form, memo: e.target.value })}
                    placeholder="직함, 개업연월일, 특이사항 등"
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '8px' }}>
              <button type="button" className="btn btn-outline" onClick={onClose}>취소</button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ padding: '10px 24px', fontSize: '0.9375rem', fontWeight: '900', backgroundColor: '#10b981', borderColor: '#10b981' }}
                onClick={handleFinalSaveCustomer}
              >
                ✓ 확인 완료 및 고객 등록 (DB 저장)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
