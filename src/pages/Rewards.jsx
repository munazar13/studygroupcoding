import { useEffect, useMemo, useState } from 'react';
import LoadingState from '../components/LoadingState';
import PixelButton from '../components/PixelButton';
import PixelCard from '../components/PixelCard';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { loadLearningData } from '../services/dataApi';
import { openChest } from '../utils/progress';

export default function Rewards() {
  const { currentMember, updateCurrentMember } = useAuth();
  const { showToast } = useToast();
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLearningData()
      .then((data) => setRewards(data.rewards))
      .finally(() => setLoading(false));
  }, []);

  const unlocked = useMemo(() => new Set([...(currentMember.badges || []), ...(currentMember.unlockedRewards || [])]), [currentMember]);

  if (loading) {
    return <LoadingState />;
  }

  async function handleOpenChest(chestId) {
    const patch = openChest(currentMember, chestId);

    if (!patch) {
      showToast('Chest tidak ditemukan.', 'error');
      return;
    }

    await updateCurrentMember(patch);
    showToast('Chest terbuka. XP dan koin masuk ke profil.');
  }

  return (
    <main className="page-shell">
      <section className="page-hero compact-hero">
        <p className="eyebrow">Reward Collection</p>
        <h1>Chest, Badge, dan Title</h1>
        <p>Kumpulkan reward dari course, quiz, dan streak belajar.</p>
      </section>

      <section className="two-column">
        <PixelCard>
          <h2>Chest Belum Dibuka</h2>
          {(currentMember.unopenedChests || []).length ? (
            <div className="chest-list">
              {currentMember.unopenedChests.map((chest) => (
                <div className="chest-item" key={chest.id}>
                  <span>🎁</span>
                  <div>
                    <strong>{chest.title}</strong>
                    <p>{chest.rarity} · +{chest.xp} XP · +{chest.coins} koin</p>
                  </div>
                  <PixelButton onClick={() => handleOpenChest(chest.id)}>Buka</PixelButton>
                </div>
              ))}
            </div>
          ) : (
            <p>Belum ada chest. Selesaikan Quiz Battle untuk mendapat peti baru.</p>
          )}
        </PixelCard>

        <PixelCard>
          <h2>Riwayat Chest</h2>
          {(currentMember.chestHistory || []).length ? (
            <ul className="clean-list">
              {currentMember.chestHistory.slice(0, 8).map((chest) => (
                <li key={chest.id}>{chest.title} · {chest.rewardText}</li>
              ))}
            </ul>
          ) : (
            <p>Chest yang sudah dibuka akan muncul di sini.</p>
          )}
        </PixelCard>
      </section>

      <section className="reward-grid">
        {rewards.map((reward) => {
          const isUnlocked = unlocked.has(reward.id);

          return (
            <PixelCard className={isUnlocked ? 'reward-card open' : 'reward-card locked'} key={reward.id}>
              <span className="reward-icon">{isUnlocked ? '🏅' : '🔒'}</span>
              <h3>{reward.title || reward.name}</h3>
              <p>{reward.description || reward.unlockText || 'Buka dengan menyelesaikan stage tertentu.'}</p>
              <small>{isUnlocked ? 'Sudah terbuka' : reward.requirement || 'Masih terkunci'}</small>
            </PixelCard>
          );
        })}
      </section>
    </main>
  );
}
