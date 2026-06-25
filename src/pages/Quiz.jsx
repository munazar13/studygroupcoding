import { Link, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import LoadingState from '../components/LoadingState';
import PixelButton from '../components/PixelButton';
import PixelCard from '../components/PixelCard';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { loadCourse, loadQuestions } from '../services/dataApi';
import { applyQuizAttempt, applyQuizPass } from '../utils/progress';

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
  const courseCompleted = (currentMember.completedCourses || []).includes(Number(stageId));

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
    return <main className="page-shell"><PixelCard>Soal belum tersedia untuk stage ini.</PixelCard></main>;
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

  async function finishQuiz() {
  if (Object.keys(answers).length < questions.length) {
    showToast('Jawab semua soal dulu.', 'error');
    return;
  }

  const stageNumber = Number(course.id || stageId);
  const alreadyPassed = (currentMember.passedStages || []).includes(stageNumber);
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
              <h3>{question.question}</h3>
              <p>Jawaban kamu: {question.options[userIndex] || 'Tidak dijawab'}</p>
              <p>Jawaban benar: {question.options[question.correctIndex]}</p>
              <small>{question.explanation}</small>
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
        <h2>{activeQuestion.question}</h2>
        <div className="answer-grid">
          {activeQuestion.options.map((option, index) => (
            <button
              className={Number(answers[activeQuestion.id]) === index ? 'answer-option selected' : 'answer-option'}
              key={option}
              type="button"
              onClick={() => setAnswers({ ...answers, [activeQuestion.id]: index })}
            >
              {option}
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
    </main>
  );
}
