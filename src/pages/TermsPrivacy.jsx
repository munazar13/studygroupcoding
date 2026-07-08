import PixelCard from '../components/PixelCard';

export default function TermsPrivacy() {
  return (
    <main className="page-shell terms-page">
      <section className="page-hero compact-hero">
        <p className="eyebrow">Aturan Komunitas</p>
        <h1>Terms, Privacy, dan Aturan Belajar</h1>
        <p>Halaman ini menjadi panduan dasar penggunaan website Study Group Coding agar anggota paham batasan dan tanggung jawabnya.</p>
      </section>

      <section className="material-list">
        <PixelCard>
          <h2>1. Aturan Akun</h2>
          <p>Gunakan NIM dan identitas yang benar. Email pemulihan harus aktif karena dipakai untuk reset sandi. Jangan membagikan password ke orang lain.</p>
        </PixelCard>
        <PixelCard>
          <h2>2. Aturan Belajar</h2>
          <p>Stage, quiz, challenge, final project, dan sertifikat dibuat untuk proses belajar. Anggota tidak boleh memanipulasi progress, koin, reward, atau hasil quiz.</p>
        </PixelCard>
        <PixelCard>
          <h2>3. Aturan Challenge dan Final Project</h2>
          <p>Submission harus milik sendiri atau mencantumkan sumber jika memakai referensi. Admin berhak meminta revisi, menolak, atau membatalkan reward jika ditemukan spam atau kecurangan.</p>
        </PixelCard>
        <PixelCard>
          <h2>4. Data dan Privasi</h2>
          <p>Data akun dipakai untuk login, progress belajar, leaderboard, challenge, reward, dan sertifikat. Catatan pribadi dan bookmark dipakai untuk membantu proses belajar anggota.</p>
        </PixelCard>
        <PixelCard>
          <h2>5. Sertifikat</h2>
          <p>Sertifikat hanya diterbitkan setelah syarat belajar terpenuhi dan final project disetujui. Sertifikat bisa dibatalkan jika ada kesalahan data atau pelanggaran serius.</p>
        </PixelCard>
      </section>
    </main>
  );
}
