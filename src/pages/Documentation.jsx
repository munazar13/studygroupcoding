import { useEffect, useState } from 'react';
import EmptyState from '../components/EmptyState';
import LoadingState from '../components/LoadingState';
import PixelCard from '../components/PixelCard';
import { loadPublicData } from '../services/dataApi';

export default function Documentation() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPublicData()
      .then((data) => setDocs(data.docs))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <LoadingState />;
  }

  return (
    <main className="page-shell">
      <section className="page-hero compact-hero">
        <p className="eyebrow">Dokumentasi</p>
        <h1>Galeri Kegiatan</h1>
        <p>Kumpulan momen belajar, diskusi, dan kegiatan Study Group Coding.</p>
      </section>

      {docs.length ? (
        <section className="documentation-grid">
          {docs.map((doc) => (
            <PixelCard className="doc-card" key={doc.id}>
              {doc.image ? <img src={doc.image} alt={doc.title} /> : <div className="image-placeholder">📷</div>}
              <h3>{doc.title}</h3>
              <span>{doc.date}</span>
              <p>{doc.description}</p>
            </PixelCard>
          ))}
        </section>
      ) : (
        <EmptyState title="Belum ada dokumentasi" text="Foto kegiatan akan tampil setelah dipublikasikan pengurus." />
      )}
    </main>
  );
}
