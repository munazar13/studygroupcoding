import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import LoadingState from '../components/LoadingState';
import PixelButton from '../components/PixelButton';
import PixelCard from '../components/PixelCard';
import LessonContent from '../components/LessonContent';
import CodePlayground from '../components/CodePlayground';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { createContentReport, loadCourse, loadQuestions } from '../services/dataApi';
import { applyCourseCompletion } from '../utils/progress';

function hasNumberId(items = [], id) {
  const target = Number(id);

  return items.some((item) => Number(item) === target);
}

function getCourseStageNumber(course = {}) {
  return Number(course.stage || course.order || course.id || 0);
}


const ROADMAP = [
  'Mengenal Dunia Coding',
  'Cara Berpikir Komputasional',
  'Algoritma Dasar',
  'Flowchart dan Pseudocode',
  'Variabel dan Tipe Data',
  'Operator',
  'Input, Proses, Output',
  'Percabangan If Else',
  'Percabangan Bertingkat',
  'Perulangan',
  'Array Dasar',
  'Function Dasar',
  'Cara Kerja Website',
  'Struktur Project Web',
  'HTML Dasar',
  'HTML Lanjutan',
  'CSS Dasar',
  'Layout CSS',
  'Responsive Design',
  'JavaScript Dasar',
  'Function dan Event',
  'DOM Manipulation',
  'Validasi Form',
  'LocalStorage',
  'Mengenal Backend',
  'Pengenalan PHP',
  'Variabel dan Operator PHP',
  'Percabangan dan Perulangan PHP',
  'Form dengan PHP',
  'Konsep Database',
  'SQL Dasar',
  'PHP dan MySQL'
];

function getLearningPathInfo(stageNumber, course = {}) {
  const index = Math.max(0, Number(stageNumber || 1) - 1);
  const previousTitle = ROADMAP[index - 1] || 'Fondasi awal';
  const currentTitle = course.title || ROADMAP[index] || `Stage ${stageNumber}`;
  const nextTitle = ROADMAP[index + 1] || 'Final Project';

  const skillMap = {
    15: ['menulis struktur HTML', 'memahami elemen dasar', 'menyiapkan halaman untuk CSS'],
    16: ['membuat form', 'memakai elemen semantik', 'menyusun tabel dasar'],
    17: ['memberi warna dan jarak', 'memahami selector', 'memakai margin dan padding'],
    18: ['menyusun layout', 'memakai flexbox/grid dasar', 'membuat card lebih rapi'],
    19: ['membuat tampilan mobile', 'memahami breakpoint', 'menjaga layout tidak pecah'],
    20: ['menulis JavaScript dasar', 'mengubah nilai', 'melihat output kode'],
    21: ['membuat function', 'menangani event', 'menghubungkan tombol dengan aksi'],
    22: ['mengambil elemen DOM', 'mengubah teks/style', 'membuat halaman responsif terhadap aksi'],
    23: ['memeriksa input form', 'menampilkan pesan error', 'mencegah data kosong'],
    24: ['menyimpan data di browser', 'membaca data LocalStorage', 'membuat fitur kecil yang persisten'],
    25: ['membedakan frontend dan backend', 'memahami request/response backend', 'siap masuk PHP'],
    30: ['memahami tabel database', 'membedakan baris dan kolom', 'menyiapkan data untuk SQL']
  };

  return {
    previousTitle,
    currentTitle,
    nextTitle,
    why: `Stage ini menghubungkan ${previousTitle} ke ${nextTitle}, jadi fokusnya bukan hanya selesai membaca, tetapi memahami skill yang akan dipakai lagi di stage berikutnya.`,
    skills: skillMap[stageNumber] || ['memahami konsep utama stage', 'mencoba contoh sederhana', 'menjelaskan ulang dengan bahasa sendiri']
  };
}

function getFrontendPlaygroundInitialCode(stageNumber) {
  if (stageNumber <= 16) {
    return {
      html: '<header>\n  <h1>Halo Dunia Web</h1>\n  <p>Saya sedang belajar HTML.</p>\n</header>\n\n<form>\n  <label for="nama">Nama</label>\n  <input id="nama" name="nama" type="text" placeholder="Isi nama">\n  <button type="submit">Kirim</button>\n</form>',
      css: '',
      js: ''
    };
  }

  if (stageNumber <= 19) {
    return {
      html: '<section class="card">\n  <h1>Belajar CSS</h1>\n  <p>Ubah warna, jarak, dan bentuk card ini.</p>\n  <button>Mulai</button>\n</section>',
      css: '.card {\n  border: 2px solid #1f2937;\n  padding: 20px;\n  border-radius: 16px;\n  background: #eff6ff;\n}\n\nbutton {\n  padding: 10px 16px;\n  border: none;\n  border-radius: 10px;\n  background: #2563eb;\n  color: white;\n}',
      js: ''
    };
  }

  return {
    html: '<h1 id="judul">Belajar JavaScript</h1>\n<p id="pesan">Klik tombol untuk mengubah teks.</p>\n<button id="tombol">Klik Saya</button>',
    css: 'body { font-family: Arial, sans-serif; }\nbutton { padding: 10px 16px; }',
    js: "const tombol = document.getElementById('tombol');\nconst pesan = document.getElementById('pesan');\n\ntombol.addEventListener('click', function () {\n  pesan.textContent = 'Teks berhasil diubah dengan JavaScript.';\n});"
  };
}

function getMiniProjectTask(stageNumber) {
  const tasks = {
    15: 'Buat halaman profil sederhana berisi judul, paragraf, gambar, link, dan daftar skill.',
    16: 'Buat form pendaftaran anggota berisi nama, NIM, email, angkatan, alasan bergabung, dan tombol daftar.',
    17: 'Beri style pada form pendaftaran: input rapi, tombol jelas, padding nyaman, dan warna konsisten.',
    18: 'Susun tiga card materi menjadi layout rapi di satu halaman.',
    19: 'Buat layout card yang rapi di laptop dan berubah nyaman di HP.',
    20: 'Buat tombol yang saat diklik mengubah teks di halaman.',
    21: 'Buat function untuk menghitung atau menampilkan pesan, lalu panggil dari event tombol.',
    22: 'Buat tombol yang mengambil elemen DOM lalu mengubah isi atau class-nya.',
    23: 'Buat form sederhana yang menampilkan pesan error jika input kosong.',
    24: 'Buat catatan sederhana yang bisa disimpan dan dibaca lagi dari LocalStorage.',
    25: 'Gambar alur request dari browser ke backend dan response kembali ke browser.',
    26: 'Buat contoh halaman PHP sederhana yang menghasilkan teks dinamis.',
    27: 'Buat contoh variabel PHP untuk menyimpan nama, harga, jumlah, dan total.',
    28: 'Buat contoh if dan loop PHP untuk menampilkan status nilai atau daftar data.',
    29: 'Buat rancangan form HTML yang siap diproses PHP dengan name yang jelas.',
    30: 'Rancang tabel database sederhana beserta kolom dan contoh datanya.',
    31: 'Tulis contoh query SELECT, WHERE, INSERT, UPDATE, dan DELETE untuk tabel latihan.',
    32: 'Rancang alur form PHP yang menyimpan data ke MySQL dan menampilkan kembali hasilnya.'
  };

  return tasks[stageNumber] || 'Buat latihan kecil yang membuktikan kamu memahami inti stage ini, lalu tulis catatan singkat hasil percobaannya.';
}

function estimateReadingMinutes(text = '') {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 150));
}

function getPracticeProgressKey(courseId) {
  return `practiceTriedAt:${String(courseId || '')}`;
}

export default function Course() {
  const { stageId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
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
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const [checkpointAnswers, setCheckpointAnswers] = useState({});
  const [revealedCheckpoint, setRevealedCheckpoint] = useState({});
  const [miniProjectReflection, setMiniProjectReflection] = useState('');
  const [savingMiniProject, setSavingMiniProject] = useState(false);

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

  useEffect(() => {
    const courseProgressId = String(course?.id || stageId || '');
    const miniProject = currentMember?.stageProgress?.[courseProgressId]?.miniProject || {};
    setMiniProjectReflection(String(miniProject.reflection || ''));
  }, [currentMember?.stageProgress, course?.id, stageId]);

  useEffect(() => {
    setActiveSectionIndex(0);
  }, [stageId]);

  const modules = course?.modules || [];

  useEffect(() => {
    const requestedSection = searchParams.get('section');

    if (!requestedSection || !modules.length) return;

    const targetIndex = modules.findIndex((module, index) => {
      return [
        String(module.id || ''),
        String(module.type || ''),
        String(module.order || ''),
        String(index)
      ].includes(String(requestedSection));
    });

    if (targetIndex >= 0) {
      setActiveSectionIndex(targetIndex);
    }
  }, [searchParams, modules]);

  const hasMaterials = modules.length > 0;
  const hasQuestions = questionCount > 0;
  const activeModule = modules[Math.min(activeSectionIndex, Math.max(0, modules.length - 1))] || null;
  const activeReadingMinutes = activeModule ? estimateReadingMinutes(activeModule.content) : 1;

  function getModuleProgressKey(module) {
    return String(module?.id || module?.type || module?.order || '');
  }

  const materialProgress = useMemo(() => {
    const courseProgressId = String(course?.id || stageId || '');
    const stageProgress = currentMember?.stageProgress?.[courseProgressId] || {};
    const doneItems = Array.isArray(stageProgress.materialSectionsDone)
      ? stageProgress.materialSectionsDone.map(String)
      : [];
    const doneSet = new Set(doneItems);
    const doneCount = modules.filter((module) => doneSet.has(getModuleProgressKey(module))).length;

    return {
      doneItems,
      doneSet,
      doneCount,
      total: modules.length,
      complete: modules.length > 0 && doneCount === modules.length
    };
  }, [currentMember?.stageProgress, course?.id, stageId, modules]);

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

  const stageNumber = getCourseStageNumber(course) || Number(stageId);
  const learningPathInfo = getLearningPathInfo(stageNumber, course);
  const defaultStageTask = getMiniProjectTask(stageNumber);
  const taskTitle = String(course.taskTitle || `Tugas Stage ${stageNumber}`).trim();
  const taskDescription = String(course.taskDescription || defaultStageTask).trim();
  const frontendPlaygroundEnabled = stageNumber >= 15 && stageNumber <= 24;
  const defaultPlaygroundCode = getFrontendPlaygroundInitialCode(stageNumber);
  const playgroundInitialCode = {
    html: String(course.playgroundHtml || defaultPlaygroundCode.html || ''),
    css: String(course.playgroundCss || defaultPlaygroundCode.css || ''),
    js: String(course.playgroundJs || course.playgroundJavascript || defaultPlaygroundCode.js || '')
  };
  const locked = stageNumber > Number(currentMember?.currentStage || 1);
  const completed = hasNumberId(currentMember?.completedCourses || [], course.id);
  const stageProgress = currentMember?.stageProgress?.[String(course.id)] || {};
  const practiceTried = Boolean(stageProgress.practiceTriedAt || stageProgress[getPracticeProgressKey(course.id)]);
  const selfTestsDone = Array.isArray(stageProgress.selfTestsDone)
    ? stageProgress.selfTestsDone.map(String)
    : [];
  const miniProjectStatus = stageProgress.miniProject?.status || 'belum_dicoba';

  async function markComplete() {
    if (!hasMaterials) {
      showToast('Materi belum tersedia untuk stage ini.', 'error');
      return;
    }

    if (!hasQuestions) {
      showToast('Quiz belum tersedia. Admin perlu menambahkan soal dulu.', 'error');
      return;
    }

    if (!materialProgress.complete) {
      showToast('Tandai semua bagian materi sudah paham dulu sebelum membuka quiz.', 'error');
      return;
    }

    await updateCurrentMember((member) => applyCourseCompletion(member, course));
    showToast('Materi selesai. Quiz Battle terbuka.');
    navigate(`/quiz/${course.id}`);
  }


  async function markModuleUnderstood(module, { moveNext = false } = {}) {
    if (!module) return;

    const moduleKey = getModuleProgressKey(module);

    try {
      await updateCurrentMember((member) => {
        const oldProgress = member.stageProgress || {};
        const oldStageProgress = oldProgress[String(course.id)] || {};
        const oldDone = Array.isArray(oldStageProgress.materialSectionsDone)
          ? oldStageProgress.materialSectionsDone.map(String)
          : [];
        const nextDone = Array.from(new Set([...oldDone, moduleKey]));

        return {
          stageProgress: {
            ...oldProgress,
            [String(course.id)]: {
              ...oldStageProgress,
              materialSectionsDone: nextDone,
              lastMaterialSectionAt: new Date().toISOString()
            }
          }
        };
      });

      if (moveNext && activeSectionIndex < modules.length - 1) {
        setActiveSectionIndex((index) => Math.min(modules.length - 1, index + 1));
      }

      showToast('Bagian materi ditandai sudah dipahami.');
    } catch (error) {
      showToast(error.message || 'Gagal menyimpan progress materi.', 'error');
    }
  }



  async function markPracticeTried() {
    try {
      await updateCurrentMember((member) => {
        const oldProgress = member.stageProgress || {};
        const oldStageProgress = oldProgress[String(course.id)] || {};

        return {
          stageProgress: {
            ...oldProgress,
            [String(course.id)]: {
              ...oldStageProgress,
              practiceTriedAt: oldStageProgress.practiceTriedAt || new Date().toISOString(),
              [getPracticeProgressKey(course.id)]: oldStageProgress[getPracticeProgressKey(course.id)] || new Date().toISOString()
            }
          }
        };
      });

      showToast('Praktik mandiri dicatat. Bagus, kamu tidak cuma membaca.');
    } catch (error) {
      showToast(error.message || 'Gagal mencatat praktik mandiri.', 'error');
    }
  }

  async function markSelfTestDone(module) {
    if (!module) return;

    const moduleKey = getModuleProgressKey(module);

    try {
      await updateCurrentMember((member) => {
        const oldProgress = member.stageProgress || {};
        const oldStageProgress = oldProgress[String(course.id)] || {};
        const oldDone = Array.isArray(oldStageProgress.selfTestsDone)
          ? oldStageProgress.selfTestsDone.map(String)
          : [];
        const nextDone = Array.from(new Set([...oldDone, moduleKey]));

        return {
          stageProgress: {
            ...oldProgress,
            [String(course.id)]: {
              ...oldStageProgress,
              selfTestsDone: nextDone,
              lastSelfTestAt: new Date().toISOString()
            }
          }
        };
      });

      showToast('Tes mandiri selesai dicatat. Mantap, kamu sudah aktif berlatih.');
    } catch (error) {
      showToast(error.message || 'Gagal mencatat tes mandiri.', 'error');
    }
  }

  async function updateMiniProject(status, reflection = miniProjectReflection) {
    setSavingMiniProject(true);

    try {
      await updateCurrentMember((member) => {
        const oldProgress = member.stageProgress || {};
        const oldStageProgress = oldProgress[String(course.id)] || {};

        return {
          stageProgress: {
            ...oldProgress,
            [String(course.id)]: {
              ...oldStageProgress,
              miniProject: {
                ...(oldStageProgress.miniProject || {}),
                status,
                reflection: String(reflection || '').trim(),
                task: taskDescription,
                updatedAt: new Date().toISOString()
              }
            }
          }
        };
      });

      showToast(status === 'selesai' ? 'Mini project ditandai selesai.' : 'Status mini project diperbarui.');
    } catch (error) {
      showToast(error.message || 'Gagal menyimpan mini project.', 'error');
    } finally {
      setSavingMiniProject(false);
    }
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

      <PixelCard className="learning-path-card">
        <div className="learning-path-grid">
          <div>
            <p className="eyebrow">Sebelumnya</p>
            <strong>{stageNumber > 1 ? `Stage ${stageNumber - 1}: ${learningPathInfo.previousTitle}` : 'Mulai dari sini'}</strong>
          </div>
          <div>
            <p className="eyebrow">Posisi Kamu</p>
            <strong>Stage {stageNumber}: {learningPathInfo.currentTitle}</strong>
            <p>{learningPathInfo.why}</p>
          </div>
          <div>
            <p className="eyebrow">Berikutnya</p>
            <strong>{stageNumber < 32 ? `Stage ${stageNumber + 1}: ${learningPathInfo.nextTitle}` : 'Final Project'}</strong>
          </div>
        </div>
        <div className="skill-chip-list">
          {learningPathInfo.skills.map((skill) => <span key={skill}>{skill}</span>)}
        </div>
      </PixelCard>

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
            <section className="interactive-lesson-shell">
              <PixelCard className="lesson-progress-card">
                <div className="lesson-progress-head">
                  <div>
                    <p className="eyebrow">Progress Materi</p>
                    <h2>{materialProgress.doneCount}/{materialProgress.total} bagian dipahami</h2>
                    <p>Baca bertahap. Tiap bagian punya estimasi waktu, checkpoint kecil, dan tombol paham agar quiz terbuka dengan alur belajar yang lebih jelas.</p>
                  </div>
                  <strong>{Math.round((materialProgress.doneCount / materialProgress.total) * 100)}%</strong>
                </div>
                <div className="pixel-progress large"><span style={{ width: `${Math.round((materialProgress.doneCount / materialProgress.total) * 100)}%` }} /></div>
              </PixelCard>

              <div className="lesson-stepper" aria-label="Navigasi bagian materi">
                {modules.map((module, index) => {
                  const done = materialProgress.doneSet.has(getModuleProgressKey(module));

                  return (
                    <button
                      className={[
                        'lesson-step-chip',
                        index === activeSectionIndex ? 'active' : '',
                        done ? 'done' : ''
                      ].filter(Boolean).join(' ')}
                      key={module.id || module.type || index}
                      type="button"
                      onClick={() => setActiveSectionIndex(index)}
                    >
                      <span>{done ? '✓' : index + 1}</span>
                      <strong>{module.title}</strong>
                    </button>
                  );
                })}
              </div>

              {activeModule ? (
                <PixelCard className="material-card interactive-material-card" key={activeModule.id}>
                  <div className="material-card-head">
                    <div>
                      <p className="material-step-label">Materi {activeSectionIndex + 1}/{modules.length} · ±{activeReadingMinutes} menit baca</p>
                      <h2>{activeModule.title}</h2>
                    </div>
                    <PixelButton
                      type="button"
                      variant={isModuleBookmarked(activeModule) ? 'secondary' : 'ghost'}
                      onClick={() => toggleModuleBookmark(activeModule)}
                    >
                      {isModuleBookmarked(activeModule) ? '★ Tersimpan' : '☆ Bookmark'}
                    </PixelButton>
                  </div>

                  <LessonContent content={activeModule.content} keyPrefix={`course-${course.id}-${activeModule.id || activeModule.type}`} />

                  {activeModule.checkpoint ? (
                    <div className="checkpoint interactive-checkpoint">
                      <strong>Mini Checkpoint</strong>
                      <p>{activeModule.checkpoint}</p>
                      <label className="checkpoint-answer-field">
                        Jawaban singkatmu
                        <textarea
                          value={checkpointAnswers[getModuleProgressKey(activeModule)] || ''}
                          onChange={(event) => setCheckpointAnswers({
                            ...checkpointAnswers,
                            [getModuleProgressKey(activeModule)]: event.target.value
                          })}
                          placeholder="Tulis dengan bahasamu sendiri dulu sebelum lanjut. Ini tidak dinilai, tujuannya melatih pemahaman."
                        />
                      </label>
                      <button
                        className="checkpoint-reveal-button"
                        type="button"
                        onClick={() => setRevealedCheckpoint({
                          ...revealedCheckpoint,
                          [getModuleProgressKey(activeModule)]: !revealedCheckpoint[getModuleProgressKey(activeModule)]
                        })}
                      >
                        {revealedCheckpoint[getModuleProgressKey(activeModule)] ? 'Sembunyikan arahan' : 'Lihat arahan cek jawaban'}
                      </button>
                      {revealedCheckpoint[getModuleProgressKey(activeModule)] ? (
                        <p className="checkpoint-hint">
                          Bandingkan jawabanmu dengan materi di atas. Jawaban yang baik biasanya menyebut istilah utama, fungsi istilah itu, dan contoh singkatnya. Kalau masih ragu, baca ulang bagian ini sebelum menekan tombol paham.
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="lesson-section-actions">
                    <PixelButton
                      type="button"
                      variant="secondary"
                      disabled={activeSectionIndex === 0}
                      onClick={() => setActiveSectionIndex((index) => Math.max(0, index - 1))}
                    >
                      ← Bagian sebelumnya
                    </PixelButton>
                    <PixelButton
                      type="button"
                      onClick={() => markModuleUnderstood(activeModule, { moveNext: activeSectionIndex < modules.length - 1 })}
                    >
                      {materialProgress.doneSet.has(getModuleProgressKey(activeModule)) ? '✓ Sudah paham' : 'Tandai bagian ini paham'}
                    </PixelButton>
                    <PixelButton
                      type="button"
                      variant="secondary"
                      disabled={activeSectionIndex >= modules.length - 1}
                      onClick={() => setActiveSectionIndex((index) => Math.min(modules.length - 1, index + 1))}
                    >
                      Bagian berikutnya →
                    </PixelButton>
                  </div>
                </PixelCard>
              ) : null}
            </section>
          ) : (
            <PixelCard className="locked-panel">
              <span className="big-icon">📚</span>
              <h2>Materi belum diisi</h2>
              <p>Stage sudah dibuat, tetapi bagian materi belum dipublikasikan oleh admin.</p>
            </PixelCard>
          )}

          <PixelCard className="stage-task-card clean-stage-task-card">
            <div className="stage-task-layout">
              <div className="stage-task-copy">
                <p className="eyebrow">Tugas Stage</p>
                <h2>{taskTitle}</h2>
                <p>{taskDescription}</p>
                {frontendPlaygroundEnabled ? (
                  <p className="stage-task-note">Ubah kode di playground, klik Jalankan, lalu bandingkan hasilnya dengan tugas stage.</p>
                ) : (
                  <p className="stage-task-note">Untuk stage PHP, SQL, atau backend, kerjakan tugas secara konsep atau di environment lokal/server yang sesuai.</p>
                )}
              </div>
            </div>

            {frontendPlaygroundEnabled ? (
              <CodePlayground
                title={`Output Kode Stage ${stageNumber}`}
                description="Ubah HTML, CSS, atau JavaScript di editor. Output langsung muncul setelah tombol Jalankan ditekan."
                initialCode={playgroundInitialCode}
              />
            ) : null}
          </PixelCard>

          <PixelCard className="course-action-card">
            <h2>{completed ? 'Materi sudah selesai' : 'Siap lanjut ke Quiz Battle?'}</h2>
            <p>
              {hasQuestions
                ? `${questionCount} soal tersedia. ${materialProgress.complete ? 'Semua bagian materi sudah ditandai paham.' : 'Selesaikan semua bagian materi dulu agar quiz terbuka.'}`
                : 'Quiz belum tersedia karena soal belum diisi admin.'}
            </p>
            {completed && hasQuestions ? (
              <Link className="pixel-button primary" to={`/quiz/${course.id}`}>Buka Quiz Battle</Link>
            ) : (
              <PixelButton disabled={!hasMaterials || !hasQuestions || !materialProgress.complete} onClick={markComplete}>Buka Quiz Battle</PixelButton>
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
