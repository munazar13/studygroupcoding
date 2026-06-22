import { useEffect, useState } from 'react';
import LoadingState from '../components/LoadingState';
import LevelCard from '../components/LevelCard';
import PixelCard from '../components/PixelCard';
import { useAuth } from '../context/AuthContext';
import { loadLearningData } from '../services/dataApi';

export default function LearningMap() {
  const { currentMember } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLearningData()
      .then((data) => setCourses(data.courses))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <LoadingState />;
  }

  return (
    <main className="page-shell">
      <section className="page-hero compact-hero">
        <p className="eyebrow">Learning Map</p>
        <h1>Peta Belajar</h1>
        <p>Stage belajar akan muncul setelah admin membuat roadmap dan mempublikasikannya.</p>
      </section>

      {courses.length ? (
        <section className="learning-map-grid">
          {courses.map((course) => {
            const locked = Number(course.id) > Number(currentMember.currentStage || 1);
            const completed = (currentMember.passedStages || []).includes(Number(course.id));
            const active = Number(course.id) === Number(currentMember.currentStage || 1);

            return (
              <LevelCard
                active={active}
                completed={completed}
                course={course}
                key={course.id}
                locked={locked}
              />
            );
          })}
        </section>
      ) : (
        <PixelCard className="locked-panel">
          <span className="big-icon">🧭</span>
          <h2>Roadmap belum tersedia</h2>
          <p>Admin belum mempublikasikan stage belajar. Setelah roadmap dibuat, anggota bisa mulai belajar dari stage pertama.</p>
        </PixelCard>
      )}
    </main>
  );
}
