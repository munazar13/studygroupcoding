import { useEffect, useMemo, useState } from 'react';
import LoadingState from '../components/LoadingState';
import PixelButton from '../components/PixelButton';
import PixelCard from '../components/PixelCard';
import StatCard from '../components/StatCard';
import AdminPreviewContent from '../components/AdminPreviewContent';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import {
  approveChallengeSubmission,
  rejectChallengeSubmission,
  cleanMemberData,
  exportAllData,
  grantMemberReward,
  importSystemData,
  loadAdminContentData,
  loadChallengeData,
  loadLearningData,
  loadPublicData,
  removeRecord,
  resetMemberChallenges,
  resetMemberEconomy,
  resetMemberProgress,
  resetMemberRewards,
  restoreBackupData,
  setMemberStatus,
  updateMemberAdminStats,
  upsertChallenge,
  upsertCourse,
  upsertCourseSection,
  upsertDoc,
  upsertEvent,
  upsertProject,
  upsertQuestion,
  upsertReward,
  deleteReward
} from '../services/dataApi';
import { downloadTextFile } from '../utils/download';
import { RARITY_LIST, getRarityClassName, getRarityLabel } from '../utils/rarity';
const tabs = [
{ id: 'overview', label: 'Ringkasan' },
{ id: 'members', label: 'Anggota' },
{ id: 'learning-content', label: 'Konten Belajar' },
{ id: 'events', label: 'Agenda' },
{ id: 'docs', label: 'Dokumentasi' },
{ id: 'projects', label: 'Karya' },
{ id: 'challenges', label: 'Tantangan' },
{ id: 'rewards', label: 'Reward' },
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
  const [challengeData, setChallengeData] = useState({ challenges: [], challengeSubmissions: [] });
  const [challengeForm, setChallengeForm] = useState(emptyChallenge);
  const [rewardForm, setRewardForm] = useState(emptyReward);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [memberEditForm, setMemberEditForm] = useState({
  level: 1,
  xp: 0,
  xpToNextLevel: 100,
  totalXp: 0,
  coins: 0
});
  const [memberRewardGrantId, setMemberRewardGrantId] = useState('');

  async function reload() {
  setLoading(true);

  try {
    const [publicResult, learningResult, contentResult, challengeResult] = await Promise.all([
      loadPublicData(),
      loadLearningData(),
      loadAdminContentData(),
      loadChallengeData()
    ]);

    setPublicData(publicResult);
    setLearningData(learningResult);
    setContentData(contentResult);
    setChallengeData(challengeResult);
  } catch (error) {
    console.error(error);
    showToast(error.message || 'Gagal memuat data admin.', 'error');
  } finally {
    setLoading(false);
  }
}

  useEffect(() => {
    reload();
  }, []);

  const pendingMembers = useMemo(() => learningData.members.filter((member) => member.status === 'pending'), [learningData]);
  const allMembers = learningData.members;
  const sortedCourses = useMemo(() => {
  return [...contentData.courses].sort((a, b) => Number(a.order || a.stage || 0) - Number(b.order || b.stage || 0));
}, [contentData.courses]);

const activeCourseId = selectedCourseId || sortedCourses[0]?.id || '';

const selectedCourse = useMemo(() => {
  return sortedCourses.find((course) => String(course.id) === String(activeCourseId)) || null;
}, [sortedCourses, activeCourseId]);

const selectedCourseSections = useMemo(() => {
  return contentData.courseSections
    .filter((section) => String(section.courseId) === String(activeCourseId))
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
}, [contentData.courseSections, activeCourseId]);

const selectedCourseQuestions = useMemo(() => {
  return contentData.questions
    .filter((question) => String(question.courseId) === String(activeCourseId))
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
}, [contentData.questions, activeCourseId]);

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



setSectionForm((current) => ({
...current,
courseId: String(selectedCourse.id || '')
}));

setQuestionForm((current) => ({
...current,
courseId: String(selectedCourse.id || '')
}));
}, [activeTab, selectedCourse]);

function createCodeSnippet(language = 'php') {
  const fence = String.fromCharCode(96).repeat(3);

  return `${fence}${language}

${fence}`;
}

function createImageSnippet() {
  return '![Judul gambar](images/materials/nama-file.png)';
}

function appendToSectionContent(snippet) {
  setSectionForm((current) => {
    const oldContent = String(current.content || '').trimEnd();

    return {
      ...current,
      content: oldContent ? `${oldContent}\n\n${snippet}` : snippet
    };
  });
}

function appendToQuestionField(fieldName, snippet) {
  setQuestionForm((current) => {
    const oldContent = String(current[fieldName] || '').trimEnd();

    return {
      ...current,
      [fieldName]: oldContent ? `${oldContent}\n\n${snippet}` : snippet
    };
  });
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
      const confirmReject = window.confirm(
        `Tolak dan hapus data anggota "${member.name}"?`
      );

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

  const confirmed = window.confirm(
    `Berikan reward "${reward.name || reward.title || reward.id}" ke "${selectedMember.name}"?`
  );

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

  const confirmed = window.confirm(
    `Simpan perubahan stat untuk "${selectedMember.name}"?`
  );

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

  const confirmed = window.confirm(
    `Reset progress belajar "${selectedMember.name}"?\n\nLevel, XP, stage selesai, dan riwayat quiz akan direset.`
  );

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

  const confirmed = window.confirm(
    `Reset semua reward "${selectedMember.name}"?\n\nBadge, title, chest, dan reward aktif akan dihapus.`
  );

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

  const confirmed = window.confirm(
    `Reset koin "${selectedMember.name}"?\n\nSaldo koin dan riwayat transaksi akan dihapus.`
  );

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

  const confirmed = window.confirm(
    `Reset data tantangan "${selectedMember.name}"?\n\nSubmission dan challenge selesai akan dikosongkan.`
  );

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

  const confirmed = window.confirm(
    `Bersihkan data "${selectedMember.name}"?\n\nDuplikat reward/stage akan dibersihkan dan angka negatif diperbaiki.`
  );

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
    const courseId = String(questionForm.courseId || activeCourseId);

    await upsertQuestion({
      ...questionForm,
      id: questionForm.id || `question-${courseId}-${Date.now()}`,
      courseId,
      correctIndex: Number(questionForm.correctIndex || 0)
    });

    setQuestionForm({
      ...emptyQuestion,
      courseId,
      order: selectedCourseQuestions.length + 1
    });

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
  const confirmed = window.confirm('Yakin ingin menghapus reward ini?');

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
  const ok = window.confirm(
    `Approve submission dari ${submission.memberName || 'anggota'}?\n\nReward akan langsung diberikan.`
  );

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
  async function handleRestoreBackup(event) {
  const file = event.target.files?.[0];

  if (!file) return;

  const confirmed = window.confirm(
    'Restore backup JSON?\n\nData dengan ID yang sama akan ditimpa oleh isi backup. Pastikan file backup benar.'
  );

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
            </ul>
          </PixelCard>
        </section>
      ) : null}



      {activeTab === 'members' ? (
  <>
    <section className="card-grid">
      {allMembers.length ? allMembers.map((member) => (
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
        <PixelCard>Belum ada anggota.</PixelCard>
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
      <PixelButton type="submit">Simpan Stage</PixelButton>
      <PixelButton
        type="button"
        variant="secondary"
        onClick={() => setCourseForm(emptyCourse)}
      >
        Kosongkan Form
      </PixelButton>
    </div>
  </form>
</div>

            

            <div className="content-editor-section">
  <div className="section-title-row">
    <h3>Materi Stage Ini</h3>
    <span>{selectedCourseSections.length} materi</span>
  </div>

  <form className="form-stack" onSubmit={handleSectionSubmit}>
    <input
      min="1"
      type="number"
      placeholder="Urutan materi"
      value={sectionForm.order}
      onChange={(e) => setSectionForm({ ...sectionForm, order: e.target.value })}
    />

    <input
      required
      placeholder="Judul materi"
      value={sectionForm.title}
      onChange={(e) => setSectionForm({ ...sectionForm, title: e.target.value })}
    />

    <textarea
      className="large-textarea"
      required
      placeholder="Isi materi. Pisahkan paragraf dengan enter."
      value={sectionForm.content}
      onChange={(e) => setSectionForm({ ...sectionForm, content: e.target.value })}
    />

    <div className="admin-insert-toolbar">
      <button
        type="button"
        onClick={() => appendToSectionContent(createCodeSnippet('php'))}
      >
        + Kode PHP
        </button>

        <button
          type="button"
          onClick={() => appendToSectionContent(createCodeSnippet('html'))}
        >
          + Kode HTML
        </button>

        <button
          type="button"
          onClick={() => appendToSectionContent(createCodeSnippet('css'))}
        >
          + Kode CSS
        </button>

        <button
          type="button"
          onClick={() => appendToSectionContent(createCodeSnippet('js'))}
        >
          + Kode JS
        </button>

        <button
          type="button"
          onClick={() => appendToSectionContent(createImageSnippet())}
        >
          + Gambar
        </button>
      </div>

    <div className="admin-preview-box">
      <div className="section-title-row">
        <h4>Preview Materi</h4>
        <span>Code / gambar / paragraf</span>
      </div>

      <div className="admin-preview-content">
        <AdminPreviewContent content={sectionForm.content} prefix="material-preview" />
      </div>
    </div>

    <textarea
      placeholder="Contoh kode, opsional"
      value={sectionForm.code}
      onChange={(e) => setSectionForm({ ...sectionForm, code: e.target.value })}
    />

    <input
      placeholder="Checkpoint / ringkasan kecil"
      value={sectionForm.checkpoint}
      onChange={(e) => setSectionForm({ ...sectionForm, checkpoint: e.target.value })}
    />

    <label className="check-line">
      <input
        type="checkbox"
        checked={sectionForm.published}
        onChange={(e) => setSectionForm({ ...sectionForm, published: e.target.checked })}
      />
      Publish materi
    </label>

    <div className="member-actions">
      <PixelButton
        type="submit"
        onClick={() => setSectionForm((current) => ({
          ...current,
          courseId: String(activeCourseId)
        }))}
      >
        Simpan Materi
      </PixelButton>

      <PixelButton
        type="button"
        variant="secondary"
        onClick={() => setSectionForm({
          ...emptySection,
          courseId: String(activeCourseId),
          order: selectedCourseSections.length + 1
        })}
      >
        Materi Baru
      </PixelButton>
    </div>
  </form>

  <div className="admin-list compact-list">
    {selectedCourseSections.length ? selectedCourseSections.map((section) => (
      <div className="editor-card" key={section.id}>
        <div>
          <strong>{section.order}. {section.title}</strong>
          <p>{section.published ? 'Published' : 'Draft'}</p>
        </div>

        <div className="member-actions">
          <PixelButton
            type="button"
            variant="secondary"
            onClick={() => setSectionForm({
              ...emptySection,
              ...section,
              courseId: String(activeCourseId),
              published: section.published !== false
            })}
          >
            Edit
          </PixelButton>

          <PixelButton
            type="button"
            variant="danger"
            onClick={() => handleDelete('courseSections', section.id)}
          >
            Hapus
          </PixelButton>
        </div>
      </div>
    )) : (
      <p>Belum ada materi untuk stage ini. Tulis materi pertama lewat form di atas.</p>
    )}
  </div>
</div>
<div className="content-editor-section">
  <div className="section-title-row">
    <h3>Soal Stage Ini</h3>
    <span>{selectedCourseQuestions.length} soal</span>
  </div>

  <form className="form-stack" onSubmit={handleQuestionSubmit}>
    <input
      min="1"
      type="number"
      placeholder="Urutan soal"
      value={questionForm.order}
      onChange={(e) => setQuestionForm({ ...questionForm, order: e.target.value })}
    />

    <textarea
      required
      placeholder="Pertanyaan"
      value={questionForm.question}
      onChange={(e) => setQuestionForm({ ...questionForm, question: e.target.value })}
    />

    <div className="admin-insert-toolbar">
      <button
        type="button"
        onClick={() => appendToQuestionField('question', createCodeSnippet('php'))}
      >
        + Kode PHP
      </button>

      <button
        type="button"
        onClick={() => appendToQuestionField('question', createCodeSnippet('html'))}
      >
        + Kode HTML
      </button>

      <button
        type="button"
        onClick={() => appendToQuestionField('question', createCodeSnippet('js'))}
      >
        + Kode JS
      </button>

      <button
        type="button"
        onClick={() => appendToQuestionField('question', createImageSnippet())}
      >
        + Gambar
      </button>
    </div>

    <div className="admin-preview-box">
      <div className="section-title-row">
        <h4>Preview Pertanyaan</h4>
        <span>Soal</span>
      </div>

      <div className="admin-preview-content">
        <AdminPreviewContent content={questionForm.question} prefix="question-preview" />
      </div>
    </div>

    <div className="form-row">
      <textarea
        required
        placeholder="Pilihan A"
        value={questionForm.optionA}
        onChange={(e) => setQuestionForm({ ...questionForm, optionA: e.target.value })}
      />
      <button
        className="mini-insert-button"
        type="button"
        onClick={() => appendToQuestionField('optionA', createCodeSnippet('txt'))}
      >
        + Kode ke A
      </button>

      <textarea
        required
        placeholder="Pilihan B"
        value={questionForm.optionB}
        onChange={(e) => setQuestionForm({ ...questionForm, optionB: e.target.value })}
      />
      <button
        className="mini-insert-button"
        type="button"
        onClick={() => appendToQuestionField('optionB', createCodeSnippet('txt'))}
      >
        + Kode ke B
      </button>
    </div>

    <div className="form-row">
      <textarea
        required
        placeholder="Pilihan C"
        value={questionForm.optionC}
        onChange={(e) => setQuestionForm({ ...questionForm, optionC: e.target.value })}
      />
      <button
        className="mini-insert-button"
        type="button"
        onClick={() => appendToQuestionField('optionC', createCodeSnippet('txt'))}
      >
        + Kode ke C
      </button>

      <textarea
        required
        placeholder="Pilihan D"
        value={questionForm.optionD}
        onChange={(e) => setQuestionForm({ ...questionForm, optionD: e.target.value })}
      />
      <button
        className="mini-insert-button"
        type="button"
        onClick={() => appendToQuestionField('optionD', createCodeSnippet('txt'))}
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
            <AdminPreviewContent content={questionForm.optionA} prefix="option-a-preview" />
          </div>
        </div>

        <div>
          <strong>B</strong>
          <div className="admin-preview-content">
            <AdminPreviewContent content={questionForm.optionB} prefix="option-b-preview" />
          </div>
        </div>

        <div>
          <strong>C</strong>
          <div className="admin-preview-content">
            <AdminPreviewContent content={questionForm.optionC} prefix="option-c-preview" />
          </div>
        </div>

            <div>
              <strong>D</strong>
              <div className="admin-preview-content">
                <AdminPreviewContent content={questionForm.optionD} prefix="option-d-preview" />
              </div>
            </div>
          </div>
        </div>

    <select
      value={questionForm.correctIndex}
      onChange={(e) => setQuestionForm({ ...questionForm, correctIndex: Number(e.target.value) })}
    >
      <option value={0}>Jawaban benar: A</option>
      <option value={1}>Jawaban benar: B</option>
      <option value={2}>Jawaban benar: C</option>
      <option value={3}>Jawaban benar: D</option>
    </select>

    <textarea
      required
      placeholder="Pembahasan jawaban"
      value={questionForm.explanation}
      onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })}
    />

    <div className="admin-insert-toolbar">
      <button
        type="button"
        onClick={() => appendToQuestionField('explanation', createCodeSnippet('php'))}
      >
        + Kode PHP
      </button>

      <button
        type="button"
        onClick={() => appendToQuestionField('explanation', createCodeSnippet('html'))}
      >
        + Kode HTML
      </button>

      <button
        type="button"
        onClick={() => appendToQuestionField('explanation', createCodeSnippet('js'))}
      >
        + Kode JS
      </button>

      <button
        type="button"
        onClick={() => appendToQuestionField('explanation', createImageSnippet())}
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
        <AdminPreviewContent content={questionForm.explanation} prefix="explanation-preview" />
      </div>
    </div>

    <label className="check-line">
      <input
        type="checkbox"
        checked={questionForm.published}
        onChange={(e) => setQuestionForm({ ...questionForm, published: e.target.checked })}
      />
      Publish soal
    </label>

    <div className="member-actions">
      <PixelButton type="submit">
        Simpan Soal
      </PixelButton>

      <PixelButton
        type="button"
        variant="secondary"
        onClick={() => setQuestionForm({
          ...emptyQuestion,
          courseId: String(activeCourseId),
          order: selectedCourseQuestions.length + 1
        })}
      >
        Soal Baru
      </PixelButton>
    </div>
  </form>

  <div className="admin-list compact-list">
    {selectedCourseQuestions.length ? selectedCourseQuestions.map((question) => (
      <div className="editor-card" key={question.id}>
        <div>
          <strong>{question.order}. {question.question}</strong>
          <p>
            Stage {question.courseId} · Jawaban benar: {
              ['A', 'B', 'C', 'D'][Number(question.correctIndex || 0)]
            } · {question.published ? 'Published' : 'Draft'}
          </p>
        </div>

        <div className="member-actions">
          <PixelButton
            type="button"
            variant="secondary"
            onClick={() => setQuestionForm({
              ...questionToForm(question),
              courseId: String(activeCourseId),
              published: question.published !== false
            })}
          >
            Edit
          </PixelButton>

          <PixelButton
            type="button"
            variant="danger"
            onClick={() => handleDelete('questions', question.id)}
          >
            Hapus
          </PixelButton>
        </div>
      </div>
    )) : (
      <p>Belum ada soal untuk stage ini. Tambahkan soal pertama lewat form di atas.</p>
    )}
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
                <label htmlFor="">nilai minimal</label>
                <input min="0" max="100" type="number" placeholder="Nilai minimal" value={courseForm.minScore} onChange={(e) => setCourseForm({ ...courseForm, minScore: e.target.value })} />
                <label htmlFor="">jumlah xp</label>
                <input min="0" type="number" placeholder="XP reward" value={courseForm.xpReward} onChange={(e) => setCourseForm({ ...courseForm, xpReward: e.target.value })} />
                <label htmlFor="">jumlah koin</label>
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
