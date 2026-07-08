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

export default function FinalQuest() {
  const { currentMember, refreshMember } = useAuth();
  const { showToast } = useToast();
  const [courses, setCourses] = useState([]);
  const [submission, setSubmission] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      loadLearningCatalog(),
      loadMyFinalProjectSubmission(currentMember.uid)
    ])
      .then(([catalog, submissionData]) => {
        setCourses(catalog.courses || []);
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
      })
      .finally(() => setLoading(false));
  }, [currentMember.uid]);

  const requiredStages = useMemo(() => courses.map(getStageNumber).filter(Boolean), [courses]);
  const passedStages = useMemo(() => new Set([...(currentMember.passedStages || []), ...(currentMember.completedStages || [])].map(Number)), [currentMember]);
  const completedRequired = requiredStages.filter((stage) => passedStages.has(stage));
  const unlocked = requiredStages.length > 0 && completedRequired.length >= requiredStages.length;

  async function handleSubmit(event) {
    event.preventDefault();
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

  if (!unlocked) {
    return (
      <main className="page-shell center-page">
        <PixelCard className="locked-panel">
          <span className="big-icon">🏰</span>
          <h1>Final Project Terkunci</h1>
          <p>Selesaikan semua stage dan quiz terlebih dahulu. Progress kamu: {completedRequired.length}/{requiredStages.length || 0} stage.</p>
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
        <p>Buat project sederhana sebagai bukti bahwa kamu memahami materi. Admin akan review sebelum sertifikat bisa diterbitkan.</p>
      </section>

      <section className="two-column">
        <PixelCard>
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
