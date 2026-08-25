// 🎨 TEAM D.D EXPORT UTILITIES (HTML2CANVAS, JSPDF, NATIVE EXCELJS .XLSX, CLIPBOARD & SHARE)

export async function exportPagesToPNG(pagesOrPrefix, maybePrefix, attachments = []) {
  let pages = [];
  let prefix = '명세서';

  if (typeof pagesOrPrefix === 'string') {
    prefix = pagesOrPrefix;
    pages = Array.from(document.querySelectorAll('.document-page'));
  } else if (pagesOrPrefix && (pagesOrPrefix instanceof NodeList || Array.isArray(pagesOrPrefix))) {
    pages = Array.from(pagesOrPrefix).filter(el => el && el.nodeType === 1);
    if (typeof maybePrefix === 'string') prefix = maybePrefix;
  } else if (pagesOrPrefix && pagesOrPrefix.nodeType === 1) {
    pages = [pagesOrPrefix];
    if (typeof maybePrefix === 'string') prefix = maybePrefix;
  } else {
    pages = Array.from(document.querySelectorAll('.document-page'));
    if (typeof maybePrefix === 'string') prefix = maybePrefix;
  }

  // 모달 또는 캔버스 대체 탐색
  if (pages.length === 0) {
    const fallback = document.querySelector('.doc-preview-body') || document.querySelector('.doc-preview-container') || document.querySelector('.preview-panel');
    if (fallback) pages = [fallback];
  }

  if (pages.length === 0) {
    alert('❌ 이미지로 저장할 문서 영역을 찾을 수 없습니다.');
    return false;
  }

  const html2canvas = window.html2canvas;
  if (!html2canvas) {
    alert('❌ 이미지 변환 라이브러리(html2canvas)가 준비되지 않았습니다. 잠시 후 다시 시도해 주세요.');
    return false;
  }

  const cleanPrefix = (prefix || '명세서').replace(/[/\\?%*:|"<>]/g, '_');

  try {
    for (let i = 0; i < pages.length; i++) {
      const canvas = await html2canvas(pages[i], {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false
      });

      const link = document.createElement('a');
      link.download = `${cleanPrefix}${pages.length > 1 ? `_${i + 1}페이지` : ''}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }

    // 첨부 서류 이미지 다운로드
    if (Array.isArray(attachments) && attachments.length > 0) {
      for (const att of attachments) {
        if (!att || !att.dataUrl) continue;
        const link = document.createElement('a');
        link.download = `${cleanPrefix}_${att.name || '첨부서류'}.png`;
        link.href = att.dataUrl;
        link.click();
      }
    }

    return true;
  } catch (err) {
    console.error('exportPagesToPNG Error:', err);
    alert('이미지 저장 중 오류가 발생했습니다: ' + (err.message || err));
    return false;
  }
}

export async function copyPageToClipboard(elementOrSelector) {
  let targetElement = null;
  if (typeof elementOrSelector === 'string') {
    targetElement = document.querySelector(elementOrSelector);
  } else if (elementOrSelector && elementOrSelector.nodeType === 1) {
    targetElement = elementOrSelector;
  } else {
    targetElement = document.querySelector('.document-page') || document.querySelector('.doc-preview-body') || document.querySelector('.preview-panel');
  }

  if (!targetElement) {
    alert('❌ 복사할 문서 영역을 찾을 수 없습니다.');
    return false;
  }

  const html2canvas = window.html2canvas;
  if (!html2canvas) throw new Error('html2canvas 라이브러리를 찾을 수 없습니다.');

  const canvas = await html2canvas(targetElement, {
    scale: 2,
    backgroundColor: '#ffffff',
    useCORS: true,
    logging: false
  });

  return new Promise((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        reject(new Error('이미지 생성에 실패했습니다.'));
        return;
      }
      try {
        if (navigator.clipboard && window.ClipboardItem) {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          alert('✓ 문서 이미지가 클립보드에 복사되었습니다! (원하는 곳에 Ctrl+V로 붙여넣기)');
          resolve(true);
        } else {
          reject(new Error('클립보드 이미지 복사를 지원하지 않는 브라우저입니다.'));
        }
      } catch (err) {
        reject(err);
      }
    }, 'image/png');
  });
}

export async function shareDocumentImage(elementOrTitle, maybeTitle = 'TEAM D.D 거래명세서', attachments = []) {
  let targetElement = null;
  let title = 'TEAM D.D 거래명세서';

  if (typeof elementOrTitle === 'string') {
    title = elementOrTitle;
    targetElement = document.querySelector('.document-page') || document.querySelector('.doc-preview-body') || document.querySelector('.preview-panel');
  } else if (elementOrTitle && elementOrTitle.nodeType === 1) {
    targetElement = elementOrTitle;
    if (typeof maybeTitle === 'string') title = maybeTitle;
  } else {
    targetElement = document.querySelector('.document-page') || document.querySelector('.doc-preview-body') || document.querySelector('.preview-panel');
    if (typeof maybeTitle === 'string') title = maybeTitle;
  }

  if (!targetElement) {
    alert('❌ 공유할 문서 화면을 찾을 수 없습니다.');
    return false;
  }

  const html2canvas = window.html2canvas;
  if (!html2canvas) {
    alert('❌ 이미지 변환 라이브러리(html2canvas)가 준비되지 않았습니다.');
    return false;
  }

  const cleanFileName = (title || '명세서').replace(/[/\\?%*:|"<>]/g, '_');

  try {
    const canvas = await html2canvas(targetElement, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false
    });

    return new Promise((resolve) => {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          alert('❌ 이미지 생성에 실패했습니다.');
          resolve(false);
          return;
        }

        const files = [new File([blob], `${cleanFileName}.png`, { type: 'image/png' })];

        // 첨부서류 이미지 파일들 추가
        if (Array.isArray(attachments) && attachments.length > 0) {
          for (const att of attachments) {
            if (!att || !att.dataUrl) continue;
            try {
              const res = await fetch(att.dataUrl);
              const attBlob = await res.blob();
              files.push(new File([attBlob], `${cleanFileName}_${att.name || '첨부'}.png`, { type: 'image/png' }));
            } catch (e) {
              console.warn('Attachment file convert error:', e);
            }
          }
        }

        // 스마트폰 모바일 브라우저 카톡/문자/인스타그램 등 다중 파일 공유 기능
        if (navigator.canShare && navigator.canShare({ files })) {
          try {
            await navigator.share({
              files: files,
              title: title,
              text: `[TEAM D.D] ${title}`
            });
            resolve(true);
            return;
          } catch (e) {
            if (e.name === 'AbortError') {
              resolve(false);
              return;
            }
            console.warn('Navigator share failed, falling back to download:', e);
          }
        }

        // PC 브라우저이거나 Web Share 미지원 환경인 경우: 사진 다운로드
        const link = document.createElement('a');
        link.download = `${cleanFileName}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();

        if (Array.isArray(attachments) && attachments.length > 0) {
          for (const att of attachments) {
            if (!att || !att.dataUrl) continue;
            const attLink = document.createElement('a');
            attLink.download = `${cleanFileName}_${att.name || '첨부'}.png`;
            attLink.href = att.dataUrl;
            attLink.click();
          }
        }

        alert('✓ 명세서 및 첨부 서류 이미지가 다운로드되었습니다. 카카오톡이나 문자메시지로 공유해 보세요!');
        resolve(true);
      }, 'image/png');
    });
  } catch (err) {
    console.error('shareDocumentImage Error:', err);
    alert('이미지 공유 생성 중 오류가 발생했습니다: ' + (err.message || err));
    return false;
  }
}

/**
 * 📄 TEAM D.D 스마트폰/PC PDF 파일 직접 공유 (카톡, 문자, 이메일) - 다중 페이지 첨부 서류 지원
 */
export async function shareDocumentPDF(elementOrTitle, maybeTitle = 'TEAM D.D 거래명세서', attachments = []) {
  let pages = [];
  let title = 'TEAM D.D 거래명세서';

  if (typeof elementOrTitle === 'string') {
    title = elementOrTitle;
    pages = Array.from(document.querySelectorAll('.document-page'));
  } else if (elementOrTitle && (elementOrTitle instanceof NodeList || Array.isArray(elementOrTitle))) {
    pages = Array.from(elementOrTitle).filter(el => el && el.nodeType === 1);
    if (typeof maybeTitle === 'string') title = maybeTitle;
  } else if (elementOrTitle && elementOrTitle.nodeType === 1) {
    pages = [elementOrTitle];
    if (typeof maybeTitle === 'string') title = maybeTitle;
  } else {
    pages = Array.from(document.querySelectorAll('.document-page'));
    if (typeof maybeTitle === 'string') title = maybeTitle;
  }

  if (pages.length === 0) {
    const fallback = document.querySelector('.doc-preview-body') || document.querySelector('.doc-preview-container') || document.querySelector('.preview-panel');
    if (fallback) pages = [fallback];
  }

  if (pages.length === 0) {
    alert('❌ PDF로 공유할 문서 영역을 찾을 수 없습니다.');
    return false;
  }

  const html2canvas = window.html2canvas;
  const jspdfObj = window.jspdf;
  if (!html2canvas || !jspdfObj) {
    alert('❌ PDF 변환 라이브러리가 준비되지 않았습니다. 인쇄 기능을 대신 이용해 주세요.');
    window.print();
    return false;
  }

  const cleanFileName = (title || '명세서').replace(/[/\\?%*:|"<>]/g, '_');

  try {
    const { jsPDF } = jspdfObj;
    const pdf = new jsPDF('p', 'mm', 'a4');

    // 1. 거래명세서 본문 페이지 렌더링
    for (let i = 0; i < pages.length; i++) {
      if (i > 0) pdf.addPage();
      const canvas = await html2canvas(pages[i], {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false
      });
      const imgData = canvas.toDataURL('image/png');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    }

    // 2. 첨부 서류 (사업자등록증, 통장사본 등) 다중 페이지 병합
    if (Array.isArray(attachments) && attachments.length > 0) {
      for (const att of attachments) {
        if (!att || !att.dataUrl) continue;
        pdf.addPage();

        const a4W = pdf.internal.pageSize.getWidth(); // 210mm
        const a4H = pdf.internal.pageSize.getHeight(); // 297mm
        const margin = 10;
        const maxW = a4W - (margin * 2);
        const maxH = a4H - (margin * 2) - 15;

        // 상단 제목
        pdf.setFontSize(13);
        pdf.setTextColor(30, 41, 59);
        pdf.text(`[첨부서류] ${att.name || '공급자 첨부서류'}`, margin, margin + 8);

        try {
          const imgProps = pdf.getImageProperties(att.dataUrl);
          let imgW = maxW;
          let imgH = (imgProps.height * maxW) / imgProps.width;

          if (imgH > maxH) {
            imgH = maxH;
            imgW = (imgProps.width * maxH) / imgProps.height;
          }

          const posX = margin + ((maxW - imgW) / 2);
          const posY = margin + 15 + ((maxH - imgH) / 2);

          pdf.addImage(att.dataUrl, 'PNG', posX, posY, imgW, imgH);
        } catch (imgErr) {
          console.warn('PDF Add Attachment Error:', imgErr);
        }
      }
    }

    const pdfBlob = pdf.output('blob');
    const pdfFile = new File([pdfBlob], `${cleanFileName}.pdf`, { type: 'application/pdf' });

    // 모바일 카톡/문자/메일 Web Share
    if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
      try {
        await navigator.share({
          files: [pdfFile],
          title: title,
          text: `[TEAM D.D] ${title}`
        });
        return true;
      } catch (e) {
        if (e.name === 'AbortError') {
          return false;
        }
        console.warn('Navigator PDF share failed, falling back to download:', e);
      }
    }

    // fallback: PC 브라우저 다운로드
    pdf.save(`${cleanFileName}.pdf`);
    alert('✓ PDF 문서 파일(첨부서류 포함)이 다운로드되었습니다. 카카오톡이나 이메일로 전송해 보세요!');
    return true;
  } catch (err) {
    console.error('shareDocumentPDF Error:', err);
    alert('PDF 공유 생성 중 오류가 발생했습니다: ' + (err.message || err));
    return false;
  }
}

/**
 * 📊 TEAM D.D Official Native .XLSX Exporter
 * (외부 굵은 테두리(medium) + 내부 일반 실선(thin) 대비, 우측 끝 테두리 완벽 마감)
 */
export async function exportDocumentToExcel({
  docType = '거래명세서',
  docNo = '',
  docDate = '',
  docTime = '',
  supplier = {},
  customer = {},
  items = [],
  vat = 0,
  vatIncluded = true,
  paid = 0,
  remark = ''
}) {
  const validItems = items.filter(i => i.name && i.name.trim() !== '');
  const totalSupply = validItems.reduce((sum, i) => sum + (Number(i.qty) || 0) * (Number(i.price) || 0), 0);
  const finalVat = vatIncluded ? Math.floor(totalSupply * 0.1) : (Number(vat) || 0);
  const grandTotal = totalSupply + finalVat;

  const supplierName = supplier?.company || supplier?.name || '세진건설기계';
  const supplierRep = supplier?.person || supplier?.name || '허강';
  const supplierBizno = supplier?.bizno || '568-23-00015';
  const supplierPhone = supplier?.tel || supplier?.phone || '010-2644-2921';
  const supplierAddr = supplier?.addr || '전북특별자치도 전주시 덕진구 추천로 269(팔복동1가)';
  const bankInfo = supplier?.bankAccount || supplier?.bank || '우리은행 1002-753-878007 허강';

  const customerName = customer?.name || '공급받는자';
  const customerPerson = customer?.person || '-';
  const customerPhone = customer?.phone || '-';
  const customerMachine = customer?.selectedMachine || customer?.machine || '-';
  const customerAddr = customer?.addr || '-';

  const fullDateTime = `${docDate} ${docTime || ''}`.trim();
  const filename = `${docType}_${customerName}_${docNo || docDate || '문서'}.xlsx`;

  // 1. ExcelJS 지원 시 완벽한 A4 피팅 워크북 생성
  if (window.ExcelJS) {
    try {
      const workbook = new window.ExcelJS.Workbook();
      workbook.creator = 'TEAM D.D';
      workbook.lastModifiedBy = 'TEAM D.D';
      workbook.created = new Date();

      const sheet = workbook.addWorksheet(docType, {
        pageSetup: {
          paperSize: 9, // A4
          orientation: 'portrait',
          fitToPage: true,
          fitToWidth: 1,
          fitToHeight: 1,
          margins: { left: 0.3, right: 0.3, top: 0.35, bottom: 0.35, header: 0.15, footer: 0.2 },
          horizontalCentered: true
        },
        views: [{ showGridLines: true }]
      });

      // 🎯 A4 1페이지 완벽 피팅 7열 너비 (총 너비: 81.5)
      sheet.columns = [
        { key: 'colA', width: 8.0 },  // A: No / 공급받는자 레이블
        { key: 'colB', width: 24.5 }, // B: 품명 및 규격 / 공급받는자 정보
        { key: 'colC', width: 4.5 },  // C: 단위
        { key: 'colD', width: 9.5 },  // D: 수량 / 공급자 레이블
        { key: 'colE', width: 11.5 }, // E: 단가
        { key: 'colF', width: 12.0 }, // F: 공급가액
        { key: 'colG', width: 11.5 }  // G: 비고 (우측 마감)
      ];

      // 🎯 세련되고 깔끔한 테두리 스타일 정의 (외곽 선명한 다크 실선 / 내부 은은한 그레이 실선)
      const BORDER_OUTER_CLEAN = { style: 'thin', color: { argb: 'FF334155' } }; // 선명하고 단정한 외곽 실선
      const BORDER_INNER_SOFT = { style: 'thin', color: { argb: 'FFCBD5E1' } };  // 은은하고 깔끔한 내부 실선
      const BORDER_BLUE_LINE = { style: 'thin', color: { argb: 'FF1D6BF3' } };   // 파란 헤더 전용 테두리

      // 🎯 외곽 선명선 + 내부 은은선 완벽 주입 헬퍼 함수
      const applyBoxBorder = (startRow, startCol, endRow, endCol, outer = BORDER_OUTER_CLEAN, inner = BORDER_INNER_SOFT) => {
        for (let r = startRow; r <= endRow; r++) {
          for (let c = startCol; c <= endCol; c++) {
            const cell = sheet.getRow(r).getCell(c);
            cell.border = {
              top: (r === startRow) ? outer : inner,
              bottom: (r === endRow) ? outer : inner,
              left: (c === startCol) ? outer : inner,
              right: (c === endCol) ? outer : inner
            };
          }
        }
      };

      // 1행: 최상단 타이틀 & 공급자 상호 (A~C열 타이틀, D~G열 상호)
      sheet.mergeCells('A1:C1');
      sheet.mergeCells('D1:G1');
      const cellTitle = sheet.getCell('A1');
      cellTitle.value = docType;
      cellTitle.font = { name: '맑은 고딕', size: 19, bold: true, color: { argb: 'FF0F172A' } };
      cellTitle.alignment = { vertical: 'middle', horizontal: 'left' };

      const cellComp = sheet.getCell('D1');
      cellComp.value = supplierName;
      cellComp.font = { name: '맑은 고딕', size: 14, bold: true, color: { argb: 'FF1E293B' } };
      cellComp.alignment = { vertical: 'middle', horizontal: 'right' };
      sheet.getRow(1).height = 30;

      // 2행: 부제목 & 슬로건
      sheet.mergeCells('A2:C2');
      sheet.mergeCells('D2:G2');
      const cellSub1 = sheet.getCell('A2');
      cellSub1.value = 'TRANSACTION STATEMENT';
      cellSub1.font = { name: '맑은 고딕', size: 8.5, bold: true, color: { argb: 'FF94A3B8' } };
      cellSub1.alignment = { vertical: 'middle', horizontal: 'left' };

      const cellSub2 = sheet.getCell('D2');
      cellSub2.value = '최고의 품질과 신뢰로 보답하겠습니다.';
      cellSub2.font = { name: '맑은 고딕', size: 8.5, color: { argb: 'FF64748B' } };
      cellSub2.alignment = { vertical: 'middle', horizontal: 'right' };
      sheet.getRow(2).height = 15;

      // 3행: 여백
      sheet.getRow(3).height = 6;

      // 4행: 메타 정보 2칸 광폭 배치 (외곽 medium 굵은 테두리 마감)
      sheet.mergeCells('A4:C4');
      sheet.mergeCells('D4:G4');
      const meta1 = sheet.getCell('A4');
      meta1.value = `📅  일자: ${fullDateTime}`;
      meta1.font = { name: '맑은 고딕', size: 9, bold: true, color: { argb: 'FF334155' } };
      meta1.alignment = { vertical: 'middle', horizontal: 'center' };
      meta1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };

      const meta2 = sheet.getCell('D4');
      meta2.value = `📄  문서번호: ${docNo || '-'}`;
      meta2.font = { name: '맑은 고딕', size: 9, bold: true, color: { argb: 'FF334155' } };
      meta2.alignment = { vertical: 'middle', horizontal: 'center' };
      meta2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };

      applyBoxBorder(4, 1, 4, 7);
      sheet.getRow(4).height = 22;

      // 5행: 여백
      sheet.getRow(5).height = 6;

      // 6행: 공급받는자(A~C) / 공급자(D~G) 헤더
      sheet.mergeCells('A6:C6');
      sheet.mergeCells('D6:G6');
      const custHdr = sheet.getCell('A6');
      custHdr.value = ' 👤  공급받는자';
      custHdr.font = { name: '맑은 고딕', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
      custHdr.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
      custHdr.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

      const suppHdr = sheet.getCell('D6');
      suppHdr.value = ' 🏢  공급자';
      suppHdr.font = { name: '맑은 고딕', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
      suppHdr.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
      suppHdr.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

      // 7~11행: 공급정보 5개 행 (A: 레이블, B:C 내용 / D: 레이블, E:G 내용 - 긴 주소 2줄 자동 줄바꿈)
      const partyRows = [
        { l1: '성명/상호', v1: customerName, bold1: true, l2: '등록번호', v2: supplierBizno, bold2: true },
        { l1: '담당자', v1: customerPerson, bold1: false, l2: '상호명', v2: supplierName, bold2: true },
        { l1: '연락처', v1: customerPhone, bold1: false, l2: '대표자', v2: supplierRep, bold2: false },
        { l1: '기종', v1: customerMachine, bold1: false, l2: '연락처/메일', v2: supplierPhone, bold2: false },
        { l1: '주소', v1: customerAddr, bold1: false, l2: '사업장주소', v2: supplierAddr, bold2: false }
      ];

      partyRows.forEach((rData, idx) => {
        const rNum = 7 + idx;
        const isAddrRow = idx === 4; // 11행: 주소 행
        sheet.mergeCells(`B${rNum}:C${rNum}`);
        sheet.mergeCells(`E${rNum}:G${rNum}`);

        // 좌측 레이블 (A열)
        const cL1 = sheet.getCell(`A${rNum}`);
        cL1.value = rData.l1;
        cL1.font = { name: '맑은 고딕', size: 8.5, bold: true, color: { argb: 'FF334155' } };
        cL1.alignment = { vertical: 'middle', horizontal: 'center' };
        cL1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };

        // 좌측 값 (B:C열)
        const cV1 = sheet.getCell(`B${rNum}`);
        cV1.value = rData.v1;
        cV1.font = { name: '맑은 고딕', size: isAddrRow ? 8 : 8.5, bold: rData.bold1, color: { argb: 'FF0F172A' } };
        cV1.alignment = { vertical: 'middle', horizontal: 'left', wrapText: isAddrRow, indent: 1 };

        // 우측 레이블 (D열)
        const cL2 = sheet.getCell(`D${rNum}`);
        cL2.value = rData.l2;
        cL2.font = { name: '맑은 고딕', size: 8.5, bold: true, color: { argb: 'FF334155' } };
        cL2.alignment = { vertical: 'middle', horizontal: 'center' };
        cL2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };

        // 우측 값 (E:G열)
        const cV2 = sheet.getCell(`E${rNum}`);
        cV2.value = rData.v2;
        cV2.font = { name: '맑은 고딕', size: isAddrRow ? 8 : 8.5, bold: rData.bold2, color: { argb: 'FF0F172A' } };
        cV2.alignment = { vertical: 'middle', horizontal: 'left', wrapText: isAddrRow, indent: 1 };

        sheet.getRow(rNum).height = isAddrRow ? 28 : 20;
      });

      // 공급받는자(A~C) / 공급자(D~G) 각각 완벽한 외곽 굵은선 테두리 적용
      applyBoxBorder(6, 1, 11, 3);
      applyBoxBorder(6, 4, 11, 7);

      // 12행: 여백
      sheet.getRow(12).height = 8;

      // 13행: 품목 테이블 헤더 (A~G 7개 컬럼)
      const tblHeaders = ['No', '품명 및 규격', '단위', '수량', '단가', '공급가액', '비고'];
      tblHeaders.forEach((th, idx) => {
        const colLetter = String.fromCharCode(65 + idx);
        const cell = sheet.getCell(`${colLetter}13`);
        cell.value = th;
        cell.font = { name: '맑은 고딕', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D6BF3' } };
      });
      sheet.getRow(13).height = 25;

      // 14행부터 품목 데이터 및 빈 행 출력 (최소 16행 확보)
      const MIN_ROWS = Math.max(16, validItems.length);
      for (let i = 0; i < MIN_ROWS; i++) {
        const rNum = 14 + i;
        const item = validItems[i];
        const hasItem = !!item;
        const isAlt = i % 2 === 1;
        const bgColor = isAlt ? { argb: 'FFF8FAFC' } : { argb: 'FFFFFFFF' };

        // No (A열)
        const cellNo = sheet.getCell(`A${rNum}`);
        cellNo.value = hasItem ? (i + 1) : '';
        cellNo.font = { name: '맑은 고딕', size: 8.5, color: { argb: 'FF475569' } };
        cellNo.alignment = { vertical: 'middle', horizontal: 'center' };

        // 품명 및 규격 (B열)
        const cellName = sheet.getCell(`B${rNum}`);
        cellName.value = hasItem ? (item.name + (item.spec ? ` (${item.spec})` : '')) : '';
        cellName.font = { name: '맑은 고딕', size: 8.5, bold: hasItem, color: { argb: 'FF0F172A' } };
        cellName.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

        // 단위 (C열)
        const cellUnit = sheet.getCell(`C${rNum}`);
        cellUnit.value = hasItem ? (item.unit || 'EA') : '';
        cellUnit.font = { name: '맑은 고딕', size: 8.5, color: { argb: 'FF475569' } };
        cellUnit.alignment = { vertical: 'middle', horizontal: 'center' };

        // 수량 (D열)
        const cellQty = sheet.getCell(`D${rNum}`);
        cellQty.value = hasItem ? (Number(item.qty) || 1) : '';
        cellQty.font = { name: '맑은 고딕', size: 8.5, color: { argb: 'FF0F172A' } };
        cellQty.alignment = { vertical: 'middle', horizontal: 'center' };

        // 단가 (E열)
        const cellPrice = sheet.getCell(`E${rNum}`);
        cellPrice.value = hasItem ? (Number(item.price) || 0) : '';
        cellPrice.numFmt = '#,##0';
        cellPrice.font = { name: '맑은 고딕', size: 8.5, color: { argb: 'FF0F172A' } };
        cellPrice.alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };

        // 공급가액 (F열)
        const cellAmt = sheet.getCell(`F${rNum}`);
        cellAmt.value = hasItem ? ((Number(item.qty) || 1) * (Number(item.price) || 0)) : '';
        cellAmt.numFmt = '#,##0';
        cellAmt.font = { name: '맑은 고딕', size: 8.5, bold: hasItem, color: { argb: 'FF0F172A' } };
        cellAmt.alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };

        // 비고 (G열 - 우측 테두리 완벽 포함)
        const cellMemo = sheet.getCell(`G${rNum}`);
        cellMemo.value = hasItem ? (item.memo || item.remark || '') : '';
        cellMemo.font = { name: '맑은 고딕', size: 7.5, color: { argb: 'FF64748B' } };
        cellMemo.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

        ['A', 'B', 'C', 'D', 'E', 'F', 'G'].forEach(col => {
          sheet.getCell(`${col}${rNum}`).fill = { type: 'pattern', pattern: 'solid', fgColor: bgColor };
        });
        sheet.getRow(rNum).height = 20;
      }

      // 품목 테이블 전체에 외곽 medium 굵은선 + 내부 thin 실선 적용 (G열 끝까지 완벽 마감)
      applyBoxBorder(13, 1, 13 + MIN_ROWS, 7);

      // 금액 요약 바 행
      const sumRowNum = 14 + MIN_ROWS + 1;
      sheet.getRow(sumRowNum - 1).height = 8;

      sheet.mergeCells(`C${sumRowNum}:D${sumRowNum}`);
      sheet.mergeCells(`F${sumRowNum}:G${sumRowNum}`);

      // 공급가액 레이블 (A열)
      const sL1 = sheet.getCell(`A${sumRowNum}`);
      sL1.value = '공급가액';
      sL1.font = { name: '맑은 고딕', size: 8.5, bold: true, color: { argb: 'FF1E293B' } };
      sL1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      sL1.alignment = { vertical: 'middle', horizontal: 'center' };

      // 공급가액 금액 (B열)
      const sV1 = sheet.getCell(`B${sumRowNum}`);
      sV1.value = totalSupply;
      sV1.numFmt = '#,##0';
      sV1.font = { name: '맑은 고딕', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
      sV1.alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };

      // 부가세 레이블 (C:D열)
      const sL2 = sheet.getCell(`C${sumRowNum}`);
      sL2.value = '부가세 (10%)';
      sL2.font = { name: '맑은 고딕', size: 8.5, bold: true, color: { argb: 'FF1E293B' } };
      sL2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      sL2.alignment = { vertical: 'middle', horizontal: 'center' };

      // 부가세 금액 (E열)
      const sV2 = sheet.getCell(`E${sumRowNum}`);
      sV2.value = finalVat;
      sV2.numFmt = '#,##0';
      sV2.font = { name: '맑은 고딕', size: 9.5, bold: true, color: { argb: 'FF0F172A' } };
      sV2.alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };

      // 합계금액 레이블 및 금액 (F:G열)
      const sL3 = sheet.getCell(`F${sumRowNum}`);
      sL3.value = `합계금액:  ${grandTotal.toLocaleString()} 원`;
      sL3.font = { name: '맑은 고딕', size: 10.5, bold: true, color: { argb: 'FFFFFFFF' } };
      sL3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D6BF3' } };
      sL3.alignment = { vertical: 'middle', horizontal: 'center' };

      // 금액 요약 바 외곽 굵은선 테두리 적용
      applyBoxBorder(sumRowNum, 1, sumRowNum, 7);
      sheet.getRow(sumRowNum).height = 25;

      // 비고 행 (있을 경우)
      let nextRow = sumRowNum + 2;
      sheet.getRow(sumRowNum + 1).height = 5;

      if (remark) {
        sheet.mergeCells(`B${nextRow}:G${nextRow}`);
        const rL = sheet.getCell(`A${nextRow}`);
        rL.value = '비고';
        rL.font = { name: '맑은 고딕', size: 8.5, bold: true, color: { argb: 'FF334155' } };
        rL.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
        rL.alignment = { vertical: 'middle', horizontal: 'center' };

        const rV = sheet.getCell(`B${nextRow}`);
        rV.value = remark;
        rV.font = { name: '맑은 고딕', size: 8.5, color: { argb: 'FF0F172A' } };
        rV.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

        applyBoxBorder(nextRow, 1, nextRow, 7);
        sheet.getRow(nextRow).height = 21;
        nextRow += 2;
        sheet.getRow(nextRow - 1).height = 4;
      }

      // 입금계좌 행
      sheet.mergeCells(`B${nextRow}:G${nextRow}`);
      const bL = sheet.getCell(`A${nextRow}`);
      bL.value = '입금계좌';
      bL.font = { name: '맑은 고딕', size: 8.5, bold: true, color: { argb: 'FF334155' } };
      bL.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      bL.alignment = { vertical: 'middle', horizontal: 'center' };

      const bV = sheet.getCell(`B${nextRow}`);
      bV.value = bankInfo;
      bV.font = { name: '맑은 고딕', size: 9.5, bold: true, color: { argb: 'FF1D4ED8' } };
      bV.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

      applyBoxBorder(nextRow, 1, nextRow, 7);
      sheet.getRow(nextRow).height = 23;

      // 🎯 최하단 페이지 번호 행 (A~G열 병합, 완벽한 가운데 정렬)
      const pageRowNum = nextRow + 1;
      sheet.mergeCells(`A${pageRowNum}:G${pageRowNum}`);
      const pCell = sheet.getCell(`A${pageRowNum}`);
      pCell.value = '📖  페이지: 1 / 1';
      pCell.font = { name: '맑은 고딕', size: 8.5, bold: true, color: { argb: 'FF64748B' } };
      pCell.alignment = { vertical: 'middle', horizontal: 'center' };
      sheet.getRow(pageRowNum).height = 20;

      // 워크북 버퍼 생성 및 .xlsx 다운로드
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return true;
    } catch (excelJsErr) {
      console.error('ExcelJS 워크북 생성 오류 상세:', excelJsErr);
    }
  }

  // 2. Fallback: CSV 다운로드
  let csv = '\uFEFF';
  csv += `"[ ${docType} ]"\n"문서번호","${docNo}","작성일자","${docDate}"\n\n`;
  csv += `"No","품명","수량","단위","단가","공급가액","비고"\n`;
  validItems.forEach((it, idx) => {
    csv += `"${idx + 1}","${it.name}","${it.qty}","${it.unit}","${it.price}","${(it.qty || 1) * (it.price || 0)}","${it.memo || ''}"\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename.replace('.xlsx', '.csv');
  link.click();
  return true;
}
