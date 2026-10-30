import { SupabaseClient } from '@supabase/supabase-js';
import { NotificationItem } from '@/components/NotificationCenter';
import { formatRupiah, formatDate } from '@/utils/format';

export async function getUserNotifications(
  supabase: SupabaseClient,
  userId: string
): Promise<NotificationItem[]> {
  const notifications: NotificationItem[] = [];

  try {
    // 1. Ambil pos tabungan aktif di mana user terdaftar sebagai anggota
    const { data: userMemberships } = await supabase
      .from('pot_members')
      .select('pot_id, role, savings_pots(id, name, type)')
      .eq('user_id', userId)
      .eq('status', 'ACTIVE');

    const userPotIds: string[] = [];
    const potMap = new Map<string, { id: string; name: string; type: string }>();

    (userMemberships ?? []).forEach((m: any) => {
      const p = Array.isArray(m.savings_pots) ? m.savings_pots[0] : m.savings_pots;
      if (p?.id) {
        userPotIds.push(p.id);
        potMap.set(p.id, { id: p.id, name: p.name, type: p.type });
      }
    });

    if (userPotIds.length > 0) {
      // 2. Ambil transaksi yang di-VOID hanya dari pos yang user miliki atau ikuti
      const { data: voidedTxs } = await supabase
        .from('transactions')
        .select('id, pot_id, amount, description, void_reason, updated_at, transaction_date')
        .in('pot_id', userPotIds)
        .eq('status', 'VOIDED')
        .order('updated_at', { ascending: false })
        .limit(5);

      (voidedTxs ?? []).forEach((tx: any) => {
        const pot = potMap.get(tx.pot_id);
        const potName = pot ? pot.name : 'Pos Tabungan';
        const isShared = pot?.type === 'SHARED';

        notifications.push({
          id: `void-${tx.id}`,
          type: 'VOID',
          title: `Transaksi Dibatalkan (${potName})`,
          message: `Transaksi Rp ${new Intl.NumberFormat('id-ID').format(tx.amount)} ${
            tx.description ? `("${tx.description}")` : ''
          } telah dibatalkan.${tx.void_reason ? ` Alasan: ${tx.void_reason}` : ''}`,
          timestamp: tx.updated_at
            ? formatDate(tx.updated_at)
            : 'Baru saja',
          link: isShared ? `/dashboard/shared?group=${tx.pot_id}` : '/dashboard/personal',
        });
      });

      // 3. Ambil transaksi kontribusi terbaru khusus di pos bersama (SHARED) yang diikuti user
      const sharedPotIds = userPotIds.filter((id) => potMap.get(id)?.type === 'SHARED');

      if (sharedPotIds.length > 0) {
        const { data: sharedTxs } = await supabase
          .from('transactions')
          .select('id, pot_id, amount, transaction_type, transaction_date, created_by_user_id, profiles:created_by_user_id(name)')
          .in('pot_id', sharedPotIds)
          .eq('status', 'ACTIVE')
          .eq('transaction_type', 'CONTRIBUTION')
          .order('transaction_date', { ascending: false })
          .limit(5);

        (sharedTxs ?? []).forEach((tx: any) => {
          const pot = potMap.get(tx.pot_id);
          const potName = pot ? pot.name : 'Pos Bersama';
          const senderName = (Array.isArray(tx.profiles) ? tx.profiles[0] : tx.profiles)?.name || 'Anggota';
          const isMe = tx.created_by_user_id === userId;

          notifications.push({
            id: `tx-${tx.id}`,
            type: 'CONTRIBUTION',
            title: isMe ? `Setoran Berhasil ke ${potName}` : `Setoran Baru di ${potName}`,
            message: `${isMe ? 'Kamu' : senderName} telah menyetor ${formatRupiah(tx.amount)} ke kas bersama.`,
            timestamp: formatDate(tx.transaction_date),
            link: `/dashboard/shared?group=${tx.pot_id}`,
          });
        });
      }
    }

    // 4. Fallback jika tidak ada notifikasi, berikan sambutan sistem
    if (notifications.length === 0) {
      notifications.push({
        id: 'system-welcome',
        type: 'SYSTEM',
        title: 'Selamat Datang di TabungKu! 🎉',
        message: 'Mulai kelola tabungan pribadimu atau buat tabungan bersama dengan keluarga dan sahabat.',
        timestamp: 'Hari ini',
        link: '/dashboard',
      });
    }
  } catch (error) {
    console.error('Error fetching notifications:', error);
    notifications.push({
      id: 'system-welcome-fallback',
      type: 'SYSTEM',
      title: 'Selamat Datang di TabungKu!',
      message: 'Semua sistem pencatatan keuanganmu aktif dan aman.',
      timestamp: 'Hari ini',
      link: '/dashboard',
    });
  }

  return notifications;
}
