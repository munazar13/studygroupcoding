import PixelCard from './PixelCard';

export default function EmptyState({ title, text, action }) {
  return (
    <PixelCard className="empty-state">
      <div className="empty-icon">🧩</div>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </PixelCard>
  );
}
