import { useEffect, useState } from 'react';
import EmptyState from '../components/EmptyState';
import LoadingState from '../components/LoadingState';
import PixelCard from '../components/PixelCard';
import { loadPublicData } from '../services/dataApi';

export default function Gallery() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPublicData()
      .then((data) => setProjects(data.projects))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <LoadingState />;
  }

  return (
    <main className="page-shell">
      <section className="page-hero compact-hero">
        <p className="eyebrow">Showcase Hall</p>
        <h1>Karya Anggota</h1>
        <p>Etalase project anggota yang sudah dipublikasikan pengurus.</p>
      </section>

      {projects.length ? (
        <section className="card-grid">
          {projects.map((project) => (
            <PixelCard className="project-card" key={project.id}>
              <span className="status-pill">{project.category}</span>
              <h3>{project.title}</h3>
              <p>{project.description}</p>
              <strong>{project.maker}</strong>
              <div className="project-actions">
                {project.demoUrl ? <a href={project.demoUrl} target="_blank" rel="noreferrer">Demo</a> : null}
                {project.githubUrl ? <a href={project.githubUrl} target="_blank" rel="noreferrer">GitHub</a> : null}
              </div>
            </PixelCard>
          ))}
        </section>
      ) : (
        <EmptyState title="Belum ada karya yang dipublikasikan" text="Karya anggota akan tampil sebagai showcase setelah dipilih pengurus." />
      )}
    </main>
  );
}
