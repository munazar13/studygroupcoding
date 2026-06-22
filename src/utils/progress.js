import { todayKey } from './format';

export function updateStudyStreak(member) {
  const today = todayKey();
  const lastStudyDate = member.lastStudyDate || '';

  if (lastStudyDate === today) {
    return {
      streak: member.streak || 0,
      lastStudyDate: today
    };
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = yesterday.toISOString().slice(0, 10);

  const nextStreak = lastStudyDate === yesterdayKey
    ? Number(member.streak || 0) + 1
    : 1;

  return {
    streak: nextStreak,
    lastStudyDate: today
  };
}

export function createStageChest(course) {
  return {
    id: `chest-${course.id}-${Date.now()}`,
    stageId: Number(course.id),
    title: `Peti Stage ${course.id}`,
    rarity: Number(course.id) >= 25 ? 'Epic' : Number(course.id) >= 13 ? 'Rare' : 'Common',
    xp: Math.max(25, Math.round(Number(course.xpReward || 80) * 0.35)),
    coins: Math.max(10, Math.round(Number(course.coinReward || 20) * 0.8)),
    createdAt: new Date().toISOString()
  };
}

export function applyCourseCompletion(member, course) {
  const completedCourses = new Set(member.completedCourses || []);
  completedCourses.add(Number(course.id));

  return {
    completedCourses: [...completedCourses],
    xp: Number(member.xp || 0) + 20,
    ...updateStudyStreak(member)
  };
}

export function applyQuizPass(member, course, result) {
  const passedStages = new Set(member.passedStages || []);
  const badges = new Set(member.badges || []);
  const unlockedRewards = new Set(member.unlockedRewards || []);
  const chest = createStageChest(course);

  passedStages.add(Number(course.id));

  if (course.badgeId) {
    badges.add(course.badgeId);
    unlockedRewards.add(course.badgeId);
  }

  unlockedRewards.add(chest.id);

  const currentStage = Math.max(
    Number(member.currentStage || 1),
    Number(course.id) + 1
  );

  const historyItem = {
    stageId: Number(course.id),
    score: result.score,
    correct: result.correct,
    total: result.total,
    passed: true,
    date: new Date().toISOString()
  };

  return {
    xp: Number(member.xp || 0) + Number(course.xpReward || 80) + (result.score === 100 ? 50 : 0),
    coins: Number(member.coins || 0) + Number(course.coinReward || 20),
    currentStage,
    passedStages: [...passedStages],
    badges: [...badges],
    unlockedRewards: [...unlockedRewards],
    unopenedChests: [chest, ...(member.unopenedChests || [])],
    quizHistory: [historyItem, ...(member.quizHistory || [])],
    ...updateStudyStreak(member)
  };
}

export function applyQuizAttempt(member, course, result) {
  const historyItem = {
    stageId: Number(course.id),
    score: result.score,
    correct: result.correct,
    total: result.total,
    passed: false,
    date: new Date().toISOString()
  };

  return {
    xp: Number(member.xp || 0) + 10,
    quizHistory: [historyItem, ...(member.quizHistory || [])],
    ...updateStudyStreak(member)
  };
}

export function openChest(member, chestId) {
  const unopenedChests = member.unopenedChests || [];
  const chest = unopenedChests.find((item) => item.id === chestId);

  if (!chest) {
    return null;
  }

  const openedItem = {
    ...chest,
    openedAt: new Date().toISOString(),
    rewardText: `+${chest.xp} XP dan +${chest.coins} koin`
  };

  return {
    xp: Number(member.xp || 0) + Number(chest.xp || 0),
    coins: Number(member.coins || 0) + Number(chest.coins || 0),
    unopenedChests: unopenedChests.filter((item) => item.id !== chestId),
    chestHistory: [openedItem, ...(member.chestHistory || [])]
  };
}
