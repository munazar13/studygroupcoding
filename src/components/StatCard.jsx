export default function StatCard({ label, value, icon = '✨' }) {
  return (
    <div className="stat-card">
      <span className="stat-icon">{icon}</span>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
