import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAnalytics, isSupported as analyticsSupported } from 'firebase/analytics';

// Web app credentials (public identifiers — Firestore security rules
// enforce access, not this key). Pasted from Firebase console.
const firebaseConfig = {
  apiKey: 'AIzaSyCSrb6D6kETApnazQPfwoOe_mothA9l7Ss',
  authDomain: 'abogicstudio.firebaseapp.com',
  projectId: 'abogicstudio',
  storageBucket: 'abogicstudio.firebasestorage.app',
  messagingSenderId: '1028224895365',
  appId: '1:1028224895365:web:d8092da7da3d864bd85cec',
  measurementId: 'G-TGQ3ZMFHR4'
};

// Lazy singletons: importing this module must stay side-effect free so the
// app (and unit tests) can load it in any environment. The SDK initializes
// on first actual use, in the browser/WebView.
let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;

export const getFirebaseApp = (): FirebaseApp => {
  if (!appInstance) {
    appInstance = initializeApp(firebaseConfig);
    // Analytics is best-effort (unsupported in some WebViews) — never block.
    analyticsSupported()
      .then((ok) => {
        if (ok && appInstance) getAnalytics(appInstance);
      })
      .catch(() => {
        /* analytics unavailable — app works without it */
      });
  }
  return appInstance;
};

export const getFirebaseAuth = (): Auth => {
  if (!authInstance) authInstance = getAuth(getFirebaseApp());
  return authInstance;
};

export const getFirebaseDb = (): Firestore => {
  if (!dbInstance) dbInstance = getFirestore(getFirebaseApp());
  return dbInstance;
};

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
