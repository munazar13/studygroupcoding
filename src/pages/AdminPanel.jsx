import { useEffect, useMemo, useRef, useState } from 'react';
import LoadingState from '../components/LoadingState';
import PixelButton from '../components/PixelButton';
import PixelCard from '../components/PixelCard';
import StatCard from '../components/StatCard';
import AdminPreviewContent from '../components/AdminPreviewContent';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { FIXED_MATERIAL_SECTIONS } from '../data/fixedMaterialSections';
import {
  approveChallengeSubmission,
  rejectChallengeSubmission,
  cleanMemberData,
  exportAllData,
  grantMemberReward,
  importSystemData,
  loadAdminContentData,
  loadAnnouncements,
  loadChallengeData,
  loadLearningData,
  loadPublicData,
  removeRecord,
  resetMemberChallenges,
  resetMemberEconomy,
  resetMemberProgress,
  resetMemberRewards,
  restoreBackupData,
  resolveContentReport,
  setMemberStatus,
  updateMemberAdminStats,
  upsertAnnouncement,
  upsertChallenge,
  upsertCourse,
  upsertCourseSection,
  upsertDoc,
  upsertEvent,
  upsertProject,
  upsertQuestion,
  upsertReward,
  deleteReward,
  analyzeSystemHealth,
  deleteMediaAsset,
  deleteShopItem,
  exportLearningContent,
  importLearningContent,
  issueCertificate,
  loadCertificateSettings,
  loadCertificates,
  loadFinalProjectSubmissions,
  loadMediaAssets,
  loadShopItems,
  repairAllMembersData,
  reviewFinalProjectSubmission,
  revokeCertificate,
  updateCertificateSettings,
  upsertMediaAsset,
  upsertShopItem,
} from '../services/dataApi';
import { downloadTextFile } from '../utils/download';
import { RARITY_LIST, getRarityClassName, getRarityLabel } from '../utils/rarity';
const tabs = [
{ id: 'overview', label: 'Ringkasan' },
{ id: 'members', label: 'Anggota' },
{ id: 'learning-content', label: 'Konten Belajar' },
{ id: 'events', label: 'Agenda' },
{ id: 'announcements', label: 'Pengumuman' },
{ id: 'docs', label: 'Dokumentasi' },
{ id: 'projects', label: 'Karya' },
{ id: 'challenges', label: 'Tantangan' },
{ id: 'rewards', label: 'Reward' },
{ id: 'shop', label: 'Shop' },
{ id: 'health', label: 'Health Check' },
{ id: 'final-projects', label: 'Final Project' },
{ id: 'certificates', label: 'Sertifikat' },
{ id: 'media', label: 'Media' },
{ id: 'content-tools', label: 'Import/Export Konten' },
{ id: 'reports', label: 'Laporan' },
{ id: 'audit', label: 'Audit Log' },
{ id: 'backup', label: 'Backup' }
];

const LEARNING_DRAFT_PREFIX = 'sgc-learning-content-draft-v2';

function getLearningDraftKey(courseId) {
  const id = String(courseId || '').trim();
  return id ? `${LEARNING_DRAFT_PREFIX}:${id}` : '';
}

function readLearningDraft(courseId) {
  const key = getLearningDraftKey(courseId);

  if (!key || typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn('Gagal membaca draft konten belajar:', error);
    return null;
  }
}

function writeLearningDraft(courseId, draft) {
  const key = getLearningDraftKey(courseId);

  if (!key || typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(key, JSON.stringify({
      ...draft,
      updatedAt: new Date().toISOString()
    }));
  } catch (error) {
    console.warn('Gagal menyimpan draft lokal konten belajar:', error);
  }
}

function removeLearningDraft(courseId) {
  const key = getLearningDraftKey(courseId);

  if (!key || typeof window === 'undefined') return;

  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    console.warn('Gagal menghapus draft lokal konten belajar:', error);
  }
}


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

  badgeRewardEnabled: false,
  badgeId: '',
  badgeName: '',
  badgeDescription: '',
  badgeIcon: '🏅',
  badgeRarity: 'common',

  titleRewardEnabled: false,
  titleRewardId: '',
  titleRewardName: '',
  titleRewardDescription: '',
  titleRewardIcon: '🎖️',
  titleRewardRarity: 'common',

  hasChestReward: false,
  chestId: '',
  chestName: '',
  chestDescription: '',
  chestIcon: '🎁',
  chestRarity: 'common',

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

const emptyAnnouncement = {
  id: '',
  title: '',
  category: 'Info',
  message: '',
  priority: 'normal',
  target: 'all',
  pinned: false,
  published: true,
  startDate: '',
  endDate: '',
  order: 999
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

const emptyChallenge = {
  id: '',
  title: '',
  description: '',

  rewardType: 'coins',
  rewardId: '',
  rewardName: '',
  rewardDescription: '',
  rewardIcon: '',
  rewardRarity: 'common',
  rewardXp: 0,
  rewardCoins: 25,

  startDate: '',
  endDate: '',
  proofRequired: true,
  featuredOnHome: true,
  published: true,
  order: 1
};


const emptyShopItem = {
  id: '',
  type: 'avatar',
  name: '',
  icon: '🧙',
  color: '',
  rarity: 'common',
  description: '',
  price: 25,
  published: true,
  order: 999
};

const emptyCertificateSettings = {
  programName: 'Dasar Pemrograman, PHP, dan MySQL',
  organizationName: 'Study Group Coding',
  signerName: 'Admin Study Group Coding',
  signerTitle: 'Pengurus / Mentor',
  requirementText: 'Menyelesaikan semua stage, lulus quiz, dan Final Project disetujui.',
  logoUrl: './images/logo.svg',
  signatureUrl: '',
  stampUrl: ''
};

const emptyReward = {
  id: '',
  type: 'badge',
  name: '',
  icon: '🏅',
  rarity: 'common',
  description: '',
  requirement: '',
  published: true,
  order: 999
};

function readImageAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function confirmDangerAction({ title, message, confirmation = 'DELETE' }) {
  const response = window.prompt(
    `${title}\n\n${message}\n\nKetik ${confirmation} untuk melanjutkan.`
  );

  return response === confirmation;
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

function getQuestionFormStatus(question, index = 0) {
  const label = `Soal ${Number(question?.order || index + 1)}`;
  const options = [
    question?.optionA,
    question?.optionB,
    question?.optionC,
    question?.optionD
  ];

  if (!String(question?.question || '').trim()) {
    return { label, complete: false, published: question?.published === true, message: 'Pertanyaan belum diisi' };
  }

  if (options.some((option) => !String(option || '').trim())) {
    return { label, complete: false, published: question?.published === true, message: 'Pilihan A/B/C/D belum lengkap' };
  }

  if (![0, 1, 2, 3].includes(Number(question?.correctIndex))) {
    return { label, complete: false, published: question?.published === true, message: 'Jawaban benar belum valid' };
  }

  if (!String(question?.explanation || '').trim()) {
    return { label, complete: false, published: question?.published === true, message: 'Pembahasan belum diisi' };
  }

  if (question?.published === false) {
    return { label, complete: false, published: false, message: 'Draft' };
  }

  return { label, complete: true, published: true, message: 'Siap' };
}

export default function AdminPanel() {
  const { refreshMember } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [publicData, setPublicData] = useState({
  founders: [],
  events: [],
  docs: [],
  projects: [],
  announcements: []
  });
  const [learningData, setLearningData] = useState({ courses: [], rewards: [], ranks: [], members: [] });
  const [contentData, setContentData] = useState({
    courses: [],
    courseSections: [],
    questions: [],
    contentReports: [],
    auditLogs: []
  });
  const [courseForm, setCourseForm] = useState(emptyCourse);
  const [sectionForms, setSectionForms] = useState([]);
  const [questionForms, setQuestionForms] = useState([]);
  const [eventForm, setEventForm] = useState(emptyEvent);
  const [announcementForm, setAnnouncementForm] = useState(emptyAnnouncement);
  const [docForm, setDocForm] = useState(emptyDoc);
  const [projectForm, setProjectForm] = useState(emptyProject);
  const [challengeData, setChallengeData] = useState({ challenges: [], challengeSubmissions: [] });
  const [challengeForm, setChallengeForm] = useState(emptyChallenge);
  const [rewardForm, setRewardForm] = useState(emptyReward);
  const [shopItems, setShopItems] = useState([]);
  const [shopForm, setShopForm] = useState(emptyShopItem);
  const [finalSubmissions, setFinalSubmissions] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [certificateSettings, setCertificateSettings] = useState(emptyCertificateSettings);
  const [certificateReviewNotes, setCertificateReviewNotes] = useState({});
  const [mediaAssets, setMediaAssets] = useState([]);
  const [mediaForm, setMediaForm] = useState({ title: '', dataUrl: '', fileName: '', mimeType: '', size: 0 });
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [savingCompleteStage, setSavingCompleteStage] = useState(false);
  const [savingMaterials, setSavingMaterials] = useState(false);
  const [savingQuestions, setSavingQuestions] = useState(false);
  const [materialDirty, setMaterialDirty] = useState(false);
  const [questionDirty, setQuestionDirty] = useState(false);
  const [draftNotice, setDraftNotice] = useState('');
  const sectionFormsCourseRef = useRef('');
  const questionFormsCourseRef = useRef('');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [memberEditForm, setMemberEditForm] = useState({
  level: 1,
  xp: 0,
  xpToNextLevel: 100,
  totalXp: 0,
  coins: 0
});
  const [memberRewardGrantId, setMemberRewardGrantId] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [memberStatusFilter, setMemberStatusFilter] = useState('all');
  const [memberCohortFilter, setMemberCohortFilter] = useState('all');
  async function reload() {
  setLoading(true);

  try {
    const [
      publicResult,
      learningResult,
      contentResult,
      challengeResult,
      announcementResult,
      shopResult,
      finalProjectResult,
      certificateResult,
      certificateSettingsResult,
      mediaResult
    ] = await Promise.all([
      loadPublicData(),
      loadLearningData(),
      loadAdminContentData(),
      loadChallengeData(),
      loadAnnouncements({ includeDrafts: true }),
      loadShopItems({ includeDrafts: true }),
      loadFinalProjectSubmissions(),
      loadCertificates(),
      loadCertificateSettings(),
      loadMediaAssets()
    ]);

    setPublicData({
      ...publicResult,
      announcements: announcementResult
    });
    setLearningData(learningResult);
    setContentData(contentResult);
    setChallengeData(challengeResult);
    setShopItems(shopResult || []);
    setFinalSubmissions(finalProjectResult || []);
    setCertificates(certificateResult || []);
    setCertificateSettings({ ...emptyCertificateSettings, ...(certificateSettingsResult || {}) });
    setMediaAssets(mediaResult || []);
  } catch (error) {
    console.error(error);

    const message = String(error?.message || '');
    const permissionMessage = message.toLowerCase().includes('permission')
      ? 'AdminPanel ditolak Firestore. Deploy firestore.rules terbaru dan pastikan login memakai akun admin.'
      : message || 'Gagal memuat data admin.';

    showToast(permissionMessage, 'error');
  } finally {
    setLoading(false);
  }
}

  useEffect(() => {
    reload();
  }, []);

  const pendingMembers = useMemo(() => learningData.members.filter((member) => member.status === 'pending'), [learningData]);
  const allMembers = learningData.members;
  const memberCohortOptions = useMemo(() => {
  return Array.from(
    new Set(
      allMembers
        .map((member) => String(member.cohort || member.letting || member.angkatan || '').trim())
        .filter(Boolean)
    )
  ).sort();
}, [allMembers]);

const filteredMembers = useMemo(() => {
  const search = memberSearch.toLowerCase().trim();

  return allMembers.filter((member) => {
    const name = String(member.name || '').toLowerCase();
    const nim = String(member.nim || '').toLowerCase();
    const cohort = String(member.cohort || member.letting || member.angkatan || '').toLowerCase();
    const status = String(member.status || 'pending').toLowerCase();

    const matchesSearch =
      !search ||
      name.includes(search) ||
      nim.includes(search) ||
      cohort.includes(search) ||
      status.includes(search);

    const matchesStatus =
      memberStatusFilter === 'all' ||
      status === memberStatusFilter;

    const matchesCohort =
      memberCohortFilter === 'all' ||
      cohort === String(memberCohortFilter).toLowerCase();

    return matchesSearch && matchesStatus && matchesCohort;
  });
}, [allMembers, memberSearch, memberStatusFilter, memberCohortFilter]);

const adminAnalytics = useMemo(() => {
  const quizEntries = allMembers.flatMap((member) => member.quizHistory || []);
  const averageQuizScore = quizEntries.length
    ? Math.round(
        quizEntries.reduce((sum, item) => sum + Number(item.score || 0), 0) / quizEntries.length
      )
    : 0;

  return {
    approvedMembers: allMembers.filter((member) => member.status === 'approved').length,
    pendingMembers: allMembers.filter((member) => member.status === 'pending').length,
    publishedStages: contentData.courses.filter((course) => course.published !== false).length,
    publishedQuestions: contentData.questions.filter((question) => question.published !== false).length,
    openReports: (contentData.contentReports || []).filter((report) => report.status !== 'resolved').length,
    pendingChallengeSubmissions: (challengeData.challengeSubmissions || []).filter((submission) => submission.status === 'pending').length,
    averageQuizScore,
    quizAttempts: quizEntries.length
  };
}, [allMembers, challengeData.challengeSubmissions, contentData.courses, contentData.questions, contentData.contentReports]);

const systemHealth = useMemo(() => analyzeSystemHealth({
  members: allMembers,
  courses: contentData.courses,
  courseSections: contentData.courseSections,
  questions: contentData.questions
}), [allMembers, contentData.courses, contentData.courseSections, contentData.questions]);

  const sortedCourses = useMemo(() => {
  return [...contentData.courses].sort((a, b) => Number(a.order || a.stage || 0) - Number(b.order || b.stage || 0));
}, [contentData.courses]);

const activeCourseId = selectedCourseId || sortedCourses[0]?.id || '';

const selectedCourse = useMemo(() => {
  return sortedCourses.find((course) => String(course.id) === String(activeCourseId)) || null;
}, [sortedCourses, activeCourseId]);

function rankSectionCandidate(section, canonicalId, template) {
  const exactId = String(section?.id || '') === String(canonicalId) ? 1000 : 0;
  const exactType = String(section?.type || '') === String(template.type) ? 100 : 0;
  const exactOrder = Number(section?.order || 0) === Number(template.order) ? 10 : 0;
  const updatedTime = new Date(section?.updatedAt || section?.createdAt || 0).getTime();

  return exactId + exactType + exactOrder + (Number.isFinite(updatedTime) ? updatedTime / 100000000000000 : 0);
}

function findBestExistingSection(existingSections, canonicalId, template) {
  const candidates = existingSections.filter((section) => {
    const sameId = String(section.id || '') === String(canonicalId);
    const sameType = String(section.type || '') === String(template.type);
    const sameOrder = Number(section.order || 0) === Number(template.order);

    return sameId || sameType || sameOrder;
  });

  if (!candidates.length) return null;

  return [...candidates].sort((a, b) =>
    rankSectionCandidate(b, canonicalId, template) - rankSectionCandidate(a, canonicalId, template)
  )[0];
}

function findExistingSectionIdsForSave(allSections, courseId, canonicalId, template) {
  return allSections
    .filter((section) => {
      const sameCourse = String(section.courseId || '') === String(courseId);
      const sameId = String(section.id || '') === String(canonicalId);
      const sameType = String(section.type || '') === String(template.type);
      const sameOrder = Number(section.order || 0) === Number(template.order);

      return sameCourse && (sameId || sameType || sameOrder);
    })
    .map((section) => String(section.id || '').trim())
    .filter(Boolean);
}

const selectedCourseSections = useMemo(() => {
  const existingSections = contentData.courseSections
    .filter((section) => String(section.courseId) === String(activeCourseId));

  return FIXED_MATERIAL_SECTIONS.map((template) => {
    const canonicalId = `section-${activeCourseId}-${template.type}`;
    const existing = findBestExistingSection(existingSections, canonicalId, template);

    return {
      id: existing?.id || canonicalId,
      canonicalId,
      courseId: String(activeCourseId || ''),
      order: template.order,
      type: template.type,
      title: template.title,
      content: existing?.content || '',
      code: existing?.code || '',
      checkpoint: existing?.checkpoint || template.defaultCheckpoint,
      published: existing ? existing.published !== false : false,
      isEmpty: !existing || !String(existing.content || '').trim()
    };
  });
}, [contentData.courseSections, activeCourseId]);

useEffect(() => {
  if (!activeCourseId) {
    sectionFormsCourseRef.current = '';
    setSectionForms([]);
    setMaterialDirty(false);
    return;
  }

  const nextCourseId = String(activeCourseId);
  const isSameCourse = sectionFormsCourseRef.current === nextCourseId;

  // Jangan timpa materi yang sedang diketik saat reload data Firestore berjalan.
  // Ini mencegah kasus materi hilang setelah klik simpan info stage / reload otomatis.
  if (isSameCourse && materialDirty) return;

  const draft = readLearningDraft(nextCourseId);
  const draftSections = Array.isArray(draft?.sectionForms)
    && draft.sectionForms.length === FIXED_MATERIAL_SECTIONS.length
    ? draft.sectionForms
    : null;
  const shouldRestoreDraft = !isSameCourse && draftSections && draft?.materialDirty === true;

  sectionFormsCourseRef.current = nextCourseId;
  setSectionForms(
    shouldRestoreDraft
      ? draftSections.map((section) => ({
          ...section,
          courseId: nextCourseId,
          content: section.content || '',
          code: section.code || '',
          checkpoint: section.checkpoint || '',
          published: section.published !== false
        }))
      : selectedCourseSections.map((section) => ({
          ...section,
          courseId: nextCourseId,
          content: section.content || '',
          code: section.code || '',
          checkpoint: section.checkpoint || '',
          published: section.published !== false
        }))
  );
  setMaterialDirty(Boolean(shouldRestoreDraft));
  if (shouldRestoreDraft) {
    setDraftNotice('Draft materi yang belum tersimpan berhasil dipulihkan dari browser. Klik Simpan Semua Materi atau Simpan Stage Lengkap agar masuk ke database.');
  }
}, [activeCourseId, selectedCourseSections, materialDirty]);

const selectedCourseQuestions = useMemo(() => {
  return contentData.questions
    .filter((question) => String(question.courseId) === String(activeCourseId))
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
}, [contentData.questions, activeCourseId]);

useEffect(() => {
  if (!activeCourseId) {
    questionFormsCourseRef.current = '';
    setQuestionForms([]);
    setQuestionDirty(false);
    return;
  }

  const nextCourseId = String(activeCourseId);
  const isSameCourse = questionFormsCourseRef.current === nextCourseId;

  // Jangan timpa soal yang sedang diketik saat reload data Firestore berjalan.
  if (isSameCourse && questionDirty) return;

  const draft = readLearningDraft(nextCourseId);
  const draftQuestions = Array.isArray(draft?.questionForms) && draft.questionForms.length
    ? draft.questionForms
    : null;
  const shouldRestoreDraft = !isSameCourse && draftQuestions && draft?.questionDirty === true;

  questionFormsCourseRef.current = nextCourseId;
  const existingQuestions = selectedCourseQuestions.map((question, index) => ({
    ...questionToForm(question),
    courseId: nextCourseId,
    order: question.order || index + 1,
    published: question.published !== false
  }));

  setQuestionForms(
    shouldRestoreDraft
      ? draftQuestions.map((question, index) => ({
          ...question,
          courseId: nextCourseId,
          order: question.order || index + 1,
          published: question.published !== false
        }))
      : existingQuestions.length
        ? existingQuestions
        : [
            {
              ...emptyQuestion,
              courseId: nextCourseId,
              order: 1,
              published: true
            }
          ]
  );
  setQuestionDirty(Boolean(shouldRestoreDraft));
  if (shouldRestoreDraft) {
    setDraftNotice('Draft soal yang belum tersimpan berhasil dipulihkan dari browser. Klik Simpan Semua Soal atau Simpan Stage Lengkap agar masuk ke database.');
  }
}, [activeCourseId, selectedCourseQuestions, questionDirty]);

useEffect(() => {
  if (activeTab !== 'learning-content') return undefined;

  const draftCourseId = getCourseFormId() || activeCourseId;

  if (!draftCourseId || (!materialDirty && !questionDirty)) return undefined;

  const timeoutId = window.setTimeout(() => {
    writeLearningDraft(draftCourseId, {
      materialDirty,
      questionDirty,
      sectionForms,
      questionForms
    });
  }, 500);

  return () => window.clearTimeout(timeoutId);
}, [
  activeTab,
  activeCourseId,
  courseForm.id,
  courseForm.stage,
  materialDirty,
  questionDirty,
  sectionForms,
  questionForms
]);

const stageCompleteness = useMemo(() => {
  const materialSource = sectionForms.length ? sectionForms : selectedCourseSections;
  const questionSource = questionForms.length
    ? questionForms
    : selectedCourseQuestions.map((question) => questionToForm(question));

  const materialStatus = materialSource.map((section) => {
    const hasContent = String(section.content || '').trim().length > 0;
    const hasCheckpoint = String(section.checkpoint || '').trim().length > 0;

    if (!hasContent) {
      return {
        title: section.title,
        complete: false,
        message: 'Belum diisi'
      };
    }

    if (!hasCheckpoint) {
      return {
        title: section.title,
        complete: false,
        message: 'Checkpoint belum diisi'
      };
    }

    if (section.published === false) {
      return {
        title: section.title,
        complete: false,
        message: 'Draft'
      };
    }

    return {
      title: section.title,
      complete: true,
      message: 'Lengkap'
    };
  });

  const questionStatus = questionSource.map((question, index) =>
    getQuestionFormStatus(question, index)
  );

  const readyPublishedQuestions = questionStatus.filter((item) => item.complete);
  const quizComplete = readyPublishedQuestions.length > 0;

  const xpReward = Number(courseForm?.xpReward || 0);
  const coinReward = Number(courseForm?.coinReward || 0);
  const rewardComplete = xpReward > 0 && coinReward > 0;

  const complete =
    materialStatus.every((item) => item.complete) &&
    quizComplete &&
    rewardComplete;

  return {
    complete,
    materialStatus,
    questionStatus,
    quizComplete,
    readyQuestionCount: readyPublishedQuestions.length,
    rewardComplete,
    xpReward,
    coinReward
  };
}, [sectionForms, selectedCourseSections, questionForms, selectedCourseQuestions, courseForm?.xpReward, courseForm?.coinReward]);

const masterRewards = useMemo(() => {
  return [...(learningData.rewards || [])].sort((a, b) => {
    const typeCompare = String(a.type || a.category || '').localeCompare(
      String(b.type || b.category || '')
    );

    if (typeCompare !== 0) return typeCompare;

    return Number(a.order || 999) - Number(b.order || 999);
  });
}, [learningData.rewards]);

const badgeRewards = useMemo(() => {
  return masterRewards.filter((reward) => String(reward.type || reward.category) === 'badge');
}, [masterRewards]);

const titleRewards = useMemo(() => {
  return masterRewards.filter((reward) => String(reward.type || reward.category) === 'title');
}, [masterRewards]);

const chestRewards = useMemo(() => {
  return masterRewards.filter((reward) => String(reward.type || reward.category) === 'chest');
}, [masterRewards]);

const selectedMember = useMemo(() => {
  if (!selectedMemberId) return null;

  return allMembers.find((member) => {
    return String(member.uid || member.id || '') === String(selectedMemberId);
  }) || null;
}, [allMembers, selectedMemberId]);

const selectedGrantReward = useMemo(() => {
  if (!memberRewardGrantId) return null;

  return masterRewards.find((reward) => {
    return String(reward.id) === String(memberRewardGrantId);
  }) || null;
}, [masterRewards, memberRewardGrantId]);

const selectedMemberAlreadyHasReward = useMemo(() => {
  return memberHasReward(selectedMember, selectedGrantReward);
}, [selectedMember, selectedGrantReward]);

useEffect(() => {
  if (!selectedMember) return;

  setMemberEditForm({
    level: Number(selectedMember.level || 1),
    xp: Number(selectedMember.xp || 0),
    xpToNextLevel: Number(selectedMember.xpToNextLevel || 100),
    totalXp: Number(selectedMember.totalXp || 0),
    coins: Number(selectedMember.coins || 0)
  });
}, [selectedMember]);

function formatAdminDate(value) {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
}

function getRewardById(rewardId) {
  const cleanId = String(rewardId || '').trim();

  if (!cleanId) return null;

  return masterRewards.find((reward) => String(reward.id) === cleanId) || null;
}

function getRewardLabel(rewardId, fallbackIcon = '🏅') {
  const reward = getRewardById(rewardId);

  if (!reward) {
    return `${fallbackIcon} ${rewardId}`;
  }

  return `${reward.icon || fallbackIcon} ${reward.name || reward.title || reward.id}`;
}

function memberHasReward(member, reward) {
  if (!member || !reward) return false;

  const rewardId = String(reward.id || '').trim();
  const rewardType = String(reward.type || reward.category || '').trim();

  if (!rewardId) return false;

  if (rewardType === 'badge') {
    return [
      ...(member.badges || []),
      ...(member.ownedBadges || [])
    ].map(String).includes(rewardId);
  }

  if (rewardType === 'title') {
    return [
      ...(member.titles || []),
      ...(member.ownedTitles || [])
    ].map(String).includes(rewardId);
  }

  if (rewardType === 'chest') {
    return [
      ...(member.unopenedChests || []),
      ...(member.openedChests || [])
    ].map(String).includes(rewardId);
  }

  return (member.unlockedRewards || []).map(String).includes(rewardId);
}

function isMemberCompletedCourse(member, course) {
  const courseId = String(course.id || '');
  const courseStage = String(course.stage || course.order || '');

  const completedCourses = (member.completedCourses || []).map(String);
  const completedStages = [
    ...(member.completedStages || []),
    ...(member.passedStages || [])
  ].map(String);

  return completedCourses.includes(courseId) || completedStages.includes(courseStage);
}

function getMemberCourseProgress(member, course) {
  const courseId = String(course.id || '');
  const courseStage = String(course.stage || course.order || '');

  return (
    member.stageProgress?.[courseId] ||
    member.stageProgress?.[courseStage] ||
    member.courseProgress?.[courseId] ||
    null
  );
}

useEffect(() => {
if (!selectedCourse || activeTab !== 'learning-content') return;

setCourseForm({
...emptyCourse,
...selectedCourse,
id: String(selectedCourse.id || selectedCourse.stage || selectedCourse.order || ''),
stage: selectedCourse.stage || selectedCourse.order || 1,
order: selectedCourse.order || selectedCourse.stage || 1,
minScore: selectedCourse.minScore ?? 70,
xpReward: selectedCourse.xpReward ?? 100,
coinReward: selectedCourse.coinReward ?? 25,
badgeRewardEnabled: selectedCourse.badgeRewardEnabled === true || Boolean(selectedCourse.badgeId || selectedCourse.badgeName),
badgeIcon: selectedCourse.badgeIcon || '🏅',
badgeRarity: selectedCourse.badgeRarity || 'common',
titleRewardEnabled: selectedCourse.titleRewardEnabled === true || Boolean(selectedCourse.titleRewardId || selectedCourse.titleRewardName),
titleRewardIcon: selectedCourse.titleRewardIcon || '🎖️',
titleRewardRarity: selectedCourse.titleRewardRarity || 'common',
hasChestReward: selectedCourse.hasChestReward === true || Boolean(selectedCourse.chestId || selectedCourse.chestName),
chestIcon: selectedCourse.chestIcon || '🎁',
chestRarity: selectedCourse.chestRarity || 'common',
published: selectedCourse.published !== false
});
}, [activeTab, selectedCourse]);

function createCodeSnippet(language = 'php') {
  const fence = String.fromCharCode(96).repeat(3);

  return `${fence}${language}

${fence}`;
}

function createImageSnippet() {
  return '![Judul gambar](images/materials/nama-file.png)';
}



function updateQuestionForms(index, field, value) {
  setQuestionDirty(true);
  setQuestionForms((current) =>
    current.map((question, questionIndex) =>
      questionIndex === index
        ? {
            ...question,
            [field]: value
          }
        : question
    )
  );
}

function appendToQuestionFormFieldAt(index, fieldName, snippet) {
  setQuestionDirty(true);
  setQuestionForms((current) =>
    current.map((question, questionIndex) => {
      if (questionIndex !== index) return question;

      const oldContent = String(question[fieldName] || '').trimEnd();

      return {
        ...question,
        [fieldName]: oldContent ? `${oldContent}

${snippet}` : snippet
      };
    })
  );
}

function addQuestionForm() {
  setQuestionDirty(true);
  setQuestionForms((current) => {
    const nextOrder = current.length
      ? Math.max(...current.map((question) => Number(question.order || 0))) + 1
      : 1;

    return [
      ...current,
      {
        ...emptyQuestion,
        id: '',
        courseId: String(activeCourseId || ''),
        order: nextOrder,
        published: true
      }
    ];
  });
}

async function removeQuestionFormAt(index) {
  const target = questionForms[index];

  if (!target) return;

  const isSaved = selectedCourseQuestions.some(
    (question) => String(question.id) === String(target.id)
  );

  if (isSaved) {
    const confirmed = window.confirm(`Hapus soal nomor ${target.order || index + 1}?`);

    if (!confirmed) return;

    try {
      await removeRecord('questions', target.id);
      showToast('Soal berhasil dihapus.');
      setQuestionDirty(false);
      await reload();
    } catch (error) {
      showToast(error.message || 'Soal gagal dihapus.', 'error');
    }

    return;
  }

  setQuestionDirty(true);
  setQuestionForms((current) => {
    const nextForms = current.filter((_, questionIndex) => questionIndex !== index);

    if (nextForms.length) return nextForms;

    return [
      {
        ...emptyQuestion,
        courseId: String(activeCourseId || ''),
        order: 1,
        published: true
      }
    ];
  });
}

  function isBlank(value) {
  return !String(value || '').trim();
}

function asPositiveNumber(value, fallback = 0) {
  const number = Number(value);

  if (Number.isNaN(number)) return fallback;

  return number;
}

function validateCourseForm() {
  const stageId = String(courseForm.id || courseForm.stage || courseForm.order || '').trim();
  const minScore = asPositiveNumber(courseForm.minScore, 0);
  const xpReward = asPositiveNumber(courseForm.xpReward, 0);
  const coinReward = asPositiveNumber(courseForm.coinReward, 0);

  if (!stageId) {
    showToast('ID atau nomor stage wajib diisi.', 'error');
    return false;
  }

  if (isBlank(courseForm.title)) {
    showToast('Judul stage wajib diisi.', 'error');
    return false;
  }

  if (isBlank(courseForm.area)) {
    showToast('Area stage wajib diisi.', 'error');
    return false;
  }

  if (isBlank(courseForm.theme)) {
    showToast('Deskripsi stage wajib diisi.', 'error');
    return false;
  }

  if (minScore < 0 || minScore > 100) {
    showToast('Nilai minimal harus antara 0 sampai 100.', 'error');
    return false;
  }

  if (xpReward < 0) {
    showToast('XP reward tidak boleh minus.', 'error');
    return false;
  }

  if (coinReward < 0) {
    showToast('Koin reward tidak boleh minus.', 'error');
    return false;
  }

  if (courseForm.badgeRewardEnabled && isBlank(courseForm.badgeName)) {
    showToast('Nama badge wajib diisi kalau reward badge aktif.', 'error');
    return false;
  }

  if (courseForm.titleRewardEnabled && isBlank(courseForm.titleRewardName)) {
    showToast('Nama title wajib diisi kalau reward title aktif.', 'error');
    return false;
  }

  if (courseForm.hasChestReward && isBlank(courseForm.chestName)) {
    showToast('Nama chest wajib diisi kalau reward chest aktif.', 'error');
    return false;
  }

  return true;
}



function validateChallengeForm() {
  if (isBlank(challengeForm.title)) {
    showToast('Judul tantangan wajib diisi.', 'error');
    return false;
  }

  if (isBlank(challengeForm.description)) {
    showToast('Deskripsi tantangan wajib diisi.', 'error');
    return false;
  }

  if (asPositiveNumber(challengeForm.order, 0) < 1) {
    showToast('Urutan tantangan minimal 1.', 'error');
    return false;
  }

  if (challengeForm.startDate && challengeForm.endDate) {
    const startDate = new Date(challengeForm.startDate);
    const endDate = new Date(challengeForm.endDate);

    if (startDate > endDate) {
      showToast('Tanggal mulai tidak boleh lebih besar dari tanggal berakhir.', 'error');
      return false;
    }
  }

  if (challengeForm.rewardType === 'coins' && asPositiveNumber(challengeForm.rewardCoins, 0) < 1) {
    showToast('Reward koin minimal 1.', 'error');
    return false;
  }

  if (challengeForm.rewardType === 'xp' && asPositiveNumber(challengeForm.rewardXp, 0) < 1) {
    showToast('Reward XP minimal 1.', 'error');
    return false;
  }

  if (['badge', 'title', 'chest'].includes(challengeForm.rewardType) && isBlank(challengeForm.rewardName)) {
    showToast('Nama reward tantangan wajib diisi.', 'error');
    return false;
  }

  return true;
}

function validateRewardForm() {
  if (!['badge', 'title', 'chest'].includes(String(rewardForm.type || '').trim())) {
    showToast('Jenis reward harus badge, title, atau chest.', 'error');
    return false;
  }

  if (isBlank(rewardForm.name)) {
    showToast('Nama reward wajib diisi.', 'error');
    return false;
  }

  if (isBlank(rewardForm.icon)) {
    showToast('Icon reward wajib diisi.', 'error');
    return false;
  }

  if (!RARITY_LIST.includes(String(rewardForm.rarity || '').trim())) {
    showToast('Rarity reward tidak valid.', 'error');
    return false;
  }

  if (asPositiveNumber(rewardForm.order, 0) < 1) {
    showToast('Urutan reward minimal 1.', 'error');
    return false;
  }

  return true;
}

function validateAnnouncementForm() {
  if (isBlank(announcementForm.title)) {
    showToast('Judul pengumuman wajib diisi.', 'error');
    return false;
  }

  if (isBlank(announcementForm.message)) {
    showToast('Isi pengumuman wajib diisi.', 'error');
    return false;
  }

  if (asPositiveNumber(announcementForm.order, 0) < 1) {
    showToast('Urutan pengumuman minimal 1.', 'error');
    return false;
  }

  if (announcementForm.startDate && announcementForm.endDate) {
    const startDate = new Date(announcementForm.startDate);
    const endDate = new Date(announcementForm.endDate);

    if (startDate > endDate) {
      showToast('Tanggal mulai tidak boleh lebih besar dari tanggal berakhir.', 'error');
      return false;
    }
  }

  return true;
}

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
  try {
    if (status === 'rejected') {
      const confirmReject = confirmDangerAction({
        title: 'Hapus data anggota',
        message: `Tolak dan hapus data anggota "${member.name}"? Data yang sudah dihapus tidak bisa dikembalikan kecuali dari backup.`,
        confirmation: 'DELETE'
      });

      if (!confirmReject) return;

      await removeRecord('members', member.uid);
      showToast('Anggota ditolak dan data member dihapus.');
      await reload();
      await refreshMember();
      return;
    }

    await setMemberStatus(member, status);
    showToast('Anggota disetujui.');
    await reload();
    await refreshMember();
  } catch (error) {
    showToast(error.message || 'Gagal memproses anggota.', 'error');
  }
}

 

   async function handleGrantRewardToSelectedMember(event) {
  event.preventDefault();

  if (!selectedMember) return;

  const reward = selectedGrantReward;

  if (!reward) {
    showToast('Pilih reward terlebih dahulu.', 'error');
    return;
  }

  if (memberHasReward(selectedMember, reward)) {
    showToast('Member sudah memiliki reward ini.', 'error');
    return;
  }

  const confirmed = confirmDangerAction({
    title: 'Berikan reward manual',
    message: `Berikan reward "${reward.name || reward.title || reward.id}" ke "${selectedMember.name}"?`,
    confirmation: 'GIVE'
  });

  if (!confirmed) return;

  try {
    await grantMemberReward(selectedMember, reward);

    setMemberRewardGrantId('');
    showToast('Reward berhasil diberikan ke member.');
    await reload();
    await refreshMember();
  } catch (error) {
    console.error(error);
    showToast(error.message || 'Gagal memberikan reward ke member.', 'error');
  }
}

async function handleUpdateSelectedMemberStats(event) {
  event.preventDefault();

  if (!selectedMember) return;

  const confirmed = confirmDangerAction({
    title: 'Simpan stat member',
    message: `Simpan perubahan level, XP, dan koin untuk "${selectedMember.name}"?`,
    confirmation: 'UPDATE'
  });

  if (!confirmed) return;

  try {
    await updateMemberAdminStats(selectedMember, memberEditForm);

    showToast('Stat member berhasil diperbarui.');
    await reload();
    await refreshMember();
  } catch (error) {
    console.error(error);
    showToast(error.message || 'Gagal memperbarui stat member.', 'error');
  }
}

async function handleResetSelectedMemberProgress() {
  if (!selectedMember) return;

  const confirmed = confirmDangerAction({
    title: 'Reset progress member',
    message: `Reset progress belajar "${selectedMember.name}"? Level, XP, stage selesai, dan riwayat quiz akan direset.`,
    confirmation: 'RESET'
  });

  if (!confirmed) return;

  try {
    await resetMemberProgress(selectedMember);
    showToast('Progress member berhasil direset.');
    await reload();
    await refreshMember();
  } catch (error) {
    console.error(error);
    showToast(error.message || 'Gagal reset progress member.', 'error');
  }
}

async function handleResetSelectedMemberRewards() {
  if (!selectedMember) return;

  const confirmed = confirmDangerAction({
    title: 'Reset reward member',
    message: `Reset semua reward "${selectedMember.name}"? Badge, title, chest, dan reward aktif akan dihapus.`,
    confirmation: 'RESET'
  });

  if (!confirmed) return;

  try {
    await resetMemberRewards(selectedMember);
    showToast('Reward member berhasil direset.');
    await reload();
    await refreshMember();
  } catch (error) {
    console.error(error);
    showToast(error.message || 'Gagal reset reward member.', 'error');
  }
}

async function handleResetSelectedMemberEconomy() {
  if (!selectedMember) return;

  const confirmed = confirmDangerAction({
    title: 'Reset ekonomi member',
    message: `Reset koin "${selectedMember.name}"? Saldo koin dan riwayat transaksi akan dihapus.`,
    confirmation: 'RESET'
  });

  if (!confirmed) return;

  try {
    await resetMemberEconomy(selectedMember);
    showToast('Koin member berhasil direset.');
    await reload();
    await refreshMember();
  } catch (error) {
    console.error(error);
    showToast(error.message || 'Gagal reset koin member.', 'error');
  }
}

async function handleResetSelectedMemberChallenges() {
  if (!selectedMember) return;

  const confirmed = confirmDangerAction({
    title: 'Reset tantangan member',
    message: `Reset data tantangan "${selectedMember.name}"? Submission dan challenge selesai akan dikosongkan.`,
    confirmation: 'RESET'
  });

  if (!confirmed) return;

  try {
    await resetMemberChallenges(selectedMember);
    showToast('Data tantangan member berhasil direset.');
    await reload();
    await refreshMember();
  } catch (error) {
    console.error(error);
    showToast(error.message || 'Gagal reset tantangan member.', 'error');
  }
}

async function handleCleanSelectedMemberData() {
  if (!selectedMember) return;

  const confirmed = confirmDangerAction({
    title: 'Bersihkan data member',
    message: `Bersihkan data "${selectedMember.name}"? Duplikat reward/stage akan dibersihkan dan angka negatif diperbaiki.`,
    confirmation: 'CLEAN'
  });

  if (!confirmed) return;

  try {
    await cleanMemberData(selectedMember);
    showToast('Data member berhasil dibersihkan.');
    await reload();
    await refreshMember();
  } catch (error) {
    console.error(error);
    showToast(error.message || 'Gagal membersihkan data member.', 'error');
  }
}


function getCourseFormId() {
  return String(courseForm.id || courseForm.stage || courseForm.order || activeCourseId || '').trim();
}

function validateSectionFormsForSave({ allowPartial = false } = {}) {
  if (!sectionForms.length || sectionForms.length !== FIXED_MATERIAL_SECTIONS.length) {
    showToast('Struktur materi belum lengkap. Muat ulang halaman lalu coba lagi.', 'error');
    return false;
  }

  const filledSections = sectionForms.filter((section) => {
    return !isBlank(section.content) || !isBlank(section.checkpoint);
  });

  if (allowPartial && !filledSections.length) {
    showToast('Belum ada isi materi yang bisa disimpan.', 'error');
    return false;
  }

  const sectionsToCheck = allowPartial ? filledSections : sectionForms;

  for (const section of sectionsToCheck) {
    if (isBlank(section.content)) {
      showToast(`Isi materi "${section.title}" wajib diisi sebelum disimpan.`, 'error');
      return false;
    }

    if (!allowPartial && isBlank(section.checkpoint)) {
      showToast(`Checkpoint "${section.title}" wajib diisi.`, 'error');
      return false;
    }
  }

  return true;
}

function validateQuestionFormsForSave() {
  if (!questionForms.length) {
    showToast('Minimal buat 1 soal quiz.', 'error');
    return false;
  }

  for (const [index, question] of questionForms.entries()) {
    const label = `Soal ${index + 1}`;

    if (isBlank(question.question)) {
      showToast(`${label}: pertanyaan wajib diisi.`, 'error');
      return false;
    }

    const options = [question.optionA, question.optionB, question.optionC, question.optionD];

    if (options.some((option) => isBlank(option))) {
      showToast(`${label}: pilihan A, B, C, dan D wajib diisi.`, 'error');
      return false;
    }

    if (![0, 1, 2, 3].includes(Number(question.correctIndex))) {
      showToast(`${label}: jawaban benar harus A, B, C, atau D.`, 'error');
      return false;
    }

    if (isBlank(question.explanation)) {
      showToast(`${label}: pembahasan jawaban wajib diisi.`, 'error');
      return false;
    }
  }

  return true;
}

async function saveCourseFormOnly({ forceDraftWhenIncomplete = false } = {}) {
  if (!validateCourseForm()) return null;

  const id = getCourseFormId();

  if (!id) {
    showToast('ID atau nomor stage wajib diisi.', 'error');
    return null;
  }

  const shouldSaveAsDraft = forceDraftWhenIncomplete && courseForm.published === true && !stageCompleteness.complete;
  const payload = {
    ...courseForm,
    id,
    published: shouldSaveAsDraft ? false : courseForm.published
  };

  await upsertCourse(payload);

  if (shouldSaveAsDraft) {
    setCourseForm((current) => ({
      ...current,
      published: false
    }));
  }

  return { id, savedAsDraft: shouldSaveAsDraft };
}

async function saveSectionFormsForCourse(courseId, { allowPartial = false } = {}) {
  if (!courseId) {
    showToast('Pilih stage terlebih dahulu.', 'error');
    return { saved: false, count: 0, sections: [] };
  }

  if (!validateSectionFormsForSave({ allowPartial })) {
    return { saved: false, count: 0, sections: [] };
  }

  const sectionsToSave = (allowPartial
    ? sectionForms.filter((section) => !isBlank(section.content) || !isBlank(section.checkpoint))
    : sectionForms
  );

  const savedSections = [];
  const savedLogicalSections = [];

  for (const section of sectionsToSave) {
    const template = FIXED_MATERIAL_SECTIONS.find(
      (item) => item.type === section.type || Number(item.order) === Number(section.order)
    );

    if (!template) {
      throw new Error(`Struktur materi "${section.title}" tidak valid.`);
    }

    const canonicalId = `section-${courseId}-${template.type}`;
    const targetIds = Array.from(new Set([
      String(section.id || '').trim(),
      String(section.canonicalId || '').trim(),
      canonicalId,
      ...findExistingSectionIdsForSave(contentData.courseSections, courseId, canonicalId, template)
    ].filter(Boolean)));

    console.info('[Konten Belajar] Target dokumen materi', {
      courseId: String(courseId),
      title: template.title,
      type: template.type,
      targetIds
    });

    let canonicalSaved = null;

    for (const targetId of targetIds) {
      const savedSection = await upsertCourseSection({
        ...section,
        id: targetId,
        canonicalId,
        courseId: String(courseId),
        order: template.order,
        type: template.type,
        title: template.title,
        code: '',
        checkpoint: section.checkpoint || template.defaultCheckpoint,
        published: section.published === true
      });

      savedSections.push(savedSection);

      if (targetId === canonicalId) {
        canonicalSaved = savedSection;
      }
    }

    savedLogicalSections.push(canonicalSaved || savedSections[savedSections.length - 1]);
  }

  return {
    saved: true,
    count: savedLogicalSections.length,
    sections: savedSections,
    logicalSections: savedLogicalSections
  };
}

async function saveQuestionFormsForCourse(courseId) {
  if (!courseId) {
    showToast('Pilih stage terlebih dahulu.', 'error');
    return false;
  }

  if (!validateQuestionFormsForSave()) return false;

  const timestamp = Date.now();

  await Promise.all(
    questionForms.map((question, index) =>
      upsertQuestion({
        ...question,
        id: question.id || `question-${courseId}-${timestamp}-${index + 1}`,
        courseId,
        order: index + 1,
        correctIndex: Number(question.correctIndex || 0),
        published: question.published === true
      })
    )
  );

  return true;
}

  async function handleCourseSubmit(event) {
    event.preventDefault();

    try {
      const result = await saveCourseFormOnly({ forceDraftWhenIncomplete: true });

      if (!result) return;

      showToast(result.savedAsDraft
        ? 'Info stage berhasil disimpan sebagai draft karena materi/soal belum lengkap. Materi dan soal di form tetap aman.'
        : 'Info stage berhasil disimpan. Materi dan soal di form tetap aman. Klik Simpan Stage Lengkap di bagian akhir untuk menyimpan semuanya.'
      );

      if (!selectedCourse || String(selectedCourse.id) !== String(result.id)) {
        setSelectedCourseId(result.id);
        await reload();
      }
    } catch (error) {
      showToast(error.message || 'Roadmap gagal disimpan.', 'error');
    }
  }

  function updateSectionForms(index, field, value) {
  setMaterialDirty(true);
  setSectionForms((current) =>
    current.map((section, sectionIndex) =>
      sectionIndex === index
        ? {
            ...section,
            [field]: value
          }
        : section
    )
  );
}

function appendToSectionContentAt(index, snippet) {
  setMaterialDirty(true);
  setSectionForms((current) =>
    current.map((section, sectionIndex) => {
      if (sectionIndex !== index) return section;

      return {
        ...section,
        content: `${section.content ? `${section.content}\n\n` : ''}${snippet}`
      };
    })
  );
}

async function handleAllSectionsSubmit(event) {
  event.preventDefault();

  if (savingMaterials) return;

  const courseId = String(selectedCourse?.id || activeCourseId || getCourseFormId() || '').trim();

  if (!courseId) {
    showToast('Pilih stage yang mau diedit, lalu coba simpan materi lagi.', 'error');
    return;
  }

  setSavingMaterials(true);

  try {
    console.info('[Konten Belajar] Simpan materi dimulai', {
      courseId,
      totalForms: sectionForms.length,
      filledForms: sectionForms.filter((section) => !isBlank(section.content) || !isBlank(section.checkpoint)).length
    });

    const result = await saveSectionFormsForCourse(courseId, { allowPartial: true });

    if (!result.saved) return;

    const savedSectionIds = new Set(result.sections.map((section) => String(section.id)));

    setContentData((current) => ({
      ...current,
      courseSections: [
        ...current.courseSections.filter((section) => !savedSectionIds.has(String(section.id))),
        ...result.sections
      ]
    }));

    const keepQuestionDraft = questionDirty;
    sectionFormsCourseRef.current = String(courseId);
    setSelectedCourseId(courseId);
    setMaterialDirty(false);

    if (keepQuestionDraft) {
      writeLearningDraft(courseId, {
        materialDirty: false,
        questionDirty: true,
        sectionForms,
        questionForms
      });
    } else {
      removeLearningDraft(courseId);
    }

    showToast(`${result.count} materi berhasil disimpan ke Stage ${courseId}.`);
    await reload();
  } catch (error) {
    console.error('[Konten Belajar] Gagal menyimpan materi:', error);
    const code = String(error?.code || '');
    const message = code.includes('permission') || String(error?.message || '').toLowerCase().includes('permission')
      ? 'Gagal menyimpan materi karena akun ini belum diizinkan write oleh Firestore Rules. Pastikan login admin benar dan rules terbaru sudah dipublish.'
      : (error.message || 'Gagal menyimpan semua materi.');
    showToast(message, 'error');
  } finally {
    setSavingMaterials(false);
  }
}


async function handleAllQuestionsSubmit(event) {
  event.preventDefault();

  if (savingQuestions) return;

  const courseId = String(selectedCourse?.id || activeCourseId || getCourseFormId() || '').trim();

  if (!courseId) {
    showToast('Pilih stage yang mau diedit, lalu coba simpan soal lagi.', 'error');
    return;
  }

  setSavingQuestions(true);

  try {
    const saved = await saveQuestionFormsForCourse(courseId);

    if (!saved) return;

    const keepMaterialDraft = materialDirty;
    questionFormsCourseRef.current = String(courseId);
    setSelectedCourseId(courseId);
    setQuestionDirty(false);

    if (keepMaterialDraft) {
      writeLearningDraft(courseId, {
        materialDirty: true,
        questionDirty: false,
        sectionForms,
        questionForms
      });
    } else {
      removeLearningDraft(courseId);
    }

    showToast(`Semua soal berhasil disimpan ke Stage ${courseId}.`);
    await reload();
  } catch (error) {
    console.error('[Konten Belajar] Gagal menyimpan soal:', error);
    showToast(error.message || 'Gagal menyimpan semua soal.', 'error');
  } finally {
    setSavingQuestions(false);
  }
}

async function handleCompleteStageSave() {
  if (savingCompleteStage) return;

  if (!validateCourseForm()) return;
  if (!validateSectionFormsForSave()) return;
  if (!validateQuestionFormsForSave()) return;

  const xpReward = Number(courseForm.xpReward || 0);
  const coinReward = Number(courseForm.coinReward || 0);

  if (xpReward <= 0 || coinReward <= 0) {
    showToast('XP dan koin reward wajib lebih dari 0 sebelum stage disimpan lengkap.', 'error');
    return;
  }

  setSavingCompleteStage(true);

  try {
    const result = await saveCourseFormOnly();

    if (!result) return;

    const courseId = result.id;

    await saveSectionFormsForCourse(courseId);
    await saveQuestionFormsForCourse(courseId);

    sectionFormsCourseRef.current = String(courseId);
    questionFormsCourseRef.current = String(courseId);
    setMaterialDirty(false);
    setQuestionDirty(false);
    removeLearningDraft(courseId);
    setSelectedCourseId(courseId);
    showToast('Stage lengkap berhasil disimpan: info stage, 6 materi, dan semua soal quiz sudah aman.');
    await reload();
  } catch (error) {
    showToast(error.message || 'Gagal menyimpan stage lengkap.', 'error');
  } finally {
    setSavingCompleteStage(false);
  }
}

async function handleAnnouncementSubmit(event) {
  event.preventDefault();

  if (!validateAnnouncementForm()) return;

  try {
    await upsertAnnouncement(announcementForm);

    setAnnouncementForm(emptyAnnouncement);
    showToast('Pengumuman berhasil disimpan.');
    await reload();
  } catch (error) {
    console.error(error);
    showToast(error.message || 'Pengumuman gagal disimpan.', 'error');
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

  function applyMasterRewardToCourse(type, rewardId) {
  const reward = masterRewards.find((item) => String(item.id) === String(rewardId));

  if (!reward) return;

  if (type === 'badge') {
    setCourseForm((current) => ({
      ...current,
      badgeRewardEnabled: true,
      badgeId: reward.id || '',
      badgeName: reward.name || reward.title || '',
      badgeDescription: reward.description || '',
      badgeIcon: reward.icon || '🏅',
      badgeRarity: reward.rarity || 'common'
    }));
  }

  if (type === 'title') {
    setCourseForm((current) => ({
      ...current,
      titleRewardEnabled: true,
      titleRewardId: reward.id || '',
      titleRewardName: reward.name || reward.title || '',
      titleRewardDescription: reward.description || '',
      titleRewardIcon: reward.icon || '🎖️',
      titleRewardRarity: reward.rarity || 'common'
    }));
  }

  if (type === 'chest') {
    setCourseForm((current) => ({
      ...current,
      hasChestReward: true,
      chestId: reward.id || '',
      chestName: reward.name || reward.title || '',
      chestDescription: reward.description || '',
      chestIcon: reward.icon || '🎁',
      chestRarity: reward.rarity || 'common'
    }));
  }
}

  function applyMasterRewardToChallenge(type, rewardId) {
  const reward = masterRewards.find((item) => String(item.id) === String(rewardId));

  if (!reward) return;

  setChallengeForm((current) => ({
    ...current,
    rewardType: type,
    rewardId: reward.id || '',
    rewardName: reward.name || reward.title || '',
    rewardDescription: reward.description || '',
    rewardIcon: reward.icon || (type === 'title' ? '🎖️' : type === 'chest' ? '🎁' : '🏅'),
    rewardRarity: reward.rarity || 'common'
  }));
}


  async function handleRewardSubmit(event) {
  event.preventDefault();

  if (!validateRewardForm()) return;

  try {
    await upsertReward(rewardForm);

    setRewardForm(emptyReward);
    showToast('Reward berhasil disimpan.');
    await reload();
  } catch (error) {
    console.error(error);
    showToast(error.message || 'Reward gagal disimpan.', 'error');
  }
}

function handleEditReward(reward) {
  setRewardForm({
    id: reward.id || '',
    type: reward.type || reward.category || 'badge',
    name: reward.name || reward.title || '',
    icon: reward.icon || '🏅',
    rarity: reward.rarity || 'common',
    description: reward.description || '',
    requirement: reward.requirement || '',
    published: reward.published !== false,
    order: Number(reward.order || 999)
  });

  setActiveTab('rewards');
}

async function handleDeleteReward(rewardId) {
  const confirmed = confirmDangerAction({
    title: 'Hapus reward',
    message: 'Reward akan dihapus dari master reward. Pastikan tidak sedang dipakai di stage aktif.',
    confirmation: 'DELETE'
  });

  if (!confirmed) return;

  try {
    await deleteReward(rewardId);

    showToast('Reward berhasil dihapus.');
    await reload();
  } catch (error) {
    console.error(error);
    showToast(error.message || 'Reward gagal dihapus.', 'error');
  }
}

  async function handleChallengeSubmit(event) {
  event.preventDefault();

  if (!validateChallengeForm()) return;

  try {
    await upsertChallenge({
      ...challengeForm,
      id: challengeForm.id || `challenge-${Date.now()}`
    });

    setChallengeForm(emptyChallenge);
    showToast('Tantangan berhasil disimpan.');
    await reload();
  } catch (error) {
    console.error(error);
    showToast(error.message || 'Tantangan gagal disimpan.', 'error');
  }
}

function getChallengeTitle(challengeId) {
  const challenge = (challengeData?.challenges || []).find(
    (item) => String(item.id) === String(challengeId)
  );

  return challenge?.title || challengeId || 'Tantangan';
}

function formatSubmissionDate(date) {
  if (!date) return '-';

  return new Date(date).toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
}

async function handleApproveChallengeSubmission(submission) {
  const ok = confirmDangerAction({
    title: 'Approve submission',
    message: `Approve submission dari ${submission.memberName || 'anggota'}? Reward akan langsung diberikan.`,
    confirmation: 'APPROVE'
  });

  if (!ok) return;

  try {
    await approveChallengeSubmission(submission);
    showToast('Submission disetujui dan reward berhasil diberikan.');
    await reload();
  } catch (error) {
    console.error(error);
    showToast(error.message || 'Gagal approve submission.', 'error');
  }
}

async function handleRejectChallengeSubmission(submission) {
  const ok = window.confirm(
    `Tolak submission dari ${submission.memberName || 'anggota'}?`
  );

  if (!ok) return;

  try {
    await rejectChallengeSubmission(submission);
    showToast('Submission tantangan ditolak.');
    await reload();
  } catch (error) {
    console.error(error);
    showToast(error.message || 'Gagal menolak submission.', 'error');
  }
}

async function handleResolveContentReport(report, status = 'resolved') {
  if (!report?.id) return;

  try {
    await resolveContentReport(report.id, status);
    showToast(status === 'resolved' ? 'Laporan ditandai selesai.' : 'Status laporan diperbarui.');
    await reload();
  } catch (error) {
    console.error(error);
    showToast(error.message || 'Gagal memperbarui laporan.', 'error');
  }
}


async function handleShopSubmit(event) {
  event.preventDefault();

  try {
    await upsertShopItem(shopForm);
    setShopForm(emptyShopItem);
    showToast('Item shop berhasil disimpan.');
    await reload();
  } catch (error) {
    showToast(error.message || 'Item shop gagal disimpan.', 'error');
  }
}

function handleEditShopItem(item) {
  setShopForm({
    id: item.id || '',
    type: item.type || 'avatar',
    name: item.name || item.title || '',
    icon: item.icon || '🧙',
    color: item.color || '',
    rarity: item.rarity || 'common',
    description: item.description || '',
    price: Number(item.price || 0),
    published: item.published !== false,
    order: Number(item.order || 999)
  });
  setActiveTab('shop');
}

async function handleDeleteShopItem(itemId) {
  const confirmed = confirmDangerAction({
    title: 'Arsipkan item shop',
    message: `Item shop ${itemId} akan diarsipkan dari toko. Data pembelian user lama tetap aman.`,
    confirmation: 'DELETE'
  });

  if (!confirmed) return;

  try {
    await deleteShopItem(itemId);
    showToast('Item shop berhasil diarsipkan.');
    await reload();
  } catch (error) {
    showToast(error.message || 'Gagal mengarsipkan item shop.', 'error');
  }
}

async function handleReviewFinalProject(submission, status) {
  const note = certificateReviewNotes[submission.id] || '';

  try {
    await reviewFinalProjectSubmission(submission, status, note);
    showToast(`Final Project ditandai ${status}.`);
    await reload();
  } catch (error) {
    showToast(error.message || 'Gagal review Final Project.', 'error');
  }
}

async function handleCertificateSettingsSubmit(event) {
  event.preventDefault();

  try {
    const nextSettings = await updateCertificateSettings(certificateSettings);
    setCertificateSettings(nextSettings);
    showToast('Pengaturan sertifikat disimpan.');
    await reload();
  } catch (error) {
    showToast(error.message || 'Gagal menyimpan pengaturan sertifikat.', 'error');
  }
}

async function handleIssueCertificate(member) {
  const confirmed = confirmDangerAction({
    title: 'Terbitkan sertifikat',
    message: `Terbitkan sertifikat untuk ${member.name}? Pastikan Final Project sudah benar-benar approved.`,
    confirmation: 'APPROVE'
  });

  if (!confirmed) return;

  try {
    await issueCertificate(member, certificateSettings);
    showToast('Sertifikat berhasil diterbitkan.');
    await reload();
  } catch (error) {
    showToast(error.message || 'Gagal menerbitkan sertifikat.', 'error');
  }
}

async function handleRevokeCertificate(certificate) {
  const reason = window.prompt('Alasan revoke sertifikat:', 'Data perlu diperbaiki');
  if (reason === null) return;

  const confirmed = confirmDangerAction({
    title: 'Revoke sertifikat',
    message: `Batalkan sertifikat ${certificate.code || certificate.id}?`,
    confirmation: 'DELETE'
  });

  if (!confirmed) return;

  try {
    await revokeCertificate(certificate, reason);
    showToast('Sertifikat berhasil dibatalkan.');
    await reload();
  } catch (error) {
    showToast(error.message || 'Gagal revoke sertifikat.', 'error');
  }
}

async function handleRepairAllMembers() {
  const confirmed = confirmDangerAction({
    title: 'Perbaiki data lama',
    message: 'Sistem akan membersihkan field member lama, menghapus duplikat reward, dan menambahkan default field aman.',
    confirmation: 'CLEAN'
  });

  if (!confirmed) return;

  try {
    const count = await repairAllMembersData(allMembers);
    showToast(`${count} data member diproses.`);
    await reload();
  } catch (error) {
    showToast(error.message || 'Gagal memperbaiki data member.', 'error');
  }
}

async function handleExportLearningContent() {
  const content = await exportLearningContent();
  downloadTextFile('study-group-coding-learning-content.json', content);
  showToast('Konten belajar berhasil diexport.');
}

async function handleImportLearningContent(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const confirmed = confirmDangerAction({
    title: 'Import konten belajar',
    message: 'Data courses, courseSections, dan questions dengan ID sama akan ditimpa.',
    confirmation: 'RESTORE'
  });

  if (!confirmed) {
    event.target.value = '';
    return;
  }

  try {
    const text = await file.text();
    const count = await importLearningContent(text);
    showToast(`${count} dokumen konten berhasil diimport.`);
    await reload();
  } catch (error) {
    showToast(error.message || 'Import konten gagal.', 'error');
  } finally {
    event.target.value = '';
  }
}

async function handleMediaFileUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    showToast('Media manager saat ini hanya menerima gambar.', 'error');
    return;
  }

  if (file.size > 750000) {
    showToast('Ukuran gambar maksimal 750 KB.', 'error');
    return;
  }

  const dataUrl = await readImageAsDataUrl(file);
  setMediaForm({
    title: mediaForm.title || file.name.replace(/\.[^.]+$/, ''),
    dataUrl,
    fileName: file.name,
    mimeType: file.type,
    size: file.size
  });
}

async function handleMediaSubmit(event) {
  event.preventDefault();

  try {
    await upsertMediaAsset(mediaForm);
    setMediaForm({ title: '', dataUrl: '', fileName: '', mimeType: '', size: 0 });
    showToast('Media berhasil disimpan.');
    await reload();
  } catch (error) {
    showToast(error.message || 'Gagal menyimpan media.', 'error');
  }
}

async function handleDeleteMedia(assetId) {
  const confirmed = confirmDangerAction({
    title: 'Hapus media',
    message: 'Media yang tersimpan di manager akan dihapus.',
    confirmation: 'DELETE'
  });

  if (!confirmed) return;

  try {
    await deleteMediaAsset(assetId);
    showToast('Media berhasil dihapus.');
    await reload();
  } catch (error) {
    showToast(error.message || 'Gagal menghapus media.', 'error');
  }
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
    const confirmed = confirmDangerAction({
      title: 'Hapus data',
      message: `Data ${collectionName}/${id} akan dihapus permanen dari koleksi.`,
      confirmation: 'DELETE'
    });

    if (!confirmed) {
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
  async function handleRestoreBackup(event) {
  const file = event.target.files?.[0];

  if (!file) return;

  const confirmed = confirmDangerAction({
    title: 'Restore backup JSON',
    message: 'Data dengan ID yang sama akan ditimpa oleh isi backup. Pastikan file backup benar dan sudah membuat backup terbaru sebelum restore.',
    confirmation: 'RESTORE'
  });

  if (!confirmed) {
    event.target.value = '';
    return;
  }

  try {
    const text = await file.text();
    const count = await restoreBackupData(text);

    showToast(`Restore berhasil. ${count} dokumen diproses.`);
    await reload();
  } catch (error) {
    console.error(error);
    showToast(error.message || 'Restore backup gagal.', 'error');
  } finally {
    event.target.value = '';
  }
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
              <li>{adminAnalytics.openReports} laporan materi/soal masih terbuka.</li>
              <li>{adminAnalytics.pendingChallengeSubmissions} submission challenge menunggu review.</li>
              <li>Rata-rata nilai quiz: {adminAnalytics.averageQuizScore || 0} dari {adminAnalytics.quizAttempts} attempt.</li>
            </ul>
          </PixelCard>
        </section>
      ) : null}



      {activeTab === 'members' ? (
  <>
    <section className="member-filter-panel">
      <div>
        <p className="eyebrow">Filter Anggota</p>
        <h2>Cari dan Saring Member</h2>
        <p>
          Total {allMembers.length} anggota, tampil {filteredMembers.length} anggota.
        </p>
      </div>

      <div className="member-filter-grid">
  <label className="form-field">
    <span>Cari Nama / NIM / Letting</span>
    <input
      type="text"
      placeholder="Contoh: Syamil, 230..., 2024"
      value={memberSearch}
      onChange={(e) => setMemberSearch(e.target.value)}
    />
  </label>

  <label className="form-field">
    <span>Status</span>
    <select
      value={memberStatusFilter}
      onChange={(e) => setMemberStatusFilter(e.target.value)}
    >
      <option value="all">Semua Status</option>
      <option value="pending">Pending</option>
      <option value="approved">Approved</option>
      <option value="rejected">Rejected</option>
    </select>
  </label>

  <label className="form-field">
    <span>Letting</span>
    <select
      value={memberCohortFilter}
      onChange={(e) => setMemberCohortFilter(e.target.value)}
    >
      <option value="all">Semua Letting</option>

      {memberCohortOptions.map((cohort) => (
        <option key={cohort} value={cohort}>
          Letting {cohort}
        </option>
      ))}
    </select>
  </label>

  <button
    className="member-filter-reset"
    type="button"
    onClick={() => {
      setMemberSearch('');
      setMemberStatusFilter('all');
      setMemberCohortFilter('all');
    }}
  >
    Reset Filter
  </button>
</div>
    </section>

    <section className="card-grid">
      {filteredMembers.length ? filteredMembers.map((member) => (
        <PixelCard className="member-card" key={member.uid}>
          <h3>{member.avatar} {member.name}</h3>
          <p>{member.nim} · Letting {member.cohort || '-'}</p>

          <span className={`status-pill ${member.status || 'pending'}`}>
            {member.status || 'pending'}
          </span>

          <div className="member-mini-stats">
            <span>Level {member.level || 1}</span>
            <span>{Number(member.xp || 0)}/{Number(member.xpToNextLevel || 100)} XP</span>
            <span>{Number(member.coins || 0)} koin</span>
          </div>

          <div className="member-actions">
            <PixelButton
              type="button"
              variant="secondary"
              onClick={() => setSelectedMemberId(member.uid || member.id)}
            >
              Detail
            </PixelButton>

            <PixelButton
              type="button"
              onClick={() => handleApprove(member, 'approved')}
            >
              Setujui
            </PixelButton>

            <PixelButton
              type="button"
              variant="secondary"
              onClick={() => handleApprove(member, 'rejected')}
            >
              Tolak
            </PixelButton>
          </div>
        </PixelCard>
      )) : (
        <PixelCard>
          Tidak ada anggota yang cocok dengan filter.
        </PixelCard>
      )}
    </section>

    {selectedMember ? (
      <section className="admin-member-detail-section">
        <PixelCard className="admin-member-detail-card">
          <div className="section-title-row">
            <div>
              <p className="eyebrow">Detail Progress Member</p>
              <h2>{selectedMember.avatar} {selectedMember.name}</h2>
              <p>{selectedMember.nim} · Letting {selectedMember.cohort || '-'}</p>
            </div>

            <PixelButton
              type="button"
              variant="secondary"
              onClick={() => setSelectedMemberId('')}
            >
              Tutup Detail
            </PixelButton>
          </div>

          <div className="member-detail-stats">
            <div>
              <strong>{selectedMember.level || 1}</strong>
              <span>Level</span>
            </div>

            <div>
              <strong>{Number(selectedMember.xp || 0)}/{Number(selectedMember.xpToNextLevel || 100)}</strong>
              <span>XP Sekarang</span>
            </div>

            <div>
              <strong>{Number(selectedMember.totalXp || 0)}</strong>
              <span>Total XP</span>
            </div>

            <div>
              <strong>{Number(selectedMember.coins || 0)}</strong>
              <span>Koin</span>
            </div>

            <div>
              <strong>{(selectedMember.completedCourses || []).length}</strong>
              <span>Course Selesai</span>
            </div>

            <div>
              <strong>{(selectedMember.completedChallenges || []).length}</strong>
              <span>Challenge Selesai</span>
            </div>
          </div>


          <form className="member-admin-edit-form" onSubmit={handleUpdateSelectedMemberStats}>
  <div>
    <p className="eyebrow">Edit Manual Admin</p>
    <h3>Koreksi Level, XP, dan Koin</h3>
    <p>Gunakan kalau XP/koin/level member perlu dikoreksi tanpa reset total.</p>
  </div>

  <div className="member-admin-edit-grid">
    <label className="form-field">
      <span>Level</span>
      <input
        type="number"
        min="1"
        value={memberEditForm.level}
        onChange={(e) =>
          setMemberEditForm({
            ...memberEditForm,
            level: e.target.value
          })
        }
      />
    </label>

    <label className="form-field">
      <span>XP Sekarang</span>
      <input
        type="number"
        min="0"
        value={memberEditForm.xp}
        onChange={(e) =>
          setMemberEditForm({
            ...memberEditForm,
            xp: e.target.value
          })
        }
      />
    </label>

    <label className="form-field">
      <span>XP ke Level Berikutnya</span>
      <input
        type="number"
        min="100"
        value={memberEditForm.xpToNextLevel}
        onChange={(e) =>
          setMemberEditForm({
            ...memberEditForm,
            xpToNextLevel: e.target.value
          })
        }
      />
    </label>

    <label className="form-field">
      <span>Total XP</span>
      <input
        type="number"
        min="0"
        value={memberEditForm.totalXp}
        onChange={(e) =>
          setMemberEditForm({
            ...memberEditForm,
            totalXp: e.target.value
          })
        }
      />
    </label>

    <label className="form-field">
      <span>Koin</span>
      <input
        type="number"
        min="0"
        value={memberEditForm.coins}
        onChange={(e) =>
          setMemberEditForm({
            ...memberEditForm,
            coins: e.target.value
          })
        }
      />
    </label>
  </div>

  <div className="member-actions">
    <PixelButton type="submit">
      Simpan Stat Member
    </PixelButton>

    <PixelButton
      type="button"
      variant="secondary"
      onClick={() =>
        setMemberEditForm({
          level: Number(selectedMember.level || 1),
          xp: Number(selectedMember.xp || 0),
          xpToNextLevel: Number(selectedMember.xpToNextLevel || 100),
          totalXp: Number(selectedMember.totalXp || 0),
          coins: Number(selectedMember.coins || 0)
        })
      }
    >
      Batalkan Perubahan
    </PixelButton>
  </div>
</form>

          <form className="member-grant-reward-form" onSubmit={handleGrantRewardToSelectedMember}>
  <div>
    <p className="eyebrow">Reward Manual Admin</p>
    <h3>Berikan Badge, Title, atau Chest</h3>
    <p>
      Pilih reward dari Reward Master, lalu berikan langsung ke member ini.
    </p>
  </div>

  <div className="member-grant-reward-row">
    <label className="form-field">
      <span>Pilih Reward</span>
      <select
        value={memberRewardGrantId}
        onChange={(e) => setMemberRewardGrantId(e.target.value)}
      >
        <option value="">Pilih reward master</option>

        {masterRewards.map((reward) => {
  const alreadyOwned = memberHasReward(selectedMember, reward);

  return (
    <option key={reward.id} value={reward.id}>
      {reward.icon || '🎁'} {reward.name || reward.title || reward.id} · {reward.type || reward.category} · {getRarityLabel(reward.rarity)}
      {alreadyOwned ? ' · Sudah dimiliki' : ''}
    </option>
  );
})}
      </select>
    </label>

    <PixelButton
  type="submit"
  disabled={!memberRewardGrantId || selectedMemberAlreadyHasReward}
>
  {selectedMemberAlreadyHasReward ? 'Sudah Dimiliki' : 'Berikan Reward'}
</PixelButton>
  </div>

  {selectedGrantReward ? (
  <div className={selectedMemberAlreadyHasReward ? 'member-grant-preview already-owned' : 'member-grant-preview'}>
    <strong>
      {selectedGrantReward.icon || '🎁'} {selectedGrantReward.name || selectedGrantReward.title || selectedGrantReward.id}
    </strong>

    <span className={`admin-rarity-pill ${getRarityClassName(selectedGrantReward.rarity)}`}>
      {getRarityLabel(selectedGrantReward.rarity)}
    </span>

    <span className="member-grant-type">
      {selectedGrantReward.type || selectedGrantReward.category}
    </span>

    {selectedMemberAlreadyHasReward ? (
      <span className="member-owned-warning">
        Sudah dimiliki member
      </span>
    ) : null}

    <p>{selectedGrantReward.description || 'Tidak ada deskripsi.'}</p>
  </div>
) : null}
</form>

          <div className="member-detail-grid">
            <div className="member-detail-box">
              <h3>Progress Stage</h3>

              <div className="member-stage-list">
                {sortedCourses.length ? sortedCourses.map((course) => {
                  const completed = isMemberCompletedCourse(selectedMember, course);
                  const progress = getMemberCourseProgress(selectedMember, course);

                  return (
                    <div
                      className={completed ? 'member-stage-row done' : 'member-stage-row'}
                      key={course.id}
                    >
                      <div>
                        <strong>Stage {course.stage || course.order}: {course.title}</strong>
                        <p>
                          {completed ? 'Selesai' : 'Belum selesai'}
                          {progress?.score ? ` · Nilai ${progress.score}` : ''}
                          {progress?.bestScore ? ` · Nilai terbaik ${progress.bestScore}` : ''}
                        </p>
                      </div>

                      <span>{completed ? '✅' : '⏳'}</span>
                    </div>
                  );
                }) : (
                  <p>Belum ada stage.</p>
                )}
              </div>
            </div>

            <div className="member-detail-box">
              <h3>Riwayat Quiz</h3>

              <div className="member-history-list">
                {(selectedMember.quizHistory || []).length ? (
                  [...(selectedMember.quizHistory || [])]
                    .reverse()
                    .slice(0, 8)
                    .map((history, index) => (
                      <div className="member-history-row" key={`${history.courseId || index}-${index}`}>
                        <strong>
                          Stage {history.courseId || history.stage || '-'}
                        </strong>

                        <p>
                          Nilai: {history.score ?? '-'}
                          {history.passed !== undefined ? ` · ${history.passed ? 'Lulus' : 'Belum lulus'}` : ''}
                        </p>

                        <small>
                          {formatAdminDate(history.createdAt || history.date || history.completedAt)}
                        </small>
                      </div>
                    ))
                ) : (
                  <p>Belum ada riwayat quiz.</p>
                )}
              </div>
            </div>

            <div className="member-detail-box">
              <h3>Reward Dimiliki</h3>

              <div className="member-reward-list">
                <div>
                  <strong>Badge</strong>
                  {(selectedMember.badges || selectedMember.ownedBadges || []).length ? (
                    <div className="member-chip-list">
                      {[
                        ...(selectedMember.badges || []),
                        ...(selectedMember.ownedBadges || [])
                      ].map((badgeId) => (
                        <span className="member-chip" key={badgeId}>
                          {getRewardLabel(badgeId, '🏅')}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p>Belum punya badge.</p>
                  )}
                </div>

                <div>
                  <strong>Title</strong>
                  {(selectedMember.titles || selectedMember.ownedTitles || []).length ? (
                    <div className="member-chip-list">
                      {[
                        ...(selectedMember.titles || []),
                        ...(selectedMember.ownedTitles || [])
                      ].map((titleId) => (
                        <span className="member-chip" key={titleId}>
                          {getRewardLabel(titleId, '🎖️')}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p>Belum punya title.</p>
                  )}
                </div>

                <div>
                  <strong>Chest Belum Dibuka</strong>
                  {(selectedMember.unopenedChests || []).length ? (
                    <div className="member-chip-list">
                      {(selectedMember.unopenedChests || []).map((chestId) => (
                        <span className="member-chip" key={chestId}>
                          {getRewardLabel(chestId, '🎁')}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p>Tidak ada chest.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="member-detail-box">
              <h3>Tantangan</h3>

              <div className="member-history-list">
                {(selectedMember.completedChallenges || []).length ? (
                  (selectedMember.completedChallenges || []).map((challengeId) => (
                    <div className="member-history-row" key={challengeId}>
                      <strong>{getChallengeTitle(challengeId)}</strong>
                      <p>Selesai</p>
                    </div>
                  ))
                ) : (
                  <p>Belum ada tantangan selesai.</p>
                )}
              </div>
            </div>
          </div>
          <div className="member-danger-zone">
  <div>
    <p className="eyebrow">Zona Reset Admin</p>
    <h3>Reset / Bersihkan Data Member</h3>
    <p>
      Gunakan hanya kalau data member error, reward dobel, XP salah,
      atau ingin mengulang progress member tertentu.
    </p>
  </div>

  <div className="member-danger-actions">
    <PixelButton
      type="button"
      variant="secondary"
      onClick={handleCleanSelectedMemberData}
    >
      Bersihkan Data
    </PixelButton>

    <PixelButton
      type="button"
      variant="secondary"
      onClick={handleResetSelectedMemberProgress}
    >
      Reset Progress
    </PixelButton>

    <PixelButton
      type="button"
      variant="secondary"
      onClick={handleResetSelectedMemberRewards}
    >
      Reset Reward
    </PixelButton>

    <PixelButton
      type="button"
      variant="secondary"
      onClick={handleResetSelectedMemberEconomy}
    >
      Reset Koin
    </PixelButton>

    <PixelButton
      type="button"
      variant="danger"
      onClick={handleResetSelectedMemberChallenges}
    >
      Reset Tantangan
    </PixelButton>
  </div>
</div>
        </PixelCard>
      </section>
    ) : null}
  </>
) : null}


      
  {activeTab === 'learning-content' ? (
    <section className="learning-admin-layout">
      <PixelCard className="stage-sidebar">
        <h2>Daftar Stage</h2>
        <p>Pilih stage yang ingin dikelola.</p>

        <div className="stage-list">
          {sortedCourses.length ? sortedCourses.map((course) => (
            <button
              className={String(activeCourseId) === String(course.id) ? 'stage-list-button active' : 'stage-list-button'}
              key={course.id}
              type="button"
              onClick={() => setSelectedCourseId(course.id)}
            >
              <strong>Stage {course.stage || course.order}</strong>
              <span>{course.title}</span>
            </button>
          )) : (
            <p>Belum ada stage. Buat stage dari data roadmap lama dulu.</p>
          )}
        </div>
      </PixelCard>

      <PixelCard className="stage-editor">
        {selectedCourse ? (
          <>
            <div className="stage-editor-head">
              <div>
                <p className="eyebrow">Konten Belajar</p>
                <h2>Stage {selectedCourse.stage}: {selectedCourse.title}</h2>
                <p>{selectedCourse.area || 'Belum ada area.'}</p>
              </div>

              <span className="status-pill">
                {selectedCourse.published ? 'Published' : 'Draft'}
              </span>
            </div>

            <div className="learning-admin-summary">
              <div>
                <strong>{selectedCourseSections.length}</strong>
                <span>Materi</span>
              </div>
              <div>
                <strong>{selectedCourseQuestions.length}</strong>
                <span>Soal</span>
              </div>
              <div>
                <strong>{selectedCourse.minScore || 0}</strong>
                <span>Nilai Minimal</span>
              </div>
              <div>
                <strong>{selectedCourse.xpReward || 0}</strong>
                <span>XP</span>
              </div>
              <div>
                <strong>{selectedCourse.coinReward || 0}</strong>
                <span>Koin</span>
              </div>
            </div>

            {draftNotice ? (
              <div className="admin-save-alert">
                <strong>Draft lokal aktif</strong>
                <p>{draftNotice}</p>
                <button type="button" onClick={() => setDraftNotice('')}>Tutup</button>
              </div>
            ) : null}

            <div className="content-editor-section">
  <div className="section-title-row">
    <h3>Edit Stage</h3>
    <span>Roadmap</span>
  </div>

  <form className="form-stack" onSubmit={handleCourseSubmit}>
    <div className="form-row">
      <input
        required
        min="1"
        placeholder="Stage"
        type="number"
        value={courseForm.stage}
        onChange={(e) =>
          setCourseForm({
            ...courseForm,
            stage: e.target.value,
            order: e.target.value,
            id: String(e.target.value)
          })
        }
      />

      <input
        required
        min="1"
        placeholder="Urutan"
        type="number"
        value={courseForm.order}
        onChange={(e) => setCourseForm({ ...courseForm, order: e.target.value })}
      />
    </div>

    <input
      required
      placeholder="Judul stage"
      value={courseForm.title}
      onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
    />

    <input
      required
      placeholder="Area, contoh: Dasar Logika Program"
      value={courseForm.area}
      onChange={(e) => setCourseForm({ ...courseForm, area: e.target.value })}
    />

    <textarea
      required
      className="large-textarea"
      placeholder="Deskripsi singkat stage"
      value={courseForm.theme}
      onChange={(e) => setCourseForm({ ...courseForm, theme: e.target.value })}
    />
    <div className="form-row">
      <input
        required
        min="0"
        max="100"
        type="number"
        placeholder="Nilai minimal"
        value={courseForm.minScore}
        onChange={(e) => setCourseForm({ ...courseForm, minScore: e.target.value })}
      />

      <input
        required
        min="0"
        type="number"
        placeholder="XP reward"
        value={courseForm.xpReward}
        onChange={(e) => setCourseForm({ ...courseForm, xpReward: e.target.value })}
      />

      <input
        required
        min="0"
        type="number"
        placeholder="Koin reward"
        value={courseForm.coinReward}
        onChange={(e) => setCourseForm({ ...courseForm, coinReward: e.target.value })}
      />
    </div>

    <div className="content-editor-section reward-admin-box">
      <div className="section-title-row">
        <h3>Reward Stage dari Admin</h3>
        <span>Badge / Title / Chest</span>
      </div>

      <label className="check-line">
        <input
          type="checkbox"
          checked={courseForm.badgeRewardEnabled}
          onChange={(e) => setCourseForm({ ...courseForm, badgeRewardEnabled: e.target.checked })}
        />
        Beri badge saat stage lulus
      </label>

      {courseForm.badgeRewardEnabled ? (
        <>
        <label className="form-field">
  <span>Pilih Badge dari Reward Master</span>
  <select
    value={courseForm.badgeId}
    onChange={(e) => applyMasterRewardToCourse('badge', e.target.value)}
  >
    <option value="">Pilih badge master</option>

    {badgeRewards.map((reward) => (
      <option key={reward.id} value={reward.id}>
        {reward.icon || '🏅'} {reward.name || reward.title} · {getRarityLabel(reward.rarity)}
      </option>
    ))}
  </select>
  <small>Kalau dipilih, nama, deskripsi, icon, dan rarity badge otomatis terisi.</small>
</label>

          <label className="form-field">
            <span>Nama Badge</span>
            <input
              required
              placeholder="Contoh: Syntax Initiate"
              value={courseForm.badgeName}
              onChange={(e) => setCourseForm({ ...courseForm, badgeName: e.target.value })}
            />
            <small>Nama badge ini yang tampil di profil. Admin bebas bikin nama keren.</small>
          </label>

          <label className="form-field">
            <span>ID Badge</span>
            <input
              placeholder="Opsional, kosongkan boleh"
              value={courseForm.badgeId}
              onChange={(e) => setCourseForm({ ...courseForm, badgeId: e.target.value })}
            />
            <small>Kalau kosong, sistem membuat ID dari nama badge. Yang penting nama tampil tetap dari admin.</small>
          </label>

          <label className="form-field">
            <span>Deskripsi Badge</span>
            <textarea
              placeholder="Contoh: Diberikan kepada anggota yang menaklukkan dasar HTML."
              value={courseForm.badgeDescription}
              onChange={(e) => setCourseForm({ ...courseForm, badgeDescription: e.target.value })}
            />
          </label>

          <div className="form-row">
            <label className="form-field">
              <span>Icon Badge</span>
              <input
                placeholder="Contoh: 🏅"
                value={courseForm.badgeIcon}
                onChange={(e) => setCourseForm({ ...courseForm, badgeIcon: e.target.value })}
              />
            </label>

            <label className="form-field">
              <span>Rarity Badge</span>
              <select
                value={courseForm.badgeRarity}
                onChange={(e) => setCourseForm({ ...courseForm, badgeRarity: e.target.value })}
              >
                <option value="common">Biasa / Putih</option>
                <option value="uncommon">Tidak Biasa / Abu-abu</option>
                <option value="rare">Rare / Dongker</option>
                <option value="epic">Epic / Kuning</option>
                <option value="mythic">Mythic / Merah</option>
              </select>
            </label>
          </div>
        </>
      ) : null}

      <label className="check-line">
        <input
          type="checkbox"
          checked={courseForm.titleRewardEnabled}
          onChange={(e) => setCourseForm({ ...courseForm, titleRewardEnabled: e.target.checked })}
        />
        Beri title saat stage lulus
      </label>

      {courseForm.titleRewardEnabled ? (
        <>
        <label className="form-field">
  <span>Pilih Title dari Reward Master</span>
  <select
    value={courseForm.titleRewardId}
    onChange={(e) => applyMasterRewardToCourse('title', e.target.value)}
  >
    <option value="">Pilih title master</option>

    {titleRewards.map((reward) => (
      <option key={reward.id} value={reward.id}>
        {reward.icon || '🎖️'} {reward.name || reward.title} · {getRarityLabel(reward.rarity)}
      </option>
    ))}
  </select>
  <small>Kalau dipilih, nama, deskripsi, icon, dan rarity title otomatis terisi.</small>
</label>

          <label className="form-field">
            <span>Nama Title</span>
            <input
              required
              placeholder="Contoh: Pixel Apprentice"
              value={courseForm.titleRewardName}
              onChange={(e) => setCourseForm({ ...courseForm, titleRewardName: e.target.value })}
            />
          </label>

          <label className="form-field">
            <span>ID Title</span>
            <input
              placeholder="Opsional, kosongkan boleh"
              value={courseForm.titleRewardId}
              onChange={(e) => setCourseForm({ ...courseForm, titleRewardId: e.target.value })}
            />
          </label>

          <label className="form-field">
            <span>Deskripsi Title</span>
            <textarea
              placeholder="Contoh: Title untuk anggota yang mulai paham struktur coding."
              value={courseForm.titleRewardDescription}
              onChange={(e) => setCourseForm({ ...courseForm, titleRewardDescription: e.target.value })}
            />
          </label>

          <div className="form-row">
            <label className="form-field">
              <span>Icon Title</span>
              <input
                placeholder="Contoh: 🎖️"
                value={courseForm.titleRewardIcon}
                onChange={(e) => setCourseForm({ ...courseForm, titleRewardIcon: e.target.value })}
              />
            </label>

            <label className="form-field">
              <span>Rarity Title</span>
              <select
                value={courseForm.titleRewardRarity}
                onChange={(e) => setCourseForm({ ...courseForm, titleRewardRarity: e.target.value })}
              >
                <option value="common">Biasa / Putih</option>
                <option value="uncommon">Tidak Biasa / Abu-abu</option>
                <option value="rare">Rare / Dongker</option>
                <option value="epic">Epic / Kuning</option>
                <option value="mythic">Mythic / Merah</option>
              </select>
            </label>
          </div>
        </>
      ) : null}

      <label className="check-line">
        <input
          type="checkbox"
          checked={courseForm.hasChestReward}
          onChange={(e) => setCourseForm({ ...courseForm, hasChestReward: e.target.checked })}
        />
        Beri chest saat stage lulus
      </label>

      {courseForm.hasChestReward ? (
  <>
    <label className="form-field">
      <span>Pilih Chest dari Reward Master</span>
      <select
        value={courseForm.chestId}
        onChange={(e) => applyMasterRewardToCourse('chest', e.target.value)}
      >
        <option value="">Pilih chest master</option>

        {chestRewards.map((reward) => (
          <option key={reward.id} value={reward.id}>
            {reward.icon || '🎁'} {reward.name || reward.title} · {getRarityLabel(reward.rarity)}
          </option>
        ))}
      </select>
      <small>Kalau dipilih, nama, deskripsi, icon, dan rarity chest otomatis terisi.</small>
    </label>

    <div className="form-row">
          <label className="form-field">
            <span>Nama Chest</span>
            <input
              placeholder="Contoh: Syntax Chest"
              value={courseForm.chestName}
              onChange={(e) => setCourseForm({ ...courseForm, chestName: e.target.value })}
            />
          </label>

          <label className="form-field">
            <span>Rarity Chest</span>
            <select
              value={courseForm.chestRarity}
              onChange={(e) => setCourseForm({ ...courseForm, chestRarity: e.target.value })}
            >
              <option value="common">Basic</option>
              <option value="uncommon">Silver</option>
              <option value="rare">Gold</option>
              <option value="epic">Epic</option>
              <option value="mythic">Mythic</option>
            </select>
          </label>
        </div>
  </>
) : null}
    </div>

    <label className="check-line">
      <input
        type="checkbox"
        checked={courseForm.published}
        onChange={(e) => setCourseForm({ ...courseForm, published: e.target.checked })}
      />
      Publish ke anggota
    </label>

    <div className="member-actions">
      <PixelButton type="submit">Simpan Info Stage Saja</PixelButton>
      <PixelButton
        type="button"
        variant="secondary"
        onClick={() => setCourseForm(emptyCourse)}
      >
        Kosongkan Form
      </PixelButton>
    </div>

    <p className="form-help warning-help">
      Tombol ini hanya menyimpan informasi stage. Materi dan soal tidak akan hilang saat diklik, tetapi belum tersimpan sampai kamu klik Simpan Semua Materi, Simpan Semua Soal, atau Simpan Stage Lengkap di akhir.
    </p>
  </form>
</div>

            

  <div className="content-editor-section">
  <div className="section-title-row">
    <h3>Materi Stage Ini</h3>
    <span>{selectedCourseSections.length} materi</span>
  </div>
  <div className="stage-completeness-card">
  <div className="section-title-row">
    <h4>Status Kelengkapan Stage</h4>
    <span>
      {stageCompleteness.complete ? 'Siap publish' : 'Belum lengkap'}
    </span>
  </div>

  <div className="stage-completeness-list">
    {stageCompleteness.materialStatus.map((item) => (
      <div
        className={`stage-completeness-item ${item.complete ? 'is-complete' : 'is-warning'}`}
        key={item.title}
      >
        <span>{item.complete ? '✓' : '!'}</span>
        <p>
          <strong>{item.title}</strong>
          <small>{item.message}</small>
        </p>
      </div>
    ))}

    <div
      className={`stage-completeness-item ${stageCompleteness.quizComplete ? 'is-complete' : 'is-warning'}`}
    >
      <span>{stageCompleteness.quizComplete ? '✓' : '!'}</span>
      <p>
        <strong>Quiz</strong>
        <small>
          {stageCompleteness.quizComplete
            ? `${stageCompleteness.readyQuestionCount} soal siap publish`
            : 'Belum ada soal lengkap dan published'}
        </small>
      </p>
    </div>

    {stageCompleteness.questionStatus.slice(0, 5).map((item) => (
      <div
        className={`stage-completeness-item ${item.complete ? 'is-complete' : 'is-warning'}`}
        key={`quiz-status-${item.label}`}
      >
        <span>{item.complete ? '✓' : '!'}</span>
        <p>
          <strong>{item.label}</strong>
          <small>{item.message}</small>
        </p>
      </div>
    ))}

    {stageCompleteness.questionStatus.length > 5 ? (
      <div className="stage-completeness-item is-warning">
        <span>…</span>
        <p>
          <strong>Soal lainnya</strong>
          <small>{stageCompleteness.questionStatus.length - 5} soal lain disembunyikan di ringkasan</small>
        </p>
      </div>
    ) : null}

    <div
          className={`stage-completeness-item ${stageCompleteness.rewardComplete ? 'is-complete' : 'is-warning'}`}
        >
          <span>{stageCompleteness.rewardComplete ? '✓' : '!'}</span>
          <p>
            <strong>Reward</strong>
            <small>
              {stageCompleteness.rewardComplete
                ? `${stageCompleteness.xpReward} XP + ${stageCompleteness.coinReward} coin`
                : 'XP dan coin belum lengkap'}
            </small>
          </p>
        </div>
      </div>
    </div>

  <details className="admin-stage-preview-card">
    <summary>Preview ringkas stage sebagai siswa</summary>

    <div className="admin-stage-preview-content">
      {sectionForms.map((section) => (
        <div className="admin-stage-preview-section" key={`preview-${section.type || section.id}`}>
          <p className="eyebrow">Materi {section.order}/6</p>
          <h3>{section.title}</h3>
          <AdminPreviewContent
            content={section.content}
            prefix={`student-preview-${section.type}`}
          />
          {section.checkpoint ? (
            <div className="checkpoint">
              <strong>Checkpoint</strong>
              <p>{section.checkpoint}</p>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  </details>

  <form className="form-stack" onSubmit={handleAllSectionsSubmit} noValidate>
  <p className="form-help">
    Semua stage memiliki 6 bagian materi tetap. Tombol ini menyimpan materi langsung ke stage yang sedang dipilih. Kamu boleh menyimpan bertahap walaupun belum semua bagian selesai, agar tulisan panjang tidak hilang.
  </p>

  {sectionForms.map((section, index) => (
    <div className="material-bulk-editor" key={section.type || section.id}>
      <div className="fixed-material-header">
        <span>Materi {section.order}/6</span>
        <h3>{section.title}</h3>
      </div>

      <textarea
        className="large-textarea"
        required
        placeholder={`Isi ${section.title}. Pisahkan paragraf dengan enter.`}
        value={section.content}
        onChange={(e) => updateSectionForms(index, 'content', e.target.value)}
      />

      <div className="admin-insert-toolbar">
        <button
          type="button"
          onClick={() => appendToSectionContentAt(index, createCodeSnippet('php'))}
        >
          + Kode PHP
        </button>

        <button
          type="button"
          onClick={() => appendToSectionContentAt(index, createCodeSnippet('html'))}
        >
          + Kode HTML
        </button>

        <button
          type="button"
          onClick={() => appendToSectionContentAt(index, createCodeSnippet('css'))}
        >
          + Kode CSS
        </button>

        <button
          type="button"
          onClick={() => appendToSectionContentAt(index, createCodeSnippet('js'))}
        >
          + Kode JS
        </button>

        <button
          type="button"
          onClick={() => appendToSectionContentAt(index, createImageSnippet())}
        >
          + Gambar
        </button>
      </div>

      <div className="admin-preview-box">
        <div className="section-title-row">
          <h4>Preview Materi</h4>
          <span>{section.title}</span>
        </div>

        <div className="admin-preview-content">
          <AdminPreviewContent
            content={section.content}
            prefix={`material-preview-${section.type}`}
          />
        </div>
      </div>

      <textarea
        required
        placeholder="Checkpoint / ringkasan kecil sebelum lanjut"
        value={section.checkpoint}
        onChange={(e) => updateSectionForms(index, 'checkpoint', e.target.value)}
      />

      <label className="check-line">
        <input
          type="checkbox"
          checked={section.published}
          onChange={(e) => updateSectionForms(index, 'published', e.target.checked)}
        />
        Publish materi ini
      </label>
    </div>
  ))}

  <div className="member-actions">
    <PixelButton type="submit" disabled={savingMaterials}>
      {savingMaterials ? 'Menyimpan Materi...' : 'Simpan Semua Materi'}
    </PixelButton>
  </div>
</form>

  <div className="admin-list compact-list">
  {selectedCourseSections.map((section) => {
    const sectionStatus = section.isEmpty
      ? 'Belum diisi'
      : section.published
        ? 'Published'
        : 'Draft';

    return (
      <div
        className={`editor-card material-status-card ${
          section.isEmpty
            ? 'is-empty'
            : section.published
              ? 'is-published'
              : 'is-draft'
        }`}
        key={section.id}
      >
        <div>
          <strong>{section.order}. {section.title}</strong>
          <p>{sectionStatus}</p>
        </div>
      </div>
    );
  })}
</div>
</div>
<div className="content-editor-section">
  <div className="section-title-row">
    <h3>Soal Stage Ini</h3>
    <span>{questionForms.length} soal di form</span>
  </div>

  <form className="form-stack" onSubmit={handleAllQuestionsSubmit} noValidate>
    <p className="form-help">
      Edit semua soal quiz stage ini sekaligus. Tombol ini menyimpan soal langsung ke stage yang sedang dipilih. Untuk publish final yang lengkap, gunakan Simpan Stage Lengkap di bagian bawah.
    </p>

    {questionForms.map((question, index) => (
      <div className="material-bulk-editor question-bulk-editor" key={question.id || `new-question-${index}`}>
        <div className="fixed-material-header">
          <span>Soal {index + 1}</span>
          <h3>{question.question ? `Quiz ${index + 1}` : 'Soal Baru'}</h3>
        </div>

        <div className="question-order-note">
          Urutan otomatis: Soal {index + 1}
        </div>

        <textarea
          required
          className="large-textarea"
          placeholder="Pertanyaan"
          value={question.question}
          onChange={(e) => updateQuestionForms(index, 'question', e.target.value)}
        />

        <div className="admin-insert-toolbar">
          <button
            type="button"
            onClick={() => appendToQuestionFormFieldAt(index, 'question', createCodeSnippet('php'))}
          >
            + Kode PHP
          </button>

          <button
            type="button"
            onClick={() => appendToQuestionFormFieldAt(index, 'question', createCodeSnippet('html'))}
          >
            + Kode HTML
          </button>

          <button
            type="button"
            onClick={() => appendToQuestionFormFieldAt(index, 'question', createCodeSnippet('js'))}
          >
            + Kode JS
          </button>

          <button
            type="button"
            onClick={() => appendToQuestionFormFieldAt(index, 'question', createImageSnippet())}
          >
            + Gambar
          </button>
        </div>

        <div className="admin-preview-box">
          <div className="section-title-row">
            <h4>Preview Pertanyaan</h4>
            <span>Soal {index + 1}</span>
          </div>

          <div className="admin-preview-content">
            <AdminPreviewContent
              content={question.question}
              prefix={`question-preview-${question.id || index}`}
            />
          </div>
        </div>

        <div className="form-row">
          <textarea
            required
            placeholder="Pilihan A"
            value={question.optionA}
            onChange={(e) => updateQuestionForms(index, 'optionA', e.target.value)}
          />

          <textarea
            required
            placeholder="Pilihan B"
            value={question.optionB}
            onChange={(e) => updateQuestionForms(index, 'optionB', e.target.value)}
          />
        </div>

        <div className="form-row">
          <textarea
            required
            placeholder="Pilihan C"
            value={question.optionC}
            onChange={(e) => updateQuestionForms(index, 'optionC', e.target.value)}
          />

          <textarea
            required
            placeholder="Pilihan D"
            value={question.optionD}
            onChange={(e) => updateQuestionForms(index, 'optionD', e.target.value)}
          />
        </div>

        <div className="admin-insert-toolbar">
          <button
            type="button"
            onClick={() => appendToQuestionFormFieldAt(index, 'optionA', createCodeSnippet('txt'))}
          >
            + Kode ke A
          </button>

          <button
            type="button"
            onClick={() => appendToQuestionFormFieldAt(index, 'optionB', createCodeSnippet('txt'))}
          >
            + Kode ke B
          </button>

          <button
            type="button"
            onClick={() => appendToQuestionFormFieldAt(index, 'optionC', createCodeSnippet('txt'))}
          >
            + Kode ke C
          </button>

          <button
            type="button"
            onClick={() => appendToQuestionFormFieldAt(index, 'optionD', createCodeSnippet('txt'))}
          >
            + Kode ke D
          </button>
        </div>

        <div className="admin-preview-box">
          <div className="section-title-row">
            <h4>Preview Pilihan Jawaban</h4>
            <span>A / B / C / D</span>
          </div>

          <div className="answer-preview-grid">
            <div>
              <strong>A</strong>
              <div className="admin-preview-content">
                <AdminPreviewContent content={question.optionA} prefix={`option-a-preview-${question.id || index}`} />
              </div>
            </div>

            <div>
              <strong>B</strong>
              <div className="admin-preview-content">
                <AdminPreviewContent content={question.optionB} prefix={`option-b-preview-${question.id || index}`} />
              </div>
            </div>

            <div>
              <strong>C</strong>
              <div className="admin-preview-content">
                <AdminPreviewContent content={question.optionC} prefix={`option-c-preview-${question.id || index}`} />
              </div>
            </div>

            <div>
              <strong>D</strong>
              <div className="admin-preview-content">
                <AdminPreviewContent content={question.optionD} prefix={`option-d-preview-${question.id || index}`} />
              </div>
            </div>
          </div>
        </div>

        <select
          value={question.correctIndex}
          onChange={(e) => updateQuestionForms(index, 'correctIndex', Number(e.target.value))}
        >
          <option value={0}>Jawaban benar: A</option>
          <option value={1}>Jawaban benar: B</option>
          <option value={2}>Jawaban benar: C</option>
          <option value={3}>Jawaban benar: D</option>
        </select>

        <textarea
          required
          className="large-textarea"
          placeholder="Pembahasan jawaban"
          value={question.explanation}
          onChange={(e) => updateQuestionForms(index, 'explanation', e.target.value)}
        />

        <div className="admin-insert-toolbar">
          <button
            type="button"
            onClick={() => appendToQuestionFormFieldAt(index, 'explanation', createCodeSnippet('php'))}
          >
            + Kode PHP
          </button>

          <button
            type="button"
            onClick={() => appendToQuestionFormFieldAt(index, 'explanation', createCodeSnippet('html'))}
          >
            + Kode HTML
          </button>

          <button
            type="button"
            onClick={() => appendToQuestionFormFieldAt(index, 'explanation', createCodeSnippet('js'))}
          >
            + Kode JS
          </button>

          <button
            type="button"
            onClick={() => appendToQuestionFormFieldAt(index, 'explanation', createImageSnippet())}
          >
            + Gambar
          </button>
        </div>

        <div className="admin-preview-box">
          <div className="section-title-row">
            <h4>Preview Pembahasan</h4>
            <span>Penjelasan jawaban</span>
          </div>

          <div className="admin-preview-content">
            <AdminPreviewContent
              content={question.explanation}
              prefix={`explanation-preview-${question.id || index}`}
            />
          </div>
        </div>

        <label className="check-line">
          <input
            type="checkbox"
            checked={question.published}
            onChange={(e) => updateQuestionForms(index, 'published', e.target.checked)}
          />
          Publish soal ini
        </label>

        <div className="member-actions">
          <PixelButton
            type="button"
            variant="secondary"
            onClick={() => removeQuestionFormAt(index)}
          >
            {question.id ? 'Hapus Soal' : 'Buang Soal Baru'}
          </PixelButton>
        </div>
      </div>
    ))}

    <div className="member-actions">
      <PixelButton type="submit" disabled={savingQuestions}>
        {savingQuestions ? 'Menyimpan Soal...' : 'Simpan Semua Soal'}
      </PixelButton>

      <PixelButton
        type="button"
        variant="secondary"
        onClick={addQuestionForm}
      >
        Tambah Soal
      </PixelButton>
    </div>
  </form>

  <div className="complete-stage-save-panel">
    <div>
      <p className="eyebrow">Simpan Final</p>
      <h3>Simpan Stage Lengkap</h3>
      <p>Gunakan tombol ini setelah info stage, 6 materi, dan semua soal sudah diisi. Sekali klik akan menyimpan semuanya otomatis agar kamu tidak perlu input ulang.</p>
    </div>

    <PixelButton
      type="button"
      onClick={handleCompleteStageSave}
      disabled={savingCompleteStage}
    >
      {savingCompleteStage ? 'Menyimpan Semua...' : 'Simpan Stage Lengkap'}
    </PixelButton>
  </div>
</div>

          </>
        ) : (
          <div className="center-page">
            <div>
              <h2>Belum ada stage</h2>
              <p>Tambahkan stage terlebih dahulu agar materi dan soal bisa dikelola.</p>
            </div>
          </div>
        )}
      </PixelCard>
    </section>
  ) : null}




      {activeTab === 'announcements' ? (
  <section className="admin-editor-grid announcements-admin-layout">
    <PixelCard>
      <h2>Tambah / Edit Pengumuman</h2>

      <form className="form-stack" onSubmit={handleAnnouncementSubmit}>
        <label className="form-field">
          <span>Judul Pengumuman</span>
          <input
            required
            placeholder="Contoh: Kelas PHP dimulai minggu ini"
            value={announcementForm.title}
            onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
          />
        </label>

        <label className="form-field">
          <span>Kategori</span>
          <select
            value={announcementForm.category}
            onChange={(e) => setAnnouncementForm({ ...announcementForm, category: e.target.value })}
          >
            <option value="Info">Info</option>
            <option value="Penting">Penting</option>
            <option value="Kelas">Kelas</option>
            <option value="Challenge">Challenge</option>
            <option value="Maintenance">Maintenance</option>
          </select>
        </label>

        <label className="form-field">
          <span>Isi Pengumuman</span>
          <textarea
            required
            placeholder="Tulis isi pengumuman untuk member."
            value={announcementForm.message}
            onChange={(e) => setAnnouncementForm({ ...announcementForm, message: e.target.value })}
          />
        </label>

        <div className="form-row">
          <label className="form-field">
            <span>Prioritas</span>
            <select
              value={announcementForm.priority}
              onChange={(e) => setAnnouncementForm({ ...announcementForm, priority: e.target.value })}
            >
              <option value="normal">Normal</option>
              <option value="high">Penting</option>
              <option value="urgent">Mendesak</option>
            </select>
          </label>

          <label className="form-field">
            <span>Target</span>
            <select
              value={announcementForm.target}
              onChange={(e) => setAnnouncementForm({ ...announcementForm, target: e.target.value })}
            >
              <option value="all">Semua Member</option>
              <option value="pending">Member Pending</option>
              <option value="approved">Member Approved</option>
            </select>
          </label>
        </div>

        <div className="form-row">
          <label className="form-field">
            <span>Tanggal Mulai</span>
            <input
              type="date"
              value={announcementForm.startDate}
              onChange={(e) => setAnnouncementForm({ ...announcementForm, startDate: e.target.value })}
            />
          </label>

          <label className="form-field">
            <span>Tanggal Berakhir</span>
            <input
              type="date"
              value={announcementForm.endDate}
              onChange={(e) => setAnnouncementForm({ ...announcementForm, endDate: e.target.value })}
            />
          </label>

          <label className="form-field">
            <span>Urutan</span>
            <input
              type="number"
              min="1"
              value={announcementForm.order}
              onChange={(e) => setAnnouncementForm({ ...announcementForm, order: e.target.value })}
            />
          </label>
        </div>

        <label className="check-line">
          <input
            type="checkbox"
            checked={announcementForm.pinned}
            onChange={(e) => setAnnouncementForm({ ...announcementForm, pinned: e.target.checked })}
          />
          Pin pengumuman di atas
        </label>

        <label className="check-line">
          <input
            type="checkbox"
            checked={announcementForm.published}
            onChange={(e) => setAnnouncementForm({ ...announcementForm, published: e.target.checked })}
          />
          Published
        </label>

        <div className="member-actions">
          <PixelButton type="submit">
            Simpan Pengumuman
          </PixelButton>

          <PixelButton
            type="button"
            variant="secondary"
            onClick={() => setAnnouncementForm(emptyAnnouncement)}
          >
            Pengumuman Baru
          </PixelButton>
        </div>
      </form>
    </PixelCard>

    <div className="admin-list">
      {(publicData.announcements || []).length ? (
        (publicData.announcements || []).map((announcement) => (
          <PixelCard
  className={`admin-announcement-card priority-${announcement.priority || 'normal'}`}
  key={announcement.id}
>
  <div className="admin-announcement-top">
    <div>
      <div className="admin-announcement-badges">
        <span>{announcement.category || 'Info'}</span>

        {announcement.pinned ? (
          <span>Pinned</span>
        ) : null}

        <span>{announcement.priority || 'normal'}</span>
      </div>

      <h3>{announcement.title}</h3>
    </div>
  </div>

  <p className="admin-announcement-message">
    {announcement.message}
  </p>

  <div className="admin-announcement-meta">
    <span>{announcement.published !== false ? 'Published' : 'Draft'}</span>
    <span>Target: {announcement.target || 'all'}</span>
    <span>Urutan: {announcement.order || 999}</span>
  </div>

  <div className="member-actions">
    <PixelButton
      type="button"
      variant="secondary"
      onClick={() => setAnnouncementForm({
        ...emptyAnnouncement,
        ...announcement,
        published: announcement.published !== false
      })}
    >
      Edit
    </PixelButton>

    <PixelButton
      type="button"
      variant="danger"
      onClick={() => handleDelete('announcements', announcement.id)}
    >
      Hapus
    </PixelButton>
  </div>
</PixelCard>
        ))
      ) : (
        <PixelCard>
          <h3>Belum ada pengumuman</h3>
          <p>Buat pengumuman pertama lewat form di samping.</p>
        </PixelCard>
      )}
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

     {activeTab === 'challenges' ? (
  <>
    <section className="admin-editor-grid">
      <PixelCard>
        <h2>Tambah / Edit Tantangan</h2>

        <form className="form-stack" onSubmit={handleChallengeSubmit}>
          <label className="form-field">
            <span>Judul Tantangan</span>
            <input
              required
              placeholder="Contoh: Mini Challenge HTML"
              value={challengeForm.title}
              onChange={(e) => setChallengeForm({ ...challengeForm, title: e.target.value })}
            />
          </label>

          <label className="form-field">
            <span>Deskripsi Tantangan</span>
            <textarea
              required
              placeholder="Jelaskan tugas yang harus dikerjakan anggota"
              value={challengeForm.description}
              onChange={(e) => setChallengeForm({ ...challengeForm, description: e.target.value })}
            />
          </label>

          <label className="form-field">
            <span>Jenis Reward</span>
            <select
              value={challengeForm.rewardType}
              onChange={(e) => {
                const rewardType = e.target.value;

                setChallengeForm({
                  ...challengeForm,
                  rewardType,
                  rewardId: '',
                  rewardName: '',
                  rewardDescription: '',
                  rewardIcon: '',
                  rewardRarity: 'common',
                  rewardXp: rewardType === 'xp' ? 50 : 0,
                  rewardCoins: rewardType === 'coins' ? 25 : 0
                });
              }}
            >
              <option value="coins">Reward Koin</option>
              <option value="xp">Reward XP</option>
              <option value="badge">Reward Badge</option>
              <option value="title">Reward Title</option>
              <option value="chest">Reward Chest</option>
            </select>
            <small>Pilih hadiah utama yang akan diberikan setelah tantangan disetujui.</small>
          </label>

          {challengeForm.rewardType === 'coins' ? (
            <label className="form-field">
              <span>Jumlah Koin Reward</span>
              <input
                type="number"
                min="1"
                placeholder="Contoh: 25"
                value={challengeForm.rewardCoins}
                onChange={(e) => setChallengeForm({ ...challengeForm, rewardCoins: e.target.value })}
              />
              <small>Koin akan masuk ke saldo anggota setelah tantangan di-approve.</small>
            </label>
          ) : null}

          {challengeForm.rewardType === 'xp' ? (
            <label className="form-field">
              <span>Jumlah XP Reward</span>
              <input
                type="number"
                min="1"
                placeholder="Contoh: 50"
                value={challengeForm.rewardXp}
                onChange={(e) => setChallengeForm({ ...challengeForm, rewardXp: e.target.value })}
              />
              <small>XP akan menambah level anggota jika bar XP penuh.</small>
            </label>
          ) : null}

          {challengeForm.rewardType === 'badge' ? (
            <>
            <label className="form-field">
            <span>Pilih Badge dari Reward Master</span>
            <select
              value={challengeForm.rewardId}
              onChange={(e) => applyMasterRewardToChallenge('badge', e.target.value)}
            >
              <option value="">Pilih badge master</option>

              {badgeRewards.map((reward) => (
                <option key={reward.id} value={reward.id}>
                  {reward.icon || '🏅'} {reward.name || reward.title} · {getRarityLabel(reward.rarity)}
                </option>
              ))}
            </select>
            <small>Kalau dipilih, nama, ID, deskripsi, icon, dan rarity badge otomatis terisi.</small>
          </label>
              <label className="form-field">
                <span>Nama Badge</span>
                <input
                  required
                  placeholder="Contoh: HTML Warrior"
                  value={challengeForm.rewardName}
                  onChange={(e) => setChallengeForm({ ...challengeForm, rewardName: e.target.value })}
                />
              </label>

              <label className="form-field">
                <span>ID Badge</span>
                <input
                  placeholder="Boleh kosong, nanti dibuat otomatis"
                  value={challengeForm.rewardId}
                  onChange={(e) => setChallengeForm({ ...challengeForm, rewardId: e.target.value })}
                />
                <small>Contoh manual: badge-html-warrior.</small>
              </label>

              <label className="form-field">
                <span>Deskripsi Badge</span>
                <textarea
                  placeholder="Contoh: Diberikan kepada anggota yang menyelesaikan tantangan HTML."
                  value={challengeForm.rewardDescription}
                  onChange={(e) => setChallengeForm({ ...challengeForm, rewardDescription: e.target.value })}
                />
              </label>

              <div className="form-row">
                <label className="form-field">
                  <span>Icon Badge</span>
                  <input
                    placeholder="Contoh: 🏅"
                    value={challengeForm.rewardIcon}
                    onChange={(e) => setChallengeForm({ ...challengeForm, rewardIcon: e.target.value })}
                  />
                </label>

                <label className="form-field">
                  <span>Rarity Badge</span>
                  <select
                    value={challengeForm.rewardRarity}
                    onChange={(e) => setChallengeForm({ ...challengeForm, rewardRarity: e.target.value })}
                  >
                    <option value="common">Biasa / Putih</option>
                    <option value="uncommon">Tidak Biasa / Abu-abu</option>
                    <option value="rare">Rare / Dongker</option>
                    <option value="epic">Epic / Kuning</option>
                    <option value="mythic">Mythic / Merah</option>
                  </select>
                </label>
              </div>

              <div className="form-row">
                <label className="form-field">
                  <span>Bonus XP</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="Opsional, contoh: 50"
                    value={challengeForm.rewardXp}
                    onChange={(e) => setChallengeForm({ ...challengeForm, rewardXp: e.target.value })}
                  />
                </label>

                <label className="form-field">
                  <span>Bonus Koin</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="Opsional, contoh: 25"
                    value={challengeForm.rewardCoins}
                    onChange={(e) => setChallengeForm({ ...challengeForm, rewardCoins: e.target.value })}
                  />
                </label>
              </div>
            </>
          ) : null}

          {challengeForm.rewardType === 'title' ? (
            <>
            <label className="form-field">
            <span>Pilih Title dari Reward Master</span>
            <select
              value={challengeForm.rewardId}
              onChange={(e) => applyMasterRewardToChallenge('title', e.target.value)}
            >
              <option value="">Pilih title master</option>

              {titleRewards.map((reward) => (
                <option key={reward.id} value={reward.id}>
                  {reward.icon || '🎖️'} {reward.name || reward.title} · {getRarityLabel(reward.rarity)}
                </option>
              ))}
            </select>
            <small>Kalau dipilih, nama, ID, deskripsi, icon, dan rarity title otomatis terisi.</small>
          </label>
              <label className="form-field">
                <span>Nama Title</span>
                <input
                  required
                  placeholder="Contoh: Si Paling HTML"
                  value={challengeForm.rewardName}
                  onChange={(e) => setChallengeForm({ ...challengeForm, rewardName: e.target.value })}
                />
              </label>

              <label className="form-field">
                <span>ID Title</span>
                <input
                  placeholder="Boleh kosong, nanti dibuat otomatis"
                  value={challengeForm.rewardId}
                  onChange={(e) => setChallengeForm({ ...challengeForm, rewardId: e.target.value })}
                />
                <small>Contoh manual: title-si-paling-html.</small>
              </label>

              <label className="form-field">
                <span>Deskripsi Title</span>
                <textarea
                  placeholder="Contoh: Title untuk anggota yang aktif menyelesaikan challenge HTML."
                  value={challengeForm.rewardDescription}
                  onChange={(e) => setChallengeForm({ ...challengeForm, rewardDescription: e.target.value })}
                />
              </label>

              <div className="form-row">
                <label className="form-field">
                  <span>Icon Title</span>
                  <input
                    placeholder="Contoh: 🎖️"
                    value={challengeForm.rewardIcon}
                    onChange={(e) => setChallengeForm({ ...challengeForm, rewardIcon: e.target.value })}
                  />
                </label>

                <label className="form-field">
                  <span>Rarity Title</span>
                  <select
                    value={challengeForm.rewardRarity}
                    onChange={(e) => setChallengeForm({ ...challengeForm, rewardRarity: e.target.value })}
                  >
                    <option value="common">Biasa / Putih</option>
                    <option value="uncommon">Tidak Biasa / Abu-abu</option>
                    <option value="rare">Rare / Dongker</option>
                    <option value="epic">Epic / Kuning</option>
                    <option value="mythic">Mythic / Merah</option>
                  </select>
                </label>
              </div>

              <div className="form-row">
                <label className="form-field">
                  <span>Bonus XP</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="Opsional, contoh: 50"
                    value={challengeForm.rewardXp}
                    onChange={(e) => setChallengeForm({ ...challengeForm, rewardXp: e.target.value })}
                  />
                </label>

                <label className="form-field">
                  <span>Bonus Koin</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="Opsional, contoh: 25"
                    value={challengeForm.rewardCoins}
                    onChange={(e) => setChallengeForm({ ...challengeForm, rewardCoins: e.target.value })}
                  />
                </label>
              </div>
            </>
          ) : null}

          {challengeForm.rewardType === 'chest' ? (
            <>
            <label className="form-field">
  <span>Pilih Chest dari Reward Master</span>
  <select
    value={challengeForm.rewardId}
    onChange={(e) => applyMasterRewardToChallenge('chest', e.target.value)}
  >
    <option value="">Pilih chest master</option>

    {chestRewards.map((reward) => (
      <option key={reward.id} value={reward.id}>
        {reward.icon || '🎁'} {reward.name || reward.title} · {getRarityLabel(reward.rarity)}
      </option>
    ))}
  </select>
  <small>Kalau dipilih, nama, ID, deskripsi, icon, dan rarity chest otomatis terisi.</small>
</label>
              <label className="form-field">
                <span>Nama Chest</span>
                <input
                  required
                  placeholder="Contoh: Chest HTML"
                  value={challengeForm.rewardName}
                  onChange={(e) => setChallengeForm({ ...challengeForm, rewardName: e.target.value })}
                />
              </label>

              <label className="form-field">
                <span>ID Chest</span>
                <input
                  placeholder="Boleh kosong, nanti dibuat otomatis"
                  value={challengeForm.rewardId}
                  onChange={(e) => setChallengeForm({ ...challengeForm, rewardId: e.target.value })}
                />
              </label>

              <label className="form-field">
                <span>Deskripsi Chest</span>
                <textarea
                  placeholder="Contoh: Chest hadiah dari tantangan HTML."
                  value={challengeForm.rewardDescription}
                  onChange={(e) => setChallengeForm({ ...challengeForm, rewardDescription: e.target.value })}
                />
              </label>

              <div className="form-row">
                <label className="form-field">
                  <span>Icon Chest</span>
                  <input
                    placeholder="Contoh: 🎁"
                    value={challengeForm.rewardIcon}
                    onChange={(e) => setChallengeForm({ ...challengeForm, rewardIcon: e.target.value })}
                  />
                </label>

                <label className="form-field">
                  <span>Tipe Chest</span>
                  <select
                    value={challengeForm.rewardRarity}
                    onChange={(e) => setChallengeForm({ ...challengeForm, rewardRarity: e.target.value })}
                  >
                    <option value="common">Basic</option>
                    <option value="uncommon">Silver</option>
                    <option value="rare">Gold</option>
                    <option value="epic">Epic</option>
                    <option value="mythic">Mythic</option>
                  </select>
                </label>
              </div>
            </>
          ) : null}

          <div className="form-row">
            <label className="form-field">
              <span>Tanggal Mulai</span>
              <input
                type="date"
                value={challengeForm.startDate}
                onChange={(e) => setChallengeForm({ ...challengeForm, startDate: e.target.value })}
              />
              <small>Boleh kosong kalau tantangan langsung aktif.</small>
            </label>

            <label className="form-field">
              <span>Tanggal Berakhir</span>
              <input
                type="date"
                value={challengeForm.endDate}
                onChange={(e) => setChallengeForm({ ...challengeForm, endDate: e.target.value })}
              />
              <small>Boleh kosong kalau tidak ada batas waktu.</small>
            </label>
          </div>

          <label className="form-field">
            <span>Urutan Tampil</span>
            <input
              type="number"
              min="1"
              placeholder="Contoh: 1"
              value={challengeForm.order}
              onChange={(e) => setChallengeForm({ ...challengeForm, order: e.target.value })}
            />
            <small>Angka kecil tampil lebih dulu.</small>
          </label>

          <label className="checkbox-line">
            <input
              type="checkbox"
              checked={challengeForm.proofRequired}
              onChange={(e) => setChallengeForm({ ...challengeForm, proofRequired: e.target.checked })}
            />
            Wajib kirim bukti
          </label>

          <label className="checkbox-line">
            <input
              type="checkbox"
              checked={challengeForm.featuredOnHome}
              onChange={(e) => setChallengeForm({ ...challengeForm, featuredOnHome: e.target.checked })}
            />
            Tampilkan di halaman utama
          </label>

          <label className="checkbox-line">
            <input
              type="checkbox"
              checked={challengeForm.published}
              onChange={(e) => setChallengeForm({ ...challengeForm, published: e.target.checked })}
            />
            Published
          </label>

          <PixelButton type="submit">Simpan Tantangan</PixelButton>
        </form>
      </PixelCard>

      <div className="admin-list">
        {(challengeData?.challenges || []).length ? (
          (challengeData?.challenges || []).map((challenge) => (
            <PixelCard key={challenge.id}>
              <h3>{challenge.title}</h3>
              <div className="admin-reward-line">
                <span>Reward: {challenge.rewardType}</span>

                {challenge.rewardName ? (
                  <strong>{challenge.rewardIcon || '🎁'} {challenge.rewardName}</strong>
                ) : null}

                {challenge.rewardRarity ? (
                  <span className={`admin-rarity-pill ${getRarityClassName(challenge.rewardRarity)}`}>
                    {getRarityLabel(challenge.rewardRarity)}
                  </span>
                ) : null}
              </div>
              <p>{challenge.description}</p>

              <div className="member-actions">
                <PixelButton
                  type="button"
                  variant="secondary"
                  onClick={() => setChallengeForm(challenge)}
                >
                  Edit
                </PixelButton>

                <PixelButton
                  type="button"
                  variant="danger"
                  onClick={() => handleDelete('challenges', challenge.id)}
                >
                  Hapus
                </PixelButton>
              </div>
            </PixelCard>
          ))
        ) : (
          <PixelCard>
            <h3>Belum ada tantangan</h3>
            <p>Buat tantangan pertama lewat form di samping.</p>
          </PixelCard>
        )}
      </div>
    </section>

    <section className="section-block">
      <div className="section-heading">
        <h2>Submission Tantangan</h2>
        <p>Approve submission untuk memberikan reward otomatis ke anggota.</p>
      </div>

      <div className="admin-list">
        {(challengeData?.challengeSubmissions || []).length ? (
          [...(challengeData?.challengeSubmissions || [])]
            .sort((a, b) => {
              const statusOrder = {
                pending: 0,
                approved: 1,
                rejected: 2
              };

              return (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9);
            })
            .map((submission) => {
              const isPending = submission.status === 'pending';

              return (
                <PixelCard
                  className={`challenge-submission-card status-${submission.status || 'pending'}`}
                  key={submission.id}
                >
                  <div className="section-title-row">
                    <div>
                      <h3>{submission.memberName || 'Anggota'}</h3>
                      <p>{getChallengeTitle(submission.challengeId)}</p>
                    </div>

                    <span className={`status-pill ${submission.status || 'pending'}`}>
                      {submission.status || 'pending'}
                    </span>
                  </div>

                  <p>
                    <strong>Bukti teks:</strong>{' '}
                    {submission.proofText || 'Tidak ada teks bukti.'}
                  </p>

                  {submission.proofUrl ? (
                    <a
                      className="text-link"
                      href={submission.proofUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Buka link bukti
                    </a>
                  ) : null}

                  <p>
                    <strong>Dikirim:</strong>{' '}
                    {formatSubmissionDate(submission.submittedAt)}
                  </p>

                  {submission.rewardText ? (
                    <p>
                      <strong>Reward:</strong> {submission.rewardText}
                    </p>
                  ) : null}

                  {isPending ? (
                    <div className="member-actions">
                      <PixelButton
                        type="button"
                        onClick={() => handleApproveChallengeSubmission(submission)}
                      >
                        Approve + Beri Reward
                      </PixelButton>

                      <PixelButton
                        type="button"
                        variant="danger"
                        onClick={() => handleRejectChallengeSubmission(submission)}
                      >
                        Reject
                      </PixelButton>
                    </div>
                  ) : (
                    <p>
                      <strong>Status:</strong> {submission.status}
                    </p>
                  )}
                </PixelCard>
              );
            })
        ) : (
          <PixelCard>
            <h3>Belum ada submission</h3>
            <p>Submission akan muncul setelah anggota mengirim bukti tantangan.</p>
          </PixelCard>
        )}
      </div>
    </section>
  </>
) : null}

      {activeTab === 'rewards' ? (
  <section className="admin-editor-grid">
    <PixelCard>
      <h2>Reward Master Admin</h2>
      <p>Kelola badge, title, dan chest yang bisa dipakai untuk stage atau tantangan.</p>

      <form className="form-stack" onSubmit={handleRewardSubmit}>
        <label className="form-field">
          <span>Jenis Reward</span>
          <select
            value={rewardForm.type}
            onChange={(e) => {
              const type = e.target.value;

              setRewardForm({
                ...rewardForm,
                type,
                icon: type === 'title' ? '🎖️' : type === 'chest' ? '🎁' : '🏅'
              });
            }}
          >
            <option value="badge">Badge</option>
            <option value="title">Title</option>
            <option value="chest">Chest</option>
          </select>
        </label>

        <label className="form-field">
          <span>ID Reward</span>
          <input
            placeholder="Boleh kosong, nanti dibuat otomatis"
            value={rewardForm.id}
            onChange={(e) => setRewardForm({ ...rewardForm, id: e.target.value })}
          />
          <small>Contoh: badge-html-warrior, title-code-slayer, chest-basic-html.</small>
        </label>

        <label className="form-field">
          <span>Nama Reward</span>
          <input
            required
            placeholder="Contoh: HTML Warrior"
            value={rewardForm.name}
            onChange={(e) => setRewardForm({ ...rewardForm, name: e.target.value })}
          />
        </label>

        <label className="form-field">
          <span>Deskripsi</span>
          <textarea
            placeholder="Contoh: Diberikan kepada anggota yang menaklukkan dasar HTML."
            value={rewardForm.description}
            onChange={(e) => setRewardForm({ ...rewardForm, description: e.target.value })}
          />
        </label>

        <label className="form-field">
          <span>Syarat Mendapatkan</span>
          <textarea
            placeholder="Contoh: Selesaikan Stage 1 atau menangkan challenge HTML."
            value={rewardForm.requirement}
            onChange={(e) => setRewardForm({ ...rewardForm, requirement: e.target.value })}
          />
        </label>

        <div className="form-row">
          <label className="form-field">
            <span>Icon</span>
            <input
              placeholder="Contoh: 🏅"
              value={rewardForm.icon}
              onChange={(e) => setRewardForm({ ...rewardForm, icon: e.target.value })}
            />
          </label>

          <label className="form-field">
            <span>Rarity</span>
            <select
              value={rewardForm.rarity}
              onChange={(e) => setRewardForm({ ...rewardForm, rarity: e.target.value })}
            >
              {RARITY_LIST.map((rarity) => (
                <option key={rarity} value={rarity}>
                  {getRarityLabel(rarity)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="form-field">
          <span>Urutan</span>
          <input
            type="number"
            min="1"
            value={rewardForm.order}
            onChange={(e) => setRewardForm({ ...rewardForm, order: e.target.value })}
          />
        </label>

        <label className="check-line">
          <input
            type="checkbox"
            checked={rewardForm.published}
            onChange={(e) => setRewardForm({ ...rewardForm, published: e.target.checked })}
          />
          Published
        </label>

        <div className="member-actions">
          <PixelButton type="submit">
            Simpan Reward
          </PixelButton>

          <PixelButton
            type="button"
            variant="secondary"
            onClick={() => setRewardForm(emptyReward)}
          >
            Reward Baru
          </PixelButton>
        </div>
      </form>
    </PixelCard>

    <div className="admin-list">
      <PixelCard>
        <h3>Badge</h3>
        {badgeRewards.length ? badgeRewards.map((reward) => (
          <div className="editor-card" key={reward.id}>
            <div>
              <strong>{reward.icon || '🏅'} {reward.name || reward.title}</strong>
              <div className="admin-reward-meta">
                <span className={`admin-rarity-pill ${getRarityClassName(reward.rarity)}`}>
                  {getRarityLabel(reward.rarity)}
                </span>

                <span>{reward.published !== false ? 'Published' : 'Draft'}</span>
              </div>
              <small>{reward.description || 'Tanpa deskripsi.'}</small>
            </div>

            <div className="member-actions">
              <PixelButton
                type="button"
                variant="secondary"
                onClick={() => handleEditReward(reward)}
              >
                Edit
              </PixelButton>

              <PixelButton
                type="button"
                variant="danger"
                onClick={() => handleDeleteReward(reward.id)}
              >
                Hapus
              </PixelButton>
            </div>
          </div>
        )) : (
          <p>Belum ada badge.</p>
        )}
      </PixelCard>

      <PixelCard>
        <h3>Title</h3>
        {titleRewards.length ? titleRewards.map((reward) => (
          <div className="editor-card" key={reward.id}>
            <div>
              <strong>{reward.icon || '🎖️'} {reward.name || reward.title}</strong>
              <div className="admin-reward-meta">
                <span className={`admin-rarity-pill ${getRarityClassName(reward.rarity)}`}>
                  {getRarityLabel(reward.rarity)}
                </span>

                <span>{reward.published !== false ? 'Published' : 'Draft'}</span>
              </div>
              <small>{reward.description || 'Tanpa deskripsi.'}</small>
            </div>

            <div className="member-actions">
              <PixelButton
                type="button"
                variant="secondary"
                onClick={() => handleEditReward(reward)}
              >
                Edit
              </PixelButton>

              <PixelButton
                type="button"
                variant="danger"
                onClick={() => handleDeleteReward(reward.id)}
              >
                Hapus
              </PixelButton>
            </div>
          </div>
        )) : (
          <p>Belum ada title.</p>
        )}
      </PixelCard>

      <PixelCard>
        <h3>Chest</h3>
        {chestRewards.length ? chestRewards.map((reward) => (
          <div className="editor-card" key={reward.id}>
            <div>
              <strong>{reward.icon || '🎁'} {reward.name || reward.title}</strong>
              <div className="admin-reward-meta">
                <span className={`admin-rarity-pill ${getRarityClassName(reward.rarity)}`}>
                  {getRarityLabel(reward.rarity)}
                </span>

                <span>{reward.published !== false ? 'Published' : 'Draft'}</span>
              </div>
              <small>{reward.description || 'Tanpa deskripsi.'}</small>
            </div>

            <div className="member-actions">
              <PixelButton
                type="button"
                variant="secondary"
                onClick={() => handleEditReward(reward)}
              >
                Edit
              </PixelButton>

              <PixelButton
                type="button"
                variant="danger"
                onClick={() => handleDeleteReward(reward.id)}
              >
                Hapus
              </PixelButton>
            </div>
          </div>
        )) : (
          <p>Belum ada chest.</p>
        )}
      </PixelCard>
    </div>
  </section>
) : null}



      {activeTab === 'shop' ? (
        <section className="two-column admin-shop-panel">
          <PixelCard>
            <h2>Kelola Coin Shop</h2>
            <form className="form-stack" onSubmit={handleShopSubmit}>
              <label>ID Item<input value={shopForm.id} onChange={(e) => setShopForm({ ...shopForm, id: e.target.value })} placeholder="kosongkan untuk otomatis" /></label>
              <label>Jenis<select value={shopForm.type} onChange={(e) => setShopForm({ ...shopForm, type: e.target.value })}>
                <option value="avatar">Avatar</option><option value="frame">Frame</option><option value="title">Title</option><option value="badge">Badge</option><option value="nameColor">Warna Nama</option><option value="profileDecoration">Dekorasi Profil</option>
              </select></label>
              <label>Nama<input value={shopForm.name} onChange={(e) => setShopForm({ ...shopForm, name: e.target.value })} /></label>
              <div className="admin-editor-grid compact-grid">
                <label>Icon<input value={shopForm.icon} onChange={(e) => setShopForm({ ...shopForm, icon: e.target.value })} /></label>
                <label>Warna<input type={shopForm.type === 'nameColor' ? 'color' : 'text'} value={shopForm.type === 'nameColor' ? (shopForm.color || '#ff9ac9') : shopForm.color} onChange={(e) => setShopForm({ ...shopForm, color: e.target.value })} placeholder="#ff9ac9" /></label>
                <label>Harga<input type="number" value={shopForm.price} onChange={(e) => setShopForm({ ...shopForm, price: Number(e.target.value) })} /></label>
                <label>Urutan<input type="number" value={shopForm.order} onChange={(e) => setShopForm({ ...shopForm, order: Number(e.target.value) })} /></label>
              </div>
              <label>Rarity<select value={shopForm.rarity} onChange={(e) => setShopForm({ ...shopForm, rarity: e.target.value })}>{RARITY_LIST.map((rarity) => <option key={rarity} value={rarity}>{getRarityLabel(rarity)}</option>)}</select></label>
              <label>Deskripsi<textarea value={shopForm.description} onChange={(e) => setShopForm({ ...shopForm, description: e.target.value })} /></label>
              <label className="inline-check"><input type="checkbox" checked={shopForm.published} onChange={(e) => setShopForm({ ...shopForm, published: e.target.checked })} /> Published</label>
              <PixelButton type="submit">Simpan Item Shop</PixelButton>
            </form>
          </PixelCard>
          <PixelCard>
            <h2>Item Shop</h2>
            <div className="compact-list">
              {shopItems.length ? shopItems.map((item) => (
                <div className="admin-list-row" key={item.id}>
                  <div><strong>{item.icon} {item.name}</strong><span>{item.type} · 🪙 {item.price} · {item.archived ? 'Archived' : item.published ? 'Published' : 'Draft'}</span></div>
                  <div className="button-row"><button type="button" onClick={() => handleEditShopItem(item)}>Edit</button><button type="button" onClick={() => handleDeleteShopItem(item.id)}>Arsipkan</button></div>
                </div>
              )) : <p>Belum ada item shop.</p>}
            </div>
          </PixelCard>
        </section>
      ) : null}

      {activeTab === 'health' ? (
        <section className="two-column">
          <PixelCard>
            <h2>Admin Health Check</h2>
            <p>Masalah terdeteksi: {systemHealth.total} · Bahaya: {systemHealth.danger} · Peringatan: {systemHealth.warning}</p>
            <PixelButton type="button" variant="secondary" onClick={handleRepairAllMembers}>Perbaiki Data Member Lama</PixelButton>
          </PixelCard>
          <PixelCard>
            <h2>Detail Temuan</h2>
            <div className="compact-list">
              {systemHealth.reports.length ? systemHealth.reports.slice(0, 30).map((report, index) => (
                <div className={`admin-list-row ${report.level}`} key={`${report.message}-${index}`}><strong>{report.level}</strong><span>{report.message}</span></div>
              )) : <p>Tidak ada masalah besar yang terdeteksi.</p>}
            </div>
          </PixelCard>
        </section>
      ) : null}

      {activeTab === 'final-projects' ? (
        <section className="material-list">
          {finalSubmissions.length ? finalSubmissions.map((submission) => (
            <PixelCard key={submission.id}>
              <div className="section-title-row"><div><p className="eyebrow">{submission.status}</p><h2>{submission.title}</h2><p>{submission.memberName} · {submission.nim}</p></div></div>
              <p>{submission.description}</p>
              <div className="button-row">
                {submission.demoUrl ? <a className="pixel-button secondary" href={submission.demoUrl} target="_blank" rel="noreferrer">Demo</a> : null}
                {submission.githubUrl ? <a className="pixel-button secondary" href={submission.githubUrl} target="_blank" rel="noreferrer">GitHub</a> : null}
                {submission.screenshotUrl ? <a className="pixel-button secondary" href={submission.screenshotUrl} target="_blank" rel="noreferrer">Screenshot</a> : null}
              </div>
              <label className="form-field">Catatan Admin<textarea value={certificateReviewNotes[submission.id] || submission.adminNote || ''} onChange={(e) => setCertificateReviewNotes({ ...certificateReviewNotes, [submission.id]: e.target.value })} /></label>
              <div className="button-row"><PixelButton type="button" onClick={() => handleReviewFinalProject(submission, 'approved')}>Approve</PixelButton><PixelButton type="button" variant="secondary" onClick={() => handleReviewFinalProject(submission, 'revision')}>Minta Revisi</PixelButton><PixelButton type="button" variant="ghost" onClick={() => handleReviewFinalProject(submission, 'rejected')}>Reject</PixelButton></div>
            </PixelCard>
          )) : <PixelCard><h2>Belum ada Final Project</h2><p>Submission anggota akan tampil di sini.</p></PixelCard>}
        </section>
      ) : null}

      {activeTab === 'certificates' ? (
        <section className="two-column">
          <PixelCard>
            <h2>Pengaturan Sertifikat</h2>
            <form className="form-stack" onSubmit={handleCertificateSettingsSubmit}>
              <label>Nama Program<input value={certificateSettings.programName || ''} onChange={(e) => setCertificateSettings({ ...certificateSettings, programName: e.target.value })} /></label>
              <label>Nama Lembaga<input value={certificateSettings.organizationName || ''} onChange={(e) => setCertificateSettings({ ...certificateSettings, organizationName: e.target.value })} /></label>
              <label>Nama Penanda Tangan<input value={certificateSettings.signerName || ''} onChange={(e) => setCertificateSettings({ ...certificateSettings, signerName: e.target.value })} /></label>
              <label>Jabatan<input value={certificateSettings.signerTitle || ''} onChange={(e) => setCertificateSettings({ ...certificateSettings, signerTitle: e.target.value })} /></label>
              <label>Syarat<textarea value={certificateSettings.requirementText || ''} onChange={(e) => setCertificateSettings({ ...certificateSettings, requirementText: e.target.value })} /></label>
              <label>Logo URL<input value={certificateSettings.logoUrl || ''} onChange={(e) => setCertificateSettings({ ...certificateSettings, logoUrl: e.target.value })} /></label>
              <label>Tanda Tangan URL<input value={certificateSettings.signatureUrl || ''} onChange={(e) => setCertificateSettings({ ...certificateSettings, signatureUrl: e.target.value })} /></label>
              <label>Stempel URL<input value={certificateSettings.stampUrl || ''} onChange={(e) => setCertificateSettings({ ...certificateSettings, stampUrl: e.target.value })} /></label>
              <PixelButton type="submit">Simpan Pengaturan</PixelButton>
            </form>
          </PixelCard>
          <PixelCard>
            <h2>Eligible Sertifikat</h2>
            <div className="compact-list">
              {allMembers.filter((member) => member.finalProjectStatus === 'approved').map((member) => (
                <div className="admin-list-row" key={member.uid}><div><strong>{member.name}</strong><span>{member.certificateStatus === 'issued' ? member.certificateCode : 'Belum diterbitkan'}</span></div>{member.certificateStatus === 'issued' ? null : <PixelButton type="button" onClick={() => handleIssueCertificate(member)}>Terbitkan</PixelButton>}</div>
              ))}
            </div>
            <h2>Daftar Sertifikat</h2>
            <div className="compact-list">
              {certificates.length ? certificates.map((certificate) => (
                <div className="admin-list-row" key={certificate.code || certificate.id}><div><strong>{certificate.code || certificate.id}</strong><span>{certificate.memberName} · {certificate.status}</span></div>{certificate.status !== 'revoked' ? <button type="button" onClick={() => handleRevokeCertificate(certificate)}>Revoke</button> : null}</div>
              )) : <p>Belum ada sertifikat.</p>}
            </div>
          </PixelCard>
        </section>
      ) : null}

      {activeTab === 'media' ? (
        <section className="two-column">
          <PixelCard>
            <h2>Media Manager</h2>
            <form className="form-stack" onSubmit={handleMediaSubmit}>
              <label>Judul Media<input value={mediaForm.title} onChange={(e) => setMediaForm({ ...mediaForm, title: e.target.value })} /></label>
              <label>Pilih Gambar<input type="file" accept="image/*" onChange={handleMediaFileUpload} /></label>
              {mediaForm.dataUrl ? <img className="media-preview" src={mediaForm.dataUrl} alt={mediaForm.title || 'Preview'} /> : null}
              <PixelButton type="submit" disabled={!mediaForm.dataUrl}>Simpan Media</PixelButton>
            </form>
          </PixelCard>
          <PixelCard>
            <h2>Daftar Media</h2>
            <div className="compact-list">
              {mediaAssets.length ? mediaAssets.map((asset) => (
                <div className="media-asset-row" key={asset.id}><img src={asset.dataUrl} alt={asset.title} /><div><strong>{asset.title}</strong><textarea readOnly value={asset.markdown || `![${asset.title}](${asset.dataUrl})`} /></div><button type="button" onClick={() => handleDeleteMedia(asset.id)}>Hapus</button></div>
              )) : <p>Belum ada media.</p>}
            </div>
          </PixelCard>
        </section>
      ) : null}

      {activeTab === 'content-tools' ? (
        <section className="two-column">
          <PixelCard><h2>Export Konten Belajar</h2><p>Export hanya courses, courseSections, dan questions.</p><PixelButton type="button" onClick={handleExportLearningContent}>Export Konten</PixelButton></PixelCard>
          <PixelCard><h2>Import Konten Belajar</h2><p>Import JSON konten belajar. Gunakan file dari export konten.</p><input type="file" accept="application/json,.json" onChange={handleImportLearningContent} /></PixelCard>
        </section>
      ) : null}

      {activeTab === 'reports' ? (
        <section className="admin-report-layout">
          <PixelCard>
            <p className="eyebrow">Laporan User</p>
            <h2>Laporan Materi & Soal</h2>
            <p>
              Daftar laporan dari siswa ketika ada materi membingungkan, gambar rusak,
              kode tidak tampil, atau jawaban quiz keliru.
            </p>
          </PixelCard>

          <section className="admin-report-list">
            {(contentData.contentReports || []).length ? (
              (contentData.contentReports || []).map((report) => (
                <PixelCard className={`admin-report-card ${report.status === 'resolved' ? 'is-resolved' : 'is-open'}`} key={report.id}>
                  <div className="section-title-row">
                    <div>
                      <p className="eyebrow">{report.type || 'laporan'}</p>
                      <h3>{report.targetTitle || `Stage ${report.courseId}`}</h3>
                      <p>
                        {report.memberName || 'Anggota'} · Stage {report.courseId || '-'} · {formatAdminDate(report.createdAt)}
                      </p>
                    </div>
                    <span className={`status-pill ${report.status || 'open'}`}>{report.status || 'open'}</span>
                  </div>

                  <p>{report.message}</p>

                  <div className="member-actions">
                    {report.status !== 'resolved' ? (
                      <PixelButton type="button" onClick={() => handleResolveContentReport(report, 'resolved')}>
                        Tandai Selesai
                      </PixelButton>
                    ) : (
                      <PixelButton type="button" variant="secondary" onClick={() => handleResolveContentReport(report, 'open')}>
                        Buka Lagi
                      </PixelButton>
                    )}
                  </div>
                </PixelCard>
              ))
            ) : (
              <PixelCard className="locked-panel">
                <span className="big-icon">✅</span>
                <h2>Belum ada laporan</h2>
                <p>Kalau siswa melaporkan materi atau soal, laporannya akan muncul di sini.</p>
              </PixelCard>
            )}
          </section>
        </section>
      ) : null}

      {activeTab === 'audit' ? (
        <section className="admin-report-layout">
          <PixelCard>
            <p className="eyebrow">Audit Log</p>
            <h2>Riwayat Aksi Penting Admin</h2>
            <p>Audit log membantu melacak perubahan data penting seperti reset, restore, edit reward, edit stage, dan approve challenge.</p>
          </PixelCard>

          <section className="admin-audit-list">
            {(contentData.auditLogs || []).length ? (
              (contentData.auditLogs || []).slice(0, 80).map((log) => (
                <PixelCard className="admin-audit-card" key={log.id || `${log.action}-${log.createdAt}`}>
                  <div className="section-title-row">
                    <div>
                      <p className="eyebrow">{log.action || 'system'}</p>
                      <h3>{log.message || 'Aktivitas admin'}</h3>
                      <p>{formatAdminDate(log.createdAt)}</p>
                    </div>
                  </div>
                </PixelCard>
              ))
            ) : (
              <PixelCard className="locked-panel">
                <span className="big-icon">🧾</span>
                <h2>Audit log belum ada</h2>
                <p>Audit log akan terisi otomatis setelah admin melakukan aksi penting.</p>
              </PixelCard>
            )}
          </section>
        </section>
      ) : null}

      {activeTab === 'backup' ? (
  <section className="backup-admin-section">
    <PixelCard>
      <h2>Backup Data</h2>
      <p>
        Unduh salinan data Firestore untuk arsip pengurus. Lakukan backup sebelum
        reset data member, edit reward besar-besaran, atau deploy update penting.
      </p>

      <PixelButton onClick={handleExport}>
        Export Backup JSON
      </PixelButton>
    </PixelCard>

    <PixelCard className="restore-backup-card">
      <h2>Restore Backup</h2>
      <p>
        Gunakan ini hanya kalau data Firestore rusak, terhapus, atau ingin
        mengembalikan data lama dari file backup.
      </p>

      <label className="backup-file-picker">
        <span>Pilih file backup JSON</span>
        <input
          type="file"
          accept="application/json,.json"
          onChange={handleRestoreBackup}
        />
      </label>

      <div className="backup-warning-box">
        <strong>Perhatian:</strong>
        <p>
          Data dengan ID yang sama akan ditimpa. Restore ini tidak menghapus data
          yang tidak ada di file backup, tapi tetap bisa menimpa data lama.
        </p>
      </div>
    </PixelCard>
  </section>
) : null}
    </main>
  );
}
