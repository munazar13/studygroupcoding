import { useEffect, useState } from 'react';
import PixelCard from '../components/PixelCard';
import LoadingState from '../components/LoadingState';
import { loadPublicData } from '../services/dataApi';

export default function About() {
  const [founders, setFounders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPublicData()
      .then((data) => setFounders(data.founders))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <LoadingState />;
  }

  return (
    <main className="page-shell">
      <section className="page-hero compact-hero">
        <p className="eyebrow">Tentang Kami</p>
        <h1>Study Group Coding</h1>
        <p>
          Komunitas belajar coding yang didirikan oleh Letting 25 dengan tujuan membantu mahasiswa baru Pendidikan Teknologi Informasi memahami pemrograman dari nol hingga mampu membaca alur PHP dan MySQL secara bertahap.
        </p>
      </section>

      <section className="about-layout">
        <PixelCard>
          <h2>Tujuan</h2>
          <p>
            Menjadi ruang belajar yang ramah untuk mahasiswa baru agar dapat memahami logika pemrograman, dasar web, JavaScript, PHP, MySQL, dan alur aplikasi sederhana.
          </p>
        </PixelCard>
        <PixelCard>
          <h2>Nilai Komunitas</h2>
          <ul className="clean-list">
            <li>Belajar bertahap dan tidak saling menjatuhkan.</li>
            <li>Berani mencoba, salah, memperbaiki, dan mengulang.</li>
            <li>Mengutamakan pemahaman alur daripada hafalan kode.</li>
          </ul>
        </PixelCard>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <p className="eyebrow">Pengurus</p>
          <h2>Tim Inti</h2>
        </div>
        <div className="founder-grid formal-grid">
          {founders.map((founder) => (
            <PixelCard className="founder-card formal" key={founder.id}>
              <img src={founder.image} alt={founder.name} />
              <h3>{founder.name}</h3>
              <strong>{founder.role}</strong>
              <p>{founder.skill}</p>
            </PixelCard>
          ))}
        </div>
      </section>
    </main>
  );
}
