import { useEffect, useMemo, useState } from 'react';
import LoadingState from '../components/LoadingState';
import PixelButton from '../components/PixelButton';
import PixelCard from '../components/PixelCard';
import StatCard from '../components/StatCard';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import {
  exportAllData,
  importSystemData,
  loadAdminContentData,
  loadLearningData,
  loadPublicData,
  removeRecord,
  setMemberStatus,
  upsertCourse,
  upsertCourseSection,
  upsertDoc,
  upsertEvent,
  upsertProject,
  upsertQuestion
} from '../services/dataApi';
import { downloadTextFile } from '../utils/download';

const tabs = [
  { id: 'overview', label: 'Ringkasan' },
  { id: 'members', label: 'Anggota' },
  { id: 'roadmap', label: 'Roadmap' },
  { id: 'materials', label: 'Materi' },
  { id: 'questions', label: 'Soal' },
  { id: 'events', label: 'Agenda' },
  { id: 'docs', label: 'Dokumentasi' },
  { id: 'projects', label: 'Karya' },
  { id: 'backup', label: 'Backup' }
];

const emptyCourse = {
  id: '',
  stage: 1,
  order: 1,
  title: '',
  area: '',
  theme: '',
  minScore: 70,
  xpReward: 100,
  coinReward: 25,
  badgeId: '',
  published: true
};

const emptySection = {
  id: '',
  courseId: '',
  order: 1,
  title: '',
  content: '',
  code: '',
  checkpoint: '',
  published: true
};

const emptyQuestion = {
  id: '',
  courseId: '',
  order: 1,
  type: 'multiple-choice',
  question: '',
  optionA: '',
  optionB: '',
  optionC: '',
  optionD: '',
  correctIndex: 0,
  explanation: '',
  published: true
};

const emptyEvent = {
  title: '',
  category: 'Kelas',
  date: '',
  startTime: '',
  endTime: '',
  location: '',
  speaker: '',
  status: 'Akan Datang',
  description: '',
  published: true
};

const emptyDoc = {
  title: '',
  date: '',
  description: '',
  image: '',
  published: true
};

const emptyProject = {
  title: '',
  maker: '',
  category: 'Website',
  description: '',
  demoUrl: '',
  githubUrl: '',
  published: true
};

function readImageAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function questionToForm(question) {
  const options = question.options || [];

  return {
    id: question.id || '',
    courseId: String(question.courseId || ''),
    order: question.order || 1,
    type: question.type || 'multiple-choice',
    question: question.question || '',
    optionA: options[0] || '',
    optionB: options[1] || '',
    optionC: options[2] || '',
    optionD: options[3] || '',
    correctIndex: Number(question.correctIndex || 0),
    explanation: question.explanation || '',
    published: question.published !== false
  };
}

export default function AdminPanel() {
  const { refreshMember } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [publicData, setPublicData] = useState({ founders: [], events: [], docs: [], projects: [] });
  const [learningData, setLearningData] = useState({ courses: [], rewards: [], ranks: [], members: [] });
  const [contentData, setContentData] = useState({ courses: [], courseSections: [], questions: [] });
  const [courseForm, setCourseForm] = useState(emptyCourse);
  const [sectionForm, setSectionForm] = useState(emptySection);
  const [questionForm, setQuestionForm] = useState(emptyQuestion);
  const [eventForm, setEventForm] = useState(emptyEvent);
  const [docForm, setDocForm] = useState(emptyDoc);
  const [projectForm, setProjectForm] = useState(emptyProject);

  async function reload() {
    setLoading(true);
    const [publicResult, learningResult, contentResult] = await Promise.all([
      loadPublicData(),
      loadLearningData(),
      loadAdminContentData()
    ]);
    setPublicData(publicResult);
    setLearningData(learningResult);
    setContentData(contentResult);
    setLoading(false);
  }

  useEffect(() => {
    reload();
  }, []);

  const pendingMembers = useMemo(() => learningData.members.filter((member) => member.status === 'pending'), [learningData]);
  const allMembers = learningData.members;

  async function handleImportSystem() {
    try {
      const count = await importSystemData();
      showToast(`Data sistem dasar berhasil diimpor. ${count} dokumen diproses.`);
      await reload();
    } catch (error) {
      showToast(error.message || 'Import gagal.', 'error');
    }
  }

  async function handleApprove(member, status) {
    await setMemberStatus(member, status);
    showToast(status === 'approved' ? 'Anggota disetujui.' : 'Anggota ditolak.');
    await reload();
    await refreshMember();
  }

  async function handleCourseSubmit(event) {
    event.preventDefault();
    try {
      const id = String(courseForm.id || courseForm.stage || courseForm.order);
      await upsertCourse({ ...courseForm, id });
      setCourseForm(emptyCourse);
      showToast('Roadmap stage berhasil disimpan.');
      await reload();
    } catch (error) {
      showToast(error.message || 'Roadmap gagal disimpan.', 'error');
    }
  }

  async function handleSectionSubmit(event) {
    event.preventDefault();
    try {
      await upsertCourseSection({
        ...sectionForm,
        id: sectionForm.id || `section-${sectionForm.courseId}-${Date.now()}`
      });
      setSectionForm(emptySection);
      showToast('Materi berhasil disimpan.');
      await reload();
    } catch (error) {
      showToast(error.message || 'Materi gagal disimpan.', 'error');
    }
  }

  async function handleQuestionSubmit(event) {
    event.preventDefault();
    try {
      await upsertQuestion(questionForm);
      setQuestionForm(emptyQuestion);
      showToast('Soal berhasil disimpan.');
      await reload();
    } catch (error) {
      showToast(error.message || 'Soal gagal disimpan.', 'error');
    }
  }

  async function handleEventSubmit(event) {
    event.preventDefault();
    await upsertEvent(eventForm);
    setEventForm(emptyEvent);
    showToast('Agenda berhasil disimpan.');
    await reload();
  }

  async function handleDocSubmit(event) {
    event.preventDefault();
    if (!docForm.image) {
      showToast('Tambahkan gambar atau URL gambar dokumentasi.', 'error');
      return;
    }
    await upsertDoc(docForm);
    setDocForm(emptyDoc);
    showToast('Dokumentasi berhasil disimpan.');
    await reload();
  }

  async function handleProjectSubmit(event) {
    event.preventDefault();
    await upsertProject(projectForm);
    setProjectForm(emptyProject);
    showToast('Karya anggota berhasil disimpan.');
    await reload();
  }

  async function handleImageUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('File harus berupa gambar.', 'error');
      return;
    }
    if (file.size > 700000) {
      showToast('Ukuran gambar maksimal 700 KB agar database tetap ringan.', 'error');
      return;
    }
    const image = await readImageAsDataUrl(file);
    setDocForm((current) => ({ ...current, image }));
  }

  async function handleDelete(collectionName, id) {
    if (!window.confirm('Yakin ingin menghapus data ini?')) {
      return;
    }

    await removeRecord(collectionName, id);
    showToast('Data berhasil dihapus.');
    await reload();
  }

  async function handleExport() {
    const content = await exportAllData();
    downloadTextFile('study-group-coding-firestore-backup.json', content);
    showToast('Backup berhasil dibuat.');
  }

  if (loading) {
    return <LoadingState />;
  }

  return (
    <main className="page-shell admin-page">
      <section className="page-hero compact-hero">
        <p className="eyebrow">Admin Panel</p>
        <h1>Panel Pengurus</h1>
        <p>Kelola anggota, roadmap, materi, soal, agenda, dokumentasi, dan karya anggota.</p>
      </section>

      <section className="stat-grid">
        <StatCard icon="👥" value={allMembers.length} label="Anggota" />
        <StatCard icon="🔐" value={pendingMembers.length} label="Menunggu" />
        <StatCard icon="🗺️" value={contentData.courses.length} label="Stage" />
        <StatCard icon="❓" value={contentData.questions.length} label="Soal" />
      </section>

      <div className="tabbar admin-tabs">
        {tabs.map((tab) => (
          <button className={activeTab === tab.id ? 'active' : ''} key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' ? (
        <section className="two-column">
          <PixelCard>
            <h2>Data Sistem Dasar</h2>
            <p>Tombol ini hanya mengisi reward, rank, dan data pengurus. Roadmap, materi, soal, dan jawaban tetap diisi manual oleh admin.</p>
            <PixelButton onClick={handleImportSystem}>Import Data Sistem</PixelButton>
          </PixelCard>
          <PixelCard>
            <h2>Status Konten Belajar</h2>
            <ul className="clean-list">
              <li>{contentData.courses.length} stage roadmap dibuat.</li>
              <li>{contentData.courseSections.length} bagian materi dibuat.</li>
              <li>{contentData.questions.length} soal quiz dibuat.</li>
            </ul>
          </PixelCard>
        </section>
      ) : null}

      {activeTab === 'members' ? (
        <section className="card-grid">
          {allMembers.length ? allMembers.map((member) => (
            <PixelCard className="member-card" key={member.uid}>
              <h3>{member.avatar} {member.name}</h3>
              <p>{member.nim} · {member.cohort}</p>
              <span className="status-pill">{member.status}</span>
              <div className="member-actions">
                <PixelButton onClick={() => handleApprove(member, 'approved')}>Setujui</PixelButton>
                <PixelButton variant="secondary" onClick={() => handleApprove(member, 'rejected')}>Tolak</PixelButton>
              </div>
            </PixelCard>
          )) : <PixelCard>Belum ada anggota.</PixelCard>}
        </section>
      ) : null}

      {activeTab === 'roadmap' ? (
        <section className="admin-editor-grid">
          <PixelCard>
            <h2>Tambah / Edit Stage</h2>
            <form className="form-stack" onSubmit={handleCourseSubmit}>
              <div className="form-row">
                <input required min="1" placeholder="Stage" type="number" value={courseForm.stage} onChange={(e) => setCourseForm({ ...courseForm, stage: e.target.value, order: e.target.value, id: String(e.target.value) })} />
                <input required min="1" placeholder="Urutan" type="number" value={courseForm.order} onChange={(e) => setCourseForm({ ...courseForm, order: e.target.value })} />
              </div>
              <input required placeholder="Judul stage" value={courseForm.title} onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })} />
              <input placeholder="Area, contoh: Dasar Logika Program" value={courseForm.area} onChange={(e) => setCourseForm({ ...courseForm, area: e.target.value })} />
              <textarea required placeholder="Deskripsi singkat stage" value={courseForm.theme} onChange={(e) => setCourseForm({ ...courseForm, theme: e.target.value })} />
              <div className="form-row">
                <input min="0" max="100" type="number" placeholder="Nilai minimal" value={courseForm.minScore} onChange={(e) => setCourseForm({ ...courseForm, minScore: e.target.value })} />
                <input min="0" type="number" placeholder="XP reward" value={courseForm.xpReward} onChange={(e) => setCourseForm({ ...courseForm, xpReward: e.target.value })} />
                <input min="0" type="number" placeholder="Koin reward" value={courseForm.coinReward} onChange={(e) => setCourseForm({ ...courseForm, coinReward: e.target.value })} />
              </div>
              <input placeholder="ID badge reward, opsional" value={courseForm.badgeId} onChange={(e) => setCourseForm({ ...courseForm, badgeId: e.target.value })} />
              <label className="check-line">
                <input type="checkbox" checked={courseForm.published} onChange={(e) => setCourseForm({ ...courseForm, published: e.target.checked })} />
                Publish ke anggota
              </label>
              <div className="member-actions">
                <PixelButton type="submit">Simpan Stage</PixelButton>
                <PixelButton type="button" variant="secondary" onClick={() => setCourseForm(emptyCourse)}>Bersihkan</PixelButton>
              </div>
            </form>
          </PixelCard>
          <div className="admin-list">
            {contentData.courses.length ? contentData.courses.map((course) => (
              <PixelCard key={course.id}>
                <h3>Stage {course.stage}: {course.title}</h3>
                <p>{course.area || 'Tanpa area'} · {course.published ? 'Published' : 'Draft'}</p>
                <div className="member-actions">
                  <PixelButton variant="secondary" onClick={() => setCourseForm(course)}>Edit</PixelButton>
                  <PixelButton variant="danger" onClick={() => handleDelete('courses', course.id)}>Hapus</PixelButton>
                </div>
              </PixelCard>
            )) : <PixelCard>Belum ada roadmap. Tambahkan stage pertama dari form ini.</PixelCard>}
          </div>
        </section>
      ) : null}

      {activeTab === 'materials' ? (
        <section className="admin-editor-grid">
          <PixelCard>
            <h2>Tambah / Edit Materi</h2>
            <form className="form-stack" onSubmit={handleSectionSubmit}>
              <select required value={sectionForm.courseId} onChange={(e) => setSectionForm({ ...sectionForm, courseId: e.target.value })}>
                <option value="">Pilih stage</option>
                {contentData.courses.map((course) => <option key={course.id} value={course.id}>Stage {course.stage}: {course.title}</option>)}
              </select>
              <input min="1" type="number" placeholder="Urutan materi" value={sectionForm.order} onChange={(e) => setSectionForm({ ...sectionForm, order: e.target.value })} />
              <input required placeholder="Judul materi" value={sectionForm.title} onChange={(e) => setSectionForm({ ...sectionForm, title: e.target.value })} />
              <textarea className="large-textarea" required placeholder="Isi materi. Pisahkan paragraf dengan enter." value={sectionForm.content} onChange={(e) => setSectionForm({ ...sectionForm, content: e.target.value })} />
              <textarea placeholder="Contoh kode, opsional" value={sectionForm.code} onChange={(e) => setSectionForm({ ...sectionForm, code: e.target.value })} />
              <input placeholder="Checkpoint / ringkasan kecil" value={sectionForm.checkpoint} onChange={(e) => setSectionForm({ ...sectionForm, checkpoint: e.target.value })} />
              <label className="check-line">
                <input type="checkbox" checked={sectionForm.published} onChange={(e) => setSectionForm({ ...sectionForm, published: e.target.checked })} />
                Publish materi
              </label>
              <div className="member-actions">
                <PixelButton type="submit">Simpan Materi</PixelButton>
                <PixelButton type="button" variant="secondary" onClick={() => setSectionForm(emptySection)}>Bersihkan</PixelButton>
              </div>
            </form>
          </PixelCard>
          <div className="admin-list">
            {contentData.courseSections.length ? contentData.courseSections.map((section) => (
              <PixelCard key={section.id}>
                <h3>{section.title}</h3>
                <p>Stage {section.courseId} · Urutan {section.order} · {section.published ? 'Published' : 'Draft'}</p>
                <div className="member-actions">
                  <PixelButton variant="secondary" onClick={() => setSectionForm(section)}>Edit</PixelButton>
                  <PixelButton variant="danger" onClick={() => handleDelete('courseSections', section.id)}>Hapus</PixelButton>
                </div>
              </PixelCard>
            )) : <PixelCard>Belum ada materi. Pilih stage lalu tulis materi pertama.</PixelCard>}
          </div>
        </section>
      ) : null}

      {activeTab === 'questions' ? (
        <section className="admin-editor-grid">
          <PixelCard>
            <h2>Tambah / Edit Soal</h2>
            <form className="form-stack" onSubmit={handleQuestionSubmit}>
              <select required value={questionForm.courseId} onChange={(e) => setQuestionForm({ ...questionForm, courseId: e.target.value })}>
                <option value="">Pilih stage</option>
                {contentData.courses.map((course) => <option key={course.id} value={course.id}>Stage {course.stage}: {course.title}</option>)}
              </select>
              <input min="1" type="number" placeholder="Urutan soal" value={questionForm.order} onChange={(e) => setQuestionForm({ ...questionForm, order: e.target.value })} />
              <textarea required placeholder="Pertanyaan" value={questionForm.question} onChange={(e) => setQuestionForm({ ...questionForm, question: e.target.value })} />
              <input required placeholder="Pilihan A" value={questionForm.optionA} onChange={(e) => setQuestionForm({ ...questionForm, optionA: e.target.value })} />
              <input required placeholder="Pilihan B" value={questionForm.optionB} onChange={(e) => setQuestionForm({ ...questionForm, optionB: e.target.value })} />
              <input placeholder="Pilihan C" value={questionForm.optionC} onChange={(e) => setQuestionForm({ ...questionForm, optionC: e.target.value })} />
              <input placeholder="Pilihan D" value={questionForm.optionD} onChange={(e) => setQuestionForm({ ...questionForm, optionD: e.target.value })} />
              <select value={questionForm.correctIndex} onChange={(e) => setQuestionForm({ ...questionForm, correctIndex: Number(e.target.value) })}>
                <option value={0}>Jawaban benar: A</option>
                <option value={1}>Jawaban benar: B</option>
                <option value={2}>Jawaban benar: C</option>
                <option value={3}>Jawaban benar: D</option>
              </select>
              <textarea required placeholder="Pembahasan jawaban" value={questionForm.explanation} onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })} />
              <label className="check-line">
                <input type="checkbox" checked={questionForm.published} onChange={(e) => setQuestionForm({ ...questionForm, published: e.target.checked })} />
                Publish soal
              </label>
              <div className="member-actions">
                <PixelButton type="submit">Simpan Soal</PixelButton>
                <PixelButton type="button" variant="secondary" onClick={() => setQuestionForm(emptyQuestion)}>Bersihkan</PixelButton>
              </div>
            </form>
          </PixelCard>
          <div className="admin-list">
            {contentData.questions.length ? contentData.questions.map((question) => (
              <PixelCard key={question.id}>
                <h3>{question.question}</h3>
                <p>Stage {question.courseId} · Urutan {question.order} · {question.published ? 'Published' : 'Draft'}</p>
                <div className="member-actions">
                  <PixelButton variant="secondary" onClick={() => setQuestionForm(questionToForm(question))}>Edit</PixelButton>
                  <PixelButton variant="danger" onClick={() => handleDelete('questions', question.id)}>Hapus</PixelButton>
                </div>
              </PixelCard>
            )) : <PixelCard>Belum ada soal. Tambahkan soal setelah stage dibuat.</PixelCard>}
          </div>
        </section>
      ) : null}

      {activeTab === 'events' ? (
        <section className="admin-editor-grid">
          <PixelCard>
            <h2>Tambah / Edit Agenda</h2>
            <form className="form-stack" onSubmit={handleEventSubmit}>
              <input required placeholder="Judul kegiatan" value={eventForm.title} onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })} />
              <input placeholder="Kategori" value={eventForm.category} onChange={(e) => setEventForm({ ...eventForm, category: e.target.value })} />
              <input required type="date" value={eventForm.date} onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })} />
              <div className="form-row">
                <input required type="time" value={eventForm.startTime} onChange={(e) => setEventForm({ ...eventForm, startTime: e.target.value })} />
                <input type="time" value={eventForm.endTime} onChange={(e) => setEventForm({ ...eventForm, endTime: e.target.value })} />
              </div>
              <input required placeholder="Lokasi" value={eventForm.location} onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })} />
              <input placeholder="Pemateri" value={eventForm.speaker} onChange={(e) => setEventForm({ ...eventForm, speaker: e.target.value })} />
              <select value={eventForm.status} onChange={(e) => setEventForm({ ...eventForm, status: e.target.value })}>
                <option>Akan Datang</option>
                <option>Berlangsung</option>
                <option>Selesai</option>
                <option>Ditunda</option>
              </select>
              <textarea required placeholder="Deskripsi" value={eventForm.description} onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })} />
              <PixelButton type="submit">Simpan Agenda</PixelButton>
            </form>
          </PixelCard>
          <div className="admin-list">
            {publicData.events.map((event) => (
              <PixelCard key={event.id}>
                <h3>{event.title}</h3>
                <p>{event.date} · {event.startTime}</p>
                <div className="member-actions">
                  <PixelButton variant="secondary" onClick={() => setEventForm(event)}>Edit</PixelButton>
                  <PixelButton variant="danger" onClick={() => handleDelete('events', event.id)}>Hapus</PixelButton>
                </div>
              </PixelCard>
            ))}
          </div>
        </section>
      ) : null}

      {activeTab === 'docs' ? (
        <section className="admin-editor-grid">
          <PixelCard>
            <h2>Tambah Dokumentasi</h2>
            <form className="form-stack" onSubmit={handleDocSubmit}>
              <input required placeholder="Judul dokumentasi" value={docForm.title} onChange={(e) => setDocForm({ ...docForm, title: e.target.value })} />
              <input required placeholder="Tanggal rinci" value={docForm.date} onChange={(e) => setDocForm({ ...docForm, date: e.target.value })} />
              <input type="file" accept="image/*" onChange={handleImageUpload} />
              <input placeholder="Atau tempel URL gambar" value={docForm.image.startsWith('data:') ? '' : docForm.image} onChange={(e) => setDocForm({ ...docForm, image: e.target.value })} />
              {docForm.image ? <img className="doc-preview" src={docForm.image} alt="Preview" /> : null}
              <textarea required placeholder="Deskripsi" value={docForm.description} onChange={(e) => setDocForm({ ...docForm, description: e.target.value })} />
              <PixelButton type="submit">Simpan Dokumentasi</PixelButton>
            </form>
          </PixelCard>
          <div className="admin-list">
            {publicData.docs.map((doc) => (
              <PixelCard key={doc.id}>
                <h3>{doc.title}</h3>
                <p>{doc.date}</p>
                <PixelButton variant="danger" onClick={() => handleDelete('docs', doc.id)}>Hapus</PixelButton>
              </PixelCard>
            ))}
          </div>
        </section>
      ) : null}

      {activeTab === 'projects' ? (
        <section className="admin-editor-grid">
          <PixelCard>
            <h2>Tambah Karya</h2>
            <form className="form-stack" onSubmit={handleProjectSubmit}>
              <input required placeholder="Nama project" value={projectForm.title} onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })} />
              <input required placeholder="Nama pembuat" value={projectForm.maker} onChange={(e) => setProjectForm({ ...projectForm, maker: e.target.value })} />
              <input placeholder="Kategori, contoh: PHP MySQL" value={projectForm.category} onChange={(e) => setProjectForm({ ...projectForm, category: e.target.value })} />
              <input placeholder="Link demo" value={projectForm.demoUrl} onChange={(e) => setProjectForm({ ...projectForm, demoUrl: e.target.value })} />
              <input placeholder="Link GitHub" value={projectForm.githubUrl} onChange={(e) => setProjectForm({ ...projectForm, githubUrl: e.target.value })} />
              <textarea required placeholder="Deskripsi" value={projectForm.description} onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })} />
              <PixelButton type="submit">Simpan Karya</PixelButton>
            </form>
          </PixelCard>
          <div className="admin-list">
            {publicData.projects.map((project) => (
              <PixelCard key={project.id}>
                <h3>{project.title}</h3>
                <p>{project.maker} · {project.category}</p>
                <PixelButton variant="danger" onClick={() => handleDelete('projects', project.id)}>Hapus</PixelButton>
              </PixelCard>
            ))}
          </div>
        </section>
      ) : null}

      {activeTab === 'backup' ? (
        <PixelCard>
          <h2>Backup Data</h2>
          <p>Unduh salinan data Firestore untuk arsip pengurus.</p>
          <PixelButton onClick={handleExport}>Export Backup JSON</PixelButton>
        </PixelCard>
      ) : null}
    </main>
  );
}
