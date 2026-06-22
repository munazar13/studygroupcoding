import { useEffect, useMemo, useState } from 'react';
import LoadingState from '../components/LoadingState';
import PixelCard from '../components/PixelCard';
import { loadLearningData } from '../services/dataApi';
import { calculateAverageQuiz } from '../utils/levelSystem';

const tabs = [
  { id: 'xp', label: 'XP Tertinggi' },
  { id: 'streak', label: 'Streak' },
  { id: 'stage', label: 'Stage' },
  { id: 'quiz', label: 'Quiz' },
  { id: 'badge', label: 'Badge' }
];

export default function Leaderboard() {
  const [members, setMembers] = useState([]);
  const [activeTab, setActiveTab] = useState('xp');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLearningData()
      .then((data) => setMembers(data.members.filter((member) => member.status === 'approved')))
      .finally(() => setLoading(false));
  }, []);

  const rankedMembers = useMemo(() => {
    const sorted = [...members];

    if (activeTab === 'xp') {
      return sorted.sort((a, b) => Number(b.xp || 0) - Number(a.xp || 0));
    }

    if (activeTab === 'streak') {
      return sorted.sort((a, b) => Number(b.streak || 0) - Number(a.streak || 0));
    }

    if (activeTab === 'stage') {
      return sorted.sort((a, b) => Number(b.passedStages?.length || 0) - Number(a.passedStages?.length || 0));
    }

    if (activeTab === 'quiz') {
      return sorted.sort((a, b) => calculateAverageQuiz(b) - calculateAverageQuiz(a));
    }

    return sorted.sort((a, b) => Number(b.badges?.length || 0) - Number(a.badges?.length || 0));
  }, [activeTab, members]);

  function getScore(member) {
    if (activeTab === 'xp') return `${member.xp || 0} XP`;
    if (activeTab === 'streak') return `${member.streak || 0} hari`;
    if (activeTab === 'stage') return `${member.passedStages?.length || 0}/32 stage`;
    if (activeTab === 'quiz') return `${calculateAverageQuiz(member)} rata-rata`;
    return `${member.badges?.length || 0} badge`;
  }

  if (loading) {
    return <LoadingState />;
  }

  return (
    <main className="page-shell">
      <section className="page-hero compact-hero">
        <p className="eyebrow">Rank Board</p>
        <h1>Leaderboard</h1>
        <p>Kompetisi ringan berdasarkan XP, streak, stage, quiz, dan badge.</p>
      </section>

      <div className="tabbar">
        {tabs.map((tab) => (
          <button
            className={activeTab === tab.id ? 'active' : ''}
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <section className="leaderboard-list">
        {rankedMembers.length ? rankedMembers.map((member, index) => (
          <PixelCard className="leader-row" key={member.uid}>
            <span className="rank-number">#{index + 1}</span>
            <span className="avatar-mini">{member.avatar}</span>
            <div>
              <h3>{member.name}</h3>
              <p>{member.cohort}</p>
            </div>
            <strong>{getScore(member)}</strong>
          </PixelCard>
        )) : (
          <PixelCard className="empty-state">
            <h3>Belum ada anggota di leaderboard</h3>
            <p>Ranking akan tampil setelah pengurus menyetujui anggota.</p>
          </PixelCard>
        )}
      </section>
    </main>
  );
}
