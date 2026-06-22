import { Link } from 'react-router-dom';
import PixelCard from './PixelCard';

export default function LevelCard({ course, locked, completed, active }) {
  return (
    <PixelCard className={`level-card ${locked ? 'locked' : ''} ${active ? 'active' : ''}`}>
      <div className="level-head">
        <span className="stage-chip">Stage {course.id}</span>
        <span>{locked ? '🔒' : completed ? '✅' : '🎮'}</span>
      </div>
      <h3>{course.title}</h3>
      <p>{course.theme || course.subtitle}</p>
      <div className="level-meta">
        <span>{course.area}</span>
        <span>{course.minScore || 70}+ nilai</span>
      </div>
      {locked ? (
        <button className="pixel-button muted" disabled>Masih terkunci</button>
      ) : (
        <Link className="pixel-button primary" to={`/course/${course.id}`}>Masuk Stage</Link>
      )}
    </PixelCard>
  );
}
