const vnd = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

/**
 * Money is cents (minor units x100) end-to-end (AGENTS.md / ADR 0003);
 * 45_000_000 → "450.000₫". Format only at the display boundary.
 */
export function formatCents(cents: number): string {
  return vnd.format(cents / 100);
}

/** Schema.org expects the major amount: VND has no decimals → "450000". */
export function centsToDecimalString(cents: number): string {
  return String(cents / 100);
}
