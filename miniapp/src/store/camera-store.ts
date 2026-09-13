import { create } from 'zustand';

interface CameraState {
  pendingImageBase64: string | null;
  pendingMimeType: string | null;
  setPendingImage: (imageBase64: string, mimeType: string) => void;
  clearPendingImage: () => void;
}

/** 内存态，用于拍照页与识别结果页之间传递图片（避免 base64 走 URL 参数） */
export const useCameraStore = create<CameraState>((set) => ({
  pendingImageBase64: null,
  pendingMimeType: null,
  setPendingImage: (imageBase64, mimeType) => set({ pendingImageBase64: imageBase64, pendingMimeType: mimeType }),
  clearPendingImage: () => set({ pendingImageBase64: null, pendingMimeType: null }),
}));
