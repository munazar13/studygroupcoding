import PixelCard from '../components/PixelCard';
import { useAuth } from '../context/AuthContext';

export default function PendingApproval() {
  const { currentMember } = useAuth();

  return (
    <main className="page-shell center-page">
      <PixelCard className="pending-card">
        <span className="big-icon">🔐</span>
        <h1>Gerbang Belajar Masih Terkunci</h1>
        <p>
          Halo {currentMember?.name || 'anggota'}, akun kamu sedang menunggu persetujuan pengurus.
          Setelah disetujui, Quest Belajar, Quiz Battle, reward, dan leaderboard akan terbuka.
        </p>
      </PixelCard>
    </main>
  );
}
