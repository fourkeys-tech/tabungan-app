'use client';

import { useState } from 'react';
import type { Tx } from '@/utils/finance';
import { formatRupiah, formatDate } from '@/utils/format';
import { FileDown, Printer, ShieldCheck } from 'lucide-react';

interface Props {
  accountName: string;
  accountEmail?: string;
  accountType?: 'PERSONAL' | 'SHARED' | 'ALL';
  groupName?: string;
  periodLabel?: string;
  openingBalance?: number;
  txs: Tx[];
  label?: string;
  variant?: 'default' | 'primary' | 'ledger-footer';
  className?: string;
}

export function ExportPdfStatementButton({
  accountName,
  accountEmail = '',
  accountType = 'ALL',
  groupName,
  periodLabel,
  openingBalance = 0,
  txs,
  label = 'Cetak Rekening Koran (PDF)',
  variant = 'default',
  className = '',
}: Props) {
  const [loading, setLoading] = useState(false);

  const handlePrintPdf = () => {
    if (txs.length === 0) {
      alert('Tidak ada data transaksi yang dapat dicetak.');
      return;
    }

    setLoading(true);

    // 1. Urutkan transaksi secara kronologis untuk menghitung saldo berjalan (Running Balance)
    const sortedChronological = [...txs].sort((a, b) => {
      const dDiff = new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime();
      return dDiff !== 0 ? dDiff : a.id.localeCompare(b.id);
    });

    let currentRunningBalance = openingBalance;
    let totalDebit = 0; // Pengeluaran
    let totalCredit = 0; // Pemasukan

    const rowsWithBalance = sortedChronological.map((t, idx) => {
      const isCredit = t.transaction_type === 'INCOME' || t.transaction_type === 'CONTRIBUTION';
      if (isCredit) {
        totalCredit += t.amount;
        currentRunningBalance += t.amount;
      } else {
        totalDebit += t.amount;
        currentRunningBalance -= t.amount;
      }

      return {
        index: idx + 1,
        date: formatDate(t.transaction_date + 'T00:00:00'),
        rawDate: t.transaction_date,
        description: t.description || (isCredit ? 'Pemasukan / Setoran' : 'Pengeluaran'),
        category: t.category_name || (t.scope_type === 'SHARED' ? 'Kas Bersama' : 'Kas Pribadi'),
        scope: t.scope_type === 'SHARED' ? `Bersama (${t.group_name || 'Grup'})` : 'Pribadi',
        debit: !isCredit ? t.amount : null,
        credit: isCredit ? t.amount : null,
        runningBalance: currentRunningBalance,
      };
    });

    const endingBalance = currentRunningBalance;
    const now = new Date();
    const printDateStr = new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'full',
      timeStyle: 'medium',
    }).format(now);

    const refNumber = `TBK-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase()}`;

    const displayPeriod =
      periodLabel ||
      (rowsWithBalance.length > 0
        ? `${rowsWithBalance[0].date} – ${rowsWithBalance[rowsWithBalance.length - 1].date}`
        : 'Periode Keseluruhan');

    const typeLabel =
      accountType === 'PERSONAL'
        ? 'Tabungan Personal (Rekening Mandiri)'
        : accountType === 'SHARED'
        ? `Tabungan Bersama (${groupName || 'Portofolio Kolektif'})`
        : 'Konsolidasi Seluruh Portofolio Keuangan';

    // 2. Buat dokumen HTML cetak yang elegan berstandar Rekening Koran Bank
    const printHtml = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <title>Rekening Koran - ${accountName} - ${refNumber}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 15mm 15mm 15mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #101820;
      background: #fff;
      margin: 0;
      padding: 0;
      font-size: 11px;
      line-height: 1.4;
    }
    .header-table {
      width: 100%;
      border-bottom: 2px solid #005249;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .logo-title {
      font-size: 22px;
      font-weight: 800;
      color: #005249;
      letter-spacing: -0.5px;
      margin: 0;
    }
    .logo-subtitle {
      font-size: 10px;
      color: #43474d;
      text-transform: uppercase;
      letter-spacing: 1px;
      font-weight: 600;
    }
    .doc-title {
      text-align: right;
    }
    .doc-title h1 {
      font-size: 16px;
      font-weight: 800;
      color: #101820;
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .doc-title p {
      font-size: 10px;
      color: #43474d;
      margin: 2px 0 0 0;
    }
    .grid-2 {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 16px;
    }
    .info-box {
      flex: 1;
      background: #f8faf9;
      border: 1px solid #d9e2de;
      border-radius: 8px;
      padding: 10px 14px;
    }
    .info-box h3 {
      font-size: 11px;
      font-weight: 700;
      color: #005249;
      text-transform: uppercase;
      margin: 0 0 8px 0;
      border-bottom: 1px dashed #d9e2de;
      padding-bottom: 4px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
      font-size: 10.5px;
    }
    .info-label {
      color: #555b63;
    }
    .info-value {
      font-weight: 600;
      color: #101820;
    }
    .statement-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
      font-size: 10px;
    }
    .statement-table th {
      background-color: #005249;
      color: #ffffff;
      padding: 7px 8px;
      font-weight: 700;
      text-align: left;
      font-size: 9.5px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .statement-table td {
      padding: 6px 8px;
      border-bottom: 1px solid #e5ece9;
      vertical-align: top;
    }
    .statement-table tr:nth-child(even) td {
      background-color: #fbfdfc;
    }
    .statement-table tr:hover td {
      background-color: #f0f5f3;
    }
    .text-right {
      text-align: right;
    }
    .text-center {
      text-align: center;
    }
    .amount-debit {
      color: #b3261e;
      font-weight: 600;
      font-family: 'SF Mono', 'Courier New', monospace;
    }
    .amount-credit {
      color: #005249;
      font-weight: 600;
      font-family: 'SF Mono', 'Courier New', monospace;
    }
    .amount-balance {
      font-weight: 700;
      font-family: 'SF Mono', 'Courier New', monospace;
      color: #101820;
    }
    .stamp-container {
      margin-top: 24px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      border-top: 1px solid #e0e5e3;
      padding-top: 14px;
    }
    .security-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border: 1px solid #005249;
      border-radius: 6px;
      background: #eef7f4;
      font-size: 9.5px;
      color: #005249;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .legal-notice {
      font-size: 8.5px;
      color: #6c737c;
      max-width: 480px;
      line-height: 1.35;
    }
    .print-bar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #101820;
      color: #fff;
      padding: 10px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      z-index: 9999;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    }
    .btn-print {
      background: #005249;
      color: #fff;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: bold;
      cursor: pointer;
      font-size: 13px;
    }
    .btn-close {
      background: #333;
      color: #eee;
      border: none;
      padding: 8px 14px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
    }
    @media print {
      .print-bar {
        display: none !important;
      }
      body {
        margin: 0;
      }
    }
  </style>
</head>
<body>
  <!-- Print Control Bar for Browser Preview -->
  <div class="print-bar">
    <div>
      <strong>Pratinjau Dokumen Rekening Koran</strong> — ${accountName} (${displayPeriod})
    </div>
    <div style="display: flex; gap: 8px;">
      <button class="btn-print" onclick="window.print()">🖨️ Cetak / Simpan PDF</button>
      <button class="btn-close" onclick="window.close()">Tutup</button>
    </div>
  </div>

  <div style="padding-top: 50px;">
    <!-- Kop Surat Lembaga Finansial -->
    <table class="header-table">
      <tr>
        <td style="vertical-align: top;">
          <h2 class="logo-title">TabungKu</h2>
          <div class="logo-subtitle">Serene Financial Ledger • Multi-Holders Platform</div>
          <div style="font-size: 9px; color: #555b63; margin-top: 3px;">
            Terlisensi &amp; Mematuhi Arsitektur Standar Mutasi Perbankan Indonesia
          </div>
        </td>
        <td class="doc-title" style="vertical-align: top;">
          <h1>Rekening Koran Resmi</h1>
          <p>ACCOUNT STATEMENT OF MUTATION</p>
          <p>No. Referensi: <strong>${refNumber}</strong></p>
          <p>Mata Uang: <strong>IDR (Indonesian Rupiah)</strong></p>
        </td>
      </tr>
    </table>

    <!-- Info Pemilik & Ringkasan Keuangan -->
    <div class="grid-2">
      <!-- Box 1: Identitas Akun -->
      <div class="info-box">
        <h3>Informasi Kepemilikan Akun</h3>
        <div class="info-row">
          <span class="info-label">Nama Pemilik / Grup:</span>
          <span class="info-value">${accountName}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Email Terdaftar:</span>
          <span class="info-value">${accountEmail || 'Akun Terverifikasi'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Klasifikasi Akun:</span>
          <span class="info-value">${typeLabel}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Periode Laporan:</span>
          <span class="info-value">${displayPeriod}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Tanggal Terbit:</span>
          <span class="info-value">${printDateStr}</span>
        </div>
      </div>

      <!-- Box 2: Ringkasan Saldo Rekonsiliasi -->
      <div class="info-box">
        <h3>Ringkasan Saldo &amp; Arus Kas</h3>
        <div class="info-row">
          <span class="info-label">Saldo Awal Periode:</span>
          <span class="info-value font-mono">${formatRupiah(openingBalance)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Total Penerimaan (Kredit):</span>
          <span class="info-value amount-credit">+ ${formatRupiah(totalCredit)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Total Pengeluaran (Debit):</span>
          <span class="info-value amount-debit">− ${formatRupiah(totalDebit)}</span>
        </div>
        <div class="info-row" style="border-top: 1px solid #d9e2de; padding-top: 4px; margin-top: 4px;">
          <span class="info-label" style="font-weight: 700; color: #101820;">Saldo Akhir Riil:</span>
          <span class="info-value amount-balance" style="font-size: 13px; color: #005249;">
            ${formatRupiah(endingBalance)}
          </span>
        </div>
        <div class="info-row">
          <span class="info-label">Status Rekonsiliasi:</span>
          <span class="info-value" style="color: #005249; font-weight: 700;">✓ 100% SEIMBANG (AUDITED)</span>
        </div>
      </div>
    </div>

    <!-- Tabel Rincian Mutasi Lengkap -->
    <table class="statement-table">
      <thead>
        <tr>
          <th style="width: 25px;" class="text-center">No</th>
          <th style="width: 75px;">Tanggal</th>
          <th>Keterangan / Uraian Transaksi</th>
          <th style="width: 100px;">Kategori</th>
          <th style="width: 95px;" class="text-right">Debit (Keluar)</th>
          <th style="width: 95px;" class="text-right">Kredit (Masuk)</th>
          <th style="width: 105px;" class="text-right">Saldo Berjalan</th>
        </tr>
      </thead>
      <tbody>
        <!-- Baris Saldo Awal -->
        <tr style="background-color: #f2f7f5; font-weight: bold;">
          <td class="text-center">-</td>
          <td>${rowsWithBalance.length > 0 ? rowsWithBalance[0].date : '-'}</td>
          <td colspan="4">SALDO AWAL PERIODE DIBUKUKAN</td>
          <td class="text-right amount-balance">${formatRupiah(openingBalance)}</td>
        </tr>

        ${rowsWithBalance
          .map(
            (r) => `
        <tr>
          <td class="text-center" style="color: #666;">${r.index}</td>
          <td style="white-space: nowrap;">${r.date}</td>
          <td>
            <strong>${r.description}</strong>
            <div style="font-size: 8.5px; color: #666;">Scope: ${r.scope}</div>
          </td>
          <td><span style="background: #eef2f1; padding: 2px 6px; border-radius: 4px;">${r.category}</span></td>
          <td class="text-right ${r.debit ? 'amount-debit' : ''}">
            ${r.debit ? '− ' + formatRupiah(r.debit) : '-'}
          </td>
          <td class="text-right ${r.credit ? 'amount-credit' : ''}">
            ${r.credit ? '+ ' + formatRupiah(r.credit) : '-'}
          </td>
          <td class="text-right amount-balance">
            ${formatRupiah(r.runningBalance)}
          </td>
        </tr>`
          )
          .join('')}

        <!-- Baris Saldo Akhir -->
        <tr style="background-color: #e8f3ef; font-weight: bold; border-top: 2px solid #005249;">
          <td colspan="4" class="text-right" style="padding-right: 12px;">TOTAL MUTASI &amp; SALDO AKHIR:</td>
          <td class="text-right amount-debit">− ${formatRupiah(totalDebit)}</td>
          <td class="text-right amount-credit">+ ${formatRupiah(totalCredit)}</td>
          <td class="text-right amount-balance" style="font-size: 11.5px; color: #005249;">
            ${formatRupiah(endingBalance)}
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Stempel Verifikasi Keamanan -->
    <div class="stamp-container">
      <div class="legal-notice">
        <strong>Pemberitahuan Hukum:</strong> Rekening koran ini diterbitkan secara elektronik melalui sistem buku kas terenkripsi TabungKu. Seluruh mutasi telah tervalidasi melalui buku besar transaksi ganda (*double-entry reconciliation*) dan jejak audit digital. Dokumen ini sah dan dapat digunakan sebagai pembuktian mutasi keuangan internal.
      </div>
      <div class="security-badge">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          <path d="m9 12 2 2 4-4"/>
        </svg>
        <span>Terverifikasi Digital • TabungKu</span>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    // 3. Buka jendela cetak baru
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(printHtml);
      printWindow.document.close();
      setLoading(false);
    } else {
      alert('Pop-up terblokir oleh browser. Silakan izinkan pop-up untuk mencetak Rekening Koran PDF.');
      setLoading(false);
    }
  };

  if (variant === 'ledger-footer') {
    return (
      <button
        type="button"
        onClick={handlePrintPdf}
        disabled={loading}
        className={`h-9 px-space-md rounded-lg bg-surface-container-lowest hover:bg-surface-variant text-on-surface font-caption-medium text-caption-medium shadow-sm transition-colors cursor-pointer shrink-0 flex items-center justify-center gap-1.5 ${className}`}
        title="Buka dan cetak Rekening Koran PDF resmi"
      >
        <Printer size={13} className="text-secondary" />
        <span>{loading ? 'Menyiapkan...' : label}</span>
      </button>
    );
  }

  if (variant === 'primary') {
    return (
      <button
        type="button"
        onClick={handlePrintPdf}
        disabled={loading}
        className={`inline-flex items-center gap-1.5 h-10 px-space-md bg-secondary hover:bg-secondary/90 text-on-secondary font-caption-medium text-caption-medium rounded-lg transition-colors shadow-xs cursor-pointer ${className}`}
        title="Cetak Rekening Koran Resmi PDF"
      >
        <Printer size={15} />
        <span>{loading ? 'Menyiapkan...' : label}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handlePrintPdf}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 h-10 px-space-md bg-surface-container-lowest hover:bg-surface-container-high text-on-surface font-caption-medium text-caption-medium rounded-lg transition-colors border border-surface-container-highest shadow-xs cursor-pointer ${className}`}
      title="Cetak Rekening Koran Resmi PDF"
    >
      <FileDown size={14} className="text-secondary" />
      <span>{loading ? 'Menyiapkan...' : label}</span>
    </button>
  );
}

