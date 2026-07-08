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

export const APP_SCHEMA_VERSION = 3;

export const localSeed = {
  rewards: seedRewards,
  ranks: seedRanks,
  founders: seedFounders,
  events: [],
  docs: [],
  projects: [],
  challenges: [],
  challengeSubmissions: [],
  contentReports: [],
  auditLogs: []
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


function createTimestampId(prefix = 'item') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function createAuditLog(action, message, metadata = {}) {
  const id = createTimestampId('audit');
  const createdAt = new Date().toISOString();

  const log = {
    id,
    action: String(action || 'system'),
    message: String(message || ''),
    metadata,
    createdAt,
    schemaVersion: APP_SCHEMA_VERSION
  };

  await setDocument('auditLogs', id, log);
  return log;
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

    published: course.published !== false,
    schemaVersion: APP_SCHEMA_VERSION
  };
}

function normalizeSection(section) {
  if (!section) return null;

  return {
    ...section,
    id: String(section.id || `section-${Date.now()}`),
    courseId: String(section.courseId || section.stageId || ''),
    order: asNumber(section.order, 1),
    type: String(section.type || '').trim(),
    title: String(section.title || '').trim(),
    content: String(section.content || '').trim(),
    code: String(section.code || '').trim(),
    checkpoint: String(section.checkpoint || '').trim(),
    published: section.published !== false,
    schemaVersion: APP_SCHEMA_VERSION
  };
}

function isSectionReady(section) {
  if (!section) return false;

  return (
    String(section.title || '').trim().length > 0 &&
    String(section.content || '').trim().length > 0 &&
    String(section.checkpoint || '').trim().length > 0
  );
}

function normalizeQuestion(question) {
  if (!question) return null;

  const rawOptions = Array.isArray(question.options)
    ? question.options
    : [
        question.optionA,
        question.optionB,
        question.optionC,
        question.optionD
      ];

  const options = rawOptions
    .slice(0, 4)
    .map((option) => String(option || '').trim());

  while (options.length < 4) {
    options.push('');
  }

  return {
    ...question,
    id: String(question.id || `q-${Date.now()}`),
    courseId: String(question.courseId || question.stageId || question.levelId || ''),
    order: asNumber(question.order, 1),
    type: question.type || 'multiple-choice',
    question: String(question.question || '').trim(),
    options,
    correctIndex: asNumber(question.correctIndex, 0),
    explanation: String(question.explanation || '').trim(),
    published: question.published !== false,
    schemaVersion: APP_SCHEMA_VERSION
  };
}

function isQuestionReady(question) {
  if (!question) return false;

  const options = Array.isArray(question.options) ? question.options : [];

  return (
    String(question.question || '').trim().length > 0 &&
    options.length === 4 &&
    options.every((option) => String(option || '').trim().length > 0) &&
    [0, 1, 2, 3].includes(Number(question.correctIndex)) &&
    String(question.explanation || '').trim().length > 0
  );
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
    updatedAt: now,
    schemaVersion: APP_SCHEMA_VERSION
  };
}

function normalizeChallenge(challenge) {
  if (!challenge) return null;

  const rewardType = String(challenge.rewardType || 'coins').trim().toLowerCase();

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
    order: asNumber(challenge.order, 1),
    schemaVersion: APP_SCHEMA_VERSION
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
    reviewedAt: submission.reviewedAt || '',
    schemaVersion: APP_SCHEMA_VERSION
  };
}


function normalizeContentReport(report) {
  if (!report) return null;

  const now = new Date().toISOString();

  return {
    ...report,
    id: String(report.id || createTimestampId('report')),
    uid: String(report.uid || ''),
    memberName: String(report.memberName || ''),
    type: String(report.type || 'materi').trim(),
    courseId: String(report.courseId || report.stageId || ''),
    targetId: String(report.targetId || ''),
    targetTitle: String(report.targetTitle || ''),
    message: String(report.message || '').trim(),
    status: String(report.status || 'open'),
    createdAt: report.createdAt || now,
    resolvedAt: report.resolvedAt || '',
    schemaVersion: APP_SCHEMA_VERSION
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
    rewards: sortByOrder(
      mergeById(rewards, seedRewards)
        .map(normalizeReward)
        .filter(Boolean)
    ),
    ranks: ranks.length ? sortByOrder(ranks) : seedRanks,
    members
  };
}

export async function loadLearningCatalog() {
  const [courses, courseSections] = await Promise.all([
    getCollection('courses'),
    getCollection('courseSections')
  ]);

  const publishedCourses = sortByOrder(
    courses
      .map(normalizeCourse)
      .filter(Boolean)
      .filter((course) => course.published !== false)
  );

  const publishedSections = sortByOrder(
    courseSections
      .map(normalizeSection)
      .filter(Boolean)
      .filter((section) => section.published !== false && isSectionReady(section))
  );

  return {
    courses: publishedCourses,
    courseSections: publishedSections
  };
}

export async function loadAdminContentData() {
  const [courses, courseSections, questions, contentReports, auditLogs] = await Promise.all([
    getCollection('courses'),
    getCollection('courseSections'),
    getCollection('questions'),
    getCollection('contentReports'),
    getCollection('auditLogs')
  ]);

  return {
    courses: sortByOrder(courses.map(normalizeCourse).filter(Boolean)),
    courseSections: sortByOrder(courseSections.map(normalizeSection).filter(Boolean)),
    questions: sortByOrder(questions.map(normalizeQuestion).filter(Boolean)),
    contentReports: contentReports
      .map(normalizeContentReport)
      .filter(Boolean)
      .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))),
    auditLogs: auditLogs
      .filter(Boolean)
      .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
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
      .filter((section) => section.courseId === String(stageId) && section.published !== false && isSectionReady(section))
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
      .filter((question) => (
        question.courseId === String(stageId) &&
        question.published !== false &&
        isQuestionReady(question)
      ))
  );
}

export async function createContentReport(report) {
  const normalized = normalizeContentReport(report);

  if (!normalized.uid || !normalized.message || !normalized.courseId) {
    throw new Error('Laporan belum lengkap. Isi pesan laporan terlebih dahulu.');
  }

  await setDocument('contentReports', normalized.id, normalized);
  await createActivity(
    `${normalized.memberName || 'Anggota'} mengirim laporan ${normalized.type} pada stage ${normalized.courseId}.`,
    'report'
  );

  return normalized;
}

export async function resolveContentReport(reportId, status = 'resolved') {
  const id = String(reportId || '').trim();

  if (!id) {
    throw new Error('ID laporan tidak valid.');
  }

  const patch = {
    status,
    resolvedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    schemaVersion: APP_SCHEMA_VERSION
  };

  await setDocument('contentReports', id, patch, { merge: true });
  await createAuditLog('content_report.resolve', `Laporan ${id} ditandai ${status}.`, { reportId: id, status });

  return patch;
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
  await createAuditLog('course.upsert', `Roadmap stage ${normalized.stage} diperbarui.`, { courseId: normalized.id });
}


export async function upsertCourseSection(section) {
  const normalized = normalizeSection({
    ...section,
    title: String(section.title || '').trim(),
    content: String(section.content || '').trim(),
    code: String(section.code || '').trim(),
    checkpoint: String(section.checkpoint || '').trim()
  });

  if (!normalized.courseId || !normalized.title || !normalized.content) {
    throw new Error('Stage, judul materi, dan isi materi wajib diisi.');
  }

  if (!normalized.checkpoint) {
    throw new Error('Checkpoint materi wajib diisi.');
  }

  await setDocument('courseSections', normalized.id, normalized);
  await createActivity(`Materi ${normalized.title} diperbarui.`, 'course');
  await createAuditLog('course_section.upsert', `Materi ${normalized.title} diperbarui.`, { sectionId: normalized.id, courseId: normalized.courseId });

  return normalized;
}

export async function upsertQuestion(question) {
  const options = [
    question.optionA,
    question.optionB,
    question.optionC,
    question.optionD
  ].map((item) => String(item || '').trim());

  const cleanQuestion = String(question.question || '').trim();
  const cleanExplanation = String(question.explanation || '').trim();

  if (!question.courseId || !cleanQuestion) {
    throw new Error('Stage dan pertanyaan wajib diisi.');
  }

  if (options.some((option) => !option)) {
    throw new Error('Pilihan A, B, C, dan D wajib diisi.');
  }

  const correctIndex = asNumber(question.correctIndex, 0);

  if (![0, 1, 2, 3].includes(correctIndex)) {
    throw new Error('Pilihan jawaban benar tidak valid.');
  }

  if (!cleanExplanation) {
    throw new Error('Pembahasan wajib diisi agar user belajar dari jawaban.');
  }

  const normalized = normalizeQuestion({
    id: question.id || `q-${question.courseId}-${Date.now()}`,
    courseId: String(question.courseId),
    order: question.order,
    type: question.type || 'multiple-choice',
    question: cleanQuestion,
    options,
    correctIndex,
    explanation: cleanExplanation,
    published: question.published !== false
  });

  await setDocument('questions', normalized.id, normalized);
  await createActivity(`Soal stage ${normalized.courseId} diperbarui.`, 'question');
  await createAuditLog('question.upsert', `Soal stage ${normalized.courseId} diperbarui.`, { questionId: normalized.id, courseId: normalized.courseId });

  return normalized;
}

function normalizeAnnouncement(announcement = {}) {
  const title = String(announcement.title || '').trim();
  const id = String(
    announcement.id || createSafeId(title || 'announcement', 'announcement')
  ).trim();

  return {
    ...announcement,
    id,
    title,
    category: String(announcement.category || 'Info').trim(),
    message: String(announcement.message || '').trim(),
    priority: String(announcement.priority || 'normal').trim(),
    target: String(announcement.target || 'all').trim(),
    pinned: announcement.pinned === true,
    published: announcement.published !== false,
    startDate: announcement.startDate || '',
    endDate: announcement.endDate || '',
    order: asNumber(announcement.order, 999),
    createdAt: announcement.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

export async function loadAnnouncements(options = {}) {
  const includeDrafts = options.includeDrafts === true;
  const announcements = await getCollection('announcements');

  return announcements
    .map(normalizeAnnouncement)
    .filter((announcement) => {
      if (includeDrafts) return true;
      return announcement.published !== false;
    })
    .sort((a, b) => {
      if (a.pinned !== b.pinned) {
        return a.pinned ? -1 : 1;
      }

      return Number(a.order || 999) - Number(b.order || 999);
    });
}

export async function upsertAnnouncement(announcement) {
  const normalized = normalizeAnnouncement(announcement);

  if (!normalized.title) {
    throw new Error('Judul pengumuman wajib diisi.');
  }

  if (!normalized.message) {
    throw new Error('Isi pengumuman wajib diisi.');
  }

  await setDocument('announcements', normalized.id, normalized);
  await createActivity(`Pengumuman ${normalized.title} diperbarui.`, 'announcement');
  await createAuditLog('announcement.upsert', `Pengumuman ${normalized.title} diperbarui.`, { announcementId: normalized.id });

  return normalized;
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
  await createAuditLog('reward.upsert', `Reward ${normalized.name} diperbarui.`, { rewardId: normalized.id, type: normalized.type });

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
  await createAuditLog('challenge.upsert', `Tantangan ${normalized.title} diperbarui.`, { challengeId: normalized.id });
}

export async function upsertChallengeSubmission(submission) {
  const normalized = normalizeChallengeSubmission(submission);

  if (!normalized.challengeId || !normalized.uid) {
    throw new Error('Data tantangan dan anggota tidak lengkap.');
  }

  const existingSubmissions = await getCollection('challengeSubmissions');
  const duplicateSubmission = existingSubmissions.some((item) => {
    return (
      String(item.id) !== String(normalized.id) &&
      String(item.challengeId) === String(normalized.challengeId) &&
      String(item.uid) === String(normalized.uid) &&
      ['pending', 'approved'].includes(String(item.status || 'pending'))
    );
  });

  if (duplicateSubmission) {
    throw new Error('Kamu sudah punya submission aktif untuk tantangan ini. Tunggu review admin dulu.');
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

  await createAuditLog('challenge_submission.approve', `Submission tantangan ${challenge.title} disetujui.`, { submissionId: normalizedSubmission.id, challengeId: challenge.id, uid: normalizedSubmission.uid });

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

  await createAuditLog('challenge_submission.reject', `Submission tantangan ${normalizedSubmission.memberName || 'anggota'} ditolak.`, { submissionId: normalizedSubmission.id, uid: normalizedSubmission.uid });

  await createActivity(
    `Submission tantangan ${normalizedSubmission.memberName || 'anggota'} ditolak.`,
    'challenge'
  );
}

export async function setMemberStatus(member, status) {
  await updateMember(member.uid, { status, schemaVersion: APP_SCHEMA_VERSION });

  await createActivity(
    status === 'approved'
      ? `${member.name} disetujui menjadi anggota aktif.`
      : `${member.name} belum disetujui untuk mengakses kursus.`,
    'member'
  );
  await createAuditLog('member.status', `Status ${member.name || member.uid} diubah menjadi ${status}.`, { uid: member.uid, status });
}

function getMemberUid(member) {
  const uid = String(member?.uid || member?.id || '').trim();

  if (!uid) {
    throw new Error('UID member tidak valid.');
  }

  return uid;
}

export async function resetMemberProgress(member) {
  const uid = getMemberUid(member);

  const payload = {
    level: 1,
    xp: 0,
    xpToNextLevel: 100,
    totalXp: 0,
    streak: 0,
    currentStage: 1,
    completedCourses: [],
    completedStages: [],
    passedStages: [],
    stageProgress: {},
    courseProgress: {},
    quizHistory: [],
    lastStudyDate: '',
    updatedAt: new Date().toISOString(),
    schemaVersion: APP_SCHEMA_VERSION
  };

  await updateMember(uid, payload);
  await createActivity(`Progress belajar ${member.name || uid} direset.`, 'member');
  await createAuditLog('member.reset_progress', `Progress belajar ${member.name || uid} direset.`, { uid });

  return payload;
}

export async function resetMemberRewards(member) {
  const uid = getMemberUid(member);

  const payload = {
    badges: [],
    titles: [],
    frames: [],
    avatars: [],
    ownedBadges: [],
    ownedTitles: [],
    ownedFrames: [],
    ownedAvatars: [],
    activeBadge: '',
    activeTitle: '',
    activeFrame: '',
    activeAvatar: '',
    unlockedRewards: [],
    unopenedChests: [],
    openedChests: [],
    chestHistory: [],
    updatedAt: new Date().toISOString(),
    schemaVersion: APP_SCHEMA_VERSION
  };

  await updateMember(uid, payload);
  await createActivity(`Reward ${member.name || uid} direset.`, 'member');
  await createAuditLog('member.reset_rewards', `Reward ${member.name || uid} direset.`, { uid });

  return payload;
}

export async function resetMemberEconomy(member) {
  const uid = getMemberUid(member);

  const payload = {
    coins: 0,
    coinTransactions: [],
    updatedAt: new Date().toISOString()
  };

  await updateMember(uid, payload);
  await createActivity(`Koin ${member.name || uid} direset.`, 'member');
  await createAuditLog('member.reset_economy', `Koin ${member.name || uid} direset.`, { uid });

  return payload;
}

export async function resetMemberChallenges(member) {
  const uid = getMemberUid(member);

  const payload = {
    challengeSubmissions: [],
    completedChallenges: [],
    challengeRewardHistory: [],
    lastChallengeReward: null,
    updatedAt: new Date().toISOString()
  };

  await updateMember(uid, payload);
  await createActivity(`Data tantangan ${member.name || uid} direset.`, 'member');
  await createAuditLog('member.reset_challenges', `Data tantangan ${member.name || uid} direset.`, { uid });

  return payload;
}

export async function cleanMemberData(member) {
  const uid = getMemberUid(member);

  const unique = (items = []) => {
    return Array.from(
      new Set(
        items
          .map((item) => String(item || '').trim())
          .filter(Boolean)
      )
    );
  };

  const payload = {
    name: String(member.name || '').trim(),
    nim: String(member.nim || '').trim(),
    cohort: String(member.cohort || member.letting || member.angkatan || '').trim(),
    role: member.role || 'member',
    status: member.status || 'pending',
    level: Math.max(1, Number(member.level) || 1),
    xp: Math.max(0, Number(member.xp) || 0),
    xpToNextLevel: Math.max(100, Number(member.xpToNextLevel) || 100),
    totalXp: Math.max(0, Number(member.totalXp) || 0),
    coins: Math.max(0, Number(member.coins) || 0),
    badges: unique(member.badges || []),
    titles: unique(member.titles || []),
    ownedBadges: unique(member.ownedBadges || []),
    ownedTitles: unique(member.ownedTitles || []),
    completedCourses: unique(member.completedCourses || []),
    completedStages: unique(member.completedStages || []),
    passedStages: unique(member.passedStages || []),
    unopenedChests: unique(member.unopenedChests || []),
    openedChests: unique(member.openedChests || []),
    completedChallenges: unique(member.completedChallenges || []),
    materialBookmarks: Array.isArray(member.materialBookmarks) ? member.materialBookmarks : [],
    privateNotes: member.privateNotes && typeof member.privateNotes === 'object' ? member.privateNotes : {},
    ownedShopItems: unique(member.ownedShopItems || []),
    shopInventory: Array.isArray(member.shopInventory) ? member.shopInventory : [],
    shopPurchaseHistory: Array.isArray(member.shopPurchaseHistory) ? member.shopPurchaseHistory : [],
    notifications: Array.isArray(member.notifications) ? member.notifications : [],
    activeNameColor: String(member.activeNameColor || ''),
    activeProfileDecoration: String(member.activeProfileDecoration || ''),
    finalProjectStatus: String(member.finalProjectStatus || ''),
    certificateStatus: String(member.certificateStatus || ''),
    updatedAt: new Date().toISOString()
  };

  await updateMember(uid, payload);
  await createActivity(`Data ${member.name || uid} dibersihkan.`, 'member');
  await createAuditLog('member.clean', `Data ${member.name || uid} dibersihkan.`, { uid });

  return payload;
}

export async function updateMemberAdminStats(member, stats = {}) {
  const uid = getMemberUid(member);

  const level = Math.max(1, Number(stats.level) || 1);
  const xp = Math.max(0, Number(stats.xp) || 0);
  const xpToNextLevel = Math.max(100, Number(stats.xpToNextLevel) || 100);
  const totalXp = Math.max(0, Number(stats.totalXp) || 0);
  const coins = Math.max(0, Number(stats.coins) || 0);

  const payload = {
    level,
    xp,
    xpToNextLevel,
    totalXp,
    coins,
    updatedAt: new Date().toISOString()
  };

  await updateMember(uid, payload);
  await createActivity(`Stat ${member.name || uid} diperbarui admin.`, 'member');
  await createAuditLog('member.stats_update', `Stat ${member.name || uid} diperbarui admin.`, { uid });

  return payload;
}


function createManualChestReward(reward) {
  const rewardId = String(reward?.id || '').trim();
  const now = new Date().toISOString();

  return {
    id: `manual-chest-${rewardId || 'reward'}-${Date.now()}`,
    chestId: rewardId || `manual-chest-${Date.now()}`,
    source: 'admin',
    sourceStageTitle: 'Reward manual admin',
    title: reward?.name || reward?.title || 'Chest Reward',
    description: reward?.description || 'Chest yang diberikan manual oleh admin.',
    rarity: normalizeRarity(reward?.rarity || 'common'),
    icon: reward?.icon || '🎁',
    opened: false,
    createdAt: now
  };
}

export async function grantMemberReward(member, reward) {
  const uid = getMemberUid(member);

  const rewardId = String(reward?.id || '').trim();
  const rewardType = String(reward?.type || reward?.category || '').trim().toLowerCase();

  if (!rewardId) {
    throw new Error('Reward tidak valid.');
  }

  if (!['badge', 'title', 'chest'].includes(rewardType)) {
    throw new Error('Jenis reward harus badge, title, atau chest.');
  }

  const unique = (items = []) => {
    return Array.from(
      new Set(
        items
          .map((item) => String(item || '').trim())
          .filter(Boolean)
      )
    );
  };

  const payload = {
    updatedAt: new Date().toISOString()
  };

  if (rewardType === 'badge') {
    payload.badges = unique([...(member.badges || []), rewardId]);
    payload.ownedBadges = unique([...(member.ownedBadges || []), rewardId]);
  }

  if (rewardType === 'title') {
    payload.titles = unique([...(member.titles || []), rewardId]);
    payload.ownedTitles = unique([...(member.ownedTitles || []), rewardId]);
  }

  if (rewardType === 'chest') {
    const oldChests = Array.isArray(member.unopenedChests) ? member.unopenedChests : [];
    const alreadyHasChest = oldChests.some((chest) => {
      if (typeof chest === 'string') return chest === rewardId;

      return String(chest?.chestId || chest?.id || '') === rewardId;
    });

    payload.unopenedChests = alreadyHasChest
      ? oldChests
      : [createManualChestReward(reward), ...oldChests];
  }

  payload.unlockedRewards = unique([...(member.unlockedRewards || []), rewardId]);

  await updateMember(uid, payload);
  await createActivity(
    `Reward ${reward.name || reward.title || rewardId} diberikan ke ${member.name || uid}.`,
    'member'
  );
  await createAuditLog('member.grant_reward', `Reward ${reward.name || reward.title || rewardId} diberikan ke ${member.name || uid}.`, { uid, rewardId, rewardType });

  return payload;
}

export async function removeRecord(collectionName, id) {
  await deleteDocument(collectionName, id);
  await createAuditLog('record.delete', `Data ${collectionName}/${id} dihapus.`, { collectionName, id });
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
    contentReports,
    auditLogs,
    nimIndex,
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
    getCollection('contentReports'),
    getCollection('auditLogs'),
    getCollection('nimIndex'),
    getCollection('activity')
  ]);

  return JSON.stringify(
    {
      schemaVersion: APP_SCHEMA_VERSION,
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
      contentReports,
      auditLogs,
      nimIndex,
      activity
    },
    null,
    2
  );
}
export async function restoreBackupData(backupJson) {
  let parsedData = backupJson;

  if (typeof backupJson === 'string') {
    try {
      parsedData = JSON.parse(backupJson);
    } catch (error) {
      throw new Error('File backup bukan JSON yang valid.');
    }
  }

  if (!parsedData || typeof parsedData !== 'object') {
    throw new Error('Isi backup tidak valid.');
  }

  const allowedCollections = [
    'members',
    'courses',
    'courseSections',
    'questions',
    'events',
    'docs',
    'projects',
    'rewards',
    'ranks',
    'founders',
    'challenges',
    'challengeSubmissions',
    'contentReports',
    'auditLogs',
    'nimIndex',
    'activity',
    'activities'
  ];

  let restoredCount = 0;

  for (const collectionName of allowedCollections) {
    const collectionData = parsedData[collectionName];

    if (!collectionData) continue;

    const items = Array.isArray(collectionData)
      ? collectionData
      : Object.values(collectionData);

    for (const item of items) {
      if (!item || typeof item !== 'object') continue;

      const id = String(
        item.id ||
        item.uid ||
        item.code ||
        item.slug ||
        ''
      ).trim();

      if (!id) continue;

      await setDocument(collectionName, id, {
        ...item,
        id: item.id || id,
        updatedAt: new Date().toISOString()
      });

      restoredCount += 1;
    }
  }

  await createActivity(`Backup berhasil direstore. ${restoredCount} dokumen diproses.`, 'backup');
  await createAuditLog('backup.restore', `Backup berhasil direstore. ${restoredCount} dokumen diproses.`, { restoredCount });

  return restoredCount;
}

export async function createLog(text, type = 'system') {
  return createActivity(text, type);
}


// =========================
// EXTENDED COMPLETE FEATURES
// Coin shop, final project, certificates, notifications, media, and content tools
// =========================

function normalizeShopItem(item = {}) {
  const type = String(item.type || 'avatar').trim();
  const name = String(item.name || item.title || '').trim();
  const id = String(item.id || createSafeId(name || type, `shop-${type}`)).trim();

  return {
    ...item,
    id,
    type,
    name,
    title: name,
    icon: String(item.icon || (type === 'frame' ? '🖼️' : type === 'title' ? '🎖️' : type === 'badge' ? '🏅' : '🧙')).trim(),
    color: String(item.color || '').trim(),
    description: String(item.description || '').trim(),
    price: Math.max(0, asNumber(item.price, 0)),
    rarity: normalizeRarity(item.rarity || 'common'),
    published: item.published !== false,
    order: asNumber(item.order, 999),
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    schemaVersion: APP_SCHEMA_VERSION
  };
}

export async function loadShopItems(options = {}) {
  const includeDrafts = options.includeDrafts === true;
  const items = await getCollection('shopItems');

  return sortByOrder(
    items
      .map(normalizeShopItem)
      .filter(Boolean)
      .filter((item) => includeDrafts || item.published !== false)
  );
}

export async function upsertShopItem(item) {
  const normalized = normalizeShopItem(item);

  if (!normalized.name) {
    throw new Error('Nama item shop wajib diisi.');
  }

  if (!['avatar', 'frame', 'title', 'badge', 'nameColor', 'profileDecoration'].includes(normalized.type)) {
    throw new Error('Jenis item shop tidak valid.');
  }

  if (normalized.price < 0) {
    throw new Error('Harga item tidak boleh minus.');
  }

  await setDocument('shopItems', normalized.id, normalized);
  await createAuditLog('shop_item.upsert', `Item shop ${normalized.name} diperbarui.`, { itemId: normalized.id, type: normalized.type });
  return normalized;
}

export async function deleteShopItem(itemId) {
  const id = String(itemId || '').trim();
  if (!id) throw new Error('Item shop tidak valid.');

  await deleteDocument('shopItems', id);
  await createAuditLog('shop_item.delete', `Item shop ${id} dihapus.`, { itemId: id });
}

function normalizeOwnedShopItems(items = []) {
  return makeUniqueList(items || []);
}

function createCoinTransaction(type, amount, description, extra = {}) {
  return {
    id: createTimestampId('coin'),
    type,
    amount: Number(amount || 0),
    description: String(description || ''),
    createdAt: new Date().toISOString(),
    ...extra
  };
}

export function memberOwnsShopItem(member = {}, item = {}) {
  const itemId = String(item.id || '').trim();
  if (!itemId) return false;

  return normalizeOwnedShopItems(member.ownedShopItems || []).includes(itemId);
}

export async function purchaseShopItem(member, item) {
  const uid = getMemberUid(member);
  const normalizedItem = normalizeShopItem(item);

  if (!normalizedItem.published) {
    throw new Error('Item shop ini belum tersedia.');
  }

  if (memberOwnsShopItem(member, normalizedItem)) {
    throw new Error('Item ini sudah kamu miliki.');
  }

  const currentCoins = asNumber(member.coins, 0);
  const price = asNumber(normalizedItem.price, 0);

  if (currentCoins < price) {
    throw new Error('Koin kamu belum cukup untuk membeli item ini.');
  }

  const ownedShopItems = normalizeOwnedShopItems([...(member.ownedShopItems || []), normalizedItem.id]);
  const shopInventory = [
    {
      id: normalizedItem.id,
      type: normalizedItem.type,
      name: normalizedItem.name,
      icon: normalizedItem.icon,
      color: normalizedItem.color || '',
      rarity: normalizedItem.rarity,
      purchasedAt: new Date().toISOString()
    },
    ...(Array.isArray(member.shopInventory) ? member.shopInventory : []).filter((entry) => String(entry.id) !== normalizedItem.id)
  ];

  const patch = {
    coins: currentCoins - price,
    ownedShopItems,
    shopInventory,
    shopPurchaseHistory: [
      {
        id: createTimestampId('purchase'),
        itemId: normalizedItem.id,
        itemType: normalizedItem.type,
        itemName: normalizedItem.name,
        price,
        purchasedAt: new Date().toISOString()
      },
      ...(member.shopPurchaseHistory || [])
    ].slice(0, 100),
    coinTransactions: [
      createCoinTransaction('shop_purchase', -price, `Beli item: ${normalizedItem.name}`, { itemId: normalizedItem.id }),
      ...(member.coinTransactions || [])
    ].slice(0, 120)
  };

  if (normalizedItem.type === 'badge') {
    patch.ownedBadges = makeUniqueList([...(member.ownedBadges || member.badges || []), normalizedItem.id]);
    patch.badges = makeUniqueList([...(member.badges || []), normalizedItem.id]);
  }

  if (normalizedItem.type === 'title') {
    patch.ownedTitles = makeUniqueList([...(member.ownedTitles || member.titles || []), normalizedItem.id]);
    patch.titles = makeUniqueList([...(member.titles || []), normalizedItem.id]);
  }

  if (normalizedItem.type === 'avatar') {
    patch.ownedAvatars = makeUniqueList([...(member.ownedAvatars || member.avatars || []), normalizedItem.id]);
    patch.avatars = makeUniqueList([...(member.avatars || []), normalizedItem.id]);
  }

  if (normalizedItem.type === 'frame') {
    patch.ownedFrames = makeUniqueList([...(member.ownedFrames || member.frames || []), normalizedItem.id]);
    patch.frames = makeUniqueList([...(member.frames || []), normalizedItem.id]);
  }

  await updateMember(uid, patch);
  await createActivity(`${member.name || uid} membeli item shop ${normalizedItem.name}.`, 'shop');
  return patch;
}

export async function equipShopItem(member, item) {
  const uid = getMemberUid(member);
  const normalizedItem = normalizeShopItem(item);

  if (!memberOwnsShopItem(member, normalizedItem)) {
    throw new Error('Item ini belum kamu miliki.');
  }

  const patch = {};

  if (normalizedItem.type === 'avatar') {
    patch.activeAvatar = normalizedItem.id;
    patch.avatar = normalizedItem.icon || member.avatar || '🧑‍💻';
  }

  if (normalizedItem.type === 'frame') {
    patch.activeFrame = normalizedItem.id;
  }

  if (normalizedItem.type === 'title') {
    patch.activeTitle = normalizedItem.id;
  }

  if (normalizedItem.type === 'badge') {
    patch.activeBadge = normalizedItem.id;
  }

  if (normalizedItem.type === 'nameColor') {
    patch.activeNameColor = normalizedItem.color || normalizedItem.id;
  }

  if (normalizedItem.type === 'profileDecoration') {
    patch.activeProfileDecoration = normalizedItem.id;
  }

  await updateMember(uid, patch);
  return patch;
}

export function createNotificationPayload(notification = {}) {
  return {
    id: notification.id || createTimestampId('notif'),
    title: String(notification.title || 'Notifikasi').trim(),
    message: String(notification.message || '').trim(),
    type: String(notification.type || 'info').trim(),
    read: notification.read === true,
    link: String(notification.link || '').trim(),
    createdAt: notification.createdAt || new Date().toISOString()
  };
}

export async function addMemberNotification(memberOrUid, notification) {
  const uid = typeof memberOrUid === 'string' ? memberOrUid : getMemberUid(memberOrUid);
  const member = typeof memberOrUid === 'string' ? await getDocument('members', uid) : memberOrUid;
  if (!member) return null;

  const payload = createNotificationPayload(notification);
  await updateMember(uid, {
    notifications: [payload, ...(member.notifications || [])].slice(0, 80)
  });

  return payload;
}

export async function markNotificationRead(member, notificationId) {
  const uid = getMemberUid(member);
  const notifications = (member.notifications || []).map((notification) => (
    String(notification.id) === String(notificationId)
      ? { ...notification, read: true, readAt: new Date().toISOString() }
      : notification
  ));

  await updateMember(uid, { notifications });
  return notifications;
}

function normalizeFinalProjectSubmission(submission = {}) {
  const now = new Date().toISOString();
  const uid = String(submission.uid || '').trim();
  const id = String(submission.id || (uid ? `final-project-${uid}` : createTimestampId('final-project'))).trim();

  return {
    ...submission,
    id,
    uid,
    memberName: String(submission.memberName || '').trim(),
    nim: String(submission.nim || '').trim(),
    title: String(submission.title || '').trim(),
    description: String(submission.description || '').trim(),
    demoUrl: String(submission.demoUrl || '').trim(),
    githubUrl: String(submission.githubUrl || '').trim(),
    screenshotUrl: String(submission.screenshotUrl || '').trim(),
    note: String(submission.note || '').trim(),
    status: String(submission.status || 'submitted').trim(),
    adminNote: String(submission.adminNote || '').trim(),
    submittedAt: submission.submittedAt || now,
    reviewedAt: submission.reviewedAt || '',
    updatedAt: now,
    schemaVersion: APP_SCHEMA_VERSION
  };
}

export async function loadFinalProjectSubmissions() {
  const submissions = await getCollection('finalProjectSubmissions');
  return submissions
    .map(normalizeFinalProjectSubmission)
    .filter(Boolean)
    .sort((a, b) => String(b.submittedAt || '').localeCompare(String(a.submittedAt || '')));
}

export async function loadMyFinalProjectSubmission(uid) {
  if (!uid) return null;
  const submission = await getDocument('finalProjectSubmissions', `final-project-${uid}`);
  return submission ? normalizeFinalProjectSubmission(submission) : null;
}

export async function upsertFinalProjectSubmission(submission) {
  const normalized = normalizeFinalProjectSubmission({
    ...submission,
    status: submission.status === 'revision' ? 'submitted' : (submission.status || 'submitted')
  });

  if (!normalized.uid || !normalized.title || !normalized.description) {
    throw new Error('Judul project dan deskripsi wajib diisi.');
  }

  if (!normalized.demoUrl && !normalized.githubUrl && !normalized.screenshotUrl) {
    throw new Error('Isi minimal salah satu bukti: link demo, GitHub, atau screenshot.');
  }

  await setDocument('finalProjectSubmissions', normalized.id, normalized);
  await updateMember(normalized.uid, {
    finalProjectStatus: normalized.status,
    finalProjectSubmissionId: normalized.id,
    finalProjectSubmittedAt: normalized.submittedAt
  });
  await createActivity(`${normalized.memberName || normalized.uid} mengirim Final Project.`, 'final-project');
  return normalized;
}

export async function reviewFinalProjectSubmission(submission, status, adminNote = '') {
  const normalized = normalizeFinalProjectSubmission(submission);
  const cleanStatus = String(status || '').trim();

  if (!['approved', 'revision', 'rejected'].includes(cleanStatus)) {
    throw new Error('Status review final project tidak valid.');
  }

  const reviewedAt = new Date().toISOString();
  const patch = {
    ...normalized,
    status: cleanStatus,
    adminNote: String(adminNote || '').trim(),
    reviewedAt,
    updatedAt: reviewedAt
  };

  await setDocument('finalProjectSubmissions', normalized.id, patch);
  await updateMember(normalized.uid, {
    finalProjectStatus: cleanStatus,
    finalProjectAdminNote: patch.adminNote,
    finalProjectReviewedAt: reviewedAt,
    finalProjectApprovedAt: cleanStatus === 'approved' ? reviewedAt : ''
  });

  await addMemberNotification(normalized.uid, {
    type: cleanStatus === 'approved' ? 'success' : cleanStatus === 'revision' ? 'warning' : 'danger',
    title: cleanStatus === 'approved' ? 'Final Project disetujui' : cleanStatus === 'revision' ? 'Final Project perlu revisi' : 'Final Project ditolak',
    message: patch.adminNote || (cleanStatus === 'approved' ? 'Project kamu disetujui. Sertifikat bisa diterbitkan admin.' : 'Cek catatan admin dan kirim ulang project.'),
    link: '/final-quest'
  });

  await createAuditLog('final_project.review', `Final Project ${normalized.memberName || normalized.uid} diubah menjadi ${cleanStatus}.`, { uid: normalized.uid, submissionId: normalized.id, status: cleanStatus });
  return patch;
}

const defaultCertificateSettings = {
  id: 'main',
  programName: 'Dasar Pemrograman, PHP, dan MySQL',
  organizationName: 'Study Group Coding',
  signerName: 'Admin Study Group Coding',
  signerTitle: 'Pengurus / Mentor',
  requirementText: 'Menyelesaikan semua stage, lulus quiz, dan Final Project disetujui.',
  logoUrl: './images/logo.svg',
  signatureUrl: '',
  stampUrl: '',
  published: true,
  updatedAt: new Date().toISOString()
};

export async function loadCertificateSettings() {
  const settings = await getDocument('certificateSettings', 'main');
  return { ...defaultCertificateSettings, ...(settings || {}) };
}

export async function updateCertificateSettings(settings) {
  const payload = {
    ...defaultCertificateSettings,
    ...settings,
    id: 'main',
    updatedAt: new Date().toISOString(),
    schemaVersion: APP_SCHEMA_VERSION
  };

  await setDocument('certificateSettings', 'main', payload);
  await createAuditLog('certificate.settings', 'Pengaturan sertifikat diperbarui.', {});
  return payload;
}

export async function loadCertificates() {
  const certificates = await getCollection('certificates');
  return certificates
    .filter(Boolean)
    .sort((a, b) => String(b.issuedAt || '').localeCompare(String(a.issuedAt || '')));
}

export async function issueCertificate(member, settings = {}) {
  const uid = getMemberUid(member);

  if (member.certificateStatus === 'issued' && member.certificateCode) {
    throw new Error('Member ini sudah punya sertifikat aktif.');
  }

  if (member.finalProjectStatus !== 'approved') {
    throw new Error('Final Project member belum approved. Sertifikat belum bisa diterbitkan.');
  }

  const now = new Date();
  const year = now.getFullYear();
  const serial = `${String(member.nim || uid).replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase()}${String(now.getTime()).slice(-5)}`;
  const code = `SGC-${year}-${serial}`;
  const certSettings = { ...defaultCertificateSettings, ...settings };

  const certificate = {
    id: code,
    code,
    uid,
    memberName: member.name || '',
    nim: member.nim || '',
    programName: certSettings.programName,
    organizationName: certSettings.organizationName,
    signerName: certSettings.signerName,
    signerTitle: certSettings.signerTitle,
    requirementText: certSettings.requirementText,
    logoUrl: certSettings.logoUrl || './images/logo.svg',
    signatureUrl: certSettings.signatureUrl || '',
    stampUrl: certSettings.stampUrl || '',
    status: 'valid',
    issuedAt: now.toISOString(),
    revokedAt: '',
    schemaVersion: APP_SCHEMA_VERSION
  };

  await setDocument('certificates', code, certificate);
  await updateMember(uid, {
    certificateStatus: 'issued',
    certificateCode: code,
    certificateIssuedAt: certificate.issuedAt,
    finalQuestComplete: true
  });
  await addMemberNotification(uid, {
    type: 'success',
    title: 'Sertifikat diterbitkan',
    message: `Sertifikat kamu sudah diterbitkan dengan kode ${code}.`,
    link: '/certificate'
  });
  await createAuditLog('certificate.issue', `Sertifikat ${code} diterbitkan untuk ${member.name || uid}.`, { uid, code });
  return certificate;
}

export async function revokeCertificate(certificate, reason = '') {
  const code = String(certificate?.code || certificate?.id || '').trim();
  if (!code) throw new Error('Kode sertifikat tidak valid.');

  const revokedAt = new Date().toISOString();
  await setDocument('certificates', code, {
    ...certificate,
    code,
    status: 'revoked',
    revokeReason: String(reason || '').trim(),
    revokedAt
  });

  if (certificate.uid) {
    await updateMember(certificate.uid, {
      certificateStatus: 'revoked',
      certificateRevokedAt: revokedAt
    });
    await addMemberNotification(certificate.uid, {
      type: 'danger',
      title: 'Sertifikat dibatalkan',
      message: reason || 'Sertifikat kamu dibatalkan oleh admin.',
      link: '/certificate'
    });
  }

  await createAuditLog('certificate.revoke', `Sertifikat ${code} dibatalkan.`, { code, reason });
}

export async function verifyCertificate(code) {
  const cleanCode = String(code || '').trim().toUpperCase();
  if (!cleanCode) return null;

  const certificate = await getDocument('certificates', cleanCode);
  return certificate || null;
}

export function analyzeSystemHealth(data = {}) {
  const members = data.members || [];
  const courses = data.courses || [];
  const courseSections = data.courseSections || [];
  const questions = data.questions || [];
  const reports = [];

  const unique = (items = []) => new Set(items.map((item) => String(item || '').trim()).filter(Boolean));

  members.forEach((member) => {
    if (!member.uid) reports.push({ type: 'member', level: 'danger', message: `Member ${member.name || member.id || '-'} tidak punya uid.` });
    if (Number(member.coins || 0) < 0) reports.push({ type: 'member', level: 'warning', message: `${member.name || member.uid} punya koin minus.` });
    if ((member.ownedBadges || []).length !== unique(member.ownedBadges || []).size) reports.push({ type: 'member', level: 'warning', message: `${member.name || member.uid} punya ownedBadges duplikat.` });
    if ((member.ownedTitles || []).length !== unique(member.ownedTitles || []).size) reports.push({ type: 'member', level: 'warning', message: `${member.name || member.uid} punya ownedTitles duplikat.` });
    if (!Array.isArray(member.materialBookmarks || [])) reports.push({ type: 'member', level: 'warning', message: `${member.name || member.uid} bookmark belum array.` });
  });

  courses.filter((course) => course.published !== false).forEach((course) => {
    const sections = courseSections.filter((section) => String(section.courseId) === String(course.id) && section.published !== false);
    const courseQuestions = questions.filter((question) => String(question.courseId) === String(course.id) && question.published !== false);

    if (!sections.length) reports.push({ type: 'content', level: 'danger', message: `Stage ${course.stage || course.id} published tapi belum punya materi published.` });
    if (!courseQuestions.length) reports.push({ type: 'content', level: 'danger', message: `Stage ${course.stage || course.id} published tapi belum punya soal published.` });
  });

  return {
    total: reports.length,
    danger: reports.filter((item) => item.level === 'danger').length,
    warning: reports.filter((item) => item.level === 'warning').length,
    reports
  };
}

export async function repairAllMembersData(members = []) {
  let count = 0;

  for (const member of members) {
    if (!member?.uid) continue;
    await cleanMemberData({
      ...member,
      materialBookmarks: Array.isArray(member.materialBookmarks) ? member.materialBookmarks : [],
      privateNotes: member.privateNotes && typeof member.privateNotes === 'object' ? member.privateNotes : {},
      ownedShopItems: makeUniqueList(member.ownedShopItems || []),
      shopInventory: Array.isArray(member.shopInventory) ? member.shopInventory : [],
      shopPurchaseHistory: Array.isArray(member.shopPurchaseHistory) ? member.shopPurchaseHistory : [],
      notifications: Array.isArray(member.notifications) ? member.notifications : []
    });
    count += 1;
  }

  await createAuditLog('health.repair_members', `${count} data member dibersihkan.`, { count });
  return count;
}

export async function exportLearningContent() {
  const [courses, courseSections, questions] = await Promise.all([
    getCollection('courses'),
    getCollection('courseSections'),
    getCollection('questions')
  ]);

  return JSON.stringify({
    schemaVersion: APP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    courses,
    courseSections,
    questions
  }, null, 2);
}

export async function importLearningContent(jsonText) {
  let parsed = jsonText;

  if (typeof jsonText === 'string') {
    try {
      parsed = JSON.parse(jsonText);
    } catch (error) {
      throw new Error('File konten bukan JSON valid.');
    }
  }

  const allowed = ['courses', 'courseSections', 'questions'];
  let count = 0;

  for (const collectionName of allowed) {
    const items = Array.isArray(parsed?.[collectionName]) ? parsed[collectionName] : [];

    for (const item of items) {
      if (!item || typeof item !== 'object') continue;
      const id = String(item.id || item.uid || '').trim();
      if (!id) continue;
      await setDocument(collectionName, id, { ...item, updatedAt: new Date().toISOString(), schemaVersion: APP_SCHEMA_VERSION });
      count += 1;
    }
  }

  await createAuditLog('content.import', `${count} dokumen konten belajar diimport.`, { count });
  return count;
}

function normalizeMediaAsset(asset = {}) {
  const title = String(asset.title || '').trim();
  const id = String(asset.id || createTimestampId('media')).trim();

  return {
    ...asset,
    id,
    title: title || id,
    fileName: String(asset.fileName || '').trim(),
    mimeType: String(asset.mimeType || '').trim(),
    size: asNumber(asset.size, 0),
    dataUrl: String(asset.dataUrl || asset.url || '').trim(),
    markdown: String(asset.markdown || '').trim(),
    createdAt: asset.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    schemaVersion: APP_SCHEMA_VERSION
  };
}

export async function loadMediaAssets() {
  const assets = await getCollection('mediaAssets');
  return assets
    .map(normalizeMediaAsset)
    .filter(Boolean)
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
}

export async function upsertMediaAsset(asset) {
  const normalized = normalizeMediaAsset(asset);
  if (!normalized.dataUrl) throw new Error('File media belum dipilih.');
  if (normalized.size > 750000) throw new Error('Ukuran gambar maksimal 750 KB agar Firestore tidak berat.');

  const markdown = normalized.markdown || `![${normalized.title}](${normalized.dataUrl})`;
  await setDocument('mediaAssets', normalized.id, { ...normalized, markdown });
  await createAuditLog('media.upsert', `Media ${normalized.title} disimpan.`, { mediaId: normalized.id });
  return { ...normalized, markdown };
}

export async function deleteMediaAsset(assetId) {
  const id = String(assetId || '').trim();
  if (!id) throw new Error('Media tidak valid.');
  await deleteDocument('mediaAssets', id);
  await createAuditLog('media.delete', `Media ${id} dihapus.`, { mediaId: id });
}
