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

    if (computedResult.passed) {
      await updateCurrentMember((member) => applyQuizPass(member, course, computedResult));
      showToast('Stage Clear! Reward dan chest berhasil dibuka.');
    } else {
      await updateCurrentMember((member) => applyQuizAttempt(member, course, computedResult));
      showToast('Belum lulus. Baca pembahasan lalu coba lagi.', 'error');
    }

    setResult(computedResult);
  }

  if (result) {
    return (
      <main className="page-shell quiz-page">
        <PixelCard className="result-card">
          <span className="big-icon">{result.passed ? '🎉' : '🧠'}</span>
          <h1>{result.passed ? 'Stage Clear!' : 'Coba Lagi'}</h1>
          <p>Benar {result.correct} dari {result.total} soal · Nilai {result.score}</p>
          {result.passed ? (
            <p>Stage berikutnya terbuka. Jangan lupa buka chest di Reward Collection.</p>
          ) : (
            <p>Nilai minimal stage ini {course.minScore || 70}. Pelajari pembahasan di bawah.</p>
          )}
          <div className="result-actions">
            <Link className="pixel-button primary" to="/rewards">Reward Collection</Link>
            <PixelButton variant="secondary" onClick={() => navigate('/map')}>Kembali ke Map</PixelButton>
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
