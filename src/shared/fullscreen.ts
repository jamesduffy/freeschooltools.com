/** Toggle fullscreen. Must be called from a click or key press handler. */
export async function toggleFullscreen(el: HTMLElement = document.documentElement): Promise<void> {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await el.requestFullscreen();
  } catch { /* not allowed or unsupported: ignore */ }
}
export const isFullscreen = () => !!document.fullscreenElement;
