import Taro from '@tarojs/taro';

interface ChooseImageResult {
  base64: string;
  mimeType: string;
}

function fileSystemReadAsBase64(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const fs = Taro.getFileSystemManager();
    fs.readFile({
      filePath,
      encoding: 'base64',
      success: (res) => resolve(res.data as string),
      fail: reject,
    });
  });
}

function browserReadAsBase64(filePath: string): Promise<string> {
  return fetch(filePath)
    .then((res) => res.blob())
    .then(
      (blob) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        }),
    );
}

/** 选择一张图片并读取为 base64（微信端走文件系统，H5 端走 FileReader） */
export async function chooseImageAsBase64(): Promise<ChooseImageResult | null> {
  const res = await Taro.chooseMedia({
    count: 1,
    mediaType: ['image'],
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
  });

  const tempFile = res.tempFiles?.[0];
  if (!tempFile?.tempFilePath) return null;

  // 压缩后的手机照片默认为 jpeg；后端同样接受 png/webp
  const mimeType = 'image/jpeg';
  const isWeapp = process.env.TARO_ENV === 'weapp';
  const base64 = isWeapp
    ? await fileSystemReadAsBase64(tempFile.tempFilePath)
    : await browserReadAsBase64(tempFile.tempFilePath);

  return { base64, mimeType };
}
