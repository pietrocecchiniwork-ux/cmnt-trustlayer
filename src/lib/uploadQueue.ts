/**
 * Offline-aware upload queue with retry logic for construction site connectivity.
 */

interface QueuedUpload {
  id: string;
  fn: () => Promise<void>;
  retries: number;
  maxRetries: number;
}

const queue: QueuedUpload[] = [];
let processing = false;

function isOnline(): boolean {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

async function processQueue() {
  if (processing || queue.length === 0) return;
  processing = true;

  while (queue.length > 0) {
    if (!isOnline()) {
      // Wait for online
      await new Promise<void>((resolve) => {
        const handler = () => { window.removeEventListener("online", handler); resolve(); };
        window.addEventListener("online", handler);
      });
    }

    const item = queue[0];
    try {
      await item.fn();
      queue.shift(); // success — remove from queue
    } catch (err) {
      item.retries++;
      if (item.retries >= item.maxRetries) {
        queue.shift(); // give up
        console.error(`Upload ${item.id} failed after ${item.maxRetries} retries`, err);
        throw err;
      }
      // Exponential backoff: 1s, 2s, 4s, 8s, 16s
      const delay = Math.min(1000 * Math.pow(2, item.retries - 1), 16000);
      await new Promise(r => setTimeout(r, delay));
    }
  }

  processing = false;
}

/**
 * Enqueue an upload function with automatic retry.
 * Returns a promise that resolves when the upload succeeds or rejects after max retries.
 */
export function enqueueUpload(
  id: string,
  uploadFn: () => Promise<void>,
  maxRetries = 5
): Promise<void> {
  return new Promise((resolve, reject) => {
    const wrapped = async () => {
      try {
        await uploadFn();
        resolve();
      } catch (err) {
        reject(err);
        throw err;
      }
    };
    queue.push({ id, fn: wrapped, retries: 0, maxRetries });
    processQueue().catch(() => {});
  });
}

/**
 * Upload a blob with retry logic. Wraps the Supabase storage upload.
 */
export async function uploadWithRetry(
  uploadFn: () => Promise<string>,
  maxRetries = 5
): Promise<string> {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    if (attempt > 0 && !isOnline()) {
      await new Promise<void>((resolve) => {
        const handler = () => { window.removeEventListener("online", handler); resolve(); };
        window.addEventListener("online", handler);
      });
    }
    try {
      return await uploadFn();
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries - 1) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 16000);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}
