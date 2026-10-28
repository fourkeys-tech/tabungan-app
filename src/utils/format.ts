export function formatRupiah(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  return 'Rp ' + new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(isNaN(n) ? 0 : n);
}

export function parseValidDate(val: string | Date | null | undefined): Date {
  if (!val) return new Date();
  if (val instanceof Date) return isNaN(val.getTime()) ? new Date() : val;
  let str = String(val).trim();
  // Tangani kasus jika string ISO sudah memiliki T lalu ditambahkan 'T00:00:00'
  if (str.includes('T') && str.endsWith('T00:00:00')) {
    str = str.replace(/T00:00:00$/, '');
  }
  const d = new Date(str);
  if (!isNaN(d.getTime())) return d;
  const datePart = str.split('T')[0];
  const fallback = new Date(datePart + 'T00:00:00');
  if (!isNaN(fallback.getTime())) return fallback;
  return new Date();
}

export function formatDate(value: string | Date | null | undefined): string {
  try {
    const d = parseValidDate(value);
    return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
  } catch {
    return '-';
  }
}
