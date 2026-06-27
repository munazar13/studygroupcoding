import {
  createActivity,
  deleteDocument,
  getCollection,
  getDocument,
  seedCoreData,
  setDocument,
  updateMember
} from './firebase';

import { addCoinsToMember, addXpToMember } from '../utils/levelSystem';
import { normalizeRarity } from '../utils/rarity';
import seedRewards from '../data/rewards.json';
import seedRanks from '../data/ranks.json';
import seedFounders from '../data/founders.json';

export const localSeed = {
  rewards: seedRewards,
  ranks: seedRanks,
  founders: seedFounders,
  events: [],
  docs: [],
  projects: [],
  challenges: [],
  challengeSubmissions: []
};

function asNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function sortByOrder(items = []) {
  return [...items].sort((a, b) => {
    const first = asNumber(a.order || a.stage || a.id, 0);
    const second = asNumber(b.order || b.stage || b.id, 0);

    return first - second;
  });
}


function mergeById(primary = [], fallback = []) {
  const map = new Map();

  [...fallback, ...primary].forEach((item) => {
    if (!item || !item.id) return;
    map.set(String(item.id), item);
  });

  return Array.from(map.values());
}

function createSafeId(text, prefix = 'item') {
  const safeText = String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return `${prefix}-${safeText || Date.now()}`;
}

function makeUniqueList(items = []) {
  return Array.from(new Set(items.filter(Boolean).map((item) => String(item))));
}

function normalizeCourse(course) {
  if (!course) return null;

  const stageNumber = asNumber(course.stage || course.order || course.id, 1);

  const badgeName = String(course.badgeName || course.badgeTitle || '').trim();
  const badgeRewardEnabled = course.badgeRewardEnabled === true || Boolean(course.badgeId || badgeName);
  const badgeId = String(
    course.badgeId || (badgeRewardEnabled && badgeName ? createSafeId(badgeName, `stage-${stageNumber}-badge`) : '')
  ).trim();

  const titleRewardName = String(course.titleRewardName || course.titleName || '').trim();
  const titleRewardEnabled = course.titleRewardEnabled === true || Boolean(course.titleRewardId || titleRewardName);
  const titleRewardId = String(
    course.titleRewardId || (titleRewardEnabled && titleRewardName ? createSafeId(titleRewardName, `stage-${stageNumber}-title`) : '')
  ).trim();

  const chestName = String(course.chestName || '').trim();
  const hasChestReward = course.hasChestReward === true || Boolean(course.chestId || chestName);
  const chestId = String(
    course.chestId || (hasChestReward && chestName ? createSafeId(chestName, `stage-${stageNumber}-chest`) : '')
  ).trim();

  return {
    ...course,
    id: String(course.id || stageNumber),
    stage: stageNumber,
    order: asNumber(course.order || stageNumber, stageNumber),
    minScore: asNumber(course.minScore, 70),
    xpReward: asNumber(course.xpReward, 100),
    coinReward: asNumber(course.coinReward, 25),

    badgeRewardEnabled,
    badgeId,
    badgeName,
    badgeDescription: String(course.badgeDescription || '').trim(),
    badgeIcon: String(course.badgeIcon || '🏅').trim() || '🏅',
    badgeRarity: String(course.badgeRarity || 'common').trim() || 'common',

    titleRewardEnabled,
    titleRewardId,
    titleRewardName,
    titleRewardDescription: String(course.titleRewardDescription || '').trim(),
    titleRewardIcon: String(course.titleRewardIcon || '🎖️').trim() || '🎖️',
    titleRewardRarity: String(course.titleRewardRarity || 'common').trim() || 'common',

    hasChestReward,
    chestId,
    chestName,
    chestDescription: String(course.chestDescription || '').trim(),
    chestIcon: String(course.chestIcon || '🎁').trim() || '🎁',
    chestRarity: String(course.chestRarity || 'common').trim() || 'common',

    published: course.published !== false
  };
}

function normalizeSection(section) {
  if (!section) return null;

  return {
    ...section,
    id: String(section.id || `section-${Date.now()}`),
    courseId: String(section.courseId || section.stageId || ''),
    order: asNumber(section.order, 1),
    published: section.published !== false
  };
}

function normalizeQuestion(question) {
  if (!question) return null;

  const options = Array.isArray(question.options)
    ? question.options.filter((option) => String(option).trim())
    : [];

  return {
    ...question,
    id: String(question.id || `q-${Date.now()}`),
    courseId: String(question.courseId || question.stageId || question.levelId || ''),
    order: asNumber(question.order, 1),
    type: question.type || 'multiple-choice',
    options,
    correctIndex: asNumber(question.correctIndex, 0),
    published: question.published !== false
  };
}

function normalizeReward(reward) {
  if (!reward) return null;

  const type = String(reward.type || reward.category || 'badge')
    .trim()
    .toLowerCase();

  const name = String(reward.name || reward.title || '')
    .trim();

  const id = String(
    reward.id || createSafeId(name || type, type)
  ).trim();

  const now = new Date().toISOString();

  return {
    ...reward,
    id,
    type,
    category: type,
    name,
    title: name,
    description: String(reward.description || '').trim(),
    icon: String(
      reward.icon || (type === 'title' ? '🎖️' : type === 'chest' ? '🎁' : '🏅')
    ).trim(),
    rarity: normalizeRarity(reward.rarity || 'common'),
    requirement: String(reward.requirement || '').trim(),
    source: String(reward.source || 'master').trim(),
    published: reward.published !== false,
    order: asNumber(reward.order, 999),
    createdAt: reward.createdAt || now,
    updatedAt: now
  };
}

function normalizeChallenge(challenge) {
  if (!challenge) return null;

  const rewardType = String(challenge.rewardType || 'coins').trim();

  const rewardName = String(
    challenge.rewardName ||
      challenge.reward?.name ||
      challenge.reward?.title ||
      ''
  ).trim();

  const rewardDescription = String(
    challenge.rewardDescription ||
      challenge.reward?.description ||
      ''
  ).trim();

  const rewardIcon = String(
    challenge.rewardIcon ||
      challenge.reward?.icon ||
      ''
  ).trim();

  const rewardRarity = String(
    challenge.rewardRarity ||
      challenge.reward?.rarity ||
      'common'
  ).trim();

  const rewardId = String(
    challenge.rewardId ||
      challenge.reward?.id ||
      (['badge', 'title', 'chest'].includes(rewardType) && rewardName
        ? createSafeId(rewardName, rewardType)
        : '')
  ).trim();

  const rewardXp = asNumber(challenge.rewardXp, 0);
  const rewardCoins = asNumber(challenge.rewardCoins, 0);

  return {
    ...challenge,
    id: String(challenge.id || `challenge-${Date.now()}`),
    title: String(challenge.title || '').trim(),
    description: String(challenge.description || '').trim(),

    rewardType,
    rewardId,
    rewardName,
    rewardDescription,
    rewardIcon,
    rewardRarity,
    rewardXp,
    rewardCoins,

    reward: {
      type: rewardType,
      id: rewardId,
      name: rewardName,
      title: rewardName,
      description: rewardDescription,
      icon: rewardIcon,
      rarity: rewardRarity,
      xp: rewardXp,
      coins: rewardCoins
    },

    startDate: challenge.startDate || '',
    endDate: challenge.endDate || '',
    proofRequired: challenge.proofRequired !== false,
    featuredOnHome: challenge.featuredOnHome !== false,
    published: challenge.published !== false,
    order: asNumber(challenge.order, 1)
  };
}

function normalizeChallengeSubmission(submission) {
  if (!submission) return null;

  return {
    ...submission,
    id: String(submission.id || `submission-${Date.now()}`),
    challengeId: String(submission.challengeId || ''),
    uid: String(submission.uid || ''),
    memberName: String(submission.memberName || ''),
    proofText: String(submission.proofText || '').trim(),
    proofUrl: String(submission.proofUrl || '').trim(),
    status: submission.status || 'pending',
    rewardGiven: submission.rewardGiven === true,
    rewardText: String(submission.rewardText || ''),
    submittedAt: submission.submittedAt || new Date().toISOString(),
    reviewedAt: submission.reviewedAt || ''
  };
}

function getChallengeReward(challenge) {
  const reward = challenge.reward || {};

  return {
    type: String(challenge.rewardType || reward.type || 'coins'),
    id: String(challenge.rewardId || reward.id || ''),
    name: String(challenge.rewardName || reward.name || reward.title || ''),
    description: String(challenge.rewardDescription || reward.description || ''),
    icon: String(challenge.rewardIcon || reward.icon || ''),
    rarity: String(challenge.rewardRarity || reward.rarity || 'common'),
    xp: asNumber(challenge.rewardXp || reward.xp, 0),
    coins: asNumber(challenge.rewardCoins || reward.coins, 0)
  };
}


function createStageRewardDoc(course, type) {
  const stageNumber = asNumber(course.stage || course.order || course.id, 1);
  const isBadge = type === 'badge';
  const id = isBadge ? course.badgeId : course.titleRewardId;
  const name = isBadge ? course.badgeName : course.titleRewardName;

  if (!id || !name) {
    return null;
  }

  return {
    id,
    type,
    category: type,
    title: name,
    name,
    description: isBadge
      ? (course.badgeDescription || `Badge dari Stage ${stageNumber}: ${course.title}.`)
      : (course.titleRewardDescription || `Title dari Stage ${stageNumber}: ${course.title}.`),
    icon: isBadge ? (course.badgeIcon || '🏅') : (course.titleRewardIcon || '🎖️'),
    rarity: isBadge ? (course.badgeRarity || 'common') : (course.titleRewardRarity || 'common'),
    requirement: `Selesaikan Stage ${stageNumber}: ${course.title}`,
    source: 'course',
    sourceStageId: String(course.id || stageNumber),
    sourceStage: stageNumber,
    published: true,
    order: stageNumber * 10 + (isBadge ? 1 : 2)
  };
}

async function syncCourseRewardDocuments(course) {
  const jobs = [];

  if (course.badgeRewardEnabled) {
    const badgeReward = createStageRewardDoc(course, 'badge');
    if (badgeReward) jobs.push(setDocument('rewards', badgeReward.id, badgeReward));
  }

  if (course.titleRewardEnabled) {
    const titleReward = createStageRewardDoc(course, 'title');
    if (titleReward) jobs.push(setDocument('rewards', titleReward.id, titleReward));
  }

  await Promise.all(jobs);
}

function updateMemberChallengeSubmissionList(member = {}, submission = {}, status = 'pending', extra = {}) {
  const oldSubmissions = member.challengeSubmissions || [];
  const updatedSubmission = {
    ...submission,
    ...extra,
    status,
    reviewedAt: extra.reviewedAt || new Date().toISOString()
  };

  const exists = oldSubmissions.some((item) => String(item.id) === String(submission.id));

  return exists
    ? oldSubmissions.map((item) => String(item.id) === String(submission.id) ? { ...item, ...updatedSubmission } : item)
    : [updatedSubmission, ...oldSubmissions];
}

function createChallengeChest(challenge, reward) {
  return {
    id: `challenge-chest-${challenge.id}-${Date.now()}`,
    chestId: reward.id || `chest-${challenge.id}`,
    sourceChallengeId: challenge.id,
    sourceStageTitle: `Tantangan: ${challenge.title}`,
    title: reward.name || 'Challenge Chest',
    description: reward.description || 'Chest dari tantangan.',
    rarity: reward.rarity || 'common',
    icon: reward.icon || '🎁',
    opened: false,
    createdAt: new Date().toISOString()
  };
}

async function saveChallengeRewardToRewardCollection(challenge, reward) {
  if (!['badge', 'title'].includes(reward.type)) {
    return;
  }

  await setDocument('rewards', reward.id, {
    id: reward.id,
    type: reward.type,
    category: reward.type,
    title: reward.name,
    name: reward.name,
    description: reward.description || `Reward dari tantangan ${challenge.title}.`,
    icon: reward.icon || (reward.type === 'badge' ? '🏅' : '🎖️'),
    rarity: reward.rarity || 'common',
    requirement: `Tantangan: ${challenge.title}`,
    source: 'challenge',
    sourceChallengeId: challenge.id,
    published: true,
    order: 999
  });
}

function applyChallengeReward(member, challenge) {
  const reward = getChallengeReward(challenge);
  let nextMember = { ...member };

  const completedChallenges = makeUniqueList(member.completedChallenges || []);
  const ownedBadges = makeUniqueList(member.ownedBadges || []);
  const badges = makeUniqueList(member.badges || []);
  const ownedTitles = makeUniqueList(member.ownedTitles || member.titles || []);
  const titles = makeUniqueList(member.titles || []);
  const unlockedRewards = makeUniqueList(member.unlockedRewards || []);
  const unopenedChests = [...(member.unopenedChests || [])];

  if (completedChallenges.includes(String(challenge.id))) {
    throw new Error('Reward tantangan ini sudah pernah diberikan ke anggota ini.');
  }

  completedChallenges.push(String(challenge.id));

  let rewardText = '';
  let gainedXp = 0;
  let gainedCoins = 0;

  if (reward.type === 'coins') {
    gainedCoins = reward.coins || 25;
    rewardText = `+${gainedCoins} koin`;
  }

  if (reward.type === 'xp') {
    gainedXp = reward.xp || 50;
    rewardText = `+${gainedXp} XP`;
  }

  if (reward.type === 'badge') {
    if (!reward.id || !reward.name) {
      throw new Error('Reward badge belum lengkap.');
    }

    ownedBadges.push(reward.id);
    badges.push(reward.id);
    unlockedRewards.push(reward.id);

    gainedXp = reward.xp || 0;
    gainedCoins = reward.coins || 0;
    rewardText = `${reward.icon || '🏅'} Badge: ${reward.name}`;
  }

  if (reward.type === 'title') {
    if (!reward.id || !reward.name) {
      throw new Error('Reward title belum lengkap.');
    }

    ownedTitles.push(reward.id);
    titles.push(reward.id);
    unlockedRewards.push(reward.id);

    gainedXp = reward.xp || 0;
    gainedCoins = reward.coins || 0;
    rewardText = `${reward.icon || '🎖️'} Title: ${reward.name}`;
  }

  if (reward.type === 'chest') {
    if (!reward.id || !reward.name) {
      throw new Error('Reward chest belum lengkap.');
    }

    const chest = createChallengeChest(challenge, reward);
    unopenedChests.unshift(chest);
    unlockedRewards.push(chest.id);
    rewardText = `${reward.icon || '🎁'} Chest: ${reward.name}`;
  }

  if (gainedXp > 0) {
    nextMember = addXpToMember(nextMember, gainedXp);
  }

  if (gainedCoins > 0) {
    nextMember = addCoinsToMember(nextMember, gainedCoins);
  }

  const historyItem = {
    id: `challenge-reward-${challenge.id}-${Date.now()}`,
    challengeId: challenge.id,
    challengeTitle: challenge.title,
    rewardType: reward.type,
    rewardId: reward.id,
    rewardName: reward.name,
    rewardText,
    gainedXp,
    gainedCoins,
    date: new Date().toISOString()
  };

  return {
    level: nextMember.level || member.level || 1,
    xp: nextMember.xp || 0,
    xpToNextLevel: nextMember.xpToNextLevel || member.xpToNextLevel || 100,
    totalXp: nextMember.totalXp || member.totalXp || 0,
    coins: nextMember.coins || 0,

    completedChallenges: makeUniqueList(completedChallenges),
    ownedBadges: makeUniqueList(ownedBadges),
    badges: makeUniqueList(badges),
    ownedTitles: makeUniqueList(ownedTitles),
    titles: makeUniqueList(titles),
    unlockedRewards: makeUniqueList(unlockedRewards),
    unopenedChests,

    activeBadge: member.activeBadge || (reward.type === 'badge' ? reward.id : ''),
    activeTitle: member.activeTitle || (reward.type === 'title' ? reward.id : ''),

    challengeRewardHistory: [
      historyItem,
      ...(member.challengeRewardHistory || [])
    ],

    lastChallengeReward: historyItem
  };
}

export async function importSystemData() {
  return seedCoreData(localSeed);
}

export async function loadPublicData() {
  const [founders, events, docs, projects, challenges] = await Promise.all([
    getCollection('founders'),
    getCollection('events'),
    getCollection('docs'),
    getCollection('projects'),
    getCollection('challenges')
  ]);

  const publishedChallenges = sortByOrder(
    challenges
      .map(normalizeChallenge)
      .filter(Boolean)
      .filter((challenge) => challenge.published !== false)
  );

  return {
    founders: founders.length ? sortByOrder(founders) : seedFounders,
    events: sortByOrder(events).sort((a, b) =>
      String(a.date || '').localeCompare(String(b.date || ''))
    ),
    docs: docs.filter((item) => item.published !== false),
    projects: projects.filter((item) => item.published !== false),
    challenges: publishedChallenges
  };
}

export async function loadLearningData() {
  const [courses, rewards, ranks, members] = await Promise.all([
    getCollection('courses'),
    getCollection('rewards'),
    getCollection('ranks'),
    getCollection('members')
  ]);

  const publishedCourses = courses
    .map(normalizeCourse)
    .filter(Boolean)
    .filter((course) => course.published !== false);

  return {
    courses: sortByOrder(publishedCourses),
    rewards: sortByOrder(mergeById(rewards, seedRewards)),
    ranks: ranks.length ? sortByOrder(ranks) : seedRanks,
    members
  };
}

export async function loadAdminContentData() {
  const [courses, courseSections, questions] = await Promise.all([
    getCollection('courses'),
    getCollection('courseSections'),
    getCollection('questions')
  ]);

  return {
    courses: sortByOrder(courses.map(normalizeCourse).filter(Boolean)),
    courseSections: sortByOrder(courseSections.map(normalizeSection).filter(Boolean)),
    questions: sortByOrder(questions.map(normalizeQuestion).filter(Boolean))
  };
}

export async function loadChallengeData() {
  const [challenges, challengeSubmissions] = await Promise.all([
    getCollection('challenges'),
    getCollection('challengeSubmissions')
  ]);

  return {
    challenges: sortByOrder(challenges.map(normalizeChallenge).filter(Boolean)),
    challengeSubmissions: sortByOrder(
      challengeSubmissions.map(normalizeChallengeSubmission).filter(Boolean)
    )
  };
}

export async function loadCourse(stageId) {
  const course = normalizeCourse(await getDocument('courses', String(stageId)));

  if (!course || course.published === false) {
    return null;
  }

  const allSections = await getCollection('courseSections');

  const modules = sortByOrder(
    allSections
      .map(normalizeSection)
      .filter(Boolean)
      .filter((section) => section.courseId === String(stageId) && section.published !== false)
  );

  return {
    ...course,
    modules
  };
}

export async function loadQuestions(stageId) {
  const allQuestions = await getCollection('questions');

  return sortByOrder(
    allQuestions
      .map(normalizeQuestion)
      .filter(Boolean)
      .filter((question) => question.courseId === String(stageId) && question.published !== false)
  );
}

export async function upsertCourse(course) {
  const normalized = normalizeCourse({
    ...course,
    title: String(course.title || '').trim(),
    area: String(course.area || '').trim(),
    theme: String(course.theme || '').trim()
  });

  if (!normalized.title || !normalized.id) {
    throw new Error('Stage dan judul wajib diisi.');
  }

  if (normalized.badgeRewardEnabled && !normalized.badgeName) {
    throw new Error('Nama badge wajib diisi jika reward badge diaktifkan.');
  }

  if (normalized.titleRewardEnabled && !normalized.titleRewardName) {
    throw new Error('Nama title wajib diisi jika reward title diaktifkan.');
  }

  await setDocument('courses', normalized.id, normalized);
  await syncCourseRewardDocuments(normalized);
  await createActivity(`Roadmap stage ${normalized.stage} diperbarui.`, 'course');
}

export async function upsertCourseSection(section) {
  const normalized = normalizeSection({
    ...section,
    title: section.title.trim(),
    content: section.content.trim(),
    code: section.code.trim(),
    checkpoint: section.checkpoint.trim()
  });

  if (!normalized.courseId || !normalized.title || !normalized.content) {
    throw new Error('Stage, judul materi, dan isi materi wajib diisi.');
  }

  await setDocument('courseSections', normalized.id, normalized);
  await createActivity(`Materi ${normalized.title} diperbarui.`, 'course');
}

export async function upsertQuestion(question) {
  const options = [
    question.optionA,
    question.optionB,
    question.optionC,
    question.optionD
  ]
    .map((item) => String(item || '').trim())
    .filter(Boolean);

  if (!question.courseId || !question.question.trim()) {
    throw new Error('Stage dan pertanyaan wajib diisi.');
  }

  if (options.length < 2) {
    throw new Error('Minimal isi 2 pilihan jawaban.');
  }

  if (!question.explanation.trim()) {
    throw new Error('Pembahasan wajib diisi agar user belajar dari jawaban.');
  }

  const correctIndex = asNumber(question.correctIndex, 0);

  if (correctIndex < 0 || correctIndex >= options.length) {
    throw new Error('Pilihan jawaban benar tidak valid.');
  }

  const normalized = normalizeQuestion({
    id: question.id || `q-${question.courseId}-${Date.now()}`,
    courseId: String(question.courseId),
    order: question.order,
    type: question.type || 'multiple-choice',
    question: question.question.trim(),
    options,
    correctIndex,
    explanation: question.explanation.trim(),
    published: question.published !== false
  });

  await setDocument('questions', normalized.id, normalized);
  await createActivity(`Soal stage ${normalized.courseId} diperbarui.`, 'question');
}

export async function upsertEvent(event) {
  const payload = {
    ...event,
    title: event.title.trim(),
    category: event.category.trim(),
    location: event.location.trim(),
    speaker: event.speaker.trim(),
    description: event.description.trim(),
    published: event.published !== false
  };

  await setDocument('events', event.id || `event-${Date.now()}`, payload);
  await createActivity(`Agenda ${payload.title} diperbarui.`, 'event');
}

export async function upsertDoc(docItem) {
  const payload = {
    ...docItem,
    title: docItem.title.trim(),
    description: docItem.description.trim(),
    published: docItem.published !== false
  };

  await setDocument('docs', docItem.id || `doc-${Date.now()}`, payload);
  await createActivity(`Dokumentasi ${payload.title} diperbarui.`, 'docs');
}

export async function upsertProject(project) {
  const payload = {
    ...project,
    title: project.title.trim(),
    maker: project.maker.trim(),
    category: project.category.trim(),
    description: project.description.trim(),
    published: project.published !== false
  };

  await setDocument('projects', project.id || `project-${Date.now()}`, payload);
  await createActivity(`Karya ${payload.title} diperbarui.`, 'project');
}

export async function upsertReward(reward) {
  const normalized = normalizeReward(reward);

  if (!normalized || !normalized.id) {
    throw new Error('Reward tidak valid.');
  }

  if (!normalized.name) {
    throw new Error('Nama reward wajib diisi.');
  }

  if (!['badge', 'title', 'chest'].includes(normalized.type)) {
    throw new Error('Jenis reward harus badge, title, atau chest.');
  }

  await setDocument('rewards', normalized.id, normalized);
  await createActivity(`Reward ${normalized.name} diperbarui.`, 'reward');

  return normalized;
}

export async function deleteReward(rewardId) {
  const cleanId = String(rewardId || '').trim();

  if (!cleanId) {
    throw new Error('Reward tidak valid.');
  }

  await deleteDocument('rewards', cleanId);
  await createActivity(`Reward ${cleanId} dihapus.`, 'reward');
}

export async function upsertChallenge(challenge) {
  const normalized = normalizeChallenge(challenge);

  if (!normalized.title || !normalized.description) {
    throw new Error('Judul dan deskripsi tantangan wajib diisi.');
  }

  if (!normalized.rewardType) {
    throw new Error('Jenis reward wajib dipilih.');
  }

  if (normalized.rewardType === 'coins' && normalized.rewardCoins <= 0) {
    throw new Error('Jumlah koin wajib lebih dari 0.');
  }

  if (normalized.rewardType === 'xp' && normalized.rewardXp <= 0) {
    throw new Error('Jumlah XP wajib lebih dari 0.');
  }

  if (['badge', 'title', 'chest'].includes(normalized.rewardType) && !normalized.rewardName) {
    throw new Error('Nama reward wajib diisi.');
  }

  if (['badge', 'title', 'chest'].includes(normalized.rewardType) && !normalized.rewardId) {
    throw new Error('Reward ID wajib diisi.');
  }

  await setDocument('challenges', normalized.id, normalized);
  await createActivity(`Tantangan ${normalized.title} diperbarui.`, 'challenge');
}

export async function upsertChallengeSubmission(submission) {
  const normalized = normalizeChallengeSubmission(submission);

  if (!normalized.challengeId || !normalized.uid) {
    throw new Error('Data tantangan dan anggota tidak lengkap.');
  }

  await setDocument('challengeSubmissions', normalized.id, normalized);
  await createActivity(`${normalized.memberName} mengirim bukti tantangan.`, 'challenge');
}

export async function approveChallengeSubmission(submission) {
  const normalizedSubmission = normalizeChallengeSubmission(submission);

  if (!normalizedSubmission.challengeId || !normalizedSubmission.uid) {
    throw new Error('Data submission tidak lengkap.');
  }

  if (normalizedSubmission.status === 'approved' || normalizedSubmission.rewardGiven) {
    throw new Error('Submission ini sudah pernah di-approve.');
  }

  const challenge = normalizeChallenge(
    await getDocument('challenges', normalizedSubmission.challengeId)
  );

  if (!challenge) {
    throw new Error('Data tantangan tidak ditemukan.');
  }

  const member = await getDocument('members', normalizedSubmission.uid);

  if (!member) {
    throw new Error('Data anggota tidak ditemukan.');
  }

  const reward = getChallengeReward(challenge);
  const memberPatch = applyChallengeReward(member, challenge);
  const reviewedAt = new Date().toISOString();
  const rewardText = memberPatch.lastChallengeReward?.rewardText || '';

  await saveChallengeRewardToRewardCollection(challenge, reward);
  await updateMember(member.uid, {
    ...memberPatch,
    challengeSubmissions: updateMemberChallengeSubmissionList(
      member,
      normalizedSubmission,
      'approved',
      { rewardGiven: true, rewardText, reviewedAt }
    )
  });

  await setDocument('challengeSubmissions', normalizedSubmission.id, {
    ...normalizedSubmission,
    status: 'approved',
    rewardGiven: true,
    rewardText,
    reviewedAt
  });

  await createActivity(
    `Tantangan ${challenge.title} milik ${
      normalizedSubmission.memberName || member.name
    } disetujui.`,
    'challenge'
  );
}

export async function rejectChallengeSubmission(submission) {
  const normalizedSubmission = normalizeChallengeSubmission(submission);
  const reviewedAt = new Date().toISOString();
  const member = normalizedSubmission.uid
    ? await getDocument('members', normalizedSubmission.uid)
    : null;

  if (member) {
    await updateMember(member.uid, {
      challengeSubmissions: updateMemberChallengeSubmissionList(
        member,
        normalizedSubmission,
        'rejected',
        { rewardGiven: false, reviewedAt }
      )
    });
  }

  await setDocument('challengeSubmissions', normalizedSubmission.id, {
    ...normalizedSubmission,
    status: 'rejected',
    rewardGiven: false,
    reviewedAt
  });

  await createActivity(
    `Submission tantangan ${normalizedSubmission.memberName || 'anggota'} ditolak.`,
    'challenge'
  );
}

export async function setMemberStatus(member, status) {
  await updateMember(member.uid, { status });

  await createActivity(
    status === 'approved'
      ? `${member.name} disetujui menjadi anggota aktif.`
      : `${member.name} belum disetujui untuk mengakses kursus.`,
    'member'
  );
}

export async function removeRecord(collectionName, id) {
  await deleteDocument(collectionName, id);
}

export async function exportAllData() {
  const [
    members,
    courses,
    courseSections,
    questions,
    rewards,
    ranks,
    founders,
    events,
    docs,
    projects,
    challenges,
    challengeSubmissions,
    activity
  ] = await Promise.all([
    getCollection('members'),
    getCollection('courses'),
    getCollection('courseSections'),
    getCollection('questions'),
    getCollection('rewards'),
    getCollection('ranks'),
    getCollection('founders'),
    getCollection('events'),
    getCollection('docs'),
    getCollection('projects'),
    getCollection('challenges'),
    getCollection('challengeSubmissions'),
    getCollection('activity')
  ]);

  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      members,
      courses,
      courseSections,
      questions,
      rewards,
      ranks,
      founders,
      events,
      docs,
      projects,
      challenges,
      challengeSubmissions,
      activity
    },
    null,
    2
  );
}

export async function createLog(text, type = 'system') {
  return createActivity(text, type);
}
