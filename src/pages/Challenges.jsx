import { useEffect, useMemo, useState } from 'react';
import LoadingState from '../components/LoadingState';
import PixelButton from '../components/PixelButton';
import PixelCard from '../components/PixelCard';
import SetupNotice from '../components/SetupNotice';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { loadPublicData, upsertChallengeSubmission } from '../services/dataApi';

function isChallengeActive(challenge) {
  const today = new Date();
  const startDate = challenge.startDate ? new Date(challenge.startDate) : null;
  const endDate = challenge.endDate ? new Date(challenge.endDate) : null;

  if (startDate && today < startDate) return false;
  if (endDate && today > endDate) return false;

  return challenge.published !== false;
}

function getRewardText(challenge) {
  if (challenge.rewardType === 'coins') {
    return `🪙 ${challenge.rewardCoins || 0} koin`;
  }

  if (challenge.rewardType === 'xp') {
    return `⭐ ${challenge.rewardXp || 0} XP`;
  }

  if (challenge.rewardType === 'badge') {
    return `${challenge.rewardIcon || '🏅'} Badge: ${challenge.rewardName || 'Badge'}`;
  }

  if (challenge.rewardType === 'title') {
    return `${challenge.rewardIcon || '🎖️'} Title: ${challenge.rewardName || 'Title'}`;
  }

  if (challenge.rewardType === 'chest') {
    return `${challenge.rewardIcon || '🎁'} Chest: ${challenge.rewardName || 'Chest'}`;
  }

  return 'Reward';
}

function formatChallengeDate(challenge) {
  if (!challenge.startDate && !challenge.endDate) {
    return 'Tanpa batas waktu';
  }

  if (challenge.startDate && challenge.endDate) {
    return `${challenge.startDate} sampai ${challenge.endDate}`;
  }

  if (challenge.startDate) {
    return `Mulai ${challenge.startDate}`;
  }

  return `Berakhir ${challenge.endDate}`;
}

function getMyChallengeStatus(member, challengeId) {
  const submissions = member?.challengeSubmissions || [];
  const rewardHistory = member?.challengeRewardHistory || [];
  const completedChallenges = member?.completedChallenges || [];

  if (completedChallenges.includes(String(challengeId))) {
    return 'approved';
  }

  if (rewardHistory.some((item) => String(item.challengeId) === String(challengeId))) {
    return 'approved';
  }

  const submission = submissions.find(
    (item) => String(item.challengeId) === String(challengeId)
  );

  return submission?.status || '';
}

function getChallengeButtonText(status) {
  if (status === 'approved') return 'Reward Diterima';
  if (status === 'rejected') return 'Ditolak, Kirim Ulang';
  if (status === 'pending') return 'Menunggu Review';

  return 'Kirim Bukti';
}

export default function Challenges() {
  const {
    firebaseConfigured,
    currentMember,
    isApproved,
    updateCurrentMember
  } = useAuth();

  const { showToast } = useToast();

  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedChallengeId, setSelectedChallengeId] = useState('');
  const [proofText, setProofText] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!firebaseConfigured) {
      setLoading(false);
      return;
    }

    loadPublicData()
      .then((data) => setChallenges(data.challenges || []))
      .catch((error) => {
        console.error(error);
        setChallenges([]);
      })
      .finally(() => setLoading(false));
  }, [firebaseConfigured]);

  const activeChallenges = useMemo(() => {
    return challenges.filter(isChallengeActive);
  }, [challenges]);

  const selectedChallenge = activeChallenges.find(
    (challenge) => String(challenge.id) === String(selectedChallengeId)
  );

  async function handleSubmitChallengeProof(event) {
    event.preventDefault();

    if (!currentMember || !isApproved) {
      showToast('Login sebagai anggota aktif dulu untuk mengirim bukti.', 'error');
      return;
    }

    if (!selectedChallenge) {
      showToast('Pilih tantangan dulu.', 'error');
      return;
    }

    const currentStatus = getMyChallengeStatus(currentMember, selectedChallenge.id);

    if (currentStatus === 'pending') {
      showToast('Bukti tantangan ini sudah dikirim. Tunggu review admin.', 'error');
      return;
    }

    if (currentStatus === 'approved') {
      showToast('Reward tantangan ini sudah pernah kamu dapatkan.', 'error');
      return;
    }

    const cleanProofText = proofText.trim();
    const cleanProofUrl = proofUrl.trim();

    if (selectedChallenge.proofRequired && !cleanProofText && !cleanProofUrl) {
      showToast('Isi bukti teks atau link bukti dulu.', 'error');
      return;
    }

    setSubmitting(true);

    try {
      const submissionItem = {
        id: `submission-${selectedChallenge.id}-${currentMember.uid}-${Date.now()}`,
        challengeId: selectedChallenge.id,
        challengeTitle: selectedChallenge.title,
        uid: currentMember.uid,
        memberName: currentMember.name,
        proofText: cleanProofText,
        proofUrl: cleanProofUrl,
        status: 'pending',
        rewardGiven: false,
        submittedAt: new Date().toISOString()
      };

      await upsertChallengeSubmission(submissionItem);

      await updateCurrentMember({
        challengeSubmissions: [
          submissionItem,
          ...(currentMember.challengeSubmissions || []).filter((item) => (
            String(item.challengeId) !== String(selectedChallenge.id) ||
            item.status === 'approved'
          ))
        ]
      });

      setSelectedChallengeId('');
      setProofText('');
      setProofUrl('');

      showToast('Bukti tantangan berhasil dikirim. Tunggu approve admin.');
    } catch (error) {
      console.error(error);
      showToast(error.message || 'Gagal mengirim bukti tantangan.', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  if (!firebaseConfigured) {
    return <SetupNotice />;
  }

  if (loading) {
    return <LoadingState />;
  }

  return (
    <main className="page-shell challenges-page">
      <section className="page-hero compact-hero">
        <p className="eyebrow">Daily Quest</p>
        <h1>Tantangan Coding</h1>
        <p>
          Kerjakan tantangan, kirim bukti, lalu tunggu admin approve.
          Reward bisa berupa XP, koin, badge, title, atau chest.
        </p>
      </section>

      <section className="challenge-home-grid">
        {activeChallenges.length ? activeChallenges.map((challenge) => {
          const myStatus = getMyChallengeStatus(currentMember, challenge.id);
          const locked = myStatus === 'pending' || myStatus === 'approved';

          return (
            <PixelCard className="home-challenge-card" key={challenge.id}>
              <div className="section-title-row">
                <div>
                  <p className="eyebrow">Challenge</p>
                  <h3>{challenge.title}</h3>
                </div>

                <span className={`challenge-reward-type ${challenge.rewardRarity || 'common'}`}>
                  {challenge.rewardType}
                </span>
              </div>

              <p>{challenge.description}</p>

              <div className="challenge-meta-list">
                <span>🎁 {getRewardText(challenge)}</span>
                <span>📅 {formatChallengeDate(challenge)}</span>
                <span>{challenge.proofRequired ? '📌 Wajib bukti' : '✅ Tanpa bukti wajib'}</span>
              </div>

              {currentMember && isApproved ? (
                <PixelButton
                  type="button"
                  variant={selectedChallengeId === challenge.id || locked ? 'secondary' : 'primary'}
                  disabled={locked}
                  onClick={() => setSelectedChallengeId(challenge.id)}
                >
                  {selectedChallengeId === challenge.id ? 'Dipilih' : getChallengeButtonText(myStatus)}
                </PixelButton>
              ) : (
                <p className="muted-text">Login sebagai anggota aktif untuk ikut tantangan.</p>
              )}
            </PixelCard>
          );
        }) : (
          <PixelCard>
            <h3>Belum ada tantangan aktif</h3>
            <p>Tantangan akan muncul setelah admin membuat dan mem-publish tantangan.</p>
          </PixelCard>
        )}
      </section>

      {selectedChallenge ? (
        <PixelCard className="challenge-proof-card">
          <h3>Kirim Bukti Tantangan</h3>
          <p>
            Tantangan: <strong>{selectedChallenge.title}</strong>
          </p>

          <form className="form-stack" onSubmit={handleSubmitChallengeProof}>
            <label className="form-field">
              <span>Bukti Teks</span>
              <textarea
                placeholder="Contoh: Saya sudah membuat halaman biodata HTML dan CSS."
                value={proofText}
                onChange={(event) => setProofText(event.target.value)}
              />
              <small>Isi penjelasan singkat tentang tugas yang sudah kamu kerjakan.</small>
            </label>

            <label className="form-field">
              <span>Link Bukti</span>
              <input
                placeholder="Contoh: link Google Drive, GitHub, screenshot, atau web hasil tugas"
                value={proofUrl}
                onChange={(event) => setProofUrl(event.target.value)}
              />
              <small>Boleh isi link screenshot, file, repo GitHub, atau hasil web.</small>
            </label>

            <div className="member-actions">
              <PixelButton type="submit" disabled={submitting}>
                {submitting ? 'Mengirim...' : 'Kirim Bukti'}
              </PixelButton>

              <PixelButton
                type="button"
                variant="secondary"
                onClick={() => {
                  setSelectedChallengeId('');
                  setProofText('');
                  setProofUrl('');
                }}
              >
                Batal
              </PixelButton>
            </div>
          </form>
        </PixelCard>
      ) : null}
    </main>
  );
}