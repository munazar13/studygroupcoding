import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import LoadingState from '../components/LoadingState';
import LevelCard from '../components/LevelCard';
import PixelCard from '../components/PixelCard';
import { useAuth } from '../context/AuthContext';
import { loadLearningCatalog } from '../services/dataApi';

function normalizeText(value) {
  return String(value || '').toLowerCase().trim();
}

function getCourseStageNumber(course = {}) {
  return Number(course.stage || course.order || course.id || 0);
}

export default function LearningMap() {
  const { currentMember } = useAuth();
  const [courses, setCourses] = useState([]);
  const [courseSections, setCourseSections] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLearningCatalog()
      .then((data) => {
        setCourses(data.courses || []);
        setCourseSections(data.courseSections || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredCourses = useMemo(() => {
    const keyword = normalizeText(searchTerm);

    if (!keyword) return courses;

    return courses.filter((course) => {
      const courseText = normalizeText([
        course.id,
        course.stage,
        course.title,
        course.area,
        course.theme
      ].join(' '));

      const sectionText = courseSections
        .filter((section) => String(section.courseId) === String(course.id))
        .map((section) => `${section.title} ${section.content} ${section.checkpoint}`)
        .join(' ')
        .toLowerCase();

      return courseText.includes(keyword) || sectionText.includes(keyword);
    });
  }, [courses, courseSections, searchTerm]);

  const bookmarks = useMemo(() => {
    return (currentMember?.materialBookmarks || [])
      .filter((item) => item?.courseId)
      .slice(0, 5);
  }, [currentMember]);

  if (loading) {
    return <LoadingState />;
  }

  return (
    <main className="page-shell">
      <section className="page-hero compact-hero">
        <p className="eyebrow">Learning Map</p>
        <h1>Peta Belajar</h1>
        <p>Cari stage atau materi, lanjutkan petualangan belajar, dan buka kembali bookmark pentingmu.</p>
      </section>

      <section className="learning-tools-grid">
        <PixelCard>
          <h2>Cari Materi</h2>
          <label>
            Kata kunci
            <input
              placeholder="Contoh: HTML, if else, array, database"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </label>
          <p>{filteredCourses.length} stage cocok dengan pencarian.</p>
        </PixelCard>

        <PixelCard>
          <h2>Bookmark Terakhir</h2>
          {bookmarks.length ? (
            <div className="bookmark-list compact-list">
              {bookmarks.map((bookmark) => (
                <Link className="bookmark-row" key={bookmark.id || `${bookmark.courseId}-${bookmark.moduleId}`} to={`/course/${bookmark.courseId}`}>
                  <strong>{bookmark.moduleTitle || 'Materi tersimpan'}</strong>
                  <span>{bookmark.courseTitle || `Stage ${bookmark.courseId}`}</span>
                </Link>
              ))}
            </div>
          ) : (
            <p>Belum ada bookmark. Buka materi lalu tandai bagian yang penting.</p>
          )}
        </PixelCard>
      </section>

      {filteredCourses.length ? (
        <section className="learning-map-grid">
          {filteredCourses.map((course) => {
            const stageNumber = getCourseStageNumber(course);
            const locked = stageNumber > Number(currentMember.currentStage || 1);
            const completedStages = [
              ...(currentMember.completedStages || []),
              ...(currentMember.passedStages || [])
            ].map(Number);
            const completed = completedStages.includes(stageNumber);
            const active = stageNumber === Number(currentMember.currentStage || 1);

            return (
              <LevelCard
                active={active}
                completed={completed}
                course={course}
                key={course.id}
                locked={locked}
              />
            );
          })}
        </section>
      ) : (
        <PixelCard className="locked-panel">
          <span className="big-icon">🧭</span>
          <h2>{searchTerm ? 'Materi tidak ditemukan' : 'Roadmap belum tersedia'}</h2>
          <p>{searchTerm ? 'Coba kata kunci lain atau hapus pencarian.' : 'Admin belum mempublikasikan stage belajar.'}</p>
        </PixelCard>
      )}
    </main>
  );
}
