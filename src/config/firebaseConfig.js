export const firebaseConfig = {
  apiKey: "AIzaSyDcCKe6INSWQoL2dMb6ni9CERHslBWXahs",
  authDomain: "studygroupcoding.firebaseapp.com",
  projectId: "studygroupcoding",
  storageBucket: "studygroupcoding.firebasestorage.app",
  messagingSenderId: "895371650167",
  appId: "1:895371650167:web:819364fa107b4b0d89d272",
  measurementId: "G-EQ6VCKW3H9"
};

export const firebaseAppOptions = {
  nimEmailDomain: "studygroupcoding.app",
  adminEmail: "admin@studygroupcoding.app"
};

export function isFirebaseConfigReady() {
  return Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    !firebaseConfig.apiKey.includes("PASTE_") &&
    !firebaseConfig.projectId.includes("PASTE_")
  );
}