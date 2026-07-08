import { Link, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import LoadingState from '../components/LoadingState';
import PixelButton from '../components/PixelButton';
import PixelCard from '../components/PixelCard';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { createContentReport, loadCourse, loadQuestions } from '../services/dataApi';
import { applyQuizAttempt, applyQuizPass } from '../utils/progress';

function renderQuizContent(content, keyPrefix = 'quiz-content') {
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
          className={`lesson-code-block quiz-code-block language-${language}`}
          key={`${keyPrefix}-code-${index}`}
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
          const altText = imageMatch[1] || 'Gambar soal';
          const imageUrl = imageMatch[2] || '';

          return (
            <figure
              className="lesson-image-block quiz-image-block"
              key={`${keyPrefix}-image-${index}-${blockIndex}-${lineIndex}`}
            >
              <img src={imageUrl} alt={altText} loading="lazy" />
              <figcaption>{altText}</figcaption>
            </figure>
          );
        }

        return (
          <p key={`${keyPrefix}-paragraph-${index}-${blockIndex}-${lineIndex}`}>
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
  if (Object.keys(answers).length < questions.length) {
    showToast('Jawab semua soal dulu.', 'error');
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
    stageRewards: computedResult.passed && !alreadyPassed ? (updatedMember?.lastStageRewards || []) : [],
    oldLevel,
    newLevel: Number(updatedMember?.level || oldLevel),
    xp: Number(updatedMember?.xp || 0),
    xpToNextLevel: Number(updatedMember?.xpToNextLevel || 100),
    nextStageId: stageNumber + 1
  });
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
          <PixelButton
            type="button"
            variant="secondary"
            onClick={() => {
              setResult(null);
              setAnswers({});
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

      <section className="review-list">
        {questions.map((question) => {
          const userIndex = Number(answers[question.id]);
          const correct = userIndex === Number(question.correctIndex);

          return (
            <PixelCard className={correct ? 'review-card correct' : 'review-card wrong'} key={question.id}>
  <div className="quiz-question-text">
    {renderQuizContent(question.question, `review-question-${question.id}`)}
  </div>

  <div className="review-answer-block">
    <strong>Jawaban kamu:</strong>

    <div className="review-answer-content">
      {question.options[userIndex]
        ? renderQuizContent(question.options[userIndex], `user-answer-${question.id}`)
        : <p>Tidak dijawab</p>}
    </div>
  </div>

  <div className="review-answer-block">
    <strong>Jawaban benar:</strong>

    <div className="review-answer-content">
      {renderQuizContent(question.options[question.correctIndex], `correct-answer-${question.id}`)}
    </div>
  </div>

  {question.explanation ? (
    <div className="review-explanation">
      <strong>Pembahasan:</strong>

      <div>
        {renderQuizContent(question.explanation, `explanation-${question.id}`)}
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
        <p>Soal {activeIndex + 1} dari {questions.length}</p>
        <div className="pixel-progress large"><span style={{ width: `${progress}%` }} /></div>
      </section>

      <PixelCard className="question-card">
  <div className="quiz-question-text">
    {renderQuizContent(activeQuestion.question, `question-${activeQuestion.id}`)}
  </div>

  <div className="answer-grid">
  {activeQuestion.options.map((option, index) => (
    <button
      className={Number(answers[activeQuestion.id]) === index ? 'answer-option selected' : 'answer-option'}
      key={`${activeQuestion.id}-${index}`}
      type="button"
      onClick={() => setAnswers({ ...answers, [activeQuestion.id]: index })}
    >
      <div className="answer-option-content">
        {renderQuizContent(option, `option-${activeQuestion.id}-${index}`)}
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
          <PixelButton onClick={finishQuiz}>Selesaikan</PixelButton>
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
