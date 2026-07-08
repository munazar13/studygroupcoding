import { useEffect, useMemo, useState } from 'react';
import LoadingState from '../components/LoadingState';
import PixelButton from '../components/PixelButton';
import PixelCard from '../components/PixelCard';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { equipShopItem, loadShopItems, memberOwnsShopItem, purchaseShopItem } from '../services/dataApi';
import { getRarityClassName, getRarityLabel } from '../utils/rarity';

const typeLabels = {
  avatar: 'Avatar',
  frame: 'Frame',
  title: 'Title',
  badge: 'Badge',
  nameColor: 'Warna Nama',
  profileDecoration: 'Dekorasi Profil'
};

function isEquipped(member, item) {
  if (!member || !item) return false;
  if (item.type === 'avatar') return String(member.activeAvatar || '') === String(item.id || '');
  if (item.type === 'frame') return String(member.activeFrame || '') === String(item.id || '');
  if (item.type === 'title') return String(member.activeTitle || '') === String(item.id || '');
  if (item.type === 'badge') return String(member.activeBadge || '') === String(item.id || '');
  if (item.type === 'nameColor') {
    return String(member.activeNameColorItemId || '') === String(item.id || '')
      || String(member.activeNameColor || '') === String(item.color || '');
  }
  if (item.type === 'profileDecoration') {
    return String(member.activeProfileDecorationItemId || '') === String(item.id || '')
      || String(member.activeProfileDecoration || '') === String(item.id || '');
  }
  return false;
}

export default function Shop() {
  const { currentMember, refreshMember } = useAuth();
  const { showToast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [busyId, setBusyId] = useState('');

  useEffect(() => {
    loadShopItems()
      .then(setItems)
      .catch((error) => showToast(error.message || 'Gagal memuat shop.', 'error'))
      .finally(() => setLoading(false));
  }, [showToast]);

  const filteredItems = useMemo(() => {
    if (filter === 'all') return items;
    return items.filter((item) => item.type === filter);
  }, [items, filter]);

  async function handleBuy(item) {
    if (busyId) return;
    setBusyId(item.id);
    try {
      await purchaseShopItem(currentMember, item);
      await refreshMember();
      showToast(`Berhasil membeli ${item.name}. Item siap dipakai dari inventory.`);
    } catch (error) {
      showToast(error.message || 'Gagal membeli item.', 'error');
    } finally {
      setBusyId('');
    }
  }

  async function handleEquip(item) {
    if (busyId) return;
    setBusyId(item.id);
    try {
      await equipShopItem(currentMember, item);
      await refreshMember();
      showToast(`${item.name} berhasil dipakai.`);
    } catch (error) {
      showToast(error.message || 'Gagal memakai item.', 'error');
    } finally {
      setBusyId('');
    }
  }

  if (loading) return <LoadingState />;

  return (
    <main className="page-shell shop-page">
      <section className="page-hero compact-hero">
        <p className="eyebrow">Coin Shop</p>
        <h1>Tukar koin dengan item kosmetik</h1>
        <p>Item shop hanya kosmetik: avatar, frame, badge, title, warna nama, dan dekorasi profil. Koin tidak bisa membeli jawaban quiz atau kelulusan stage.</p>
        <div className="shop-balance-card">
          <span>🪙</span>
          <strong>{currentMember?.coins || 0}</strong>
          <small>Koin tersedia</small>
        </div>
      </section>

      <div className="tabbar shop-filter">
        <button type="button" className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>Semua</button>
        {Object.entries(typeLabels).map(([type, label]) => (
          <button key={type} type="button" className={filter === type ? 'active' : ''} onClick={() => setFilter(type)}>{label}</button>
        ))}
      </div>

      {filteredItems.length ? (
        <section className="reward-grid shop-grid">
          {filteredItems.map((item) => {
            const owned = memberOwnsShopItem(currentMember, item);
            const equipped = isEquipped(currentMember, item);
            const affordable = Number(currentMember?.coins || 0) >= Number(item.price || 0);
            const shopLocked = Boolean(busyId);

            return (
              <PixelCard className={`shop-item-card ${getRarityClassName(item.rarity)} ${owned ? 'owned' : ''}`} key={item.id}>
                <span className="shop-item-icon" style={item.color ? { color: item.color } : undefined}>{item.icon || '🎁'}</span>
                <p className="eyebrow">{typeLabels[item.type] || item.type}</p>
                <h3>{item.name}</h3>
                <p>{item.description || 'Item kosmetik untuk mempercantik profil.'}</p>
                <small>{getRarityLabel(item.rarity)} · 🪙 {item.price || 0}</small>

                {owned ? (
                  <PixelButton type="button" variant={equipped ? 'secondary' : 'primary'} disabled={equipped || shopLocked} onClick={() => handleEquip(item)}>
                    {busyId === item.id ? 'Memasang...' : equipped ? 'Sedang Dipakai' : 'Pakai Item'}
                  </PixelButton>
                ) : (
                  <PixelButton type="button" disabled={!affordable || shopLocked} onClick={() => handleBuy(item)}>
                    {busyId === item.id ? 'Membeli...' : affordable ? 'Beli Item' : 'Koin Kurang'}
                  </PixelButton>
                )}
              </PixelCard>
            );
          })}
        </section>
      ) : (
        <PixelCard className="locked-panel">
          <span className="big-icon">🛒</span>
          <h2>Item belum tersedia</h2>
          <p>Admin belum mempublikasikan item shop untuk kategori ini.</p>
        </PixelCard>
      )}

      <section className="section-block two-column">
        <PixelCard>
          <h2>Inventory</h2>
          {(currentMember?.shopInventory || []).length ? (
            <div className="compact-list">
              {(currentMember.shopInventory || []).slice(0, 8).map((item) => (
                <div className="mini-row" key={`${item.id}-${item.purchasedAt}`}>
                  <strong>{item.icon} {item.name}</strong>
                  <span>{typeLabels[item.type] || item.type}</span>
                </div>
              ))}
            </div>
          ) : <p>Belum ada item shop yang dibeli.</p>}
        </PixelCard>
        <PixelCard>
          <h2>Riwayat Transaksi</h2>
          {(currentMember?.coinTransactions || []).length ? (
            <div className="compact-list">
              {(currentMember.coinTransactions || []).slice(0, 8).map((tx) => (
                <div className="mini-row" key={tx.id}>
                  <strong>{Number(tx.amount || 0) > 0 ? '+' : ''}{tx.amount} koin</strong>
                  <span>{tx.description}</span>
                </div>
              ))}
            </div>
          ) : <p>Belum ada riwayat transaksi koin.</p>}
        </PixelCard>
      </section>
    </main>
  );
}
