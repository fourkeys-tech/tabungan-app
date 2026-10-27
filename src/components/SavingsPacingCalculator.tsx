'use client';

import { useState } from 'react';
import { formatRupiah, formatDate } from '@/utils/format';
import { MaskableText } from '@/components/PrivacyContext';
import {
  Target,
  Calendar,
  Sparkles,
  TrendingUp,
  Clock,
  Users,
  ChevronDown,
  ChevronUp,
  Calculator,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Coffee,
} from 'lucide-react';

interface Props {
  mode?: 'group' | 'personal';
  groupName?: string;
  currentBalance?: number;
  targetAmount?: number | null;
  targetDate?: string | null;
  memberCount?: number;
  className?: string;
}

const QUICK_AMOUNTS = [1000000, 3000000, 5000000, 10000000, 25000000];
const QUICK_MONTHS = [1, 3, 6, 12, 24];

export function SavingsPacingCalculator({
  mode = 'group',
  groupName,
  currentBalance = 0,
  targetAmount,
  targetDate,
  memberCount = 1,
  className = '',
}: Props) {
  const [showSimulator, setShowSimulator] = useState(false);

  // States untuk simulasi interaktif
  const [simAmount, setSimAmount] = useState<number>(
    targetAmount && targetAmount > 0 ? targetAmount : 5000000
  );
  const [simMonths, setSimMonths] = useState<number>(6);
  const [simMembers, setSimMembers] = useState<number>(memberCount > 1 ? memberCount : 1);

  // Perhitungan pacing data aktif (jika ada target)
  const hasActiveTarget = targetAmount != null && targetAmount > 0;
  const targetVal = targetAmount || 0;
  const remainingAmount = Math.max(0, targetVal - currentBalance);
  const pct = targetVal > 0 ? Math.min(100, Math.round((currentBalance / targetVal) * 100)) : 0;
  const isAchieved = hasActiveTarget && currentBalance >= targetVal;

  // Waktu tersisa hingga target date
  let daysRemaining = 0;
  let monthsRemaining = 1;
  let weeksRemaining = 1;

  if (targetDate) {
    const now = new Date();
    const tDate = new Date(targetDate + 'T23:59:59');
    const diff = tDate.getTime() - now.getTime();
    daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    weeksRemaining = Math.max(1, Math.ceil(daysRemaining / 7));
    monthsRemaining = Math.max(1, Math.ceil(daysRemaining / 30.4));
  } else {
    // Default 6 bulan jika belum ada target_date
    monthsRemaining = 6;
    weeksRemaining = 24;
    daysRemaining = 180;
  }

  // Rekomendasi nominal setoran pacing
  const monthlyNeeded = Math.ceil(remainingAmount / monthsRemaining);
  const weeklyNeeded = Math.ceil(remainingAmount / weeksRemaining);
  const dailyNeeded = Math.ceil(remainingAmount / Math.max(1, daysRemaining));

  // Porsi per anggota (untuk tabungan bersama)
  const activeMembers = Math.max(1, memberCount);
  const perMemberMonthly = Math.ceil(monthlyNeeded / activeMembers);
  const perMemberWeekly = Math.ceil(weeklyNeeded / activeMembers);

  // Perhitungan simulator interaktif
  const simRemaining = Math.max(0, simAmount - (mode === 'personal' ? currentBalance : 0));
  const simMonthly = Math.ceil(simRemaining / Math.max(1, simMonths));
  const simWeekly = Math.ceil(simMonthly / 4);
  const simDaily = Math.ceil(simMonthly / 30);
  const simPerMemberMonthly = Math.ceil(simMonthly / Math.max(1, simMembers));

  return (
    <article
      className={`rounded-2xl bg-surface-container-low border border-surface-container-high p-space-md flex flex-col gap-space-sm ${className}`}
    >
      {/* Header Bar Pacing */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-xs">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-secondary-container text-secondary flex items-center justify-center shrink-0">
            <Sparkles size={16} />
          </div>
          <div>
            <h3 className="font-headline-h3 text-sm font-bold text-on-surface flex items-center gap-1.5">
              <span>Smart Target Pacing</span>
              {hasActiveTarget && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isAchieved
                      ? 'bg-primary-fixed text-primary'
                      : daysRemaining <= 14 && targetDate
                      ? 'bg-tertiary-fixed text-tertiary'
                      : 'bg-secondary-container text-on-secondary-fixed-variant'
                  }`}
                >
                  {isAchieved
                    ? 'Target Tercapai 🎉'
                    : daysRemaining <= 14 && targetDate
                    ? 'Tenggat Waktu Dekat ⚡'
                    : 'On Track 🚀'}
                </span>
              )}
            </h3>
            <p className="font-caption text-[11px] text-on-surface-variant">
              Kalkulasi cerdas estimasi setoran berkala untuk mencapai target finansial tepat waktu.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowSimulator(!showSimulator)}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-variant text-on-surface text-xs font-semibold transition-colors cursor-pointer self-start sm:self-auto border border-surface-container-high"
        >
          <Calculator size={13} />
          <span>{showSimulator ? 'Tutup Simulasi' : 'Kalkulator Simulasi'}</span>
          {showSimulator ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Progress & Pacing Metrics (Bila Grup memiliki Target) */}
      {hasActiveTarget ? (
        <div className="flex flex-col gap-space-xs pt-1">
          {/* Progress Bar */}
          <div className="flex items-baseline justify-between text-xs font-medium">
            <span className="text-on-surface-variant">
              Progres Terkumpul:{' '}
              <strong className="text-secondary font-bold tabular-nums">{pct}%</strong>
            </span>
            <span className="text-on-surface-variant">
              Sisa Kebutuhan:{' '}
              <strong className="text-on-surface font-semibold tabular-nums">
                <MaskableText value={formatRupiah(remainingAmount)} />
              </strong>
            </span>
          </div>

          <div className="h-2 w-full bg-surface-container-highest rounded-full overflow-hidden">
            <div
              className="h-full bg-secondary rounded-full transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>

          {/* Rekomendasi Pacing Cards */}
          {!isAchieved && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-1">
              {/* Bulanan */}
              <div className="p-3 rounded-xl bg-surface-container-lowest border border-surface-container-high flex flex-col justify-between">
                <span className="font-caption text-[11px] text-on-surface-variant">
                  Setoran per Bulan
                </span>
                <span className="font-currency-body text-base font-bold text-secondary tabular-nums mt-0.5">
                  <MaskableText value={formatRupiah(monthlyNeeded)} />
                </span>
                {memberCount > 1 ? (
                  <span className="text-[10px] text-on-surface-variant mt-0.5">
                    ({formatRupiah(perMemberMonthly)} / orang)
                  </span>
                ) : (
                  <span className="text-[10px] text-on-surface-variant mt-0.5">
                    Rekomendasi bulanan
                  </span>
                )}
              </div>

              {/* Mingguan */}
              <div className="p-3 rounded-xl bg-surface-container-lowest border border-surface-container-high flex flex-col justify-between">
                <span className="font-caption text-[11px] text-on-surface-variant">
                  Setoran per Minggu
                </span>
                <span className="font-currency-body text-base font-bold text-on-surface tabular-nums mt-0.5">
                  <MaskableText value={formatRupiah(weeklyNeeded)} />
                </span>
                {memberCount > 1 ? (
                  <span className="text-[10px] text-on-surface-variant mt-0.5">
                    ({formatRupiah(perMemberWeekly)} / orang)
                  </span>
                ) : (
                  <span className="text-[10px] text-on-surface-variant mt-0.5">
                    4 siklus / bulan
                  </span>
                )}
              </div>

              {/* Harian */}
              <div className="p-3 rounded-xl bg-surface-container-lowest border border-surface-container-high flex flex-col justify-between">
                <span className="font-caption text-[11px] text-on-surface-variant">
                  Cukup Sisihkan per Hari
                </span>
                <span className="font-currency-body text-base font-bold text-primary tabular-nums mt-0.5">
                  <MaskableText value={formatRupiah(dailyNeeded)} />
                </span>
                <span className="text-[10px] text-primary flex items-center gap-1 mt-0.5">
                  <Coffee size={10} /> Setara secangkir kopi
                </span>
              </div>
            </div>
          )}

          {targetDate && (
            <p className="text-[11px] text-on-surface-variant mt-0.5">
              📅 Tenggat: <strong>{formatDate(targetDate + 'T00:00:00')}</strong> • Tersisa{' '}
              <strong className="text-secondary">{daysRemaining} hari lagi</strong> ({monthsRemaining} siklus bulanan).
            </p>
          )}
        </div>
      ) : (
        <div className="p-3 rounded-xl bg-surface-container-lowest border border-surface-container-high flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <HelpCircle size={16} className="text-secondary shrink-0" />
            <span className="text-xs text-on-surface-variant">
              {mode === 'group'
                ? 'Grup ini belum menetapkan target nominal & tanggal tenggat. Gunakan tombol kalkulator untuk melakukan simulasi target.'
                : 'Simulasikan target tabungan impian Anda (dana darurat, liburan, gadget) dengan kalkulator di bawah ini.'}
            </span>
          </div>
        </div>
      )}

      {/* Interactive Simulator Mode (Expandable) */}
      {showSimulator && (
        <div className="pt-space-sm border-t border-surface-container-high flex flex-col gap-space-sm animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <h4 className="font-headline-h3 text-xs font-bold text-on-surface uppercase tracking-wider">
              Simulasi Rencana Tabungan Baru
            </h4>
            <span className="text-[11px] text-secondary font-medium">Kalkulasi Otomatis</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
            {/* Controls Input Slider */}
            <div className="flex flex-col gap-space-sm">
              {/* Nominal Target */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-on-surface">Target Dana yang Dituju:</span>
                  <span className="text-secondary font-bold tabular-nums">
                    {formatRupiah(simAmount)}
                  </span>
                </div>
                <input
                  type="range"
                  min={500000}
                  max={50000000}
                  step={500000}
                  value={simAmount}
                  onChange={(e) => setSimAmount(Number(e.target.value))}
                  className="w-full accent-secondary cursor-pointer h-1.5 bg-surface-container-highest rounded-lg"
                />
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {QUICK_AMOUNTS.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setSimAmount(amt)}
                      className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                        simAmount === amt
                          ? 'bg-secondary text-on-secondary'
                          : 'bg-surface-container-highest text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      {formatRupiah(amt)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Jangka Waktu */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-on-surface">Jangka Waktu Pencapaian:</span>
                  <span className="text-secondary font-bold">{simMonths} Bulan</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={36}
                  step={1}
                  value={simMonths}
                  onChange={(e) => setSimMonths(Number(e.target.value))}
                  className="w-full accent-secondary cursor-pointer h-1.5 bg-surface-container-highest rounded-lg"
                />
                <div className="flex gap-1 mt-1.5">
                  {QUICK_MONTHS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setSimMonths(m)}
                      className={`flex-1 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer text-center ${
                        simMonths === m
                          ? 'bg-secondary text-on-secondary'
                          : 'bg-surface-container-highest text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      {m} Bln
                    </button>
                  ))}
                </div>
              </div>

              {/* Jumlah Anggota (Jika Mode Grup atau ingin patungan) */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-on-surface">Jumlah Anggota Patungan:</span>
                  <span className="text-secondary font-bold">{simMembers} Orang</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={20}
                  step={1}
                  value={simMembers}
                  onChange={(e) => setSimMembers(Number(e.target.value))}
                  className="w-full accent-secondary cursor-pointer h-1.5 bg-surface-container-highest rounded-lg"
                />
              </div>
            </div>

            {/* Live Calculation Results Card */}
            <div className="p-space-md rounded-xl bg-surface-container-lowest border border-secondary/30 flex flex-col justify-between gap-space-sm">
              <div>
                <span className="font-caption text-[11px] text-on-surface-variant block uppercase tracking-wider font-semibold">
                  Hasil Simulasi Setoran
                </span>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="font-currency-display text-2xl font-bold text-secondary tabular-nums">
                    {formatRupiah(simMonthly)}
                  </span>
                  <span className="text-xs text-on-surface-variant">/ bulan</span>
                </div>
                {simMembers > 1 && (
                  <p className="text-xs text-secondary font-medium mt-0.5">
                    Atau <strong>{formatRupiah(simPerMemberMonthly)}</strong> per orang setiap bulan
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-surface-container-low text-xs">
                <div>
                  <span className="text-on-surface-variant text-[11px] block">Per Minggu:</span>
                  <strong className="text-on-surface font-semibold tabular-nums">
                    {formatRupiah(simWeekly)}
                  </strong>
                </div>
                <div>
                  <span className="text-on-surface-variant text-[11px] block">Per Hari:</span>
                  <strong className="text-primary font-semibold tabular-nums">
                    {formatRupiah(simDaily)}
                  </strong>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-surface-container-low flex items-center gap-2 text-xs text-on-surface-variant">
                <Coffee size={14} className="text-primary shrink-0" />
                <span>
                  Hanya butuh menyisihkan <strong>{formatRupiah(simDaily)}/hari</strong> untuk
                  mengumpulkan <strong>{formatRupiah(simAmount)}</strong> dalam {simMonths} bulan!
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

