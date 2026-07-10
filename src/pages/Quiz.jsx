import { Link, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import LoadingState from '../components/LoadingState';
import PixelButton from '../components/PixelButton';
import PixelCard from '../components/PixelCard';
import LessonContent from '../components/LessonContent';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { createContentReport, loadCourse, loadQuestions } from '../services/dataApi';
import { applyQuizAttempt, applyQuizPass, getStageRewardPreview } from '../utils/progress';

function hasNumberId(items = [], id) {
  const target = Number(id);

  return items.some((item) => Number(item) === target);
}

function getCourseStageNumber(course = {}) {
  return Number(course.stage || course.order || course.id || 0);
}

function getRecommendedReviewModules(course = {}, question = {}, questionIndex = 0, totalQuestions = 1) {
  const modules = Array.isArray(course.modules) ? course.modules : [];

  if (!modules.length) return [];

  const haystack = [
    question.question,
    question.explanation,
    ...(Array.isArray(question.options) ? question.options : [])
  ].join(' ').toLowerCase();

  const matched = modules.filter((module) => {
    const title = String(module.title || '').toLowerCase();
    const type = String(module.type || '').toLowerCase();
    const titleWords = title.split(/\s+/).filter((word) => word.length >= 5);

    return (
      (type && haystack.includes(type)) ||
      titleWords.some((word) => haystack.includes(word))
    );
  });

  if (matched.length) return matched.slice(0, 2);

  const estimatedIndex = Math.min(
    modules.length - 1,
    Math.max(0, Math.floor((questionIndex / Math.max(1, totalQuestions)) * modules.length))
  );

  const fallbackIndexes = [estimatedIndex, 1, 3, 5].filter((index) => index >= 0 && index < modules.length);
  const unique = [];
  fallbackIndexes.forEach((index) => {
    const module = modules[index];
    if (module && !unique.some((item) => String(item.id || item.type || item.order) === String(module.id || module.type || module.order))) {
      unique.push(module);
    }
  });

  return unique.slice(0, 2);
}

function getModuleQueryValue(module, index = 0) {
  return String(module?.type || module?.id || module?.order || index);
}

export default function Quiz() {

  const { stageId } = useParams();
  const navigate = useNavigate();
  const { currentMember, updateCurrentMember } = useAuth();
  const { showToast } = useToast();
  const [course, setCourse] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [activeIndex, setActiveIndex] = useState(0);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportMessage, setReportMessage] = useState('');
  const [reportSending, setReportSending] = useState(false);
  const [submittingQuiz, setSubmittingQuiz] = useState(false);
  const [flaggedQuestions, setFlaggedQuestions] = useState({});
  const [reviewingAnswers, setReviewingAnswers] = useState(false);

  useEffect(() => {
    Promise.all([loadCourse(stageId), loadQuestions(stageId)])
      .then(([courseData, questionData]) => {
        setCourse(courseData);
        setQuestions(questionData);
      })
      .finally(() => setLoading(false));
  }, [stageId]);

  const activeQuestion = questions[activeIndex];
  const progress = questions.length ? ((activeIndex + 1) / questions.length) * 100 : 0;
  const courseCompleted = hasNumberId(currentMember.completedCourses || [], stageId);

  const computedResult = useMemo(() => {
    const correct = questions.reduce((total, question) => {
      return Number(answers[question.id]) === Number(question.correctIndex) ? total + 1 : total;
    }, 0);

    const score = questions.length ? Math.round((correct / questions.length) * 100) : 0;

    return {
      correct,
      total: questions.length,
      score,
      passed: score >= Number(course?.minScore || 70)
    };
  }, [answers, course, questions]);

  const answeredCount = Object.keys(answers).length;
  const flaggedCount = Object.values(flaggedQuestions).filter(Boolean).length;

  function toggleActiveQuestionFlag() {
    if (!activeQuestion) return;

    setFlaggedQuestions((current) => ({
      ...current,
      [activeQuestion.id]: !current[activeQuestion.id]
    }));
  }

  if (loading) {
    return <LoadingState />;
  }

  if (!course || !questions.length) {
    return (
      <main className="page-shell center-page">
        <PixelCard className="locked-panel">
          <span className="big-icon">❓</span>
          <h1>Quiz belum tersedia</h1>
          <p>Soal stage ini belum dipublikasikan atau belum lengkap. Silakan kembali ke materi.</p>
          <Link className="pixel-button primary" to={`/course/${stageId}`}>Kembali ke Materi</Link>
        </PixelCard>
      </main>
    );
  }

  if (!courseCompleted) {
    return (
      <main className="page-shell center-page">
        <PixelCard className="locked-panel">
          <span className="big-icon">📖</span>
          <h1>Baca materi dulu</h1>
          <p>Quiz Battle akan terbuka setelah kamu menandai materi stage ini selesai.</p>
          <Link className="pixel-button primary" to={`/course/${stageId}`}>Buka Materi</Link>
        </PixelCard>
      </main>
    );
  }

  async function submitQuizReport(event) {
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
        type: 'quiz',
        courseId: String(course.id || stageId),
        targetId: String(activeQuestion?.id || course.id || stageId),
        targetTitle: `${course.title} · Soal ${activeIndex + 1}`,
        message: cleanMessage,
        status: 'open'
      });

      setReportMessage('');
      setReportOpen(false);
      showToast('Laporan soal berhasil dikirim ke admin.');
    } catch (error) {
      console.error(error);
      showToast(error.message || 'Gagal mengirim laporan soal.', 'error');
    } finally {
      setReportSending(false);
    }
  }

  async function finishQuiz() {
  if (submittingQuiz) return;

  if (Object.keys(answers).length < questions.length) {
    showToast('Jawab semua soal dulu.', 'error');
    return;
  }

  if (Object.values(flaggedQuestions).some(Boolean)) {
    const confirmed = window.confirm('Masih ada soal yang kamu tandai ragu-ragu. Tetap selesaikan quiz sekarang?');

    if (!confirmed) return;
  }

  if (!reviewingAnswers) {
    setReviewingAnswers(true);
    showToast('Cek ulang ringkasan jawaban. Klik Selesaikan sekali lagi kalau sudah yakin.');
    return;
  }

  const stageNumber = getCourseStageNumber(course) || Number(stageId);
  const alreadyPassed = hasNumberId(currentMember.passedStages || [], stageNumber);
  const oldLevel = Number(currentMember.level || 1);

  const chestStages = [5, 10, 15, 20, 25, 30, 32];
  const hasChestReward =
    course.hasChestReward === true ||
    Boolean(course.chestId) ||
    chestStages.includes(stageNumber);

  let updatedMember = currentMember;
  const stageRewardPreview = computedResult.passed && !alreadyPassed
    ? getStageRewardPreview(course)
    : [];

  setSubmittingQuiz(true);

  try {
  if (computedResult.passed) {
    updatedMember = await updateCurrentMember((member) =>
      applyQuizPass(member, course, computedResult)
    );

    showToast(
      alreadyPassed
        ? 'Quiz selesai. Nilai terbaik diperbarui jika lebih tinggi.'
        : 'Stage Clear! Reward berhasil didapat.'
    );
  } else {
    updatedMember = await updateCurrentMember((member) =>
      applyQuizAttempt(member, course, computedResult)
    );

    showToast('Belum lulus. Baca pembahasan lalu coba lagi.', 'error');
  }

  setResult({
    ...computedResult,
    alreadyPassed,
    rewardGiven: computedResult.passed && !alreadyPassed,
    gainedXp: computedResult.passed && !alreadyPassed
      ? Number(course.xpReward || 80) + (computedResult.score === 100 ? 50 : 0)
      : 0,
    gainedCoins: computedResult.passed && !alreadyPassed
      ? Number(course.coinReward || 20)
      : 0,
    chestAvailable: computedResult.passed && !alreadyPassed && hasChestReward,
    stageRewards: stageRewardPreview,
    oldLevel,
    newLevel: Number(updatedMember?.level || oldLevel),
    xp: Number(updatedMember?.xp || 0),
    xpToNextLevel: Number(updatedMember?.xpToNextLevel || 100),
    nextStageId: stageNumber + 1
  });
  } catch (error) {
    console.error(error);
    showToast(error.message || 'Gagal menyimpan hasil quiz.', 'error');
  } finally {
    setSubmittingQuiz(false);
  }
}

  if (result) {
  const xpPercent = result.xpToNextLevel
    ? Math.min(100, Math.round((result.xp / result.xpToNextLevel) * 100))
    : 0;

  const isLastStage = Number(course.id || stageId) >= 32;

  return (
    <main className="page-shell quiz-page">
      <PixelCard className="result-card stage-result-card">
        <span className="big-icon">{result.passed ? '🎉' : '🧠'}</span>

        <h1>{result.passed ? 'Stage Clear!' : 'Coba Lagi'}</h1>

        <p>
          Benar {result.correct} dari {result.total} soal · Nilai {result.score}
        </p>

        {result.passed ? (
          <>
            {result.rewardGiven ? (
              <>
                <div className="stage-reward-summary">
                <div>
                  <strong>+{result.gainedXp}</strong>
                  <span>XP</span>
                </div>

                <div>
                  <strong>+{result.gainedCoins}</strong>
                  <span>Koin</span>
                </div>

                <div>
                  <strong>{result.chestAvailable ? 'Ada' : 'Tidak ada'}</strong>
                  <span>Chest</span>
                </div>
              </div>

              {result.stageRewards?.length ? (
                <ul className="clean-list reward-history-list">
                  {result.stageRewards.map((reward) => (
                    <li key={`${reward.type}-${reward.id}`}>
                      <strong>{reward.icon || '🎁'} {reward.name}</strong>
                      <span>{reward.type}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
              </>
            ) : (
              <p>
                Stage ini sudah pernah kamu selesaikan. Kamu boleh mengulang quiz
                untuk memperbaiki nilai, tapi reward utama tidak diberikan lagi.
              </p>
            )}

            {result.newLevel > result.oldLevel ? (
              <div className="level-up-box">
                <strong>LEVEL UP!</strong>
                <span>Level {result.oldLevel} → Level {result.newLevel}</span>
              </div>
            ) : null}

            <div className="level-progress-preview">
              <div className="level-progress-head">
                <span>Level {result.newLevel}</span>
                <span>{result.xp}/{result.xpToNextLevel} XP</span>
              </div>

              <div className="pixel-progress large">
                <span style={{ width: `${xpPercent}%` }} />
              </div>
            </div>

            {result.chestAvailable ? (
              <p>
                Kamu mendapat chest baru. Chest belum dibuka otomatis, cek di menu Hadiah.
              </p>
            ) : null}
          </>
        ) : (
          <p>
            Nilai minimal stage ini {course.minScore || 70}. Pelajari pembahasan
            di bawah lalu coba lagi.
          </p>
        )}

        <div className="result-actions">
          {!result.passed ? (
            <PixelButton
              type="button"
              variant="secondary"
              onClick={() => {
                const wrongAnswers = {};
                questions.forEach((question) => {
                  if (Number(answers[question.id]) !== Number(question.correctIndex)) {
                    wrongAnswers[question.id] = answers[question.id];
                  }
                });
                setResult(null);
                setAnswers(wrongAnswers);
                setFlaggedQuestions({});
                setReviewingAnswers(false);
                const firstWrongIndex = questions.findIndex((question) => Number(answers[question.id]) !== Number(question.correctIndex));
                setActiveIndex(firstWrongIndex >= 0 ? firstWrongIndex : 0);
              }}
            >
              🎯 Ulangi soal yang salah
            </PixelButton>
          ) : null}
          <PixelButton
            type="button"
            variant="secondary"
            onClick={() => {
              setResult(null);
              setAnswers({});
              setFlaggedQuestions({});
              setReviewingAnswers(false);
              setActiveIndex(0);
            }}
          >
            🔁 Ulangi Stage
          </PixelButton>

          <PixelButton type="button" variant="secondary" onClick={() => navigate('/map')}>
            🗺️ Kembali ke Map
          </PixelButton>

          {result.passed && !isLastStage ? (
            <PixelButton type="button" onClick={() => navigate(`/course/${result.nextStageId}`)}>
              ➡️ Stage Selanjutnya
            </PixelButton>
          ) : null}

          {result.passed ? (
            <Link className="pixel-button primary" to="/rewards">
              🎁 Cek Hadiah
            </Link>
          ) : null}
        </div>
      </PixelCard>

      {!result.passed ? (
        <PixelCard className="smart-feedback-summary">
          <p className="eyebrow">Arahan Belajar Ulang</p>
          <h2>Jangan cuma ulang quiz, ulangi konsep yang paling dekat dengan soal salah.</h2>
          <p>Di bawah setiap soal salah ada rekomendasi bagian materi. Buka bagian itu, baca ulang contoh praktiknya, lalu kembali mengerjakan soal yang salah.</p>
        </PixelCard>
      ) : null}

      <section className="review-list">
        {questions.map((question, questionIndex) => {
          const userIndex = Number(answers[question.id]);
          const correct = userIndex === Number(question.correctIndex);

          return (
            <PixelCard className={correct ? 'review-card correct' : 'review-card wrong'} key={question.id}>
  <div className="quiz-question-text">
    <LessonContent content={question.question} keyPrefix={`review-question-${question.id}`} />
  </div>

  <div className="review-answer-block">
    <strong>Jawaban kamu:</strong>

    <div className="review-answer-content">
      {question.options[userIndex]
        ? <LessonContent content={question.options[userIndex]} keyPrefix={`user-answer-${question.id}`} />
        : <p>Tidak dijawab</p>}
    </div>
  </div>

  <div className="review-answer-block">
    <strong>Jawaban benar:</strong>

    <div className="review-answer-content">
      <LessonContent content={question.options[question.correctIndex]} keyPrefix={`correct-answer-${question.id}`} />
    </div>
  </div>

  {question.explanation ? (
    <div className="review-explanation">
      <strong>Pembahasan:</strong>

      <div>
        <LessonContent content={question.explanation} keyPrefix={`explanation-${question.id}`} />
      </div>
    </div>
  ) : null}

  {!correct ? (
    <div className="smart-review-box">
      <strong>Belajar ulang yang disarankan:</strong>
      <p>Soal ini kemungkinan berkaitan dengan konsep di bawah. Buka materi, baca ulang, lalu coba jelaskan ulang dengan bahasa sendiri.</p>
      <div className="smart-review-links">
        {getRecommendedReviewModules(course, question, questionIndex, questions.length).map((module, moduleIndex) => (
          <Link
            className="pixel-button ghost review-material-link"
            key={`${question.id}-review-${module.id || module.type || moduleIndex}`}
            to={`/course/${course.id || stageId}?section=${getModuleQueryValue(module, moduleIndex)}`}
          >
            📖 Materi {module.order || moduleIndex + 1}: {module.title || 'Baca ulang'}
          </Link>
        ))}
      </div>
    </div>
  ) : null}
</PixelCard>
          );
        })}
      </section>
    </main>
  );
}

  return (
    <main className="page-shell quiz-page">
      <section className="page-hero compact-hero">
        <p className="eyebrow">Quiz Battle</p>
        <h1>Stage {course.id}: {course.title}</h1>
        <p>Soal {activeIndex + 1} dari {questions.length} · Terjawab {answeredCount}/{questions.length} · Ragu-ragu {flaggedCount}</p>
        <div className="pixel-progress large"><span style={{ width: `${progress}%` }} /></div>
      </section>

      <div className="quiz-question-nav" aria-label="Navigasi soal quiz">
        {questions.map((question, index) => {
          const answered = Object.prototype.hasOwnProperty.call(answers, question.id);
          const flagged = Boolean(flaggedQuestions[question.id]);

          return (
            <button
              className={[
                'quiz-question-chip',
                index === activeIndex ? 'active' : '',
                answered ? 'answered' : '',
                flagged ? 'flagged' : ''
              ].filter(Boolean).join(' ')}
              key={question.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              title={flagged ? `Soal ${index + 1} ditandai ragu-ragu` : `Buka soal ${index + 1}`}
            >
              {index + 1}{flagged ? ' !' : ''}
            </button>
          );
        })}
      </div>


      {reviewingAnswers ? (
        <PixelCard className="quiz-review-panel">
          <p className="eyebrow">Review Sebelum Submit</p>
          <h2>Cek jawabanmu sekali lagi</h2>
          <p>
            Semua soal sudah dijawab. Lihat nomor yang masih ragu-ragu, buka kembali jika perlu,
            lalu klik Selesaikan sekali lagi kalau sudah yakin.
          </p>
          <div className="quiz-review-grid">
            {questions.map((question, index) => {
              const answered = Object.prototype.hasOwnProperty.call(answers, question.id);
              const flagged = Boolean(flaggedQuestions[question.id]);

              return (
                <button
                  className={['quiz-review-item', answered ? 'answered' : '', flagged ? 'flagged' : ''].filter(Boolean).join(' ')}
                  key={`review-${question.id}`}
                  type="button"
                  onClick={() => {
                    setActiveIndex(index);
                    setReviewingAnswers(false);
                  }}
                >
                  <strong>Soal {index + 1}</strong>
                  <span>{flagged ? 'Ragu-ragu' : 'Siap'}</span>
                </button>
              );
            })}
          </div>
        </PixelCard>
      ) : null}

      <PixelCard className="question-card">
  <div className="quiz-question-head">
    <p className="eyebrow">Soal {activeIndex + 1}</p>
    <PixelButton type="button" variant={flaggedQuestions[activeQuestion.id] ? 'secondary' : 'ghost'} onClick={toggleActiveQuestionFlag}>
      {flaggedQuestions[activeQuestion.id] ? '⚑ Ragu-ragu' : '⚐ Tandai ragu'}
    </PixelButton>
  </div>

  <div className="quiz-question-text">
    <LessonContent content={activeQuestion.question} keyPrefix={`question-${activeQuestion.id}`} />
  </div>

  <div className="answer-grid">
  {activeQuestion.options.map((option, index) => (
    <button
      className={Number(answers[activeQuestion.id]) === index ? 'answer-option selected' : 'answer-option'}
      key={`${activeQuestion.id}-${index}`}
      type="button"
      onClick={() => {
        setAnswers({ ...answers, [activeQuestion.id]: index });
        setReviewingAnswers(false);
      }}
    >
      <div className="answer-option-content">
        <LessonContent content={option} keyPrefix={`option-${activeQuestion.id}-${index}`} />
      </div>
    </button>
  ))}
</div>
</PixelCard>

      <div className="quiz-controls">
        <PixelButton
          disabled={activeIndex === 0}
          variant="secondary"
          onClick={() => setActiveIndex((index) => Math.max(0, index - 1))}
        >
          Sebelumnya
        </PixelButton>
        {activeIndex < questions.length - 1 ? (
          <PixelButton onClick={() => setActiveIndex((index) => index + 1)}>Lanjut</PixelButton>
        ) : (
          <PixelButton onClick={finishQuiz} disabled={submittingQuiz}>
            {submittingQuiz ? 'Menyimpan...' : reviewingAnswers ? 'Selesaikan Sekarang' : 'Review Jawaban'}
          </PixelButton>
        )}
      </div>

      <PixelCard className="content-report-card">
        <div className="section-title-row">
          <div>
            <p className="eyebrow">Lapor Soal</p>
            <h2>Ada soal yang keliru?</h2>
            <p>Laporkan kalau pilihan jawaban, pembahasan, gambar, atau kode pada soal ini perlu diperiksa.</p>
          </div>
          <PixelButton type="button" variant="secondary" onClick={() => setReportOpen((open) => !open)}>
            {reportOpen ? 'Tutup Laporan' : 'Laporkan Soal'}
          </PixelButton>
        </div>

        {reportOpen ? (
          <form className="form-stack" onSubmit={submitQuizReport}>
            <label>
              Detail Laporan
              <textarea
                value={reportMessage}
                onChange={(event) => setReportMessage(event.target.value)}
                placeholder="Contoh: jawaban benar sepertinya bukan pilihan B, atau pembahasannya membingungkan."
              />
            </label>
            <PixelButton type="submit" disabled={reportSending}>
              {reportSending ? 'Mengirim...' : 'Kirim Laporan Soal'}
            </PixelButton>
          </form>
        ) : null}
      </PixelCard>
    </main>
  );
}
