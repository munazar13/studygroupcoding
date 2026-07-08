import { Link } from 'react-router-dom';
import PixelCard from './PixelCard';

export default function LevelCard({ course, locked, completed, active }) {
  const stageNumber = course.stage || course.order || course.id;

  return (
    <PixelCard className={`level-card ${locked ? 'locked' : ''} ${active ? 'active' : ''}`}>
      <div className="level-head">
        <span className="stage-chip">Stage {stageNumber}</span>
        <span>{locked ? '🔒' : completed ? '✅' : '🎮'}</span>
      </div>
      <h3>{course.title}</h3>
      <p>{course.theme || course.subtitle || 'Materi sedang disiapkan.'}</p>
      <div className="level-meta">
        <span>{course.area}</span>
        <span>{course.minScore || 70}+ nilai</span>
      </div>
      {locked ? (
        <button className="pixel-button muted" disabled>Masih terkunci</button>
      ) : completed ? (
        <Link className="pixel-button secondary" to={`/course/${course.id}`}>Review Stage</Link>
      ) : (
        <Link className="pixel-button primary" to={`/course/${course.id}`}>Masuk Stage</Link>
      )}
    </PixelCard>
  );
}
