import { Link, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import LoadingState from '../components/LoadingState';
import PixelButton from '../components/PixelButton';
import PixelCard from '../components/PixelCard';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { loadCourse, loadQuestions } from '../services/dataApi';
import { applyCourseCompletion } from '../utils/progress';

function renderContent(content) {
  const rawContent = Array.isArray(content)
    ? content.join('\n\n')
    : String(content || '');

  if (!rawContent.trim()) {
    return null;
  }

  const parts = rawContent.split(/```/g);

  return parts.flatMap((part, index) => {
    const isCodeBlock = index % 2 === 1;

    if (isCodeBlock) {
      const cleanPart = part.replace(/^\n/, '').trimEnd();
const lines = cleanPart.split('\n');

let language = 'text';
let code = cleanPart;

const firstLine = lines[0]?.trim() || '';
const knownLanguages = ['php', 'html', 'css', 'js', 'javascript', 'txt', 'sql', 'json'];

if (lines.length > 1 && knownLanguages.includes(firstLine.toLowerCase())) {
  language = firstLine.toLowerCase();
  code = lines.slice(1).join('\n').trimEnd();
} else {
  const oneLineMatch = cleanPart.match(/^([a-zA-Z0-9_-]+)\s+([\s\S]*)$/);

  if (oneLineMatch && knownLanguages.includes(oneLineMatch[1].toLowerCase())) {
    language = oneLineMatch[1].toLowerCase();
    code = oneLineMatch[2].trimEnd();
  }
}

      return [
        <pre
          className={`lesson-code-block language-${language}`}
          key={`code-${index}`}
        >
          <code>{code}</code>
        </pre>
      ];
    }

    const blocks = part
      .split(/\n{2,}/g)
      .map((block) => block.trim())
      .filter(Boolean);

    return blocks.flatMap((block, blockIndex) => {
      const lines = block
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

      return lines.map((line, lineIndex) => {
        const imageMatch = line.match(/^!\[(.*?)\]\((.*?)\)$/);

        if (imageMatch) {
          const altText = imageMatch[1] || 'Gambar materi';
          const imageUrl = imageMatch[2] || '';

          return (
            <figure
              className="lesson-image-block"
              key={`image-${index}-${blockIndex}-${lineIndex}`}
            >
              <img
                src={imageUrl}
                alt={altText}
                loading="lazy"
                onError={(event) => {
                  event.currentTarget.style.display = 'none';
                }}
              />
              <figcaption>{altText}</figcaption>
            </figure>
          );
        }

        return (
          <p key={`paragraph-${index}-${blockIndex}-${lineIndex}`}>
            {line}
          </p>
        );
      });
    });
  });
}

export default function Course() {
  const { stageId } = useParams();
  const navigate = useNavigate();
  const { currentMember, updateCurrentMember } = useAuth();
  const { showToast } = useToast();
  const [course, setCourse] = useState(null);
  const [questionCount, setQuestionCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([loadCourse(stageId), loadQuestions(stageId)])
      .then(([courseData, questions]) => {
        setCourse(courseData);
        setQuestionCount(questions.length);
      })
      .finally(() => setLoading(false));
  }, [stageId]);

  if (loading) {
    return <LoadingState />;
  }

  if (!course) {
    return (
      <main className="page-shell center-page">
        <PixelCard className="locked-panel">
          <span className="big-icon">📝</span>
          <h1>Materi belum tersedia</h1>
          <p>Stage ini belum dipublikasikan oleh pengurus. Coba cek kembali setelah admin mengisi roadmap dan materi.</p>
          <Link className="pixel-button primary" to="/map">Kembali ke Map</Link>
        </PixelCard>
      </main>
    );
  }

  const locked = Number(course.id) > Number(currentMember.currentStage || 1);
  const completed = (currentMember.completedCourses || []).includes(Number(course.id));
  const hasMaterials = (course.modules || []).length > 0;
  const hasQuestions = questionCount > 0;

  async function markComplete() {
    if (!hasMaterials) {
      showToast('Materi belum tersedia untuk stage ini.', 'error');
      return;
    }

    if (!hasQuestions) {
      showToast('Quiz belum tersedia. Admin perlu menambahkan soal dulu.', 'error');
      return;
    }

    await updateCurrentMember((member) => applyCourseCompletion(member, course));
    showToast('Materi selesai. Quiz Battle terbuka.');
    navigate(`/quiz/${course.id}`);
  }

  return (
    <main className="page-shell course-page">
      <section className="page-hero compact-hero">
        <p className="eyebrow">Stage {course.id}</p>
        <h1>{course.title}</h1>
        <p>{course.theme}</p>
      </section>

      {locked ? (
        <PixelCard className="locked-panel">
          <span className="big-icon">🔒</span>
          <h2>Stage terkunci</h2>
          <p>Selesaikan stage sebelumnya untuk membuka materi ini.</p>
          <Link className="pixel-button secondary" to="/map">Kembali ke Map</Link>
        </PixelCard>
      ) : (
        <>
          {hasMaterials ? (
            <section className="material-list">
              {(course.modules || []).map((module) => (
                <PixelCard className="material-card" key={module.id}>
                  <h2>{module.title}</h2>
                  <div className="lesson-content">
                  {renderContent(module.content)}
                  </div>
                  {module.code ? <pre><code>{module.code}</code></pre> : null}
                  {module.checkpoint ? <div className="checkpoint">🎯 {module.checkpoint}</div> : null}
                </PixelCard>
              ))}
            </section>
          ) : (
            <PixelCard className="locked-panel">
              <span className="big-icon">📚</span>
              <h2>Materi belum diisi</h2>
              <p>Stage sudah dibuat, tetapi bagian materi belum dipublikasikan oleh admin.</p>
            </PixelCard>
          )}

          <PixelCard className="course-action-card">
            <h2>{completed ? 'Materi sudah selesai' : 'Siap lanjut ke Quiz Battle?'}</h2>
            <p>{hasQuestions ? `${questionCount} soal tersedia untuk stage ini.` : 'Quiz belum tersedia karena soal belum diisi admin.'}</p>
            {completed && hasQuestions ? (
              <Link className="pixel-button primary" to={`/quiz/${course.id}`}>Buka Quiz Battle</Link>
            ) : (
              <PixelButton disabled={!hasMaterials || !hasQuestions} onClick={markComplete}>Saya Sudah Paham</PixelButton>
            )}
          </PixelCard>
        </>
      )}
    </main>
  );
}
