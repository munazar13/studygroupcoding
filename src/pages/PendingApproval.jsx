import { useNavigate } from 'react-router-dom';
import PixelButton from '../components/PixelButton';
import PixelCard from '../components/PixelCard';
import { useAuth } from '../context/AuthContext';

export default function PendingApproval() {
  const navigate = useNavigate();
  const { currentMember, logout } = useAuth();

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  return (
    <main className="page-shell center-page">
      <PixelCard className="pending-card">
        <p className="eyebrow">Menunggu Persetujuan</p>

        <div className="big-icon">⏳</div>

        <h1>Akun kamu sedang menunggu persetujuan</h1>

        <p>
          Halo {currentMember?.name || 'anggota baru'}, akun kamu sudah berhasil dibuat.
          Sekarang kamu tinggal menunggu admin Study Group Coding menyetujui akunmu.
        </p>

        <p>
          Setelah disetujui, kamu baru bisa membuka dashboard, map belajar, quiz,
          reward, dan leaderboard.
        </p>

        <div className="member-actions">
          <PixelButton type="button" onClick={() => navigate('/')}>
            Kembali ke Beranda
          </PixelButton>

          <PixelButton type="button" variant="secondary" onClick={handleLogout}>
            Keluar
          </PixelButton>
        </div>
      </PixelCard>
    </main>
  );
}