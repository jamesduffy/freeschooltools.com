/** Keep the screen awake with the Screen Wake Lock API. Request on a user press, release when done.
 *  The browser drops the lock when the tab is hidden, so this re-requests when it becomes visible again. */
type Sentinel = { release(): Promise<void> };
let sentinel: Sentinel | null = null;
let wanted = false;

export const wakeLockSupported = () => "wakeLock" in navigator;

async function acquire(): Promise<void> {
  if (!wakeLockSupported() || sentinel) return;
  try {
    sentinel = await (navigator as unknown as { wakeLock: { request(t: "screen"): Promise<Sentinel> } }).wakeLock.request("screen");
  } catch { sentinel = null; }
}

export async function keepAwake(): Promise<boolean> {
  wanted = true;
  await acquire();
  return sentinel !== null;
}

export async function releaseAwake(): Promise<void> {
  wanted = false;
  const s = sentinel; sentinel = null;
  try { await s?.release(); } catch { /* already released */ }
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && wanted) { sentinel = null; void acquire(); }
});
