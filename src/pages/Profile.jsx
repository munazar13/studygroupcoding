import { useEffect, useMemo, useState } from 'react';
import LoadingState from '../components/LoadingState';
import PixelButton from '../components/PixelButton';
import MemberName from '../components/MemberName';
import PixelCard from '../components/PixelCard';
import StatCard from '../components/StatCard';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { loadLearningData } from '../services/dataApi';
import { calculateAverageQuiz, getRank, getXpPercent } from '../utils/levelSystem';
import { mergeOwnedCosmetics, findCosmeticById } from '../utils/cosmetics';
import { getRarityClassName, getRarityLabel } from '../utils/rarity';

function getChallengeStatusText(status) {
  if (status === 'approved') return 'Reward Diterima';
  if (status === 'rejected') return 'Ditolak';
  if (status === 'pending') return 'Menunggu Review';

  return 'Belum Dikirim';
}

function getChallengeStatusClass(status) {
  if (status === 'approved') return 'approved';
  if (status === 'rejected') return 'rejected';
  if (status === 'pending') return 'pending';

  return 'not-submitted';
}

function formatProfileDate(date) {
  if (!date) return '-';

  return new Date(date).toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
}
function getRewardName(reward) {
  return reward?.title || reward?.name || reward?.id || 'Reward';
}

function getRewardType(reward) {
  return String(reward?.type || reward?.category || '').toLowerCase();
}


export default function Profile() {
  const { currentMember, updateCurrentMember } = useAuth();
  const { showToast } = useToast();

  const [rewards, setRewards] = useState([]);
  const [shopItems, setShopItems] = useState([]);
  const [ranks, setRanks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLearningData()
      .then((data) => {
        setRanks(data.ranks || []);
        setRewards(data.rewards || []);
        setShopItems(data.shopItems || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const ownedBadgeIds = useMemo(() => {
  return Array.from(new Set([
    ...(currentMember?.badges || []),
    ...(currentMember?.ownedBadges || []),
    ...((currentMember?.shopInventory || []).filter((item) => item?.type === 'badge').map((item) => item.id))
  ]
    .map((item) => String(item || '').trim())
    .filter(Boolean)
  ));
}, [currentMember]);

const ownedTitleIds = useMemo(() => {
  return Array.from(new Set([
    ...(currentMember?.titles || []),
    ...(currentMember?.ownedTitles || []),
    ...((currentMember?.shopInventory || []).filter((item) => item?.type === 'title').map((item) => item.id))
  ]
    .map((item) => String(item || '').trim())
    .filter(Boolean)
  ));
}, [currentMember]);

const badgeRewards = useMemo(() => {
  return mergeOwnedCosmetics({ rewards, shopItems, member: currentMember, ownedIds: ownedBadgeIds, type: 'badge' });
}, [currentMember, ownedBadgeIds, rewards, shopItems]);

const titleRewards = useMemo(() => {
  return mergeOwnedCosmetics({ rewards, shopItems, member: currentMember, ownedIds: ownedTitleIds, type: 'title' });
}, [currentMember, ownedTitleIds, rewards, shopItems]);

const activeBadge = findCosmeticById({ rewards, shopItems, member: currentMember, id: currentMember?.activeBadge, type: 'badge' });
const activeTitle = findCosmeticById({ rewards, shopItems, member: currentMember, id: currentMember?.activeTitle, type: 'title' });

  if (loading) {
    return <LoadingState />;
  }

  const level = Number(currentMember.level || 1);
  const xp = Number(currentMember.xp || 0);
  const xpToNextLevel = Number(currentMember.xpToNextLevel || 100);
  const xpPercent = getXpPercent(currentMember);
  const rank = getRank(ranks, currentMember.totalXp || currentMember.xp || 0);

  async function setActiveBadge(badgeId) {
    if (!ownedBadgeIds.includes(String(badgeId))) {
      showToast('Badge ini belum kamu miliki.', 'error');
      return;
    }

    try {
      await updateCurrentMember({ activeBadge: badgeId });
      showToast('Badge aktif berhasil diganti.');
    } catch (error) {
      showToast(error.message || 'Gagal memasang badge.', 'error');
    }
  }

  async function setActiveTitle(titleId) {
    if (!ownedTitleIds.includes(String(titleId))) {
      showToast('Title ini belum kamu miliki.', 'error');
      return;
    }

    try {
      await updateCurrentMember({ activeTitle: titleId });
      showToast('Title aktif berhasil diganti.');
    } catch (error) {
      showToast(error.message || 'Gagal memasang title.', 'error');
    }
  }

  const challengeSubmissions = [...(currentMember?.challengeSubmissions || [])].sort((a, b) => {
  return new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0);
});

  const pendingChallengeCount = challengeSubmissions.filter(
  (submission) => submission.status === 'pending'
).length;

const latestChallengeReview = challengeSubmissions.find(
  (submission) => submission.status === 'approved' || submission.status === 'rejected'
);
  return (
    <main className="page-shell">
      <section className="profile-header">
        <div className="profile-avatar">{currentMember.avatar}</div>

        <div>
          <p className="eyebrow">Profil Anggota</p>
          <h1><MemberName member={currentMember} shopItems={shopItems} /></h1>

          <p>
            {activeTitle ? getRewardName(activeTitle) : rank.name} · {currentMember.cohort}
          </p>

          <div className="profile-active-rewards">
            <span className={`profile-reward-pill ${activeTitle ? getRarityClassName(activeTitle.rarity) : 'rarity-common'}`}>
              🎖️ {activeTitle ? getRewardName(activeTitle) : 'Belum ada title aktif'}
            </span>

            <span className={`profile-reward-pill ${activeBadge ? getRarityClassName(activeBadge.rarity) : 'rarity-common'}`}>
              🏅 {activeBadge ? getRewardName(activeBadge) : 'Belum ada badge aktif'}
            </span>
          </div>
        </div>
      </section>

      <section className="profile-level-card pixel-card">
        <div className="level-progress-head">
          <strong>Level {level}</strong>
          <span>{xp}/{xpToNextLevel} XP menuju Level {level + 1}</span>
        </div>

        <div className="pixel-progress large">
          <span style={{ width: `${xpPercent}%` }} />
        </div>
      </section>

      <section className="stat-grid">
        <StatCard icon="⭐" value={currentMember.totalXp || currentMember.xp || 0} label="Total XP" />
        <StatCard icon="🪙" value={currentMember.coins || 0} label="Koin" />
        <StatCard icon="🔥" value={currentMember.streak || 0} label="Streak" />
        <StatCard icon="🧠" value={calculateAverageQuiz(currentMember)} label="Rata-rata Quiz" />
      </section>

      <section className="two-column">
        <PixelCard>
          <h2>Progress Belajar</h2>
          <p>Stage selesai: {currentMember.completedStages?.length || currentMember.passedStages?.length || 0}/32</p>
          <p>Stage aktif: {currentMember.currentStage || 1}</p>
          <p>NIM: {currentMember.nim}</p>
          <p>Chest belum dibuka: {currentMember.unopenedChests?.length || 0}</p>
        </PixelCard>

        <PixelCard>
          <h2>Identitas Aktif</h2>
          <p>Title aktif: {activeTitle ? getRewardName(activeTitle) : 'Belum dipilih'}</p>
          <p>Badge aktif: {activeBadge ? getRewardName(activeBadge) : 'Belum dipilih'}</p>
          <p>Title dan badge aktif akan tampil di leaderboard.</p>
        </PixelCard>
      </section>

      <section className="section-block two-column">
        <PixelCard>
          <h2>Final Project</h2>
          <p>Status: <strong>{currentMember.finalProjectStatus || 'belum dikirim'}</strong></p>
          <p>Kirim submission tugas akhir dari halaman Final Project setelah semua stage selesai.</p>
          <a className="pixel-button primary" href="#/final-quest">Buka Final Project</a>
        </PixelCard>

        <PixelCard>
          <h2>Sertifikat</h2>
          <p>Status: <strong>{currentMember.certificateStatus || 'belum diterbitkan'}</strong></p>
          <p>Sertifikat diterbitkan admin setelah Final Project disetujui.</p>
          <a className="pixel-button secondary" href="#/certificate">Cek Sertifikat</a>
        </PixelCard>
      </section>

      <section className="section-block two-column">
        <PixelCard>
          <h2>Bookmark Materi</h2>
          {(currentMember.materialBookmarks || []).length ? (
            <div className="bookmark-list compact-list">
              {(currentMember.materialBookmarks || []).slice(0, 6).map((bookmark) => (
                <a className="bookmark-row" href={`#/course/${bookmark.courseId}`} key={bookmark.id || `${bookmark.courseId}-${bookmark.moduleId}`}>
                  <strong>{bookmark.moduleTitle || 'Materi tersimpan'}</strong>
                  <span>{bookmark.courseTitle || `Stage ${bookmark.courseId}`}</span>
                </a>
              ))}
            </div>
          ) : (
            <p>Belum ada bookmark. Tandai materi penting dari halaman stage.</p>
          )}
        </PixelCard>

        <PixelCard>
          <h2>Catatan Pribadi</h2>
          {Object.keys(currentMember.privateNotes || {}).length ? (
            <div className="private-note-list compact-list">
              {Object.entries(currentMember.privateNotes || {}).slice(0, 5).map(([courseId, note]) => (
                <a className="bookmark-row" href={`#/course/${courseId}`} key={courseId}>
                  <strong>Stage {courseId}</strong>
                  <span>{String(note || '').slice(0, 120) || 'Catatan kosong'}</span>
                </a>
              ))}
            </div>
          ) : (
            <p>Belum ada catatan. Buka stage dan tulis catatan belajarmu.</p>
          )}
        </PixelCard>
      </section>


      <section className="section-block two-column">
        <PixelCard>
          <h2>Item Shop Saya</h2>
          {(currentMember.shopInventory || []).length ? (
            <div className="compact-list">
              {(currentMember.shopInventory || []).slice(0, 6).map((item) => (
                <a className="bookmark-row" href="#/shop" key={`${item.id}-${item.purchasedAt}`}>
                  <strong>{item.icon} {item.name}</strong>
                  <span>{item.type} · {item.rarity}</span>
                </a>
              ))}
            </div>
          ) : (
            <p>Belum ada item shop. Buka Coin Shop untuk menukar koin dengan item kosmetik.</p>
          )}
        </PixelCard>

        <PixelCard>
          <h2>Transaksi Koin</h2>
          {(currentMember.coinTransactions || []).length ? (
            <div className="compact-list">
              {(currentMember.coinTransactions || []).slice(0, 6).map((tx) => (
                <div className="bookmark-row" key={tx.id}>
                  <strong>{Number(tx.amount || 0) > 0 ? '+' : ''}{tx.amount} koin</strong>
                  <span>{tx.description}</span>
                </div>
              ))}
            </div>
          ) : (
            <p>Belum ada transaksi koin.</p>
          )}
        </PixelCard>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <h2>Pilih Badge Aktif</h2>
          <p>Badge aktif akan muncul di profil dan leaderboard.</p>
        </div>

        <div className="reward-grid">
          {badgeRewards.length ? badgeRewards.map((badge) => {
            const isActive = String(currentMember.activeBadge || '') === String(badge.id || '');

            return (
              <PixelCard
                className={`reward-card open ${getRarityClassName(badge.rarity)} ${isActive ? 'active-reward' : ''}`}
                key={badge.id}
              >
                <span className="reward-icon">{badge.icon || '🏅'}</span>
                <h3>{getRewardName(badge)}</h3>
                <p>{badge.description || 'Badge yang sudah kamu miliki.'}</p>
                <small>{getRarityLabel(badge.rarity)} · {isActive ? 'Sedang dipakai' : 'Belum dipakai'}</small>

                <PixelButton
                  type="button"
                  variant={isActive ? 'secondary' : 'primary'}
                  onClick={() => setActiveBadge(badge.id)}
                  disabled={isActive}
                >
                  {isActive ? 'Dipakai' : 'Pakai Badge'}
                </PixelButton>
              </PixelCard>
            );
          }) : (
            <PixelCard>
              <h3>Belum ada badge</h3>
              <p>Badge akan muncul setelah kamu menyelesaikan stage, membuka chest, atau menyelesaikan tantangan.</p>
            </PixelCard>
          )}
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <h2>Pilih Title Aktif</h2>
          <p>Title aktif akan tampil di bawah namamu.</p>
        </div>

        <div className="reward-grid">
          {titleRewards.length ? titleRewards.map((title) => {
            const isActive = String(currentMember.activeTitle || '') === String(title.id || '');

            return (
              <PixelCard
                className={`reward-card open ${getRarityClassName(title.rarity)} ${isActive ? 'active-reward' : ''}`}
                key={title.id}
              >
                <span className="reward-icon">{title.icon || '🎖️'}</span>
                <h3>{getRewardName(title)}</h3>
                <p>{title.description || 'Title yang sudah kamu miliki.'}</p>
                <small>{getRarityLabel(title.rarity)} · {isActive ? 'Sedang dipakai' : 'Belum dipakai'}</small>

                <PixelButton
                  type="button"
                  variant={isActive ? 'secondary' : 'primary'}
                  onClick={() => setActiveTitle(title.id)}
                  disabled={isActive}
                >
                  {isActive ? 'Dipakai' : 'Pakai Title'}
                </PixelButton>
              </PixelCard>
            );
          }) : (
            <PixelCard>
              <h3>Belum ada title</h3>
              <p>Title bisa didapat dari chest, shop, atau tantangan khusus.</p>
            </PixelCard>
          )}
        </div>
      </section>
          {pendingChallengeCount || latestChallengeReview ? (
  <section className="profile-challenge-alerts">
    {pendingChallengeCount ? (
      <PixelCard className="profile-alert-card pending">
        <div>
          <p className="eyebrow">Menunggu Review</p>
          <h3>{pendingChallengeCount} Tantangan Pending</h3>
          <p>Bukti tantangan kamu sudah dikirim dan sedang menunggu admin approve.</p>
        </div>

        <span className="challenge-status-pill pending">
          Pending
        </span>
      </PixelCard>
    ) : null}

    {latestChallengeReview ? (
      <PixelCard className={`profile-alert-card ${latestChallengeReview.status}`}>
        <div>
          <p className="eyebrow">Update Tantangan</p>
          <h3>{latestChallengeReview.challengeTitle || 'Tantangan'}</h3>
          <p>
            Status terbaru: <strong>{getChallengeStatusText(latestChallengeReview.status)}</strong>
          </p>
        </div>

        <span className={`challenge-status-pill ${getChallengeStatusClass(latestChallengeReview.status)}`}>
          {getChallengeStatusText(latestChallengeReview.status)}
        </span>
      </PixelCard>
    ) : null}
  </section>
) : null}
      <section className="section-block">
  <div className="section-heading">
    <p className="eyebrow">Challenge History</p>
    <h2>Riwayat Tantangan</h2>
    <p>Status tantangan yang pernah kamu kirim untuk direview admin.</p>
  </div>

  {challengeSubmissions.length ? (
    <div className="profile-challenge-list">
      {challengeSubmissions.map((submission) => (
        <PixelCard className="profile-challenge-card" key={submission.id}>
          <div className="section-title-row">
            <div>
              <h3>{submission.challengeTitle || 'Tantangan'}</h3>
              <p>Dikirim: {formatProfileDate(submission.submittedAt)}</p>
            </div>

            <span className={`challenge-status-pill ${getChallengeStatusClass(submission.status)}`}>
              {getChallengeStatusText(submission.status)}
            </span>
          </div>

          {submission.proofText ? (
            <p>
              <strong>Bukti:</strong> {submission.proofText}
            </p>
          ) : null}

          {submission.proofUrl ? (
            <a
              className="text-link"
              href={submission.proofUrl}
              target="_blank"
              rel="noreferrer"
            >
              Buka link bukti
            </a>
          ) : null}

          {submission.reviewedAt ? (
            <p>
              <strong>Direview:</strong> {formatProfileDate(submission.reviewedAt)}
            </p>
          ) : null}
        </PixelCard>
      ))}
    </div>
  ) : (
    <PixelCard>
      <h3>Belum ada riwayat tantangan</h3>
      <p>Kirim bukti tantangan dari halaman Tantangan untuk melihat riwayatnya di sini.</p>
    </PixelCard>
  )}
</section>
    </main>
  );
}