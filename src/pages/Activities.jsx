import { useEffect, useState } from 'react';
import EmptyState from '../components/EmptyState';
import LoadingState from '../components/LoadingState';
import PixelCard from '../components/PixelCard';
import { loadPublicData } from '../services/dataApi';

export default function Activities() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPublicData()
      .then((data) => setEvents(data.events))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <LoadingState />;
  }

  return (
    <main className="page-shell">
      <section className="page-hero compact-hero">
        <p className="eyebrow">Agenda</p>
        <h1>Kegiatan Study Group</h1>
        <p>Informasi kelas, mentoring, diskusi, dan workshop yang sudah dipublikasikan pengurus.</p>
      </section>

      {events.length ? (
        <section className="card-grid">
          {events.map((event) => (
            <PixelCard className="event-card" key={event.id}>
              <span className="status-pill">{event.status}</span>
              <h3>{event.title}</h3>
              <p>{event.description}</p>
              <div className="event-detail">
                <span>📅 {event.date || event.dayDate}</span>
                <span>⏰ {event.startTime} - {event.endTime || 'Selesai'}</span>
                <span>📍 {event.location}</span>
                <span>🎙️ {event.speaker}</span>
              </div>
            </PixelCard>
          ))}
        </section>
      ) : (
        <EmptyState title="Belum ada agenda" text="Agenda kegiatan akan tampil setelah dipublikasikan pengurus." />
      )}
    </main>
  );
}
