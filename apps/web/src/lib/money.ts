const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

/** Money is cents end-to-end (AGENTS.md); format only at the display boundary. */
export function formatCents(cents: number): string {
  return usd.format(cents / 100);
}

/** Schema.org expects "29.90", never cents (PLAN.md §10). */
export function centsToDecimalString(cents: number): string {
  return (cents / 100).toFixed(2);
}
