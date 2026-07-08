import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import LoadingState from '../components/LoadingState';
import PixelButton from '../components/PixelButton';
import PixelCard from '../components/PixelCard';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { loadLearningCatalog, loadMyFinalProjectSubmission, upsertFinalProjectSubmission } from '../services/dataApi';

const emptyForm = {
  title: '',
  description: '',
  demoUrl: '',
  githubUrl: '',
  screenshotUrl: '',
  note: ''
};

function getStageNumber(course = {}) {
  return Number(course.stage || course.order || course.id || 0);
}

function statusLabel(status) {
  if (status === 'approved') return 'Disetujui';
  if (status === 'revision') return 'Perlu Revisi';
  if (status === 'rejected') return 'Ditolak';
  if (status === 'submitted') return 'Menunggu Review';
  return 'Belum Dikirim';
}

function getCompletedStageSet(member = {}) {
  const fromArrays = [
    ...(member.passedStages || []),
    ...(member.completedStages || []),
    ...(member.completedCourses || [])
  ];

  const fromProgress = Object.entries(member.stageProgress || {})
    .filter(([, value]) => value?.passed || value?.completed || value?.completedAt)
    .map(([key]) => key);

  return new Set([...fromArrays, ...fromProgress]
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item) && item > 0));
}

function formatStageProgress(done, total) {
  if (!total) return 'Belum ada stage aktif yang bisa dihitung';
  return `${done}/${total} stage`;
}

export default function FinalQuest() {
  const { currentMember, refreshMember } = useAuth();
  const { showToast } = useToast();
  const [courses, setCourses] = useState([]);
  const [submission, setSubmission] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [catalogError, setCatalogError] = useState('');
  const [submissionError, setSubmissionError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadFinalProjectPage() {
      if (!currentMember?.uid) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setCatalogError('');
      setSubmissionError('');

      try {
        const catalog = await loadLearningCatalog();
        if (!active) return;
        setCourses(catalog.courses || []);
      } catch (error) {
        console.error('Failed to load final project requirements:', error);
        if (!active) return;
        setCatalogError(error?.code === 'permission-denied'
          ? 'Data stage belum bisa dibaca karena izin Firestore belum sesuai.'
          : 'Data stage belum bisa dimuat. Coba refresh halaman.');
      }

      try {
        const submissionData = await loadMyFinalProjectSubmission(currentMember.uid);
        if (!active) return;
        setSubmission(submissionData);
        if (submissionData) {
          setForm({
            title: submissionData.title || '',
            description: submissionData.description || '',
            demoUrl: submissionData.demoUrl || '',
            githubUrl: submissionData.githubUrl || '',
            screenshotUrl: submissionData.screenshotUrl || '',
            note: submissionData.note || ''
          });
        }
      } catch (error) {
        console.error('Failed to load my final project submission:', error);
        if (!active) return;
        setSubmissionError(error?.code === 'permission-denied'
          ? 'Submission lama belum bisa dibaca. Kamu tetap bisa membuka syarat Final Project setelah rules diperbarui.'
          : 'Submission lama belum bisa dimuat.');
      } finally {
        if (active) setLoading(false);
      }
    }

    loadFinalProjectPage();

    return () => {
      active = false;
    };
  }, [currentMember?.uid]);

  const requiredStages = useMemo(() => courses.map(getStageNumber).filter(Boolean), [courses]);
  const completedStageSet = useMemo(() => getCompletedStageSet(currentMember), [currentMember]);
  const completedRequired = requiredStages.filter((stage) => completedStageSet.has(stage));
  const hasStageRequirement = requiredStages.length > 0;
  const unlocked = hasStageRequirement && completedRequired.length >= requiredStages.length;

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.title.trim()) {
      showToast('Judul project wajib diisi.', 'error');
      return;
    }

    if (!form.description.trim()) {
      showToast('Deskripsi project wajib diisi.', 'error');
      return;
    }

    if (!form.demoUrl.trim() && !form.githubUrl.trim() && !form.screenshotUrl.trim()) {
      showToast('Tambahkan minimal satu bukti: link demo, GitHub, atau screenshot.', 'error');
      return;
    }

    setSaving(true);

    try {
      const nextSubmission = await upsertFinalProjectSubmission({
        ...submission,
        ...form,
        uid: currentMember.uid,
        memberName: currentMember.name,
        nim: currentMember.nim,
        status: submission?.status === 'revision' ? 'submitted' : 'submitted'
      });
      setSubmission(nextSubmission);
      await refreshMember();
      showToast('Final Project berhasil dikirim. Tunggu review admin.');
    } catch (error) {
      showToast(error.message || 'Gagal mengirim Final Project.', 'error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState />;

  if (catalogError || !hasStageRequirement) {
    return (
      <main className="page-shell center-page">
        <PixelCard className="locked-panel warning-panel">
          <span className="big-icon">🧭</span>
          <h1>Final Project Belum Bisa Dihitung</h1>
          <p>{catalogError || 'Daftar stage aktif belum terbaca, jadi sistem belum bisa menentukan apakah Final Project sudah terbuka.'}</p>
          <p className="muted-text">Progress kamu: {formatStageProgress(completedRequired.length, requiredStages.length)}.</p>
          <p>Pastikan Admin sudah membuat stage, stage sudah dipublish, dan aturan Firestore sudah dideploy.</p>
          <Link className="pixel-button primary" to="/map">Cek Learning Map</Link>
        </PixelCard>
      </main>
    );
  }

  if (!unlocked) {
    return (
      <main className="page-shell center-page">
        <PixelCard className="locked-panel">
          <span className="big-icon">🏰</span>
          <h1>Final Project Terkunci</h1>
          <p>Selesaikan semua stage dan quiz terlebih dahulu. Progress kamu: {formatStageProgress(completedRequired.length, requiredStages.length)}.</p>
          <Link className="pixel-button primary" to="/map">Kembali ke Learning Map</Link>
        </PixelCard>
      </main>
    );
  }

  const currentStatus = submission?.status || currentMember.finalProjectStatus || '';

  return (
    <main className="page-shell final-project-page">
      <section className="page-hero compact-hero">
        <p className="eyebrow">Final Project</p>
        <h1>Tugas Akhir Petualangan Coding</h1>
        <p>Halaman ini adalah tempat anggota memasukkan submission. Form akan terbuka setelah semua stage dan quiz selesai.</p>
        <p>Setelah kamu klik Kirim Final Project, submission masuk ke tab Final Project di Admin Panel untuk direview.</p>
      </section>

      {submissionError ? (
        <PixelCard className="warning-panel section-block">
          <strong>Catatan:</strong> {submissionError}
        </PixelCard>
      ) : null}

      <section className="two-column">
        <PixelCard>
          <h2>Kapan Harus Mengirim?</h2>
          <p>Kirim Final Project setelah peta belajar menunjukkan semua stage selesai. Kamu boleh update submission jika admin meminta revisi.</p>
          <h2>Ketentuan Project</h2>
          <ul className="clean-list">
            <li>Buat website sederhana, landing page, profil, katalog UMKM, atau mini app sesuai kemampuan.</li>
            <li>Project harus bisa dijelaskan: tujuan, fitur, teknologi, dan cara menjalankan.</li>
            <li>Kirim minimal salah satu bukti: link demo, GitHub, atau screenshot.</li>
            <li>Jika diminta revisi, perbaiki lalu kirim ulang dari halaman ini.</li>
          </ul>
        </PixelCard>

        <PixelCard className={`final-status-card ${currentStatus || 'empty'}`}>
          <p className="eyebrow">Status Review</p>
          <h2>{statusLabel(currentStatus)}</h2>
          {submission?.adminNote || currentMember.finalProjectAdminNote ? <p><strong>Catatan admin:</strong> {submission?.adminNote || currentMember.finalProjectAdminNote}</p> : <p>Setelah dikirim, admin akan mengecek project kamu.</p>}
          {currentStatus === 'approved' ? <Link className="pixel-button primary" to="/certificate">Cek Sertifikat</Link> : null}
        </PixelCard>
      </section>

      {currentStatus === 'approved' ? null : (
        <PixelCard className="section-block">
          <h2>{submission ? 'Update Submission Final Project' : 'Kirim Final Project'}</h2>
          <form className="form-stack" onSubmit={handleSubmit}>
            <label>
              Judul Project
              <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Contoh: Website Profil Komunitas" />
            </label>
            <label>
              Deskripsi Project
              <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Jelaskan tujuan, fitur utama, dan teknologi yang kamu pakai." />
            </label>
            <div className="admin-editor-grid compact-grid">
              <label>
                Link Demo
                <input value={form.demoUrl} onChange={(event) => setForm({ ...form, demoUrl: event.target.value })} placeholder="https://..." />
              </label>
              <label>
                Link GitHub
                <input value={form.githubUrl} onChange={(event) => setForm({ ...form, githubUrl: event.target.value })} placeholder="https://github.com/..." />
              </label>
            </div>
            <label>
              Link Screenshot / Bukti Gambar
              <input value={form.screenshotUrl} onChange={(event) => setForm({ ...form, screenshotUrl: event.target.value })} placeholder="https://..." />
            </label>
            <label>
              Catatan untuk Admin
              <textarea value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} placeholder="Tambahkan kendala, cara login demo, atau catatan khusus." />
            </label>
            <PixelButton type="submit" disabled={saving}>{saving ? 'Mengirim...' : 'Kirim Final Project'}</PixelButton>
          </form>
        </PixelCard>
      )}
    </main>
  );
}
