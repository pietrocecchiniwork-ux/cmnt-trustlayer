/**
 * In-memory photo store to pass captured photos between CameraScreen and EvidenceConfirm.
 * Avoids sessionStorage size limits (5MB) that cause silent failures on mobile.
 *
 * Mobile hardening: photo blobs stay in memory, but a lightweight "handoff token"
 * is persisted to sessionStorage so we can detect when iOS Safari has dropped
 * module state (tab suspension) and surface a clear error instead of silently
 * routing back.
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

const HANDOFF_KEY = "cmt_evidence_handoff_v1";

let _state: EvidencePhotoState | null = null;
let _token: string | null = null;

function newToken() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function setEvidencePhotoState(state: EvidencePhotoState) {
  _state = state;
  _token = newToken();
  try {
    sessionStorage.setItem(
      HANDOFF_KEY,
      JSON.stringify({
        token: _token,
        milestoneId: state.milestoneId,
        photoCount: state.photos.length,
      }),
    );
  } catch {
    // sessionStorage unavailable (private mode etc.) — fall back to memory only.
  }
}

export type HandoffStatus =
  | { kind: "ok"; state: EvidencePhotoState }
  | { kind: "missing" } // never set
  | { kind: "lost"; milestoneId: string | null }; // sessionStorage says we should have one but module memory was wiped

export function readEvidenceHandoff(): HandoffStatus {
  let stored: { token?: string; milestoneId?: string; photoCount?: number } | null = null;
  try {
    const raw = sessionStorage.getItem(HANDOFF_KEY);
    if (raw) stored = JSON.parse(raw);
  } catch {
    /* ignore */
  }

  if (_state && _token && stored?.token === _token) {
    return { kind: "ok", state: _state };
  }
  if (stored?.token) {
    return { kind: "lost", milestoneId: stored.milestoneId ?? null };
  }
  return { kind: "missing" };
}

/** @deprecated kept for any legacy callers; prefer readEvidenceHandoff */
export function getEvidencePhotoState(): EvidencePhotoState | null {
  return _state;
}

export function clearEvidencePhotoState() {
  _state = null;
  _token = null;
  try {
    sessionStorage.removeItem(HANDOFF_KEY);
  } catch {
    /* ignore */
  }
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
