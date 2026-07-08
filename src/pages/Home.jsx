import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import PixelCard from '../components/PixelCard';
import StatCard from '../components/StatCard';
import LoadingState from '../components/LoadingState';
import { loadPublicData } from '../services/dataApi';
import { useAuth } from '../context/AuthContext';
import AnnouncementsPanel from '../components/AnnouncementsPanel';
import SetupNotice from '../components/SetupNotice';
import PwaInstallButton from '../components/PwaInstallButton';

function isChallengeActive(challenge) {
  const today = new Date();
  const startDate = challenge.startDate ? new Date(challenge.startDate) : null;
  const endDate = challenge.endDate ? new Date(challenge.endDate) : null;

  if (startDate && today < startDate) return false;
  if (endDate && today > endDate) return false;

  return challenge.published !== false && challenge.featuredOnHome !== false;
}

function getRewardText(challenge) {
  if (challenge.rewardType === 'coins') {
    return `🪙 ${challenge.rewardCoins || 0} koin`;
  }

  if (challenge.rewardType === 'xp') {
    return `⭐ ${challenge.rewardXp || 0} XP`;
  }

  if (challenge.rewardType === 'badge') {
    return `${challenge.rewardIcon || '🏅'} Badge: ${challenge.rewardName || 'Badge'}`;
  }

  if (challenge.rewardType === 'title') {
    return `${challenge.rewardIcon || '🎖️'} Title: ${challenge.rewardName || 'Title'}`;
  }

  if (challenge.rewardType === 'chest') {
    return `${challenge.rewardIcon || '🎁'} Chest: ${challenge.rewardName || 'Chest'}`;
  }

  return 'Reward';
}

function formatChallengeDate(challenge) {
  if (!challenge.startDate && !challenge.endDate) {
    return 'Tanpa batas waktu';
  }

  if (challenge.startDate && challenge.endDate) {
    return `${challenge.startDate} sampai ${challenge.endDate}`;
  }

  if (challenge.startDate) {
    return `Mulai ${challenge.startDate}`;
  }

  return `Berakhir ${challenge.endDate}`;
}




export default function Home() {
  const { firebaseConfigured, currentMember } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  
  useEffect(() => {
    if (!firebaseConfigured) {
      setLoading(false);
      return;
    }

    loadPublicData()
      .then(setData)
      .catch(() => setData({
        founders: [],
        events: [],
        docs: [],
        projects: [],
        challenges: []
      }))
      .finally(() => setLoading(false));
  }, [firebaseConfigured]);

  const activeChallenges = useMemo(() => {
    return (data?.challenges || []).filter(isChallengeActive);
  }, [data]);



  if (!firebaseConfigured) {
    return <SetupNotice />;
  }

  if (loading) {
    return <LoadingState />;
  }

  return (
    <main className="page-shell home-page">
      <section className="hero-section">
        <div className="hero-copy">
          <p className="eyebrow">Pixel Coding Adventure</p>
          <h1>Belajar coding, naik level, buka reward.</h1>
          <p>
            Komunitas belajar coding yang didirikan oleh Letting 25 dengan tujuan membantu
            mahasiswa baru Pendidikan Teknologi Informasi memahami pemrograman dari nol
            hingga mampu membaca alur PHP dan MySQL secara bertahap.
          </p>

          <div className="hero-actions">
            <Link className="pixel-button primary" to={currentMember ? "/map" : "/login"}>Mulai Petualangan</Link>
            <Link className="pixel-button secondary" to="/cara-bermain">Cara Bermain</Link>
            <PwaInstallButton />
          </div>
        </div>

        <PixelCard className="hero-game-card">
          <div className="hero-character">👾</div>
          <h2>Stage 1</h2>
          <p>Mengenal dunia coding dari bahasa paling sederhana.</p>
          <div className="pixel-progress"><span style={{ width: '18%' }} /></div>
          <small>Gerbang awal untuk calon programmer.</small>
        </PixelCard>
      </section>

      <AnnouncementsPanel limit={3} />

      <section className="stat-grid">
        <StatCard icon="🗺️" value="32" label="Stage Belajar" />
        <StatCard icon="⚔️" value="160" label="Quiz Battle" />
        <StatCard icon="🎁" value="Reward" label="Chest & Badge" />
        <StatCard icon="🏆" value="Rank" label="Kompetisi Ringan" />
      </section>

      <section className="section-block">
  <div className="section-heading">
    <p className="eyebrow">Daily Quest</p>
    <h2>Tantangan Aktif</h2>
    <p>
      Lihat tantangan terbaru yang bisa dikerjakan anggota untuk mendapatkan XP,
      koin, badge, title, atau chest.
    </p>

    <Link className="pixel-button secondary" to="/challenges">
      Buka Halaman Tantangan
    </Link>
  </div>

  {activeChallenges.length ? (
    <div className="challenge-home-grid">
      {activeChallenges.slice(0, 3).map((challenge) => (
        <PixelCard className="home-challenge-card" key={challenge.id}>
          <div className="section-title-row">
            <div>
              <p className="eyebrow">Challenge</p>
              <h3>{challenge.title}</h3>
            </div>

            <span className={`challenge-reward-type ${challenge.rewardRarity || 'common'}`}>
              {challenge.rewardType}
            </span>
          </div>

          <p>{challenge.description}</p>

          <div className="challenge-meta-list">
            <span>🎁 {getRewardText(challenge)}</span>
            <span>📅 {formatChallengeDate(challenge)}</span>
            <span>{challenge.proofRequired ? '📌 Wajib bukti' : '✅ Tanpa bukti wajib'}</span>
          </div>

          <Link className="pixel-button primary" to="/challenges">
            Lihat Tantangan
          </Link>
        </PixelCard>
      ))}
    </div>
  ) : (
    <PixelCard>
      <h3>Belum ada tantangan aktif</h3>
      <p>Tantangan akan muncul di sini setelah admin membuat dan mem-publish tantangan.</p>
    </PixelCard>
  )}
</section>

      <section className="section-block">
        <div className="section-heading">
          <p className="eyebrow">Party Member</p>
          <h2>Pengurus Inti</h2>
        </div>

        <div className="founder-grid">
          {data.founders.slice(0, 5).map((founder) => (
            <PixelCard className="founder-card" key={founder.id}>
              <img src={founder.image} alt={founder.name} />
              <h3>{founder.name}</h3>
              <strong>{founder.role}</strong>
              <span>{founder.subtitle}</span>
            </PixelCard>
          ))}
        </div>
      </section>

      <section className="section-block two-column">
        <PixelCard>
          <h2>Reward Terkunci</h2>
          <p>Naik stage untuk membuka title, badge, chest, frame profil, dan sertifikat akhir.</p>

          <div className="reward-preview-grid">
            <span>🔒 Golden Frame</span>
            <span>🔒 Backend Builder</span>
            <span>🔒 Final Crown</span>
            <span>🔒 Victory Certificate</span>
          </div>
        </PixelCard>

        <PixelCard id="cara-bermain">
          <h2>Cara Bermain</h2>

          <ol className="clean-list numbered">
            <li>Daftar memakai nama asli, NIM, dan email pemulihan.</li>
            <li>Tunggu akun disetujui pengurus.</li>
            <li>Masuk ke Learning Map dan cari stage yang ingin dipelajari.</li>
            <li>Baca materi, simpan bookmark, dan tulis catatan pribadi.</li>
            <li>Selesaikan Quiz Battle untuk membuka stage berikutnya.</li>
            <li>Ikut tantangan aktif untuk mendapatkan reward tambahan.</li>
            <li>Selesaikan tugas akhir sebelum sertifikat diterbitkan.</li>
          </ol>
        </PixelCard>
      </section>
    </main>
  );
}