import LessonContent from './LessonContent';

export default function AdminPreviewContent({ content, prefix = 'admin-preview' }) {
  const rawContent = Array.isArray(content)
    ? content.join('\n\n')
    : String(content || '');

  if (!rawContent.trim()) {
    return <p className="preview-empty">Belum ada isi untuk dipreview.</p>;
  }

  return (
    <div className="admin-member-preview-frame">
      <div className="admin-member-preview-topbar">
        <span>Preview tampilan member</span>
        <strong>Renderer sama dengan halaman Course</strong>
      </div>
      <LessonContent
        content={rawContent}
        className="admin-preview-content"
        keyPrefix={prefix}
      />
    </div>
  );
}
