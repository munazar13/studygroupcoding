import { useEffect, useMemo, useState } from 'react';
import PixelCard from './PixelCard';
import { useAuth } from '../context/AuthContext';
import { loadAnnouncements } from '../services/dataApi';

function isAnnouncementActive(announcement) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (announcement.startDate) {
    const startDate = new Date(announcement.startDate);
    startDate.setHours(0, 0, 0, 0);

    if (startDate > today) return false;
  }

  if (announcement.endDate) {
    const endDate = new Date(announcement.endDate);
    endDate.setHours(23, 59, 59, 999);

    if (endDate < new Date()) return false;
  }

  return true;
}

function canMemberSeeAnnouncement(announcement, member) {
  const target = String(announcement.target || 'all').toLowerCase();
  const status = String(member?.status || '').toLowerCase();

  if (target === 'all') return true;
  if (target === 'approved') return status === 'approved';
  if (target === 'pending') return status === 'pending';

  return true;
}

function getPriorityLabel(priority) {
  if (priority === 'urgent') return 'Mendesak';
  if (priority === 'high') return 'Penting';
  return 'Info';
}

function getPriorityIcon(priority) {
  if (priority === 'urgent') return '🚨';
  if (priority === 'high') return '📌';
  return '📢';
}

export default function AnnouncementsPanel({ limit = 3 }) {
  const auth = useAuth();
  const currentMember = auth?.currentMember || auth?.member || null;
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        const result = await loadAnnouncements();

        if (!active) return;

        setAnnouncements(result || []);
      } catch (error) {
        console.error(error);

        if (!active) return;

        setAnnouncements([]);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      active = false;
    };
  }, []);

  const visibleAnnouncements = useMemo(() => {
    return announcements
      .filter((announcement) => announcement.published !== false)
      .filter((announcement) => isAnnouncementActive(announcement))
      .filter((announcement) => canMemberSeeAnnouncement(announcement, currentMember))
      .slice(0, limit);
  }, [announcements, currentMember, limit]);

  if (loading) return null;
  if (!visibleAnnouncements.length) return null;

  return (
    <section className="home-announcement-panel">
      <div className="home-announcement-head">
        <div>
          <p className="eyebrow">Pengumuman</p>
          <h2>Info Terbaru</h2>
        </div>

        <span className="home-announcement-count">
          {visibleAnnouncements.length} info
        </span>
      </div>

      <div className="home-announcement-list">
        {visibleAnnouncements.map((announcement) => {
          const priority = String(announcement.priority || 'normal').toLowerCase();
          const showPriority = priority === 'high' || priority === 'urgent';

          return (
            <PixelCard
              className={`home-announcement-card priority-${priority}`}
              key={announcement.id}
            >
              <div className="home-announcement-icon">
                {getPriorityIcon(priority)}
              </div>

              <div className="home-announcement-content">
                <div className="home-announcement-badges">
                  <span>{announcement.category || 'Info'}</span>

                  {showPriority ? (
                    <span className={`priority-${priority}`}>
                      {getPriorityLabel(priority)}
                    </span>
                  ) : null}

                  {announcement.pinned ? (
                    <span>Pinned</span>
                  ) : null}
                </div>

                <h3>{announcement.title}</h3>
                <p>{announcement.message}</p>
              </div>
            </PixelCard>
          );
        })}
      </div>
    </section>
  );
}