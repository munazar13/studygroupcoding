import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
  sendPasswordResetEmail,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile
} from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  getFirestore,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch
} from 'firebase/firestore';
import { firebaseAppOptions, firebaseConfig, isFirebaseConfigReady } from '../config/firebaseConfig';

let app = null;
let auth = null;
let db = null;

if (isFirebaseConfigReady()) {
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
}

export function firebaseReady() {
  return Boolean(app && auth && db);
}

export function getFirebaseAuth() {
  return auth;
}

export function getFirebaseDb() {
  return db;
}

export function normalizeNim(nim) {
  return String(nim || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');
}

export function nimToEmail(nim) {
  const cleanNim = normalizeNim(nim);

  return `${cleanNim}@${firebaseAppOptions.nimEmailDomain}`;
}

export function adminIdentifierToEmail(identifier) {
  const value = String(identifier).trim();

  if (value.toLowerCase() === 'admin') {
    return firebaseAppOptions.adminEmail;
  }

  if (value.includes('@')) {
    return value;
  }

  return nimToEmail(value);
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function isConfiguredAdminEmail(email) {
  return normalizeEmail(email) === normalizeEmail(firebaseAppOptions.adminEmail);
}

function createVirtualAdminMember(user) {
  const now = new Date().toISOString();

  return {
    id: user.uid,
    uid: user.uid,
    name: user.displayName || 'Admin Study Group Coding',
    nim: 'admin',
    cohort: 'Admin',
    avatar: '🛡️',
    authEmail: normalizeEmail(user.email),
    recoveryEmail: normalizeEmail(user.email),
    role: 'admin',
    status: 'approved',
    schemaVersion: 3,
    level: 1,
    xp: 0,
    xpToNextLevel: 100,
    totalXp: 0,
    coins: 0,
    streak: 0,
    currentStage: 1,
    completedCourses: [],
    completedStages: [],
    passedStages: [],
    stageProgress: {},
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
    coinTransactions: [],
    quizHistory: [],
    activityLogs: [],
    materialBookmarks: [],
    privateNotes: {},
    ownedShopItems: [],
    shopInventory: [],
    shopPurchaseHistory: [],
    notifications: [],
    activeNameColor: '',
    activeProfileDecoration: '',
    challengeSubmissions: [],
    completedChallenges: [],
    challengeRewardHistory: [],
    lastChallengeReward: null,
    finalProjectStatus: '',
    finalProjectSubmissionId: '',
    finalProjectSubmittedAt: '',
    finalProjectAdminNote: '',
    finalProjectReviewedAt: '',
    finalProjectApprovedAt: '',
    finalQuestComplete: false,
    certificateStatus: '',
    certificateCode: '',
    certificateIssuedAt: '',
    certificateRevokedAt: '',
    lastStudyDate: '',
    createdAt: now,
    updatedAt: now,
    virtualAdmin: true
  };
}

async function findMemberAuthRecordByNim(nim) {
  if (!firebaseReady()) {
    throw new Error('Firebase belum dikonfigurasi.');
  }

  const cleanNim = normalizeNim(nim);

  if (!cleanNim) {
    throw new Error('NIM wajib diisi.');
  }

  const snapshot = await getDoc(doc(db, 'nimIndex', cleanNim));

  if (snapshot.exists()) {
    const data = snapshot.data();

    return {
      nim: cleanNim,
      uid: data.uid || '',
      authEmail: normalizeEmail(data.authEmail || data.recoveryEmail || data.email),
      recoveryEmail: normalizeEmail(data.recoveryEmail || data.authEmail || data.email),
      isLegacyGeneratedEmail: false
    };
  }

  return {
    nim: cleanNim,
    uid: '',
    authEmail: nimToEmail(cleanNim),
    recoveryEmail: '',
    isLegacyGeneratedEmail: true
  };
}

export async function signInMember(nim, password) {
  if (!firebaseReady()) {
    throw new Error('Firebase belum dikonfigurasi.');
  }

  const record = await findMemberAuthRecordByNim(nim);

  return signInWithEmailAndPassword(auth, record.authEmail, password);
}

export async function sendMemberPasswordReset(identifier) {
  if (!firebaseReady()) {
    throw new Error('Firebase belum dikonfigurasi.');
  }

  const value = String(identifier || '').trim();

  if (!value) {
    throw new Error('Isi NIM atau email pemulihan terlebih dahulu.');
  }

  if (value.includes('@')) {
    await sendPasswordResetEmail(auth, normalizeEmail(value));
    return normalizeEmail(value);
  }

  const record = await findMemberAuthRecordByNim(value);

  if (record.isLegacyGeneratedEmail) {
    throw new Error('Akun lama ini belum punya email pemulihan. Tambahkan email pemulihan dulu dari profil atau daftar ulang sesuai arahan admin.');
  }

  await sendPasswordResetEmail(auth, record.authEmail);
  return record.recoveryEmail || record.authEmail;
}

export async function signInAdmin(identifier, password) {
  if (!firebaseReady()) {
    throw new Error('Firebase belum dikonfigurasi.');
  }

  return signInWithEmailAndPassword(auth, adminIdentifierToEmail(identifier), password);
}

function createDefaultMember(payload, uid) {
  const now = new Date().toISOString();

  return {
    uid,
    name: String(payload.name || '').trim(),
    nim: normalizeNim(payload.nim),
    cohort: String(payload.cohort || '').trim(),
    avatar: payload.avatar || '🧑‍💻',
    authEmail: normalizeEmail(payload.authEmail || payload.email),
    recoveryEmail: normalizeEmail(payload.recoveryEmail || payload.email),

    role: 'member',
    status: 'pending',
    schemaVersion: 3,

    level: 1,
    xp: 0,
    xpToNextLevel: 100,
    totalXp: 0,
    coins: 0,
    streak: 0,

    currentStage: 1,
    completedCourses: [],
    completedStages: [],
    passedStages: [],
    stageProgress: {},

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
    coinTransactions: [],
    quizHistory: [],
    activityLogs: [],
    ownedShopItems: [],
    shopInventory: [],
    shopPurchaseHistory: [],
    notifications: [],
    activeNameColor: '',
    activeProfileDecoration: '',

    challengeSubmissions: [],
    completedChallenges: [],
    challengeRewardHistory: [],
    lastChallengeReward: null,

    finalProjectStatus: '',
    finalProjectSubmissionId: '',
    finalProjectSubmittedAt: '',
    finalProjectAdminNote: '',
    finalProjectReviewedAt: '',
    finalProjectApprovedAt: '',
    finalQuestComplete: false,
    certificateStatus: '',
    certificateCode: '',
    certificateIssuedAt: '',
    certificateRevokedAt: '',
    lastStudyDate: '',

    createdAt: now,
    updatedAt: now
  };
}

export async function createMemberAccount(payload) {
  if (!firebaseReady()) {
    throw new Error('Firebase belum dikonfigurasi.');
  }

  const cleanNim = normalizeNim(payload.nim);
  const authEmail = normalizeEmail(payload.email || payload.recoveryEmail);

  if (!cleanNim) {
    throw new Error('NIM wajib diisi.');
  }

  if (!authEmail || !authEmail.includes('@')) {
    throw new Error('Email pemulihan wajib diisi dengan format email yang benar.');
  }

  const nimIndexRef = doc(db, 'nimIndex', cleanNim);
  const nimIndexSnapshot = await getDoc(nimIndexRef);

  if (nimIndexSnapshot.exists()) {
    throw new Error('NIM ini sudah terdaftar. Silakan login, bukan daftar ulang.');
  }

  try {
    const credential = await createUserWithEmailAndPassword(
      auth,
      authEmail,
      payload.password
    );

    await updateProfile(credential.user, {
      displayName: payload.name
    });

    const member = createDefaultMember(
      {
        ...payload,
        nim: cleanNim,
        authEmail,
        recoveryEmail: authEmail
      },
      credential.user.uid
    );

    await setDoc(doc(db, 'members', credential.user.uid), member);

    await setDoc(nimIndexRef, {
      nim: cleanNim,
      uid: credential.user.uid,
      authEmail,
      recoveryEmail: authEmail,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    await createActivity(
      `${member.name} mendaftar dan menunggu persetujuan pengurus.`,
      'member'
    );

    return member;
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('Email ini sudah dipakai. Gunakan email lain atau buka halaman lupa password.');
    }

    throw error;
  }
}

export function listenToAuth(callback) {
  if (!firebaseReady()) {
    callback(null);
    return () => {};
  }

  return onAuthStateChanged(auth, callback);
}

export async function logoutFirebase() {
  if (auth) {
    await signOut(auth);
  }
}

export async function getMember(uid) {
  if (!firebaseReady() || !uid) {
    return null;
  }

  const snapshot = await getDoc(doc(db, 'members', uid));

  if (snapshot.exists()) {
    return { id: snapshot.id, ...snapshot.data() };
  }

  const activeUser = auth?.currentUser;

  if (activeUser?.uid === uid && isConfiguredAdminEmail(activeUser.email)) {
    return createVirtualAdminMember(activeUser);
  }

  return null;
}

export async function updateMember(uid, patch) {
  await updateDoc(doc(db, 'members', uid), {
    ...patch,
    updatedAt: new Date().toISOString()
  });
}

export async function getCollection(collectionName, options = {}) {
  const ref = collection(db, collectionName);
  const constraints = [];

  if (options.where) {
    options.where.forEach((item) => constraints.push(where(item.field, item.operator, item.value)));
  }

  if (options.orderBy) {
    constraints.push(orderBy(options.orderBy.field, options.orderBy.direction || 'asc'));
  }

  const snapshot = await getDocs(constraints.length ? query(ref, ...constraints) : ref);
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function getDocument(collectionName, id) {
  const snapshot = await getDoc(doc(db, collectionName, String(id)));
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}

export async function setDocument(collectionName, id, data) {
  await setDoc(doc(db, collectionName, String(id)), {
    ...data,
    updatedAt: new Date().toISOString()
  }, { merge: true });
}

export async function addDocument(collectionName, data) {
  return addDoc(collection(db, collectionName), {
    ...data,
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
}

export async function deleteDocument(collectionName, id) {
  await deleteDoc(doc(db, collectionName, String(id)));
}

export async function createActivity(text, type = 'system') {
  if (!firebaseReady()) {
    return;
  }

  await addDoc(collection(db, 'activity'), {
    text,
    type,
    createdAt: new Date().toISOString()
  });
}

export async function isCollectionEmpty(collectionName) {
  const snapshot = await getCountFromServer(collection(db, collectionName));
  return snapshot.data().count === 0;
}

function chunkArray(items, size) {
  const chunks = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

export async function seedCoreData(seed) {
  if (!firebaseReady()) {
    throw new Error('Firebase belum dikonfigurasi.');
  }

  const jobs = [];

  const collections = [
    ['rewards', seed.rewards || []],
    ['ranks', seed.ranks || []],
    ['founders', seed.founders || []],
    ['events', seed.events || []],
    ['docs', seed.docs || []],
    ['projects', seed.projects || []],
    ['challenges', seed.challenges || []],
    ['challengeSubmissions', seed.challengeSubmissions || []]
  ];

  collections.forEach(([name, items]) => {
    items.forEach((item) => {
      const id = item.id || `${name}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      jobs.push({ collectionName: name, id: String(id), data: item });
    });
  });

  for (const chunk of chunkArray(jobs, 450)) {
    const batch = writeBatch(db);

    chunk.forEach((job) => {
      batch.set(doc(db, job.collectionName, job.id), {
        ...job.data,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    });

    await batch.commit();
  }

  await createActivity('Data sistem dasar diperbarui oleh admin.', 'admin');

  return jobs.length;
}
