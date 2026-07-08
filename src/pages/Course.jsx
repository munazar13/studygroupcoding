import { Link, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import LoadingState from '../components/LoadingState';
import PixelButton from '../components/PixelButton';
import PixelCard from '../components/PixelCard';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { createContentReport, loadCourse, loadQuestions } from '../services/dataApi';
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

function hasNumberId(items = [], id) {
  const target = Number(id);

  return items.some((item) => Number(item) === target);
}

function getCourseStageNumber(course = {}) {
  return Number(course.stage || course.order || course.id || 0);
}

export default function Course() {
  const { stageId } = useParams();
  const navigate = useNavigate();
  const { currentMember, updateCurrentMember } = useAuth();
  const { showToast } = useToast();
  const [course, setCourse] = useState(null);
  const [questionCount, setQuestionCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportType, setReportType] = useState('materi');
  const [reportMessage, setReportMessage] = useState('');
  const [reportSending, setReportSending] = useState(false);
  const [privateNote, setPrivateNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    Promise.all([loadCourse(stageId), loadQuestions(stageId)])
      .then(([courseData, questions]) => {
        setCourse(courseData);
        setQuestionCount(questions.length);
      })
      .finally(() => setLoading(false));
  }, [stageId]);

  useEffect(() => {
    setPrivateNote(String(currentMember?.privateNotes?.[String(stageId)] || ''));
  }, [currentMember, stageId]);

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

  const locked = getCourseStageNumber(course) > Number(currentMember.currentStage || 1);
  const completed = hasNumberId(currentMember.completedCourses || [], course.id);
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


  function getBookmarkId(module) {
    return `${String(course.id)}::${String(module.id || module.type || module.order)}`;
  }

  function isModuleBookmarked(module) {
    const bookmarkId = getBookmarkId(module);

    return (currentMember.materialBookmarks || []).some(
      (bookmark) => String(bookmark.id || '') === bookmarkId
    );
  }

  async function toggleModuleBookmark(module) {
    const bookmarkId = getBookmarkId(module);
    const alreadyBookmarked = isModuleBookmarked(module);

    try {
      await updateCurrentMember((member) => {
        const currentBookmarks = Array.isArray(member.materialBookmarks)
          ? member.materialBookmarks
          : [];

        const nextBookmarks = alreadyBookmarked
          ? currentBookmarks.filter((bookmark) => String(bookmark.id || '') !== bookmarkId)
          : [
              {
                id: bookmarkId,
                courseId: String(course.id),
                courseTitle: course.title,
                moduleId: String(module.id || module.type || module.order),
                moduleTitle: module.title,
                createdAt: new Date().toISOString()
              },
              ...currentBookmarks
            ];

        return {
          materialBookmarks: nextBookmarks.slice(0, 50)
        };
      });

      showToast(alreadyBookmarked ? 'Bookmark materi dihapus.' : 'Materi ditambahkan ke bookmark.');
    } catch (error) {
      showToast(error.message || 'Gagal mengubah bookmark.', 'error');
    }
  }

  async function savePrivateNote(event) {
    event.preventDefault();
    setSavingNote(true);

    try {
      await updateCurrentMember((member) => ({
        privateNotes: {
          ...(member.privateNotes || {}),
          [String(course.id)]: privateNote.trim()
        }
      }));

      showToast('Catatan pribadi berhasil disimpan.');
    } catch (error) {
      showToast(error.message || 'Gagal menyimpan catatan.', 'error');
    } finally {
      setSavingNote(false);
    }
  }

  async function submitContentReport(event) {
    event.preventDefault();

    const cleanMessage = reportMessage.trim();

    if (!cleanMessage) {
      showToast('Isi detail laporan dulu.', 'error');
      return;
    }

    setReportSending(true);

    try {
      await createContentReport({
        uid: currentMember.uid,
        memberName: currentMember.name,
        type: reportType,
        courseId: String(course.id),
        targetId: String(course.id),
        targetTitle: course.title,
        message: cleanMessage,
        status: 'open'
      });

      setReportMessage('');
      setReportOpen(false);
      showToast('Laporan berhasil dikirim ke admin.');
    } catch (error) {
      console.error(error);
      showToast(error.message || 'Gagal mengirim laporan.', 'error');
    } finally {
      setReportSending(false);
    }
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
              {(course.modules || []).map((module, index) => (
                <PixelCard className="material-card" key={module.id}>
                  <div className="material-card-head">
                    <div>
                      <p className="material-step-label">Materi {index + 1}/{course.modules.length}</p>
                      <h2>{module.title}</h2>
                    </div>
                    <PixelButton
                      type="button"
                      variant={isModuleBookmarked(module) ? 'secondary' : 'ghost'}
                      onClick={() => toggleModuleBookmark(module)}
                    >
                      {isModuleBookmarked(module) ? '★ Tersimpan' : '☆ Bookmark'}
                    </PixelButton>
                  </div>
                  <div className="lesson-content">
                  {renderContent(module.content)}
                  </div>
                  {module.checkpoint ? (
                    <div className="checkpoint">
                      <strong>Checkpoint</strong>
                      <p>{module.checkpoint}</p>
                    </div>
                  ) : null}
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

          <PixelCard className="private-note-card">
            <div className="section-title-row">
              <div>
                <p className="eyebrow">Catatan Pribadi</p>
                <h2>Catatan untuk stage ini</h2>
                <p>Catatan ini hanya tersimpan di akunmu dan tidak dilihat admin.</p>
              </div>
            </div>

            <form className="form-stack" onSubmit={savePrivateNote}>
              <label>
                Isi catatan
                <textarea
                  value={privateNote}
                  onChange={(event) => setPrivateNote(event.target.value)}
                  placeholder="Tulis ringkasan, hal yang belum paham, atau potongan kode penting dari stage ini."
                />
              </label>
              <PixelButton type="submit" disabled={savingNote}>
                {savingNote ? 'Menyimpan...' : 'Simpan Catatan'}
              </PixelButton>
            </form>
          </PixelCard>

          <PixelCard className="content-report-card">
            <div className="section-title-row">
              <div>
                <p className="eyebrow">Feedback Materi</p>
                <h2>Menemukan masalah?</h2>
                <p>Laporkan kalau materi membingungkan, gambar rusak, kode tidak tampil, atau soal terasa keliru.</p>
              </div>
              <PixelButton type="button" variant="secondary" onClick={() => setReportOpen((open) => !open)}>
                {reportOpen ? 'Tutup Laporan' : 'Laporkan Masalah'}
              </PixelButton>
            </div>

            {reportOpen ? (
              <form className="form-stack" onSubmit={submitContentReport}>
                <label>
                  Jenis Laporan
                  <select value={reportType} onChange={(event) => setReportType(event.target.value)}>
                    <option value="materi">Materi membingungkan</option>
                    <option value="gambar">Gambar rusak/tidak muncul</option>
                    <option value="kode">Kode tidak tampil/error</option>
                    <option value="soal">Soal/jawaban perlu dicek</option>
                  </select>
                </label>
                <label>
                  Detail Laporan
                  <textarea
                    value={reportMessage}
                    onChange={(event) => setReportMessage(event.target.value)}
                    placeholder="Contoh: gambar di materi 3 tidak muncul, atau contoh kodenya membingungkan."
                  />
                </label>
                <PixelButton type="submit" disabled={reportSending}>
                  {reportSending ? 'Mengirim...' : 'Kirim Laporan'}
                </PixelButton>
              </form>
            ) : null}
          </PixelCard>
        </>
      )}
    </main>
  );
}
