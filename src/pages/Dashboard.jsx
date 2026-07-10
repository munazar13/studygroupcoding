import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import LoadingState from '../components/LoadingState';
import MemberName from '../components/MemberName';
import PixelCard from '../components/PixelCard';
import PixelButton from '../components/PixelButton';
import StatCard from '../components/StatCard';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { loadLearningData } from '../services/dataApi';
import { updateStudyStreak } from '../utils/progress';
import { getNextCourse, getRank } from '../utils/levelSystem';

function getTodayMission(nextCourse) {
  if (!nextCourse) {
    return [
      'Review catatan pribadi dari stage terakhir.',
      'Buka Reward Collection dan cek pencapaianmu.',
      'Siapkan ide Final Project sederhana.'
    ];
  }

  return [
    `Lanjutkan Stage ${nextCourse.stage || nextCourse.order || nextCourse.id}: ${nextCourse.title}.`,
    'Jawab checkpoint pemahaman dengan bahasamu sendiri.',
    'Kerjakan tugas stage atau coba satu kode di playground.'
  ];
}

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
  const todayMissions = useMemo(() => getTodayMission(nextCourse), [nextCourse]);
  const completedCount = new Set([
    ...(currentMember.passedStages || []),
    ...(currentMember.completedStages || [])
  ].map((item) => Number(item))).size;
  const totalStages = data?.courses?.length || 0;
  const completedStageLabel = totalStages ? `${completedCount}/${totalStages}` : 'Belum tersedia';

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
          <h1>{currentMember.avatar} <MemberName member={currentMember} shopItems={data.shopItems || []} /></h1>
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
              <p className="dashboard-guidance">Baca materi, jawab checkpoint, selesaikan tugas stage, lalu kerjakan quiz untuk membuka stage berikutnya.</p>
              <Link className="pixel-button primary" to={`/course/${nextCourse.id}`}>Lanjutkan</Link>
            </>
          ) : data.courses.length ? (
            <>
              <p>Semua stage utama selesai. Final Project sudah terbuka.</p>
              <p className="dashboard-guidance">Kirim tugas akhir supaya admin bisa review dan menerbitkan sertifikat.</p>
              <Link className="pixel-button primary" to="/final-quest">Kirim Final Project</Link>
            </>
          ) : (
            <p>Roadmap belum tersedia. Admin perlu membuat stage belajar terlebih dahulu.</p>
          )}
        </PixelCard>
      </section>

      <section className="stat-grid">
        <StatCard icon="⭐" value={currentMember.xp || 0} label="XP" />
        <StatCard icon="🪙" value={currentMember.coins || 0} label="Koin" />
        <StatCard icon="🔥" value={`${currentMember.streak || 0} hari`} label="Streak" />
        <StatCard icon="✅" value={completedStageLabel} label="Stage Selesai" />
      </section>

      <PixelCard className="daily-learning-card">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">Target Hari Ini</p>
            <h2>Belajar sedikit tapi aktif</h2>
            <p>Fokusnya bukan hanya membuka halaman, tapi membaca, mencoba, dan menulis catatan kecil.</p>
          </div>
          <PixelButton onClick={claimDaily}>Catat Aktivitas Belajar</PixelButton>
        </div>
        <ol className="daily-mission-list">
          {todayMissions.map((mission) => <li key={mission}>{mission}</li>)}
        </ol>
      </PixelCard>

      <section className="two-column">
        <PixelCard>
          <h2>Langkah Berikutnya</h2>
          <ol className="clean-list numbered">
            <li>Baca materi stage aktif sampai selesai.</li>
            <li>Jawab checkpoint pemahaman di setiap bagian materi.</li>
            <li>Kerjakan tugas stage, lalu lulus quiz untuk membuka stage berikutnya.</li>
            <li>Buka chest di Reward Collection.</li>
            <li>Setelah semua stage selesai, buka Final Project dan kirim submission.</li>
          </ol>
        </PixelCard>
        <PixelCard>
          <h2>Misi Harian</h2>
          <p>Gunakan tombol ini setelah kamu benar-benar membaca, mencoba kode, atau mengulang konsep. Streak dibuat untuk membangun kebiasaan, bukan sekadar klik.</p>
          <PixelButton onClick={claimDaily}>Catat Aktivitas Belajar</PixelButton>
        </PixelCard>
      </section>
    </main>
  );
}
