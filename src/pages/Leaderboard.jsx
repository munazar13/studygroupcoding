import { useEffect, useMemo, useState } from 'react';
import LoadingState from '../components/LoadingState';
import PixelCard from '../components/PixelCard';
import { loadLearningData } from '../services/dataApi';
import { getXpPercent } from '../utils/levelSystem';
import { getRarityClassName, getRarityLabel } from '../utils/rarity';

const tabs = [
  { id: 'main', label: '🏆 Rank Utama' },
  { id: 'stage', label: '🗺️ Penakluk Stage' },
  { id: 'streak', label: '🔥 Streak Harian' },
  { id: 'badge', label: '🎖️ Kolektor Badge' }
];

function getCompletedStageCount(member) {
  const completedStages = member.completedStages || member.passedStages || [];
  return completedStages.length;
}

function getOwnedBadgeIds(member) {
  return Array.from(new Set([
    ...(member.badges || []),
    ...(member.ownedBadges || [])
  ]));
}

function getOwnedTitleIds(member) {
  return Array.from(new Set([
    ...(member.titles || []),
    ...(member.ownedTitles || [])
  ]));
}

function getRewardName(reward, fallback = '') {
  return reward?.title || reward?.name || fallback || 'Belum dipilih';
}

function getRewardById(rewards, id, type = 'reward') {
  if (!id) return null;

  return rewards.find((reward) => String(reward.id) === String(id)) || {
    id,
    name: String(id).replace(/[-_]+/g, ' '),
    title: String(id).replace(/[-_]+/g, ' '),
    type,
    category: type,
    rarity: 'common'
  };
}

function compareMainRank(a, b) {
  const levelA = Number(a.level || 1);
  const levelB = Number(b.level || 1);

  if (levelB !== levelA) return levelB - levelA;

  const xpPercentB = getXpPercent(b);
  const xpPercentA = getXpPercent(a);

  if (xpPercentB !== xpPercentA) return xpPercentB - xpPercentA;

  const totalXpB = Number(b.totalXp || b.xp || 0);
  const totalXpA = Number(a.totalXp || a.xp || 0);

  if (totalXpB !== totalXpA) return totalXpB - totalXpA;

  return getCompletedStageCount(b) - getCompletedStageCount(a);
}

function formatLetting(member = {}) {
  const letting = String(member.cohort || member.letting || member.angkatan || '').trim();

  if (!letting) {
    return 'Letting belum diisi';
  }

  if (letting.toLowerCase().includes('letting')) {
    return letting;
  }

  return `Letting ${letting}`;
}

function getRarityClassName(rarity) {
  const cleanRarity = String(rarity || 'common')
    .trim()
    .toLowerCase();

  return `rarity-${cleanRarity}`;
}

export default function Leaderboard() {
  const [members, setMembers] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [activeTab, setActiveTab] = useState('main');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLearningData()
      .then((data) => {
        setMembers((data.members || []).filter((member) => member.status === 'approved'));
        setRewards(data.rewards || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const rankedMembers = useMemo(() => {
    const sorted = [...members];

    if (activeTab === 'main') {
      return sorted.sort(compareMainRank);
    }

    if (activeTab === 'stage') {
      return sorted.sort((a, b) => {
        const stageDiff = getCompletedStageCount(b) - getCompletedStageCount(a);
        if (stageDiff !== 0) return stageDiff;

        return compareMainRank(a, b);
      });
    }

    if (activeTab === 'streak') {
      return sorted.sort((a, b) => {
        const streakDiff = Number(b.streak || 0) - Number(a.streak || 0);
        if (streakDiff !== 0) return streakDiff;

        return compareMainRank(a, b);
      });
    }

    if (activeTab === 'badge') {
      return sorted.sort((a, b) => {
        const badgeDiff = getOwnedBadgeIds(b).length - getOwnedBadgeIds(a).length;
        if (badgeDiff !== 0) return badgeDiff;

        const titleDiff = getOwnedTitleIds(b).length - getOwnedTitleIds(a).length;
        if (titleDiff !== 0) return titleDiff;

        return compareMainRank(a, b);
      });
    }

    return sorted;
  }, [activeTab, members]);

  function getMainScore(member) {
    if (activeTab === 'main') {
      return `Level ${member.level || 1}`;
    }

    if (activeTab === 'stage') {
      return `${getCompletedStageCount(member)}/32 stage`;
    }

    if (activeTab === 'streak') {
      return `${member.streak || 0} hari`;
    }

    return `${getOwnedBadgeIds(member).length} badge`;
  }

  function getRankMedal(index) {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `#${index + 1}`;
  }

  if (loading) {
    return <LoadingState />;
  }

  return (
    <main className="page-shell leaderboard-page">
      <section className="page-hero compact-hero">
        <p className="eyebrow">Rank Board</p>
        <h1>Leaderboard</h1>
        <p>
          Ranking utama dihitung dari level, XP bar, total XP, dan stage selesai.
          Badge serta title aktif akan tampil di nama anggota.
        </p>
      </section>

      <div className="tabbar leaderboard-tabs">
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
        {rankedMembers.length ? rankedMembers.map((member, index) => {
          const xpPercent = getXpPercent(member);
          const activeBadge = getRewardById(rewards, member.activeBadge, 'badge');
          const activeTitle = getRewardById(rewards, member.activeTitle, 'title');

          return (
            <PixelCard className={`leader-row-v2 rank-${index + 1}`} key={member.uid}>
              <div className="leader-rank">
                {getRankMedal(index)}
              </div>

              <div className="leader-avatar">
                {member.avatar || '🧑‍💻'}
              </div>

              <div className="leader-info">
                <div className="leader-name-row">
                  <h3>{member.name}</h3>
                  <p className="leader-letting">
                  {formatLetting(member)}
                  </p>

                  {activeBadge ? (
                    <span className={`leader-badge-pill ${getRarityClassName(activeBadge.rarity || 'common')}`}>
                      🏅 {getRewardName(activeBadge)}
                    </span>
                  ) : null}
                </div>

                <p>
                  {activeTitle ? (
                   <span className={`leader-title-pill ${getRarityClassName(activeTitle.rarity || 'common')}`}>
                    🎖️ {getRewardName(activeTitle)}
                  </span>
                  ) : (
                    <span>Belum memakai title</span>
                  )}
                </p>

                <div className="leader-level-line">
                  <span>Level {member.level || 1}</span>
                  {"  "}
                  <span>{Number(member.xp || 0)}/{Number(member.xpToNextLevel || 100)} XP</span>
                </div>

                <div className="pixel-progress">
                  <span style={{ width: `${xpPercent}%` }} />
                </div>

                <small>
                  Stage selesai {getCompletedStageCount(member)}/32 · Badge {getOwnedBadgeIds(member).length} · Title {getOwnedTitleIds(member).length}
                </small>
              </div>

              <strong className="leader-score">
                {getMainScore(member)}
              </strong>
            </PixelCard>
          );
        }) : (
          <PixelCard className="empty-state">
            <h3>Belum ada anggota di leaderboard</h3>
            <p>Ranking akan tampil setelah pengurus menyetujui anggota.</p>
          </PixelCard>
        )}
      </section>

      <PixelCard className="leaderboard-note">
        <h3>Aturan Ranking</h3>
        <p>
          Rank Utama memakai urutan: level tertinggi, XP bar tertinggi, total XP,
          lalu jumlah stage selesai. XP tidak ditampilkan besar-besar, cukup lewat
          bar supaya leaderboard tetap rapi.
        </p>
      </PixelCard>
    </main>
  );
}