/** Hide technical ingestion labels in producer views without changing stored data. */
export function prospectDisplayText(value: string | null | undefined): string {
  return (value ?? '').replace(/\[(?:Laney[\s-]*Barrac\s*\((?:Brevo|Tally)\)|Brevo|Tally|formulaire|form|cliqueur|click)\]\s*/gi, '').trim();
}