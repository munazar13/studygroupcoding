import { useEffect, useMemo, useState } from 'react';
import LoadingState from '../components/LoadingState';
import MemberName from '../components/MemberName';
import PixelCard from '../components/PixelCard';
import { useAuth } from '../context/AuthContext';
import { loadLeaderboardData } from '../services/dataApi';
import { findCosmeticById } from '../utils/cosmetics';
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
  if (Array.isArray(completedStages) && completedStages.length) {
    return completedStages.length;
  }

  return Number(member.completedStageCount || member.stageCompleted || 0);
}

function getOwnedBadgeIds(member) {
  return Array.from(new Set([
    ...(member.badges || []),
    ...(member.ownedBadges || []),
    ...((member.shopInventory || []).filter((item) => item?.type === 'badge').map((item) => item.id))
  ]));
}

function getOwnedTitleIds(member) {
  return Array.from(new Set([
    ...(member.titles || []),
    ...(member.ownedTitles || []),
    ...((member.shopInventory || []).filter((item) => item?.type === 'title').map((item) => item.id))
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

function getMemberId(member = {}) {
  return String(member.uid || member.id || member.memberId || '').trim();
}

function isApprovedForLeaderboard(member = {}) {
  return member.role === 'admin' || member.status === 'approved' || member.status === 'active';
}


export default function Leaderboard() {
  const { currentMember } = useAuth();
  const [members, setMembers] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [shopItems, setShopItems] = useState([]);
  const [activeTab, setActiveTab] = useState('main');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboardData()
      .then((data) => {
        setMembers((data.members || []).filter(isApprovedForLeaderboard));
        setRewards(data.rewards || []);
        setShopItems(data.shopItems || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const leaderboardMembers = useMemo(() => {
    const baseMembers = [...members];
    const currentId = getMemberId(currentMember);

    if (!currentId || !isApprovedForLeaderboard(currentMember)) {
      return baseMembers;
    }

    const currentLeaderboardProfile = {
      ...currentMember,
      id: currentId,
      uid: currentId,
      status: currentMember.status || 'approved'
    };

    const currentIndex = baseMembers.findIndex((member) => getMemberId(member) === currentId);

    if (currentIndex >= 0) {
      baseMembers[currentIndex] = {
        ...baseMembers[currentIndex],
        ...currentLeaderboardProfile
      };
    } else {
      baseMembers.push(currentLeaderboardProfile);
    }

    return baseMembers;
  }, [currentMember, members]);

  const rankedMembers = useMemo(() => {
    const sorted = [...leaderboardMembers];

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
  }, [activeTab, leaderboardMembers]);

  const currentMemberId = getMemberId(currentMember);
  const topRankedMembers = rankedMembers.slice(0, 10);
  const currentRankIndex = currentMemberId
    ? rankedMembers.findIndex((member) => getMemberId(member) === currentMemberId)
    : -1;
  const currentRankMember = currentRankIndex >= 0 ? rankedMembers[currentRankIndex] : null;
  const currentInTopTen = currentRankIndex >= 0 && currentRankIndex < 10;

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

  function renderLeaderRow(member, index, { currentUser = false, compact = false } = {}) {
    const activeBadge = findCosmeticById({ rewards, shopItems, member, id: member.activeBadge, type: 'badge' });
    const activeTitle = findCosmeticById({ rewards, shopItems, member, id: member.activeTitle, type: 'title' });

    return (
      <PixelCard className={[`leader-row-v2 rank-${index + 1}`, currentUser ? 'current-user' : '', compact ? 'compact' : ''].filter(Boolean).join(' ')} key={`${getMemberId(member) || member.name}-${index}`}>
        <div className="leader-rank">
          {getRankMedal(index)}
        </div>

        <div className="leader-avatar">
          {member.avatar || '🧑‍💻'}
        </div>

        <div className="leader-info">
          <div className="leader-name-row">
            <h3><MemberName member={member} shopItems={shopItems} /></h3>
            {currentUser ? <span className="your-rank-chip">Kamu</span> : null}
            <p className="leader-letting">
              {formatLetting(member)}
            </p>

            {activeBadge ? (
              <span className={`leader-badge-pill ${getRarityClassName(activeBadge.rarity || 'common')}`}>
                <span>🏅 {getRewardName(activeBadge)}</span>
                <small>{getRarityLabel(activeBadge.rarity || 'common')}</small>
              </span>
            ) : null}
          </div>

          <p>
            {activeTitle ? (
              <span className={`leader-title-pill ${getRarityClassName(activeTitle.rarity || 'common')}`}>
                <span>🎖️ {getRewardName(activeTitle)}</span>
                <small>{getRarityLabel(activeTitle.rarity || 'common')}</small>
              </span>
            ) : (
              <span>Belum memakai title</span>
            )}
          </p>

          <div className="leader-level-line">
            <span>Level {member.level || 1}</span>
            {'  '}
            <span>{Number(member.xp || 0)}/{Number(member.xpToNextLevel || 100)} XP</span>
          </div>

          <div className="pixel-progress">
            <span style={{ width: `${getXpPercent(member)}%` }} />
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

      <section className="leaderboard-overview-grid">
        <PixelCard className="leaderboard-summary-card">
          <p className="eyebrow">10 Besar</p>
          <h2>Rank 1 sampai 10</h2>
          <p>Menampilkan sepuluh anggota teratas pada kategori yang sedang dipilih.</p>
        </PixelCard>
        <PixelCard className="leaderboard-summary-card current-rank-summary">
          <p className="eyebrow">Peringkat Kamu</p>
          {currentRankMember ? (
            <>
              <h2>#{currentRankIndex + 1}</h2>
              <p>{currentInTopTen ? 'Kamu sedang masuk 10 besar. Pertahankan ritmenya.' : 'Kamu belum masuk 10 besar, tapi posisimu tetap tercatat di bawah.'}</p>
            </>
          ) : (
            <>
              <h2>Belum tercatat</h2>
              <p>Login sebagai member approved dan selesaikan aktivitas belajar agar profil publikmu masuk leaderboard.</p>
            </>
          )}
        </PixelCard>
      </section>

      <section className="leaderboard-list">
        {topRankedMembers.length ? topRankedMembers.map((member, index) => (
          renderLeaderRow(member, index, { currentUser: getMemberId(member) === currentMemberId })
        )) : (
          <PixelCard className="empty-state">
            <h3>Belum ada anggota di leaderboard</h3>
            <p>Ranking akan tampil setelah pengurus menyetujui anggota.</p>
          </PixelCard>
        )}
      </section>

      {currentRankMember && !currentInTopTen ? (
        <section className="leaderboard-current-rank">
          <p className="eyebrow">Posisi Kamu</p>
          {renderLeaderRow(currentRankMember, currentRankIndex, { currentUser: true, compact: true })}
        </section>
      ) : null}

      <PixelCard className="leaderboard-note">
        <h3>Aturan Ranking</h3>
        <p>
          Rank Utama memakai urutan: level tertinggi, XP bar tertinggi, total XP,
          lalu jumlah stage selesai. 
        </p>
      </PixelCard>
    </main>
  );
}