import { Link } from 'react-router-dom';
import PixelCard from '../components/PixelCard';

export default function NotFound() {
  return (
    <main className="page-shell center-page">
      <PixelCard className="locked-panel not-found-card">
        <span className="big-icon">🧭</span>
        <h1>Halaman tidak ditemukan</h1>
        <p>Alamat yang kamu buka tidak tersedia atau sudah dipindahkan.</p>
        <div className="hero-actions">
          <Link className="pixel-button primary" to="/dashboard">Ke Dashboard</Link>
          <Link className="pixel-button secondary" to="/">Ke Beranda</Link>
        </div>
      </PixelCard>
    </main>
  );
}
