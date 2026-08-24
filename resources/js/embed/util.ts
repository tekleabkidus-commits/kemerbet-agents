// Shared helpers with no other imports — safe for any module to depend on.

const ESC_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function esc(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => ESC_MAP[c]);
}
