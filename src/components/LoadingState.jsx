export default function LoadingState({ text = 'Memuat data...' }) {
  return (
    <main className="page-shell center-page">
      <div className="pixel-loader" />
      <p>{text}</p>
    </main>
  );
}
