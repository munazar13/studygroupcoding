import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

export const firebaseConfig = {
  apiKey: "AIzaSyDcCKe6INSWQoL2dMb6ni9CERHslBWXahs",
  authDomain: "studygroupcoding.firebaseapp.com",
  projectId: "studygroupcoding",
  storageBucket: "studygroupcoding.firebasestorage.app",
  messagingSenderId: "895371650167",
  appId: "1:895371650167:web:819364fa107b4b0d89d272",
  measurementId: "G-EQ6VCKW3H9",
};

export const firebaseAppOptions = {
  nimEmailDomain: "studygroupcoding.app",
  adminEmail: "admin@studygroupcoding.app",
};

export function isFirebaseConfigReady() {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.projectId &&
      !firebaseConfig.apiKey.includes("PASTE_") &&
      !firebaseConfig.projectId.includes("PASTE_")
  );
}

// Biar Firebase tidak error kalau ke-initialize lebih dari sekali
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;