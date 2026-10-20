/**
 * Format transfer service_information values for display.
 * Transfer time (TRFTIME) values are minutes from the API.
 */
export function formatTransferServiceValue(service) {
  const raw = service?.value;
  if (raw == null || raw === '') return '—';

  const isTransferTime =
    service?.id === 'TRFTIME' ||
    /transfer\s*time/i.test(service?.name || '');

  if (!isTransferTime) return String(raw);

  const mins = Number(raw);
  if (Number.isNaN(mins) || mins < 0) return String(raw);

  return `${mins} min`;
}
