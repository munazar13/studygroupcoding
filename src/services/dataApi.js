import {
  createActivity,
  deleteDocument,
  getCollection,
  getDocument,
  seedCoreData,
  setDocument,
  updateMember
} from './firebase';
import seedRewards from '../data/rewards.json';
import seedRanks from '../data/ranks.json';
import seedFounders from '../data/founders.json';

export const localSeed = {
  rewards: seedRewards,
  ranks: seedRanks,
  founders: seedFounders,
  events: [],
  docs: [],
  projects: []
};

function asNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeCourse(course) {
  if (!course) return null;

  const stageNumber = asNumber(course.stage || course.order || course.id, 1);

  return {
    ...course,
    id: String(course.id || stageNumber),
    stage: stageNumber,
    order: asNumber(course.order || stageNumber, stageNumber),
    minScore: asNumber(course.minScore, 70),
    xpReward: asNumber(course.xpReward, 100),
    coinReward: asNumber(course.coinReward, 25),
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

function sortByOrder(items) {
  return [...items].sort((a, b) => {
    const first = asNumber(a.order || a.stage || a.id, 0);
    const second = asNumber(b.order || b.stage || b.id, 0);
    return first - second;
  });
}

export async function importSystemData() {
  return seedCoreData(localSeed);
}

export async function loadPublicData() {
  const [founders, events, docs, projects] = await Promise.all([
    getCollection('founders'),
    getCollection('events'),
    getCollection('docs'),
    getCollection('projects')
  ]);

  return {
    founders: founders.length ? sortByOrder(founders) : seedFounders,
    events: sortByOrder(events).sort((a, b) => String(a.date || '').localeCompare(String(b.date || ''))),
    docs: docs.filter((item) => item.published !== false),
    projects: projects.filter((item) => item.published !== false)
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
    rewards: rewards.length ? sortByOrder(rewards) : seedRewards,
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
    title: course.title.trim(),
    area: course.area.trim(),
    theme: course.theme.trim(),
    badgeId: course.badgeId.trim()
  });

  if (!normalized.title || !normalized.id) {
    throw new Error('Stage dan judul wajib diisi.');
  }

  await setDocument('courses', normalized.id, normalized);
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
  const options = [question.optionA, question.optionB, question.optionC, question.optionD]
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
    getCollection('activity')
  ]);

  return JSON.stringify({
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
    activity
  }, null, 2);
}

export async function createLog(text, type = 'system') {
  return createActivity(text, type);
}
