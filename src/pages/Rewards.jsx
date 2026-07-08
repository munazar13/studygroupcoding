import { useEffect, useMemo, useState } from 'react';
import LoadingState from '../components/LoadingState';
import PixelButton from '../components/PixelButton';
import PixelCard from '../components/PixelCard';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { loadLearningData } from '../services/dataApi';
import { openChest } from '../utils/progress';
import { getRarityClassName, getRarityLabel } from '../utils/rarity';


function getRewardType(reward) {
  return String(reward?.type || reward?.category || '').toLowerCase();
}

function createFallbackReward(id, type = 'badge') {
  return {
    id,
    type,
    category: type,
    title: String(id).replace(/[-_]+/g, ' '),
    name: String(id).replace(/[-_]+/g, ' '),
    rarity: 'common',
    description: type === 'title' ? 'Title yang sudah kamu miliki.' : 'Badge yang sudah kamu miliki.'
  };
}

function mergeRewardItems(rewards = [], ownedIds = new Set(), type = 'badge') {
  const map = new Map();

  rewards
    .filter((reward) => getRewardType(reward).includes(type))
    .forEach((reward) => map.set(String(reward.id), reward));

  ownedIds.forEach((id) => {
    if (!map.has(String(id))) {
      map.set(String(id), createFallbackReward(id, type));
    }
  });

  return Array.from(map.values());
}

function normalizeChestForView(chest, index = 0) {
  if (typeof chest === 'string') {
    return {
      id: chest,
      chestId: chest,
      title: chest.replace(/[-_]+/g, ' '),
      rarity: 'common',
      sourceStageTitle: 'Reward lama',
      icon: '🎁'
    };
  }

  return {
    ...chest,
    id: String(chest?.id || chest?.chestId || `chest-${index}`),
    chestId: String(chest?.chestId || chest?.id || `chest-${index}`),
    title: chest?.title || chest?.name || 'Chest Baru',
    rarity: chest?.rarity || 'common',
    sourceStageTitle: chest?.sourceStageTitle || chest?.source || `Stage ${chest?.stageId || '-'}`,
    icon: chest?.icon || '🎁'
  };
}

export default function Rewards() {
  const { currentMember, updateCurrentMember } = useAuth();
  const { showToast } = useToast();

  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openingChestId, setOpeningChestId] = useState('');
  const [lastReward, setLastReward] = useState(null);

  useEffect(() => {
    loadLearningData()
      .then((data) => setRewards(data.rewards || []))
      .finally(() => setLoading(false));
  }, []);

  const unopenedChests = (currentMember?.unopenedChests || []).map(normalizeChestForView);
  const chestHistory = currentMember?.chestHistory || [];

  const ownedBadges = useMemo(() => {
    return new Set([
      ...(currentMember?.badges || []),
      ...(currentMember?.ownedBadges || []),
      ...((currentMember?.shopInventory || []).filter((item) => item?.type === 'badge').map((item) => item.id))
    ].map((item) => String(item)));
  }, [currentMember]);

  const ownedTitles = useMemo(() => {
    return new Set([
      ...(currentMember?.titles || []),
      ...(currentMember?.ownedTitles || []),
      ...((currentMember?.shopInventory || []).filter((item) => item?.type === 'title').map((item) => item.id))
    ].map((item) => String(item)));
  }, [currentMember]);

  const badgeRewards = useMemo(() => mergeRewardItems(rewards, ownedBadges, 'badge'), [rewards, ownedBadges]);
  const titleRewards = useMemo(() => mergeRewardItems(rewards, ownedTitles, 'title'), [rewards, ownedTitles]);

  if (loading) {
    return <LoadingState />;
  }

  async function handleOpenChest(chestId) {
    if (openingChestId) return;
    setOpeningChestId(chestId);

    try {
      const patch = openChest(currentMember, chestId);

      if (!patch) {
        showToast('Chest tidak ditemukan.', 'error');
        return;
      }

      await updateCurrentMember(patch);

      const newestReward = patch.chestHistory?.[0] || null;
      setLastReward(newestReward);

      showToast(newestReward?.rewardText || 'Chest berhasil dibuka.');
    } catch (error) {
      showToast(error.message || 'Gagal membuka chest.', 'error');
    } finally {
      setOpeningChestId('');
    }
  }

  return (
    <main className="page-shell rewards-page">
      <section className="page-hero compact-hero">
        <p className="eyebrow">Menu Hadiah</p>
        <h1>Hadiah & Chest</h1>
        <p>
          Chest yang kamu dapat dari stage akan masuk ke sini. Buka chest untuk
          mendapatkan XP, koin, badge, atau title.
        </p>
      </section>

      {lastReward ? (
        <PixelCard className="reward-reveal-card">
          <span className="big-icon">✨</span>
          <div>
            <p className="eyebrow">Hadiah Terbaru</p>
            <h2>{lastReward.rewardText}</h2>
            <p>{lastReward.title} · {lastReward.rarity || 'Chest'}</p>
          </div>
        </PixelCard>
      ) : null}

      <section className="two-column">
        <PixelCard>
          <div className="section-title-row">
            <h2>Chest Belum Dibuka</h2>
            <span>{unopenedChests.length} chest</span>
          </div>

          {unopenedChests.length ? (
            <div className="chest-list">
              {unopenedChests.map((chest) => (
                <div className="chest-item reward-chest-card" key={chest.id || chest.chestId}>
                  <span className="chest-icon">🎁</span>

                  <div>
                    <strong>{chest.title || 'Chest Baru'}</strong>
                    <p>
                      {chest.rarity || 'Common'} · dari {chest.sourceStageTitle || `Stage ${chest.stageId || '-'}`}
                    </p>
                    <small>Belum dibuka</small>
                  </div>

                  <PixelButton
                    type="button"
                    disabled={Boolean(openingChestId)}
                    onClick={() => handleOpenChest(chest.id || chest.chestId)}
                  >
                    {openingChestId === chest.id ? 'Membuka...' : 'Buka'}
                  </PixelButton>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-reward-box">
              <span>📦</span>
              <h3>Belum ada chest</h3>
              <p>
                Selesaikan stage tertentu untuk mendapatkan chest. Chest tidak
                terbuka otomatis, jadi nanti akan muncul di sini.
              </p>
            </div>
          )}
        </PixelCard>

        <PixelCard>
          <div className="section-title-row">
            <h2>Riwayat Chest</h2>
            <span>{chestHistory.length} dibuka</span>
          </div>

          {chestHistory.length ? (
            <ul className="clean-list reward-history-list">
              {chestHistory.slice(0, 10).map((chest) => (
                <li key={`${chest.id}-${chest.openedAt || chest.createdAt}`}>
                  <strong>{chest.title}</strong>
                  <span>{chest.rewardText}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty-reward-box">
              <span>🕹️</span>
              <h3>Belum ada riwayat</h3>
              <p>Chest yang sudah dibuka akan muncul di sini.</p>
            </div>
          )}
        </PixelCard>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <h2>Badge yang Dimiliki</h2>
          <p>Badge aktif nanti bisa ditampilkan di profil dan leaderboard.</p>
        </div>

        <div className="reward-grid">
          {badgeRewards.length ? badgeRewards.map((reward) => {
            const isOwned = ownedBadges.has(reward.id);

            return (
              <PixelCard
  className={`reward-card ${isOwned ? 'open' : 'locked'} ${getRarityClassName(reward.rarity)}`}
  key={reward.id}
>
                <span className="reward-icon">{isOwned ? '🏅' : '🔒'}</span>
                <h3>{reward.title || reward.name}</h3>
                <p>{reward.description || reward.unlockText || 'Badge reward.'}</p>
                <small>
  {getRarityLabel(reward.rarity)} · {isOwned ? 'Sudah dimiliki' : reward.requirement || 'Belum dimiliki'}
</small>
              </PixelCard>
            );
          }) : (
            <PixelCard>
              <h3>Belum ada data badge</h3>
              <p>Badge akan muncul setelah data reward ditambahkan.</p>
            </PixelCard>
          )}
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <h2>Title yang Dimiliki</h2>
          <p>Title bisa dipakai untuk mempercantik nama di leaderboard.</p>
        </div>

        <div className="reward-grid">
          {titleRewards.length ? titleRewards.map((reward) => {
            const isOwned = ownedTitles.has(reward.id);

            return (
              <PixelCard className={`reward-card ${isOwned ? 'open' : 'locked'} ${getRarityClassName(reward.rarity)}`} key={reward.id}>
                <span className="reward-icon">{isOwned ? '🎖️' : '🔒'}</span>
                <h3>{reward.title || reward.name}</h3>
                <p>{reward.description || reward.unlockText || 'Title reward.'}</p>
                <small>{getRarityLabel(reward.rarity)} · {isOwned ? 'Sudah dimiliki' : reward.requirement || 'Belum dimiliki'}</small>
              </PixelCard>
            );
          }) : (
            <PixelCard>
              <h3>Belum ada data title</h3>
              <p>Title akan muncul setelah data reward ditambahkan.</p>
            </PixelCard>
          )}
        </div>
      </section>
    </main>
  );
}