// 🎨 TEAM D.D IMAGE UTILITIES (STAMP & PHOTO OPTIMIZER)

/**
 * 이미지 파일을 읽어서 최대 크기(maxDimension px)로 리사이징 후 Base64 Data URL로 반환
 */
export function compressImageFile(file, maxDimension = 300, quality = 0.9) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve(null);
      return;
    }

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
        ctx.drawImage(img, 0, 0, width, height);

        // PNG 투명도 보존
        const isPng = file.type === 'image/png';
        const dataUrl = canvas.toDataURL(isPng ? 'image/png' : 'image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('이미지를 불러오는데 실패했습니다.'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('파일을 읽는데 실패했습니다.'));
    reader.readAsDataURL(file);
  });
}
