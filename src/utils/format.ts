export function formatRupiah(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  return 'Rp ' + new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(n);
}

export function formatDate(value: string | Date): string {
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
}
