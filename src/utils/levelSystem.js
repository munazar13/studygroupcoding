export function isStageUnlocked(member, stageId) {
  if (!member) {
    return false;
  }

  return Number(stageId) <= Number(member.currentStage || 1);
}

function getCourseStageNumber(course = {}) {
  return Number(course.stage || course.order || course.id || 0);
}

function getCompletedStageSet(member = {}) {
  return new Set([
    ...(member.passedStages || []),
    ...(member.completedStages || [])
  ]
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item) && item > 0)
  );
}

export function getNextCourse(courses, member) {
  if (!courses.length || !member) {
    return null;
  }

  const currentStage = Number(member.currentStage || 1);
  const completedStages = getCompletedStageSet(member);
  const sortedCourses = [...courses].sort(
    (a, b) => getCourseStageNumber(a) - getCourseStageNumber(b)
  );

  return (
    sortedCourses.find((course) => {
      const stageNumber = getCourseStageNumber(course);

      return stageNumber >= currentStage && !completedStages.has(stageNumber);
    }) ||
    sortedCourses.find((course) => !completedStages.has(getCourseStageNumber(course))) ||
    null
  );
}

export function getRank(ranks, xp = 0) {
  if (!ranks.length) {
    return { name: 'Rookie Coder', minXp: 0, nextXp: 300 };
  }

  const sorted = [...ranks].sort((a, b) => Number(a.minXp || 0) - Number(b.minXp || 0));
  let current = sorted[0];

  sorted.forEach((rank) => {
    if (Number(xp) >= Number(rank.minXp || 0)) {
      current = rank;
    }
  });

  const next = sorted.find((rank) => Number(rank.minXp || 0) > Number(xp));

  return {
    ...current,
    nextXp: next?.minXp || current.minXp + 1000
  };
}

export function calculateAverageQuiz(member) {
  const history = member?.quizHistory || [];

  if (!history.length) {
    return 0;
  }
  
  const total = history.reduce((sum, item) => sum + Number(item.score || 0), 0);
  return Math.round(total / history.length);
}
export function getXpToNextLevel(level = 1) {
  const safeLevel = Math.max(1, Number(level) || 1);

  return 100 + (safeLevel - 1) * 25;
}

export function normalizeMemberProgress(member = {}) {
  const level = Math.max(1, Number(member.level) || 1);
  const xp = Math.max(0, Number(member.xp) || 0);
  const xpToNextLevel = Math.max(
    getXpToNextLevel(level),
    Number(member.xpToNextLevel) || getXpToNextLevel(level)
  );

  return {
    level,
    xp,
    xpToNextLevel,
    totalXp: Math.max(0, Number(member.totalXp) || Number(member.xp) || 0),
    coins: Math.max(0, Number(member.coins) || 0)
  };
}

export function addXpToMember(member = {}, gainedXp = 0) {
  let { level, xp, totalXp, coins } = normalizeMemberProgress(member);
  const addedXp = Math.max(0, Number(gainedXp) || 0);

  let xpToNextLevel = getXpToNextLevel(level);
  let leveledUp = false;
  let levelUpCount = 0;

  xp += addedXp;
  totalXp += addedXp;

  while (xp >= xpToNextLevel) {
    xp -= xpToNextLevel;
    level += 1;
    levelUpCount += 1;
    leveledUp = true;
    xpToNextLevel = getXpToNextLevel(level);
  }

  return {
    ...member,
    level,
    xp,
    xpToNextLevel,
    totalXp,
    coins,
    leveledUp,
    levelUpCount
  };
}

export function addCoinsToMember(member = {}, gainedCoins = 0) {
  const currentCoins = Math.max(0, Number(member.coins) || 0);
  const addedCoins = Math.max(0, Number(gainedCoins) || 0);

  return {
    ...member,
    coins: currentCoins + addedCoins
  };
}

export function getXpPercent(member = {}) {
  const { xp, xpToNextLevel } = normalizeMemberProgress(member);

  if (!xpToNextLevel) return 0;

  return Math.min(100, Math.round((xp / xpToNextLevel) * 100));
}