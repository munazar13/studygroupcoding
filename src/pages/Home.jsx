import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import PixelCard from '../components/PixelCard';
import PixelButton from '../components/PixelButton';
import StatCard from '../components/StatCard';
import LoadingState from '../components/LoadingState';
import { loadPublicData } from '../services/dataApi';
import { useAuth } from '../context/AuthContext';
import SetupNotice from '../components/SetupNotice';

export default function Home() {
  const { firebaseConfigured } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseConfigured) {
      setLoading(false);
      return;
    }

    loadPublicData()
      .then(setData)
      .catch(() => setData({ founders: [], events: [], docs: [], projects: [] }))
      .finally(() => setLoading(false));
  }, [firebaseConfigured]);

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
            Komunitas belajar coding yang didirikan oleh Letting 25 dengan tujuan membantu mahasiswa baru Pendidikan Teknologi Informasi memahami pemrograman dari nol hingga mampu membaca alur PHP dan MySQL secara bertahap.
          </p>
          <div className="hero-actions">
            <Link className="pixel-button primary" to="/register">Mulai Petualangan</Link>
            <Link className="pixel-button secondary" to="/about">Lihat Komunitas</Link>
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

      <section className="stat-grid">
        <StatCard icon="🗺️" value="32" label="Stage Belajar" />
        <StatCard icon="⚔️" value="160" label="Quiz Battle" />
        <StatCard icon="🎁" value="Reward" label="Chest & Badge" />
        <StatCard icon="🏆" value="Rank" label="Kompetisi Ringan" />
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
        <PixelCard>
          <h2>Cara Main</h2>
          <ol className="clean-list numbered">
            <li>Daftar memakai nama asli dan NIM.</li>
            <li>Tunggu akun disetujui pengurus.</li>
            <li>Baca materi stage aktif.</li>
            <li>Selesaikan Quiz Battle untuk membuka stage berikutnya.</li>
          </ol>
        </PixelCard>
      </section>
    </main>
  );
}
