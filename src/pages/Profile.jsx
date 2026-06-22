import { useEffect, useState } from 'react';
import LoadingState from '../components/LoadingState';
import PixelCard from '../components/PixelCard';
import StatCard from '../components/StatCard';
import { useAuth } from '../context/AuthContext';
import { loadLearningData } from '../services/dataApi';
import { calculateAverageQuiz, getRank } from '../utils/levelSystem';

export default function Profile() {
  const { currentMember } = useAuth();
  const [ranks, setRanks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLearningData()
      .then((data) => setRanks(data.ranks))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <LoadingState />;
  }

  const rank = getRank(ranks, currentMember.xp);

  return (
    <main className="page-shell">
      <section className="profile-header">
        <div className="profile-avatar">{currentMember.avatar}</div>
        <div>
          <p className="eyebrow">Profil Anggota</p>
          <h1>{currentMember.name}</h1>
          <p>{rank.name} · {currentMember.cohort}</p>
        </div>
      </section>

      <section className="stat-grid">
        <StatCard icon="⭐" value={currentMember.xp || 0} label="XP" />
        <StatCard icon="🪙" value={currentMember.coins || 0} label="Koin" />
        <StatCard icon="🔥" value={currentMember.streak || 0} label="Streak" />
        <StatCard icon="🧠" value={calculateAverageQuiz(currentMember)} label="Rata-rata Quiz" />
      </section>

      <section className="two-column">
        <PixelCard>
          <h2>Progress</h2>
          <p>Stage selesai: {currentMember.passedStages?.length || 0}/32</p>
          <p>Stage aktif: {currentMember.currentStage || 1}</p>
          <p>NIM: {currentMember.nim}</p>
        </PixelCard>
        <PixelCard>
          <h2>Badge</h2>
          {(currentMember.badges || []).length ? (
            <div className="badge-list">
              {currentMember.badges.map((badge) => <span key={badge}>🏅 {badge}</span>)}
            </div>
          ) : (
            <p>Badge akan muncul setelah kamu menyelesaikan Quiz Battle.</p>
          )}
        </PixelCard>
      </section>
    </main>
  );
}
