import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  createMemberAccount,
  firebaseReady,
  getMember,
  listenToAuth,
  logoutFirebase,
  signInAdmin,
  sendMemberPasswordReset,
  signInMember,
  syncMemberPublicProfile,
  updateMember
} from '../services/firebase';

const AuthContext = createContext(null);

function normalizeMember(member) {
  if (!member) {
    return null;
  }

  return {
  role: 'member',
  status: 'pending',
  authEmail: '',
  recoveryEmail: '',
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

  ...member
};
}

export function AuthProvider({ children }) {
  const [firebaseConfigured] = useState(() => firebaseReady());
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [currentMember, setCurrentMember] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  async function setAndSyncMember(member) {
    const normalized = normalizeMember(member);
    setCurrentMember(normalized);

    if (normalized?.uid && normalized.status === 'approved') {
      syncMemberPublicProfile(normalized).catch((error) => {
        console.warn('Gagal memperbarui profil publik leaderboard:', error);
      });
    }

    return normalized;
  }

  useEffect(() => {
    const unsubscribe = listenToAuth(async (user) => {
      setFirebaseUser(user);

      if (!user) {
        setCurrentMember(null);
        setAuthLoading(false);
        return;
      }

      try {
        const member = await getMember(user.uid);
        await setAndSyncMember(member);
      } catch (error) {
        console.error('Gagal mengambil data anggota.', error);
        setCurrentMember(null);
      } finally {
        setAuthLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  async function refreshMember() {
    if (!firebaseUser) {
      setCurrentMember(null);
      return null;
    }

    const member = await getMember(firebaseUser.uid);
    return setAndSyncMember(member);
  }

  async function loginMember(nim, password) {
    const credential = await signInMember(nim, password);
    const member = await getMember(credential.user.uid);

    if (!member) {
      throw new Error('Akun ditemukan, tetapi profil anggota belum dibuat. Hubungi pengurus.');
    }

    return setAndSyncMember(member);
  }

  async function loginAdmin(identifier, password) {
    const credential = await signInAdmin(identifier, password);
    const member = await getMember(credential.user.uid);

    if (!member || member.role !== 'admin') {
      await logoutFirebase();
      throw new Error('Akun ini bukan admin.');
    }

    if (member.status !== 'approved') {
      await logoutFirebase();
      throw new Error('Akun admin belum aktif.');
    }

    return setAndSyncMember(member);
  }

  async function registerMember(payload) {
    const member = await createMemberAccount(payload);
    return setAndSyncMember(member);
  }

  async function resetMemberPassword(identifier) {
    return sendMemberPasswordReset(identifier);
  }

  async function logout() {
    await logoutFirebase();
    setCurrentMember(null);
  }

  async function updateCurrentMember(patchOrUpdater) {
    if (!currentMember) {
      return null;
    }

    const patch = typeof patchOrUpdater === 'function'
      ? patchOrUpdater(currentMember)
      : patchOrUpdater;

    await updateMember(currentMember.uid, patch);
    return refreshMember();
  }

  const value = useMemo(() => ({
    firebaseConfigured,
    firebaseUser,
    currentMember,
    authLoading,
    isAuthenticated: Boolean(firebaseUser),
    isApproved: currentMember?.status === 'approved',
    isAdmin: currentMember?.role === 'admin',
    loginMember,
    loginAdmin,
    registerMember,
    resetMemberPassword,
    logout,
    refreshMember,
    updateCurrentMember
  }), [firebaseConfigured, firebaseUser, currentMember, authLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth harus digunakan di dalam AuthProvider.');
  }

  return context;
}
