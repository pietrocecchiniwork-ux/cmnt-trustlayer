/**
 * In-memory photo store to pass captured photos between CameraScreen and EvidenceConfirm.
 * Avoids sessionStorage size limits (5MB) that cause silent failures on mobile.
 */

export interface CapturedPhoto {
  dataUrl: string;
  base64: string;
}

export interface EvidencePhotoState {
  photos: CapturedPhoto[];
  milestoneId: string;
  taskId: string;
  milestoneName: string;
  taskName: string;
  projectName: string;
  milestoneDescription: string;
  taskDescription: string;
  allTasks: { name: string; status: string }[];
}

let _state: EvidencePhotoState | null = null;

export function setEvidencePhotoState(state: EvidencePhotoState) {
  _state = state;
}

export function getEvidencePhotoState(): EvidencePhotoState | null {
  return _state;
}

export function clearEvidencePhotoState() {
  _state = null;
}

/**
 * Resize an image to fit within maxDimension while maintaining aspect ratio.
 * Returns { dataUrl, base64 }.
 */
export function resizeImage(
  file: File | Blob,
  maxDimension = 1600,
  quality = 0.85
): Promise<CapturedPhoto> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        const ratio = Math.min(maxDimension / width, maxDimension / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas not supported")); return; }
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      const base64 = dataUrl.split(",")[1];
      resolve({ dataUrl, base64 });
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Failed to load image")); };
    img.src = url;
  });
}
