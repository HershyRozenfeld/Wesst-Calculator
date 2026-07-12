export function notifyDataChanged(): void {
  const runtime = (globalThis as typeof globalThis & {
    chrome?: { runtime?: { id?: string; sendMessage?: (message: unknown) => void } };
  }).chrome?.runtime;

  if (!runtime?.id || !runtime.sendMessage) return;
  try {
    runtime.sendMessage({ type: 'data-changed' });
  } catch {
    // Desktop and regular browser builds do not have an extension runtime.
  }
}
