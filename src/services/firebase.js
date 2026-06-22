import { initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
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
  app = initializeApp(firebaseConfig);
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

export function nimToEmail(nim) {
  return `${String(nim).trim()}@${firebaseAppOptions.nimEmailDomain}`;
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

export async function signInMember(nim, password) {
  if (!firebaseReady()) {
    throw new Error('Firebase belum dikonfigurasi.');
  }

  return signInWithEmailAndPassword(auth, nimToEmail(nim), password);
}

export async function signInAdmin(identifier, password) {
  if (!firebaseReady()) {
    throw new Error('Firebase belum dikonfigurasi.');
  }

  return signInWithEmailAndPassword(auth, adminIdentifierToEmail(identifier), password);
}

export async function createMemberAccount(payload) {
  if (!firebaseReady()) {
    throw new Error('Firebase belum dikonfigurasi.');
  }

  const credential = await createUserWithEmailAndPassword(auth, nimToEmail(payload.nim), payload.password);
  const now = new Date().toISOString();

  await updateProfile(credential.user, {
    displayName: payload.name
  });

  const member = {
    uid: credential.user.uid,
    name: payload.name.trim(),
    nim: payload.nim.trim(),
    cohort: payload.cohort.trim(),
    avatar: payload.avatar || '🧑‍💻',
    role: 'member',
    status: 'pending',
    xp: 0,
    coins: 0,
    streak: 0,
    currentStage: 1,
    completedCourses: [],
    passedStages: [],
    badges: [],
    unlockedRewards: [],
    unopenedChests: [],
    chestHistory: [],
    quizHistory: [],
    finalQuestComplete: false,
    certificateCode: '',
    lastStudyDate: '',
    createdAt: now,
    updatedAt: now
  };

  await setDoc(doc(db, 'members', credential.user.uid), member);
  await createActivity(`${member.name} mendaftar dan menunggu persetujuan pengurus.`, 'member');

  return member;
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
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
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
    ['projects', seed.projects || []]
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
