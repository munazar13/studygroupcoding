import PixelCard from './PixelCard';

export default function SetupNotice() {
  return (
    <main className="page-shell center-page">
      <PixelCard className="setup-notice">
        <span className="big-icon">🔧</span>
        <h1>Sistem sedang disiapkan</h1>
        <p>
          Konfigurasi database belum dipasang. Setelah Firebase dihubungkan, akun,
          kursus, leaderboard, reward, dan dokumentasi akan tersimpan online.
        </p>
      </PixelCard>
    </main>
  );
}
