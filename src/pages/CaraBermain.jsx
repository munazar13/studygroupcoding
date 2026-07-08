import { Link } from 'react-router-dom';
import PixelCard from '../components/PixelCard';
import PwaInstallButton from '../components/PwaInstallButton';
import { useAuth } from '../context/AuthContext';

const journeySteps = [
  {
    icon: '📝',
    title: 'Daftar akun anggota',
    text: 'Isi nama, NIM, email pemulihan, dan password. NIM dipakai sebagai identitas login. Email pemulihan dipakai oleh sistem untuk reset sandi kalau kamu lupa password.'
  },
  {
    icon: '⏳',
    title: 'Tunggu akun disetujui',
    text: 'Akun baru masuk status pending lebih dulu. Setelah admin menyetujui akun, kamu bisa masuk ke dashboard, learning map, materi, quiz, reward, dan fitur anggota lain.'
  },
  {
    icon: '🗺️',
    title: 'Mulai dari Learning Map',
    text: 'Learning Map adalah peta utama belajar. Di sana kamu melihat stage yang sudah terbuka, stage yang masih terkunci, progress, bookmark, dan pencarian materi.'
  },
  {
    icon: '📚',
    title: 'Baca materi stage',
    text: 'Setiap stage berisi materi bertahap. Baca dari awal sampai akhir, simpan materi penting dengan bookmark, dan tulis catatan pribadi agar lebih mudah mengulang.'
  },
  {
    icon: '🧠',
    title: 'Kerjakan quiz',
    text: 'Quiz dipakai untuk mengecek pemahaman. Selesaikan quiz sesuai aturan nilai minimal. Kalau belum lulus, pelajari ulang materi lalu coba lagi.'
  },
  {
    icon: '⭐',
    title: 'Kumpulkan progress',
    text: 'Saat belajar, kamu bisa mendapat XP, koin, badge, title, chest, atau reward lain sesuai aturan sistem. Reward tidak menggantikan proses belajar.'
  },
  {
    icon: '⚔️',
    title: 'Ikut challenge',
    text: 'Challenge adalah tugas tambahan. Kirim bukti pengerjaan sesuai instruksi. Admin akan review submission sebelum reward diberikan.'
  },
  {
    icon: '🏁',
    title: 'Selesaikan final project',
    text: 'Setelah semua stage dan quiz selesai, kamu mengerjakan tugas akhir berupa project coding. Project ini menjadi bukti kemampuan sebelum sertifikat diterbitkan.'
  },
  {
    icon: '📜',
    title: 'Dapatkan sertifikat',
    text: 'Sertifikat hanya diterbitkan setelah syarat belajar terpenuhi dan final project disetujui. Sertifikat memiliki kode unik agar bisa dicek validitasnya.'
  }
];

const quickRules = [
  'Login memakai NIM, bukan email.',
  'Email pemulihan wajib benar karena dipakai untuk reset password.',
  'Stage terkunci akan terbuka setelah syarat progress terpenuhi.',
  'Bookmark dan catatan pribadi hanya untuk membantu belajar, bukan dilihat admin.',
  'Challenge dan final project harus dikirim dengan bukti yang jelas.',
  'Sertifikat tidak langsung keluar otomatis; ada proses review agar lebih valid.'
];

const featureGuides = [
  {
    title: 'Dashboard',
    icon: '🎯',
    text: 'Tempat melihat ringkasan akun, progress belajar, level, reward, dan aktivitas penting. Buka dashboard setelah login untuk tahu kondisi belajarmu.'
  },
  {
    title: 'Learning Map',
    icon: '🗺️',
    text: 'Peta stage belajar. Mulai dari stage paling awal, cek stage yang terbuka, lanjutkan stage yang belum selesai, dan gunakan search untuk mencari topik.'
  },
  {
    title: 'Materi',
    icon: '📚',
    text: 'Halaman belajar utama. Baca materi, tandai dengan bookmark, tulis catatan pribadi, lalu lanjut ke quiz saat sudah paham.'
  },
  {
    title: 'Quiz',
    icon: '🧠',
    text: 'Tempat menguji pemahaman. Jawab soal dengan teliti. Jika ada soal yang salah atau membingungkan, gunakan fitur lapor soal.'
  },
  {
    title: 'Reward',
    icon: '🎁',
    text: 'Tempat melihat badge, title, chest, XP, atau reward yang kamu dapat dari belajar dan challenge.'
  },
  {
    title: 'Profil',
    icon: '🧙',
    text: 'Tempat melihat data akun, bookmark, catatan pribadi, dan identitas belajar kamu.'
  }
];

const faqItems = [
  {
    q: 'Saya sudah daftar, kenapa belum bisa masuk semua fitur?',
    a: 'Akun baru perlu disetujui dulu. Kalau status masih pending, tunggu admin menyetujui akun. Ini untuk mencegah spam dan akun palsu.'
  },
  {
    q: 'Kalau lupa password harus minta admin?',
    a: 'Tidak. Gunakan halaman Lupa Password. Masukkan NIM atau email pemulihan, lalu sistem akan mengirim link reset sandi ke email pemulihan.'
  },
  {
    q: 'Kenapa stage berikutnya terkunci?',
    a: 'Biasanya karena stage sebelumnya belum selesai, quiz belum lulus, atau syarat progress belum terpenuhi. Buka Learning Map untuk melihat progress.'
  },
  {
    q: 'Apakah catatan pribadi bisa dibaca admin?',
    a: 'Tidak. Catatan pribadi dibuat untuk membantu kamu belajar. Admin tidak perlu melihat isi catatan belajarmu.'
  },
  {
    q: 'Kapan sertifikat bisa didapat?',
    a: 'Sertifikat bisa diterbitkan setelah semua stage dan quiz selesai, final project dikirim, lalu final project disetujui.'
  },
  {
    q: 'Tombol Install App tidak muncul, berarti rusak?',
    a: 'Belum tentu. Browser punya aturan sendiri untuk menampilkan tombol install. Buka bagian Install App di halaman ini untuk panduan manual.'
  }
];

export default function CaraBermain() {
  const { currentMember, isApproved } = useAuth();

  const startTarget = currentMember ? (isApproved ? '/map' : '/dashboard') : '/login';
  const startLabel = currentMember ? (isApproved ? 'Buka Learning Map' : 'Cek Status Akun') : 'Masuk untuk Mulai';

  return (
    <main className="page-shell how-to-play-page">
      <section className="page-hero compact-hero how-hero">
        <p className="eyebrow">Panduan Anggota</p>
        <h1>Cara Bermain Study Group Coding</h1>
        <p>
          Halaman ini menjelaskan alur website dari daftar akun, belajar per stage,
          mengerjakan quiz, memakai bookmark dan catatan pribadi, mengikuti challenge,
          sampai final project dan sertifikat.
        </p>

        <div className="hero-actions">
          <Link className="pixel-button primary" to={startTarget}>
            {startLabel}
          </Link>
          <a className="pixel-button secondary" href="#alur-belajar">
            Lihat Alur Belajar
          </a>
        </div>
      </section>

      <section className="how-summary-grid" aria-label="Ringkasan cara kerja website">
        <PixelCard className="how-summary-card accent-blue">
          <span>1</span>
          <h2>Daftar</h2>
          <p>Buat akun dengan NIM dan email pemulihan.</p>
        </PixelCard>
        <PixelCard className="how-summary-card accent-yellow">
          <span>2</span>
          <h2>Belajar</h2>
          <p>Buka map, baca materi, bookmark, dan buat catatan.</p>
        </PixelCard>
        <PixelCard className="how-summary-card accent-green">
          <span>3</span>
          <h2>Uji</h2>
          <p>Kerjakan quiz dan challenge untuk membuktikan pemahaman.</p>
        </PixelCard>
        <PixelCard className="how-summary-card accent-pink">
          <span>4</span>
          <h2>Lulus</h2>
          <p>Selesaikan final project lalu tunggu sertifikat diterbitkan.</p>
        </PixelCard>
      </section>

      <section className="section-block how-section" id="alur-belajar">
        <div className="section-heading-block">
          <p className="eyebrow">Alur Utama</p>
          <h2>Ikuti urutan ini supaya tidak bingung</h2>
          <p>
            Anggota baru cukup mengikuti langkah dari atas ke bawah. Jangan langsung lompat ke stage akhir,
            karena stage, quiz, reward, final project, dan sertifikat saling terhubung.
          </p>
        </div>

        <div className="how-timeline">
          {journeySteps.map((step, index) => (
            <PixelCard className="how-timeline-card" key={step.title}>
              <span className="how-to-number">{index + 1}</span>
              <div className="how-to-icon">{step.icon}</div>
              <div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
            </PixelCard>
          ))}
        </div>
      </section>

      <section className="section-block two-column how-detail-block">
        <PixelCard>
          <p className="eyebrow">Akun & Password</p>
          <h2>Cara login dan reset sandi</h2>
          <p>
            Website ini memakai NIM sebagai identitas login agar cocok untuk anggota. Email tetap diminta,
            tetapi fungsinya sebagai email pemulihan saat lupa password.
          </p>
          <ul className="how-check-list">
            <li>Login memakai NIM dan password.</li>
            <li>Email pemulihan dipakai untuk link reset sandi.</li>
            <li>Reset sandi dilakukan oleh sistem, bukan lewat admin.</li>
            <li>Jangan memakai email asal-asalan saat daftar.</li>
          </ul>
          <Link className="inline-action" to="/forgot-password">
            Buka halaman lupa password →
          </Link>
        </PixelCard>

        <PixelCard>
          <p className="eyebrow">Install App</p>
          <h2>Pasang ke HP atau laptop</h2>
          <p>
            Kalau browser mendukung, tombol install akan menjalankan pemasangan otomatis.
            Kalau tidak muncul, pakai cara manual sesuai perangkat.
          </p>
          <PwaInstallButton />
          <div className="manual-install-guide">
            <strong>Panduan manual:</strong>
            <span>Android Chrome: menu titik tiga → Add to Home screen.</span>
            <span>iPhone Safari: tombol Share → Add to Home Screen.</span>
            <span>Desktop Chrome/Edge: cari ikon install di address bar.</span>
          </div>
        </PixelCard>
      </section>

      <section className="section-block how-section">
        <div className="section-heading-block">
          <p className="eyebrow">Fitur Penting</p>
          <h2>Kenali fungsi setiap halaman</h2>
          <p>
            Ini ringkasan halaman yang paling sering dipakai anggota. Kalau bingung harus buka apa,
            mulai dari Dashboard lalu lanjut ke Learning Map.
          </p>
        </div>

        <div className="how-feature-grid">
          {featureGuides.map((feature) => (
            <PixelCard className="how-feature-card" key={feature.title}>
              <span>{feature.icon}</span>
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </PixelCard>
          ))}
        </div>
      </section>

      <section className="section-block two-column how-detail-block">
        <PixelCard>
          <p className="eyebrow">Bookmark & Catatan</p>
          <h2>Cara belajar lebih rapi</h2>
          <p>
            Bookmark dipakai untuk menyimpan materi penting. Catatan pribadi dipakai untuk menulis rangkuman,
            kode penting, kesalahan yang sering terjadi, atau hal yang ingin kamu ulangi nanti.
          </p>
          <ul className="how-check-list">
            <li>Gunakan bookmark untuk materi yang ingin dibuka lagi.</li>
            <li>Tulis catatan singkat setelah membaca materi.</li>
            <li>Cari ulang materi lewat Learning Map.</li>
            <li>Buka Profile untuk melihat ringkasan bookmark dan catatan.</li>
          </ul>
        </PixelCard>

        <PixelCard>
          <p className="eyebrow">Challenge, Final Project, Sertifikat</p>
          <h2>Kenapa perlu submission?</h2>
          <p>
            Quiz menguji pemahaman dasar, sedangkan submission membuktikan kamu benar-benar bisa membuat sesuatu.
            Karena itu challenge dan final project perlu bukti pengerjaan yang jelas.
          </p>
          <ul className="how-check-list">
            <li>Challenge bisa memberi reward tambahan.</li>
            <li>Final project menjadi syarat utama sertifikat.</li>
            <li>Admin bisa memberi status revisi jika submission belum cukup.</li>
            <li>Sertifikat diterbitkan setelah final project approved.</li>
          </ul>
        </PixelCard>
      </section>

      <section className="section-block how-section">
        <div className="section-heading-block">
          <p className="eyebrow">Aturan Singkat</p>
          <h2>Yang perlu diingat anggota</h2>
        </div>

        <div className="how-rules-list">
          {quickRules.map((rule) => (
            <PixelCard className="how-rule-card" key={rule}>
              <span>✓</span>
              <p>{rule}</p>
            </PixelCard>
          ))}
        </div>
      </section>

      <section className="section-block how-section">
        <div className="section-heading-block">
          <p className="eyebrow">FAQ</p>
          <h2>Pertanyaan yang paling sering muncul</h2>
          <p>
            Baca bagian ini dulu sebelum bertanya. Sebagian besar masalah anggota baru biasanya ada di status akun,
            reset password, stage terkunci, atau tombol install app.
          </p>
        </div>

        <div className="how-faq-list">
          {faqItems.map((item) => (
            <details className="how-faq-item" key={item.q}>
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="how-final-cta">
        <PixelCard>
          <p className="eyebrow">Mulai Sekarang</p>
          <h2>Masih bingung mulai dari mana?</h2>
          <p>
            Daftar atau login dulu, cek status akun, lalu masuk ke Learning Map. Setelah itu cukup ikuti stage dari awal.
          </p>
          <div className="hero-actions">
            <Link className="pixel-button primary" to={startTarget}>
              {startLabel}
            </Link>
            <Link className="pixel-button secondary" to="/">
              Kembali ke Beranda
            </Link>
          </div>
        </PixelCard>
      </section>
    </main>
  );
}
