import { useState } from 'react';
import { Link } from 'react-router-dom';
import PixelButton from '../components/PixelButton';
import PixelCard from '../components/PixelCard';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import finalQuest from '../data/finalQuest.json';

export default function FinalQuest() {
  const { currentMember, updateCurrentMember } = useAuth();
  const { showToast } = useToast();
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const unlocked = (currentMember.passedStages || []).length >= 32;

  async function finishQuest() {
    const correct = finalQuest.reduce((total, item) => Number(answers[item.id]) === Number(item.correctIndex) ? total + 1 : total, 0);
    const score = Math.round((correct / finalQuest.length) * 100);
    const passed = score >= 80;

    if (passed) {
      await updateCurrentMember({
        finalQuestComplete: true,
        certificateCode: `SGC-${currentMember.nim}-${Date.now().toString().slice(-6)}`,
        xp: Number(currentMember.xp || 0) + 500,
        coins: Number(currentMember.coins || 0) + 200
      });
      showToast('Final Quest selesai. Sertifikat terbuka.');
    } else {
      showToast('Nilai belum cukup. Pelajari ulang stage PHP dan MySQL.', 'error');
    }

    setResult({ correct, score, passed });
  }

  if (!unlocked) {
    return (
      <main className="page-shell center-page">
        <PixelCard className="locked-panel">
          <span className="big-icon">🏰</span>
          <h1>Final Quest Terkunci</h1>
          <p>Selesaikan semua 32 stage sebelum memasuki misi akhir.</p>
          <Link className="pixel-button primary" to="/map">Kembali ke Learning Map</Link>
        </PixelCard>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <section className="page-hero compact-hero">
        <p className="eyebrow">Final Quest</p>
        <h1>Misi Akhir PHP dan MySQL</h1>
        <p>Jawab skenario alur backend, database, login, dan CRUD secara otomatis.</p>
      </section>

      {result ? (
        <PixelCard className="result-card">
          <h2>{result.passed ? 'Victory!' : 'Belum Lulus'}</h2>
          <p>Nilai: {result.score} · Benar {result.correct}/{finalQuest.length}</p>
          {result.passed ? <Link className="pixel-button primary" to="/certificate">Lihat Sertifikat</Link> : null}
        </PixelCard>
      ) : null}

      <section className="material-list">
        {finalQuest.map((item) => (
          <PixelCard className="question-card mini" key={item.id}>
            <h3>{item.question}</h3>
            <div className="answer-grid">
              {item.options.map((option, index) => (
                <button
                  className={Number(answers[item.id]) === index ? 'answer-option selected' : 'answer-option'}
                  key={option}
                  type="button"
                  onClick={() => setAnswers({ ...answers, [item.id]: index })}
                >
                  {option}
                </button>
              ))}
            </div>
          </PixelCard>
        ))}
      </section>

      <PixelButton onClick={finishQuest}>Selesaikan Final Quest</PixelButton>
    </main>
  );
}
