'use client';

import React from 'react';
import { Download } from 'lucide-react';
import type { Tx } from '@/utils/finance';
import { formatRupiah, formatDate } from '@/utils/format';

export interface ExportCsvProps {
  txs: (Tx & { actor_name?: string })[];
  accountName?: string;
  accountEmail?: string;
  accountType?: 'ALL' | 'PERSONAL' | 'SHARED';
  groupName?: string;
  periodLabel?: string;
  openingBalance?: number;
  filename?: string;
  label?: string;
  variant?: 'default' | 'ledger-footer';
  className?: string;
}

function escapeCsvField(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

export function ExportCsvButton({
  txs,
  accountName = 'Nasabah TabungKu',
  accountEmail,
  accountType = 'ALL',
  groupName,
  periodLabel = 'Seluruh Periode Aktif',
  openingBalance = 0,
  filename = 'laporan-mutasi-keuangan-tabungku.csv',
  label = 'Ekspor CSV',
  variant = 'default',
  className = '',
}: ExportCsvProps) {
  const handleExport = () => {
    if (txs.length === 0) {
      alert('Tidak ada data transaksi yang dapat diekspor.');
      return;
    }

    // Sort chronologically ascending to properly compute running balance
    const sortedTxs = [...txs].sort((a, b) => {
      const dateCmp = a.transaction_date.localeCompare(b.transaction_date);
      if (dateCmp !== 0) return dateCmp;
      return a.id.localeCompare(b.id);
    });

    const now = new Date();
    const downloadDateFormatted = new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    }).format(now);

    const scopeTitle =
      accountType === 'PERSONAL'
        ? 'Buku Kas Personal (Mandiri)'
        : accountType === 'SHARED'
        ? `Tabungan Bersama (${groupName || 'Kas Kolektif'})`
        : 'Buku Besar Gabungan (Dual-Ledger Governance)';

    // Compute active totals
    let totalIncome = 0;
    let totalExpense = 0;
    let runningBalance = openingBalance;

    const dataRows: string[] = [];

    sortedTxs.forEach((t, idx) => {
      const isVoid = t.status === 'VOIDED';
      const isPending = t.status === 'PENDING_APPROVAL';
      const isRejected = t.status === 'REJECTED';

      const isIncome =
        t.transaction_type === 'INCOME' ||
        (t.transaction_type === 'CONTRIBUTION' && t.scope_type === 'SHARED');
      const isExpense =
        t.transaction_type === 'EXPENSE' ||
        (t.transaction_type === 'CONTRIBUTION' && t.scope_type === 'PERSONAL');

      const creditAmount = isIncome && !isVoid && !isPending && !isRejected ? t.amount : 0;
      const debitAmount = isExpense && !isVoid && !isPending && !isRejected ? t.amount : 0;

      if (!isVoid && !isPending && !isRejected) {
        totalIncome += creditAmount;
        totalExpense += debitAmount;
        runningBalance += creditAmount - debitAmount;
      }

      // Format Ref Code #TRX-YYYYMMDD-XXXX
      const datePart = (t.transaction_date || '').slice(0, 10).replace(/[^0-9]/g, '');
      const idPart = (t.id || 'XXXX').replace(/-/g, '').slice(0, 4).toUpperCase();
      const refCode = `#TRX-${datePart || '20261027'}-${idPart}`;

      // Format Date & Time
      const txDateObj = new Date(t.transaction_date);
      const formattedDate = formatDate(t.transaction_date);
      const formattedTime =
        t.transaction_date.includes('T') && !isNaN(txDateObj.getTime())
          ? `${String(txDateObj.getHours()).padStart(2, '0')}:${String(
              txDateObj.getMinutes()
            ).padStart(2, '0')} WIB`
          : '-';

      // Wadah / Rekening
      const wadah =
        t.scope_type === 'PERSONAL'
          ? 'Personal (Mandiri)'
          : `Tabungan Bersama - ${t.group_name || groupName || 'Grup'}`;

      // Jenis Mutasi
      const jenisMutasi =
        t.transaction_type === 'INCOME'
          ? 'Pemasukan'
          : t.transaction_type === 'EXPENSE'
          ? 'Pengeluaran'
          : 'Setoran Kas Bersama';

      // Status
      const statusLabel = isVoid
        ? 'Dibatalkan (Void)'
        : isPending
        ? 'Menunggu Persetujuan'
        : isRejected
        ? 'Ditolak'
        : 'Tervalidasi (Aktif)';

      const actor =
        t.actor_name ||
        (t.scope_type === 'PERSONAL' ? accountName : 'Anggota TabungKu');

      const row = [
        escapeCsvField(idx + 1),
        escapeCsvField(refCode),
        escapeCsvField(formattedDate),
        escapeCsvField(formattedTime),
        escapeCsvField(wadah),
        escapeCsvField(jenisMutasi),
        escapeCsvField(t.category_name || 'Lainnya'),
        escapeCsvField(t.description || '-'),
        escapeCsvField(t.payment_method || 'Transfer Bank'),
        escapeCsvField(actor),
        creditAmount, // numeric for Excel SUM
        debitAmount,  // numeric for Excel SUM
        runningBalance, // numeric running balance
        escapeCsvField(statusLabel),
        escapeCsvField(t.void_reason || '-'),
      ].join(',');

      dataRows.push(row);
    });

    const netCashflow = totalIncome - totalExpense;
    const endingBalance = openingBalance + netCashflow;

    // Build the executive CSV file lines
    const lines: string[] = [
      'sep=,', // Instructs Microsoft Excel on Windows to parse columns by comma regardless of system locale
      escapeCsvField('LAPORAN BUKU BESAR MUTASI KEUANGAN - TABUNGKU'),
      escapeCsvField('Sistem Tata Kelola Keuangan Terintegrasi (Dual-Ledger Governance)'),
      '""',
      `${escapeCsvField('INFORMASI LAPORAN & AUDIT')},""`,
      `${escapeCsvField('Nama Nasabah / Entitas:')},${escapeCsvField(accountName)}`,
      `${escapeCsvField('Email Akun:')},${escapeCsvField(accountEmail || '-')}`,
      `${escapeCsvField('Cakupan Laporan:')},${escapeCsvField(scopeTitle)}`,
      `${escapeCsvField('Periode Mutasi:')},${escapeCsvField(periodLabel)}`,
      `${escapeCsvField('Tanggal Ekspor:')},${escapeCsvField(downloadDateFormatted)}`,
      `${escapeCsvField('Total Entri Mutasi:')},${escapeCsvField(`${sortedTxs.length} Transaksi`)}`,
      '""',
      `${escapeCsvField('RINGKASAN ARUS KAS (IDR)')},"",""`,
      `${escapeCsvField('Total Pemasukan (Kredit):')},${totalIncome},${escapeCsvField(formatRupiah(totalIncome))}`,
      `${escapeCsvField('Total Pengeluaran (Debit):')},${totalExpense},${escapeCsvField(formatRupiah(totalExpense))}`,
      `${escapeCsvField('Net Arus Kas Periode Ini:')},${netCashflow},${escapeCsvField(formatRupiah(netCashflow))}`,
      `${escapeCsvField('Saldo Awal (Opening):')},${openingBalance},${escapeCsvField(formatRupiah(openingBalance))}`,
      `${escapeCsvField('Saldo Akhir Buku Besar:')},${endingBalance},${escapeCsvField(formatRupiah(endingBalance))}`,
      '""',
      escapeCsvField('RINCIAN BUKU BESAR TRANSAKSI'),
      [
        escapeCsvField('No'),
        escapeCsvField('No. Referensi'),
        escapeCsvField('Tanggal'),
        escapeCsvField('Waktu'),
        escapeCsvField('Wadah / Akun'),
        escapeCsvField('Jenis Mutasi'),
        escapeCsvField('Kategori'),
        escapeCsvField('Keterangan Transaksi'),
        escapeCsvField('Metode Pembayaran'),
        escapeCsvField('Pencatat / Anggota'),
        escapeCsvField('Masuk (Kredit)'),
        escapeCsvField('Keluar (Debit)'),
        escapeCsvField('Saldo Berjalan'),
        escapeCsvField('Status Validasi'),
        escapeCsvField('Catatan Pembatalan'),
      ].join(','),
      ...dataRows,
      '""',
      [
        escapeCsvField('TOTAL AKHIR MUTASI'),
        '""',
        '""',
        '""',
        '""',
        '""',
        '""',
        '""',
        '""',
        '""',
        totalIncome,
        totalExpense,
        endingBalance,
        '""',
        '""',
      ].join(','),
      '""',
      escapeCsvField('CATATAN KEPATUHAN & JEJAK AUDIT PERBANKAN INDONESIA'),
      escapeCsvField('1. Dokumen ini diterbitkan secara digital oleh TabungKu Financial System dan terikat dengan jejak audit mutasi.'),
      escapeCsvField('2. Nilai moneter disajikan dalam mata uang Rupiah (IDR). Kolom Masuk, Keluar, dan Saldo Berjalan berupa angka desimal valid untuk rumus Excel (=SUM, =AVERAGE).'),
      escapeCsvField('3. Transaksi berstatus Dibatalkan (Void) dan Menunggu Persetujuan dikecualikan dari akumulasi total mutasi efektif.'),
    ];

    const csvContent = lines.join('\r\n');
    const blob = new Blob(['\uFEFF' + csvContent], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (variant === 'ledger-footer') {
    return (
      <button
        type="button"
        onClick={handleExport}
        className={`h-9 px-space-md rounded-lg bg-surface-container-lowest hover:bg-surface-variant text-on-surface font-caption-medium text-caption-medium shadow-sm transition-colors cursor-pointer shrink-0 flex items-center justify-center gap-1.5 ${className}`}
        title="Unduh laporan mutasi profesional dalam format CSV (Excel)"
      >
        <Download size={13} className="text-secondary" />
        <span>{label}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      className={`inline-flex items-center gap-1.5 h-10 px-space-md bg-surface-container-lowest hover:bg-surface-container-high text-on-surface font-caption-medium text-caption-medium rounded-lg transition-colors border border-surface-container-highest shadow-xs cursor-pointer ${className}`}
      title="Unduh laporan mutasi profesional dalam format CSV (Excel)"
    >
      <Download size={14} className="text-secondary" />
      <span>{label}</span>
    </button>
  );
}
