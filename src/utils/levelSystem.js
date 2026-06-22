export function isStageUnlocked(member, stageId) {
  if (!member) {
    return false;
  }

  return Number(stageId) <= Number(member.currentStage || 1);
}

export function getNextCourse(courses, member) {
  if (!courses.length || !member) {
    return null;
  }

  const currentStage = Number(member.currentStage || 1);
  return courses.find((course) => Number(course.id) === currentStage) || courses[0];
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
