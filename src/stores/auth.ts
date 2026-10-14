import { reactive, computed } from 'vue';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User
} from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { getFirebaseAuth, googleProvider } from '../lib/firebase';

interface AuthState {
  user: User | null;
  ready: boolean;
  busy: boolean;
  error: string | null;
}

const state = reactive<AuthState>({
  user: null,
  ready: false,
  busy: false,
  error: null
});

let initStarted = false;

/** Resolves once the initial auth state is known (persisted session or not). */
let readyResolve: () => void = () => {};
const readyPromise = new Promise<void>((resolve) => {
  readyResolve = resolve;
});

export const awaitAuthReady = () => readyPromise;

const initAuth = () => {
  if (initStarted) return;
  initStarted = true;
  try {
    onAuthStateChanged(
      getFirebaseAuth(),
      (user) => {
        state.user = user;
        state.ready = true;
        readyResolve();
      },
      (err) => {
        state.error = err?.message ?? 'Auth failed to initialize';
        state.ready = true;
        readyResolve();
      }
    );
  } catch (err) {
    // Firebase Auth couldn't even start (e.g. blocked network) —
    // resolve anyway so the router never hangs on a blank screen.
    state.error = err instanceof Error ? err.message : 'Auth failed to initialize';
    state.ready = true;
    readyResolve();
  }
};

// Start listening at module load, NOT on first useAuthStore() call.
// The router guard awaits auth readiness before any component (and its
// useAuthStore() call) exists — starting here avoids a startup deadlock.
initAuth();

/** Wrap a step so the login screen shows exactly which Firebase call failed. */
const step = async <T>(label: string, fn: () => Promise<T> | T): Promise<T> => {
  try {
    return await fn();
  } catch (err) {
    const detail =
      err instanceof Error
        ? `${err.message}${err.stack ? `\n${err.stack.split('\n').slice(0, 4).join('\n')}` : ''}`
        : String(err);
    // Full error (with stack) also goes to logcat via Capacitor console.
    console.error(`[auth:${label}]`, err);
    throw new Error(`${label} failed: ${detail}`);
  }
};

export const useAuthStore = () => {
  initAuth();

  const signInWithGoogle = async () => {
    state.busy = true;
    state.error = null;
    try {
      if (Capacitor.isNativePlatform()) {
        // No browser popup inside the native WebView — sign in through
        // the native Google SDK, then hand the ID token to Firebase Auth.
        const result = await step('native-google-signin', () =>
          FirebaseAuthentication.signInWithGoogle()
        );
        const idToken = result.credential?.idToken;
        if (!idToken) {
          throw new Error(
            'Google sign-in returned no ID token. Make sure the SHA-1 ' +
              'fingerprint is registered for com.abogicstudio.activity in the ' +
              'Firebase console.'
          );
        }
        const auth = await step('getAuth', () => getFirebaseAuth());
        const credential = GoogleAuthProvider.credential(
          idToken,
          result.credential?.accessToken ?? undefined
        );
        await step('signInWithCredential', () => signInWithCredential(auth, credential));
      } else {
        await signInWithPopup(getFirebaseAuth(), googleProvider);
      }
    } catch (err) {
      state.error =
        err instanceof Error ? err.message : 'Google sign-in failed';
      throw err;
    } finally {
      state.busy = false;
    }
  };

  const signOut = async () => {
    state.busy = true;
    state.error = null;
    try {
      if (Capacitor.isNativePlatform()) {
        // Clear the native session too, otherwise the next sign-in
        // silently reuses the previous Google account.
        try {
          await FirebaseAuthentication.signOut();
        } catch {
          /* native session may already be empty */
        }
      }
      await firebaseSignOut(getFirebaseAuth());
    } catch (err) {
      state.error = err instanceof Error ? err.message : 'Sign-out failed';
      throw err;
    } finally {
      state.busy = false;
    }
  };

  const isAuthenticated = computed(() => state.user !== null);

  return {
    state,
    user: computed(() => state.user),
    ready: computed(() => state.ready),
    busy: computed(() => state.busy),
    error: computed(() => state.error),
    isAuthenticated,
    signInWithGoogle,
    signOut
  };
};
