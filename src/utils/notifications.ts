import { SupabaseClient } from '@supabase/supabase-js';
import { NotificationItem } from '@/components/NotificationCenter';
import { formatRupiah } from '@/utils/format';

export async function getUserNotifications(
  supabase: SupabaseClient,
  userId: string
): Promise<NotificationItem[]> {
  const notifications: NotificationItem[] = [];

  try {
    // 1. Ambil transaksi yang di-VOID terbaru
    const { data: voidedTxs } = await supabase
      .from('transactions')
      .select('id, amount, description, void_reason, updated_at, scope_type')
      .eq('status', 'VOIDED')
      .order('updated_at', { ascending: false })
      .limit(3);

    (voidedTxs ?? []).forEach((tx: any) => {
      notifications.push({
        id: `void-${tx.id}`,
        type: 'VOID',
        title: 'Transaksi Dibatalkan (Void)',
        message: `Transaksi Rp ${new Intl.NumberFormat('id-ID').format(tx.amount)} ${tx.description ? `("${tx.description}")` : ''} telah dibatalkan.${tx.void_reason ? ` Alasan: ${tx.void_reason}` : ''}`,
        timestamp: tx.updated_at ? new Date(tx.updated_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : 'Baru saja',
        link: '/dashboard/transactions',
      });
    });

    // 2. Ambil grup pengguna dan periksa progress target
    const { data: memberships } = await supabase
      .from('savings_group_members')
      .select('group_id, savings_groups(id, name, target_amount, opening_balance)')
      .eq('user_id', userId)
      .eq('status', 'ACTIVE');

    const groupIds: string[] = [];
    const groups: any[] = [];
    (memberships ?? []).forEach((m: any) => {
      const g = Array.isArray(m.savings_groups) ? m.savings_groups[0] : m.savings_groups;
      if (g) {
        groupIds.push(g.id);
        groups.push(g);
      }
    });

    if (groupIds.length > 0) {
      // Ambil transaksi grup terbaru dari anggota
      const { data: groupTxs } = await supabase
        .from('transactions')
        .select('id, amount, transaction_type, transaction_date, group_id, created_by_user_id, profiles:created_by_user_id(name), savings_groups:group_id(name)')
        .in('group_id', groupIds)
        .eq('status', 'ACTIVE')
        .order('transaction_date', { ascending: false })
        .limit(4);

      (groupTxs ?? []).forEach((tx: any) => {
        const groupName = (Array.isArray(tx.savings_groups) ? tx.savings_groups[0] : tx.savings_groups)?.name || 'Grup';
        const senderName = (Array.isArray(tx.profiles) ? tx.profiles[0] : tx.profiles)?.name || 'Anggota';
        const isMe = tx.created_by_user_id === userId;

        if (tx.transaction_type === 'CONTRIBUTION') {
          notifications.push({
            id: `tx-${tx.id}`,
            type: 'CONTRIBUTION',
            title: isMe ? `Setoran Berhasil ke ${groupName}` : `Setoran Baru di ${groupName}`,
            message: `${isMe ? 'Kamu' : senderName} telah menyetor ${formatRupiah(tx.amount)} ke tabungan bersama.`,
            timestamp: tx.transaction_date,
            link: `/dashboard/shared?group=${tx.group_id}`,
          });
        }
      });
    }

    // 3. Fallback jika masih kosong, berikan sambutan sistem
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
  } catch {
    // Graceful fallback
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
