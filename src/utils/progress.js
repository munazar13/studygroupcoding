import { todayKey } from './format';
import { addCoinsToMember, addXpToMember } from './levelSystem';

const CHEST_STAGE_NUMBERS = [5, 10, 15, 20, 25, 30, 32];

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

function shouldGiveChest(course) {
  const stageNumber = Number(course.id || course.stage || 0);

  if (course.hasChestReward === false) {
    return false;
  }

  if (course.hasChestReward === true) {
    return true;
  }

  if (course.chestId) {
    return true;
  }

  return CHEST_STAGE_NUMBERS.includes(stageNumber);
}

export function createStageChest(course) {
  const stageNumber = Number(course.id || course.stage || 0);

  return {
    id: `chest-${stageNumber}-${Date.now()}`,
    chestId: course.chestId || `stage-${stageNumber}-chest`,
    stageId: stageNumber,
    sourceStageId: String(course.id || stageNumber),
    sourceStageTitle: course.title || `Stage ${stageNumber}`,
    title: course.chestName || `Chest Stage ${stageNumber}`,
    description: course.chestDescription || `Chest dari Stage ${stageNumber}.`,
    rarity: course.chestRarity || (stageNumber >= 30 ? 'epic' : stageNumber >= 15 ? 'rare' : 'common'),
    icon: course.chestIcon || '🎁',
    opened: false,
    createdAt: new Date().toISOString()
  };
}

export function applyCourseCompletion(member, course) {
  const courseId = Number(course.id || course.stage || course.order || 0);
  const completedCourses = new Set(
    (member.completedCourses || [])
      .map((item) => Number(item))
      .filter((item) => Number.isFinite(item) && item > 0)
  );

  if (courseId > 0) {
    completedCourses.add(courseId);
  }

  return {
    completedCourses: [...completedCourses],
    ...updateStudyStreak(member)
  };
}

export function applyQuizPass(member, course, result) {
  const stageId = Number(course.id || course.stage || course.order || 0);
  const normalizeStageSet = (items = []) => new Set(
    items
      .map((item) => Number(item))
      .filter((item) => Number.isFinite(item) && item > 0)
  );

  const passedStages = normalizeStageSet(member.passedStages || []);
  const completedStages = normalizeStageSet(member.completedStages || []);
  const badges = new Set((member.badges || []).map(String));
  const ownedBadges = new Set((member.ownedBadges || member.badges || []).map(String));
  const titles = new Set((member.titles || []).map(String));
  const ownedTitles = new Set((member.ownedTitles || member.titles || []).map(String));
  const unlockedRewards = new Set((member.unlockedRewards || []).map(String));
  const alreadyPassed = passedStages.has(stageId);

  const currentStage = Math.max(
    Number(member.currentStage || 1),
    stageId + 1
  );

  const oldProgress = member.stageProgress || {};
  const oldStageProgress = oldProgress[String(stageId)] || {};
  const previousBestScore = Number(oldStageProgress.bestScore || 0);
  const attemptCount = Number(oldStageProgress.attemptCount || 0) + 1;

  const historyItem = {
    stageId,
    score: result.score,
    correct: result.correct,
    total: result.total,
    passed: true,
    rewardGiven: !alreadyPassed,
    date: new Date().toISOString()
  };

  passedStages.add(stageId);
  completedStages.add(stageId);

  let nextMember = {
    ...member,
    currentStage,
    passedStages: [...passedStages],
    completedStages: [...completedStages],
    quizHistory: [historyItem, ...(member.quizHistory || [])],
    stageProgress: {
      ...oldProgress,
      [String(stageId)]: {
        ...oldStageProgress,
        passed: true,
        bestScore: Math.max(previousBestScore, Number(result.score || 0)),
        attemptCount,
        completedAt: oldStageProgress.completedAt || new Date().toISOString(),
        lastAttemptAt: new Date().toISOString()
      }
    },
    ...updateStudyStreak(member)
  };

  const stageRewards = [];

  if (!alreadyPassed) {
    const bonusPerfectXp = Number(result.score || 0) === 100 ? 50 : 0;
    const gainedXp = Number(course.xpReward || 80) + bonusPerfectXp;
    const gainedCoins = Number(course.coinReward || 20);

    nextMember = addXpToMember(nextMember, gainedXp);
    nextMember = addCoinsToMember(nextMember, gainedCoins);

    if (course.badgeRewardEnabled && course.badgeId) {
      badges.add(course.badgeId);
      ownedBadges.add(course.badgeId);
      unlockedRewards.add(course.badgeId);
      stageRewards.push({
        type: 'badge',
        id: course.badgeId,
        name: course.badgeName || course.badgeId,
        icon: course.badgeIcon || '🏅'
      });
    }

    if (course.titleRewardEnabled && course.titleRewardId) {
      titles.add(course.titleRewardId);
      ownedTitles.add(course.titleRewardId);
      unlockedRewards.add(course.titleRewardId);
      stageRewards.push({
        type: 'title',
        id: course.titleRewardId,
        name: course.titleRewardName || course.titleRewardId,
        icon: course.titleRewardIcon || '🎖️'
      });
    }

    if (shouldGiveChest(course)) {
      const chest = createStageChest(course);
      unlockedRewards.add(chest.id);
      stageRewards.push({
        type: 'chest',
        id: chest.id,
        name: chest.title,
        icon: chest.icon || '🎁'
      });

      nextMember.unopenedChests = [
        chest,
        ...(member.unopenedChests || [])
      ];
    }
  }

  return {
    level: nextMember.level,
    xp: nextMember.xp,
    xpToNextLevel: nextMember.xpToNextLevel,
    totalXp: nextMember.totalXp,
    coins: nextMember.coins,
    currentStage: nextMember.currentStage,
    passedStages: nextMember.passedStages,
    completedStages: nextMember.completedStages,
    badges: [...badges],
    ownedBadges: [...ownedBadges],
    titles: [...titles],
    ownedTitles: [...ownedTitles],
    unlockedRewards: [...unlockedRewards],
    unopenedChests: nextMember.unopenedChests || member.unopenedChests || [],
    quizHistory: nextMember.quizHistory,
    stageProgress: nextMember.stageProgress,
    streak: nextMember.streak,
    lastStudyDate: nextMember.lastStudyDate,
    activeBadge: member.activeBadge || (stageRewards.find((item) => item.type === 'badge')?.id || ''),
    activeTitle: member.activeTitle || (stageRewards.find((item) => item.type === 'title')?.id || ''),
    lastStageRewards: stageRewards
  };
}

export function applyQuizAttempt(member, course, result) {
  const stageId = Number(course.id);
  const oldProgress = member.stageProgress || {};
  const oldStageProgress = oldProgress[String(stageId)] || {};
  const previousBestScore = Number(oldStageProgress.bestScore || 0);
  const attemptCount = Number(oldStageProgress.attemptCount || 0) + 1;

  const historyItem = {
    stageId,
    score: result.score,
    correct: result.correct,
    total: result.total,
    passed: false,
    rewardGiven: false,
    date: new Date().toISOString()
  };

  return {
    quizHistory: [historyItem, ...(member.quizHistory || [])],
    stageProgress: {
      ...oldProgress,
      [String(stageId)]: {
        ...oldStageProgress,
        passed: oldStageProgress.passed || false,
        bestScore: Math.max(previousBestScore, Number(result.score || 0)),
        attemptCount,
        lastAttemptAt: new Date().toISOString()
      }
    },
    ...updateStudyStreak(member)
  };
}

function normalizeChestItem(chest, index = 0) {
  if (!chest) return null;

  if (typeof chest === 'string') {
    return {
      id: chest,
      chestId: chest,
      title: chest.replace(/[-_]+/g, ' '),
      description: 'Chest dari data lama.',
      rarity: 'common',
      icon: '🎁',
      opened: false,
      createdAt: ''
    };
  }

  return {
    ...chest,
    id: String(chest.id || chest.chestId || `chest-${index}`),
    chestId: String(chest.chestId || chest.id || `chest-${index}`),
    title: chest.title || chest.name || 'Chest Baru',
    description: chest.description || 'Chest reward.',
    rarity: chest.rarity || 'common',
    icon: chest.icon || '🎁',
    opened: chest.opened === true,
    createdAt: chest.createdAt || ''
  };
}

export function openChest(member, chestId) {
  const unopenedChests = (member.unopenedChests || [])
    .map((chest, index) => normalizeChestItem(chest, index))
    .filter(Boolean);

  const targetId = String(chestId || '');
  const chest = unopenedChests.find((item) => (
    String(item.id) === targetId ||
    String(item.chestId) === targetId
  ));

  if (!chest) {
    return null;
  }

  const rewardXp = Math.floor(Math.random() * 71) + 30;
  const rewardCoins = Math.floor(Math.random() * 101) + 50;

  let nextMember = addXpToMember(member, rewardXp);
  nextMember = addCoinsToMember(nextMember, rewardCoins);

  const openedItem = {
    ...chest,
    opened: true,
    openedAt: new Date().toISOString(),
    rewardType: 'xp-coins',
    rewardXp,
    rewardCoins,
    rewardText: `+${rewardXp} XP dan +${rewardCoins} koin`
  };

  return {
    level: nextMember.level,
    xp: nextMember.xp,
    xpToNextLevel: nextMember.xpToNextLevel,
    totalXp: nextMember.totalXp,
    coins: nextMember.coins,
    unopenedChests: unopenedChests.filter((item) => item.id !== chest.id),
    openedChests: Array.from(new Set([String(chest.chestId || chest.id), ...(member.openedChests || []).map(String)])),
    chestHistory: [openedItem, ...(member.chestHistory || [])]
  };
}
