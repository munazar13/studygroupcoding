import PixelButton from '../components/PixelButton';
import PixelCard from '../components/PixelCard';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { markNotificationRead } from '../services/dataApi';

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function Notifications() {
  const { currentMember, refreshMember } = useAuth();
  const { showToast } = useToast();
  const notifications = [...(currentMember?.notifications || [])].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));

  async function handleRead(id) {
    try {
      await markNotificationRead(currentMember, id);
      await refreshMember();
      showToast('Notifikasi ditandai sudah dibaca.');
    } catch (error) {
      showToast(error.message || 'Gagal update notifikasi.', 'error');
    }
  }

  return (
    <main className="page-shell">
      <section className="page-hero compact-hero">
        <p className="eyebrow">Notification Center</p>
        <h1>Notifikasi Akun</h1>
        <p>Di sini kamu melihat kabar penting tentang akun, challenge, final project, reward, dan sertifikat.</p>
      </section>

      {notifications.length ? (
        <section className="material-list notification-list">
          {notifications.map((item) => (
            <PixelCard className={`notification-card ${item.read ? 'read' : 'unread'} ${item.type || 'info'}`} key={item.id}>
              <div className="section-title-row">
                <div>
                  <p className="eyebrow">{formatDate(item.createdAt)}</p>
                  <h2>{item.title}</h2>
                </div>
                {!item.read ? <span className="status-pill pending">Baru</span> : <span className="status-pill approved">Dibaca</span>}
              </div>
              <p>{item.message}</p>
              <div className="button-row">
                {item.link ? <a className="pixel-button secondary" href={`#${item.link}`}>Buka</a> : null}
                {!item.read ? <PixelButton type="button" onClick={() => handleRead(item.id)}>Tandai Dibaca</PixelButton> : null}
              </div>
            </PixelCard>
          ))}
        </section>
      ) : (
        <PixelCard className="locked-panel">
          <span className="big-icon">🔔</span>
          <h2>Belum ada notifikasi</h2>
          <p>Nanti update akun, challenge, final project, dan sertifikat akan muncul di sini.</p>
        </PixelCard>
      )}
    </main>
  );
}
