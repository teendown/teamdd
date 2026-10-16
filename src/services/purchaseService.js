// 🎨 TEAM D.D PURCHASE INVOICE SERVICE & AI VISION OCR PARSER
import { dbSave, dbFetch, dbDelete } from '../api/supabaseClient.js';
import { STORAGE_KEYS } from '../config/constants.js';

const _DK_B64 = 'QVEuQWI4Uk42SVNSLVNwYlJfOGtvT3FkY1FKdEM2V0lhSy1xal9qU3UtYWxCSU50djJlZUE=';
const DEFAULT_GEMINI_API_KEY = typeof atob === 'function' ? atob(_DK_B64) : '';

/**
 * 📷 전표 이미지/PDF 최적화 및 압축 (가로세로 최대 1600px)
 */
export async function compressInvoiceImage(file, maxDimension = 1600, quality = 0.88) {
  if (!file) throw new Error('파일이 제공되지 않았습니다.');

  const isPdf = file.type === 'application/pdf' || file.name?.toLowerCase().endsWith('.pdf');

  // 1. PDF 파일인 경우: PDF.js로 첫 페이지 캔버스 렌더링
  if (isPdf && window.pdfjsLib) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const page = await pdf.getPage(1);
      
      const viewport = page.getViewport({ scale: 2.0 }); // 고해상도 렌더링
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({ canvasContext: ctx, viewport }).promise;

      // 리사이징 (필요 시)
      let finalCanvas = canvas;
      if (canvas.width > maxDimension || canvas.height > maxDimension) {
        let w = canvas.width;
        let h = canvas.height;
        if (w > h) {
          h = Math.round((h * maxDimension) / w);
          w = maxDimension;
        } else {
          w = Math.round((w * maxDimension) / h);
          h = maxDimension;
        }
        const resized = document.createElement('canvas');
        resized.width = w;
        resized.height = h;
        const rctx = resized.getContext('2d');
        rctx.fillStyle = '#FFFFFF';
        rctx.fillRect(0, 0, w, h);
        rctx.drawImage(canvas, 0, 0, w, h);
        finalCanvas = resized;
      }

      const dataUrl = finalCanvas.toDataURL('image/jpeg', quality);
      const base64 = dataUrl.split(',')[1];
      return {
        dataUrl,
        base64,
        mimeType: 'image/jpeg',
        width: finalCanvas.width,
        height: finalCanvas.height,
        isPdf: true,
        pageCount: pdf.numPages
      };
    } catch (pdfErr) {
      console.warn('PDF.js rendering failed, fallback to standard reader:', pdfErr);
    }
  }

  // 2. 일반 이미지 파일(JPG, PNG 등)인 경우
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        const base64 = dataUrl.split(',')[1];
        resolve({
          dataUrl,
          base64,
          mimeType: 'image/jpeg',
          width,
          height,
          isPdf: false
        });
      };
      img.onerror = () => reject(new Error('전표 이미지 로딩에 실패했습니다.'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('파일을 읽는 도중 오류가 발생했습니다.'));
    reader.readAsDataURL(file);
  });
}

/**
 * 🤖 Gemini Vision AI를 통한 매입전표 / 거래명세표 / 영수증 정밀 OCR 파싱
 */
export async function parsePurchaseInvoiceImage(base64Data, mimeType = 'image/jpeg', apiKey = null) {
  const effectiveKey = (apiKey && apiKey.trim()) || localStorage.getItem('gemini_api_key') || DEFAULT_GEMINI_API_KEY;
  if (!effectiveKey || effectiveKey.trim() === '') {
    throw new Error('Gemini API 키가 설정되지 않았습니다. [설정] 탭에서 Gemini API 키를 먼저 입력해 주세요.');
  }

  const prompt = `당신은 한국의 건설기계/부품 거래명세서, 매입전표, 세금계산서, 간이영수증 전문 정형 데이터 추출 AI입니다.
주어진 전표 이미지를 정밀 분석하여 매입처(물건을 판매한 공급자) 정보와 상세 품목(Line Items) 리스트를 완벽하게 추출해 주세요.

규칙:
1. vendor_name: 거래명세서 상의 '공급자' 상호(회사명). (공급받는자가 아니라 물건을 판 업체여야 합니다)
2. vendor_bizno: 공급자의 사업자등록번호 (000-00-00000 형태).
3. invoice_date: 거래일자/작성일자 (YYYY-MM-DD 형식, 연도가 생략된 경우 올해 연도 적용).
4. items: 전표 내 품목 목록 테이블의 각 행을 배열로 추출:
   - part_no: 부품번호, 품번, 부품코드, P/N, 도번 (영문/숫자 코드, 하이픈 포함).
     * 필독: 전표 테이블에 '부품번호', '품번', 'Part No', 'P/N', 'Item Code', '도번', '코드' 열이 있다면 해당 열의 영문/숫자 코드를 절대 빠뜨리지 말고 추출하세요.
     * 필독: 만약 별도의 부품번호 열이 없더라도 품명란에 영문/숫자 코드(예: 'VOE14532101 HUB', '1453-2101', '14532101 씰' 등)가 함께 적혀 있다면, 영문/숫자 부품코드를 분리하여 part_no에 넣고 name에는 순수 품명을 넣으세요. 없으면 ""
   - name: 품목명 (순수 부품명, 한글/영문 품명)
   - spec: 규격/모델명 (없으면 "")
   - qty: 수량 (숫자, 기본값 1)
   - unit_price: 단가 (숫자, 콤마 제외)
   - amount: 공급가액 또는 금액 (숫자, 콤마 제외)
   - memo: 비고 또는 특이사항
5. total_amount: 총 합계금액 (숫자)
6. supply_amount: 공급가액 합계 (숫자)
7. vat_amount: 부가세 합계 (숫자, 없으면 0)
8. memo: 전표 하단 메모, 은행 계좌번호 등 참고사항

반드시 오직 유효한 JSON 형식으로만 응답하세요. 백틱(\`\`\`)이나 마크다운 설명 없이 순수 JSON만 출력하세요:
{
  "vendor_name": "상호명",
  "vendor_bizno": "000-00-00000",
  "invoice_date": "2026-09-14",
  "total_amount": 110000,
  "supply_amount": 100000,
  "vat_amount": 10000,
  "items": [
    {
      "part_no": "VOE14532101",
      "name": "유압호스 1/2",
      "spec": "2W-08",
      "qty": 2,
      "unit_price": 25000,
      "amount": 50000,
      "memo": ""
    }
  ],
  "memo": ""
}`;

  const cleanBase64 = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');

  const payload = {
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
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${effectiveKey.trim()}`,
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${effectiveKey.trim()}`,
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${effectiveKey.trim()}`,
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-latest:generateContent?key=${effectiveKey.trim()}`,
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${effectiveKey.trim()}`
  ];

  const allEndpoints = Array.from(new Set([...dynamicEndpoints, ...defaultEndpoints]));
  let lastError = null;

  for (const url of allEndpoints) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        const errMsg = errJson?.error?.message || `HTTP ${response.status}`;
        lastError = new Error(`${errMsg}`);
        continue;
      }

      const resData = await response.json();
      const rawText = resData?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) throw new Error('AI 응답 내용이 비어 있습니다.');

      // JSON 파싱
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('AI 응답에서 JSON 데이터를 찾을 수 없습니다.');

      const parsed = JSON.parse(jsonMatch[0]);
      return {
        vendor_name: parsed.vendor_name || '',
        vendor_bizno: parsed.vendor_bizno || '',
        invoice_date: parsed.invoice_date || new Date().toISOString().split('T')[0],
        total_amount: Number(parsed.total_amount) || 0,
        supply_amount: Number(parsed.supply_amount) || 0,
        vat_amount: Number(parsed.vat_amount) || 0,
        items: Array.isArray(parsed.items) ? parsed.items.map(it => ({
          part_no: (it.part_no || it.code || it.part_number || it.partNo || '').trim(),
          name: it.name || '',
          spec: it.spec || '',
          qty: Number(it.qty) || 1,
          unit_price: Number(it.unit_price) || 0,
          amount: Number(it.amount) || ((Number(it.qty) || 1) * (Number(it.unit_price) || 0)),
          memo: it.memo || ''
        })) : [],
        memo: parsed.memo || ''
      };
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('전표 분석에 실패했습니다. Gemini API 키와 네트워크를 확인해 주세요.');
}
