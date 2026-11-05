/**
 * Display-only website link normalisation. Accepts bare domains ("123weine.de",
 * "www.123weine.de") by prefixing https://, keeps absolute http(s) URLs and
 * returns null for empty values, relative paths, credentials or other schemes.
 * Not used for evidence qualification (see safeExternalUrl in importer-profile).
 */
export function safeWebsiteUrl(value?: string | null): string | null {
  let raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) return null;
  if (!/^[a-z][a-z\d+.-]*:/i.test(raw)) {
    if (raw.startsWith('//')) raw = raw.slice(2);
    if (!/^[\w-]+(\.[\w-]+)+([/:?#].*)?$/.test(raw)) return null;
    raw = `https://${raw}`;
  }
  try {
    const url = new URL(raw);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password && url.hostname.includes('.') ? url.href : null;
  } catch { return null; }
}
