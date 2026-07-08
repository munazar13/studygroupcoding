import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import LoadingState from '../components/LoadingState';
import PixelCard from '../components/PixelCard';
import PixelButton from '../components/PixelButton';
import StatCard from '../components/StatCard';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { loadLearningData } from '../services/dataApi';
import { updateStudyStreak } from '../utils/progress';
import { getNextCourse, getRank } from '../utils/levelSystem';

export default function Dashboard() {
  const { currentMember, updateCurrentMember } = useAuth();
  const { showToast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLearningData()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const nextCourse = useMemo(() => data ? getNextCourse(data.courses, currentMember) : null, [data, currentMember]);
  const rank = useMemo(() => data ? getRank(data.ranks, currentMember.totalXp || currentMember.xp || 0) : null, [data, currentMember]);
  const completedCount = new Set([
    ...(currentMember.passedStages || []),
    ...(currentMember.completedStages || [])
  ].map((item) => Number(item))).size;
  const totalStages = data?.courses?.length || 0;

  if (loading || !data) {
    return <LoadingState />;
  }

  async function claimDaily() {
    const targetCourse = nextCourse || data.courses[0];

    if (!targetCourse) {
      showToast('Roadmap belum tersedia. Tunggu admin membuat stage belajar.', 'error');
      return;
    }

    await updateCurrentMember(updateStudyStreak(currentMember));
    showToast('Misi harian dicatat. Streak diperbarui. Quiz tetap harus dibuka dari materi stage.');
  }

  return (
    <main className="page-shell dashboard-page">
      <section className="dashboard-hero">
        <div>
          <p className="eyebrow">Dashboard Anggota</p>
          <h1>{currentMember.avatar} {currentMember.name}</h1>
          <p>{rank.name} · Stage {currentMember.currentStage || 1}/{totalStages || '-'}</p>
          <div className="pixel-progress large">
            <span style={{ width: `${Math.min((currentMember.xp / rank.nextXp) * 100, 100)}%` }} />
          </div>
        </div>
        <PixelCard className="next-quest-card">
          <span className="big-icon">🧭</span>
          <h2>Quest Sekarang</h2>
          {nextCourse ? (
            <>
              <p>Stage {nextCourse.stage || nextCourse.order || nextCourse.id}: {nextCourse.title}</p>
              <p className="dashboard-guidance">Baca materi, tandai paham, lalu kerjakan quiz untuk membuka stage berikutnya.</p>
              <Link className="pixel-button primary" to={`/course/${nextCourse.id}`}>Lanjutkan</Link>
            </>
          ) : data.courses.length ? (
            <p>Semua stage utama selesai. Final Quest menunggu.</p>
          ) : (
            <p>Roadmap belum tersedia. Admin perlu membuat stage belajar terlebih dahulu.</p>
          )}
        </PixelCard>
      </section>

      <section className="stat-grid">
        <StatCard icon="⭐" value={currentMember.xp || 0} label="XP" />
        <StatCard icon="🪙" value={currentMember.coins || 0} label="Koin" />
        <StatCard icon="🔥" value={`${currentMember.streak || 0} hari`} label="Streak" />
        <StatCard icon="✅" value={`${completedCount}/${totalStages}`} label="Stage Selesai" />
      </section>

      <section className="two-column">
        <PixelCard>
          <h2>Langkah Berikutnya</h2>
          <ol className="clean-list numbered">
            <li>Baca materi stage aktif sampai selesai.</li>
            <li>Tandai materi selesai agar Quiz Battle terbuka.</li>
            <li>Lulus quiz untuk membuka stage berikutnya.</li>
            <li>Buka chest di Reward Collection.</li>
          </ol>
        </PixelCard>
        <PixelCard>
          <h2>Misi Harian</h2>
          <p>Klaim setelah kamu membaca materi atau mengulang konsep hari ini.</p>
          <PixelButton onClick={claimDaily}>Catat Aktivitas Belajar</PixelButton>
        </PixelCard>
      </section>
    </main>
  );
}
