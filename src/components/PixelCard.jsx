export default function PixelCard({ children, className = '' }) {
  return <div className={`pixel-card ${className}`.trim()}>{children}</div>;
}
