import { Link } from 'react-router-dom';
import PixelCard from '../components/PixelCard';
import { useAuth } from '../context/AuthContext';

export default function Certificate() {
  const { currentMember } = useAuth();

  if (!currentMember.finalQuestComplete) {
    return (
      <main className="page-shell center-page">
        <PixelCard>
          <h1>Sertifikat belum terbuka</h1>
          <p>Selesaikan Final Quest untuk membuka sertifikat.</p>
          <Link className="pixel-button primary" to="/final-quest">Buka Final Quest</Link>
        </PixelCard>
      </main>
    );
  }

  return (
    <main className="page-shell center-page">
      <section className="certificate-card">
        <p>Certificate of Completion</p>
        <h1>{currentMember.name}</h1>
        <h2>Dasar Pemrograman, PHP, dan MySQL</h2>
        <p>Study Group Coding</p>
        <strong>{currentMember.certificateCode}</strong>
        <button className="pixel-button primary" type="button" onClick={() => window.print()}>Cetak Sertifikat</button>
      </section>
    </main>
  );
}
