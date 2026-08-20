// 🎨 TEAM D.D EXPORT UTILITIES (HTML2CANVAS, JSPDF, CLIPBOARD & SHARE)

export async function exportPagesToPNG(pages, filenamePrefix = '명세서') {
  if (!pages || pages.length === 0) return;
  const html2canvas = window.html2canvas;
  if (!html2canvas) {
    throw new Error('html2canvas 라이브러리가 로드되지 않았습니다.');
  }

  for (let i = 0; i < pages.length; i++) {
    const canvas = await html2canvas(pages[i], {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true
    });

    const link = document.createElement('a');
    link.download = `${filenamePrefix}_${i + 1}페이지.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }
}

export async function copyPageToClipboard(pageElement) {
  if (!pageElement) return false;
  const html2canvas = window.html2canvas;
  if (!html2canvas) throw new Error('html2canvas 라이브러리를 찾을 수 없습니다.');

  const canvas = await html2canvas(pageElement, {
    scale: 2,
    backgroundColor: '#ffffff',
    useCORS: true
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

export async function shareDocumentImage(pageElement, title = 'TEAM D.D 거래명세서') {
  if (!navigator.share || !pageElement) return false;
  const html2canvas = window.html2canvas;
  if (!html2canvas) throw new Error('html2canvas 라이브러리를 찾을 수 없습니다.');

  const canvas = await html2canvas(pageElement, {
    scale: 2,
    backgroundColor: '#ffffff',
    useCORS: true
  });

  return new Promise((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        reject(new Error('이미지 생성 실패'));
        return;
      }
      const file = new File([blob], `${title}.png`, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: title,
            text: title
          });
          resolve(true);
        } catch (e) {
          if (e.name !== 'AbortError') reject(e);
          else resolve(false);
        }
      } else {
        reject(new Error('이 기기에서는 파일 공유 기능을 지원하지 않습니다.'));
      }
    }, 'image/png');
  });
}
