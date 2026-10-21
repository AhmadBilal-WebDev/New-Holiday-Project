/**
 * Ensures modify-search always re-triggers listing fetches even when
 * criteria are unchanged (Next.js ignores identical router.push URLs).
 */
export function stampSearchParams(params) {
  const next =
    params instanceof URLSearchParams
      ? new URLSearchParams(params)
      : new URLSearchParams(params || {});
  next.set('_r', String(Date.now()));
  return next;
}

export function withSearchRefresh(pathOrUrl) {
  const raw = String(pathOrUrl || '');
  const hasQuery = raw.includes('?');
  const [path, query = ''] = hasQuery ? raw.split('?') : [raw, ''];
  const params = stampSearchParams(query);
  return `${path}?${params.toString()}`;
}
