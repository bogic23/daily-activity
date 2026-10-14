import { ref, watch, type WatchStopHandle } from 'vue';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  type Unsubscribe
} from 'firebase/firestore';
import { getFirebaseDb } from './firebase';
import {
  useActivityStore,
  sanitizeItems,
  type DailyActivity
} from '../stores/activities';

export type SyncStatus = 'connecting' | 'synced' | 'saving' | 'offline' | 'error';

const status = ref<SyncStatus>('connecting');
const errorMsg = ref<string | null>(null);
const isOnline = ref(typeof navigator === 'undefined' ? true : navigator.onLine);

export const useSyncStatus = () => ({ status, errorMsg, isOnline });

interface RemoteDoc {
  type: DailyActivity['type'];
  name: string;
  time: string;
  days: DailyActivity['days'];
  checklist: { id: string; label: string; done: boolean }[];
  completed: boolean;
  completedDate?: string;
  updatedAt?: string;
}

const toDoc = (item: DailyActivity): RemoteDoc => ({
  type: item.type,
  name: item.name,
  time: item.time,
  days: [...item.days],
  checklist: item.checklist.map((c) => ({ id: c.id, label: c.label, done: c.done })),
  completed: item.completed,
  ...(item.completedDate ? { completedDate: item.completedDate } : {}),
  ...(item.updatedAt ? { updatedAt: item.updatedAt } : {})
});

const fromDoc = (id: string, data: Record<string, unknown>): DailyActivity => ({
  id,
  type: data.type === 'workout' ? 'workout' : 'activity',
  name: typeof data.name === 'string' ? data.name : 'Untitled',
  time: typeof data.time === 'string' ? data.time : '',
  days: Array.isArray(data.days) ? (data.days as DailyActivity['days']) : [],
  checklist: Array.isArray(data.checklist)
    ? (data.checklist as RemoteDoc['checklist']).map((c) => ({
        id: String(c.id),
        label: String(c.label),
        done: Boolean(c.done)
      }))
    : [],
  completed: Boolean(data.completed),
  completedDate: typeof data.completedDate === 'string' ? data.completedDate : undefined,
  updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : undefined
});

/** Order-independent fingerprint used to skip our own snapshot echoes. */
const fingerprint = (items: DailyActivity[]): string => {
  const sorted = [...items]
    .map((i) => ({ id: i.id, ...toDoc(i) }))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return JSON.stringify(sorted);
};

let stopWatcher: WatchStopHandle | null = null;
let unsubscribe: Unsubscribe | null = null;
let pushTimer: ReturnType<typeof setTimeout> | undefined;
let activeUid: string | null = null;
let lastRemoteFp = '';
let lastRemoteIds = new Set<string>();
let lastPushedFp = '';
let initialized = false;

const onlineHandler = () => {
  isOnline.value = true;
  if (status.value === 'offline') status.value = 'synced';
};
const offlineHandler = () => {
  isOnline.value = false;
  status.value = 'offline';
};

export const stopSync = () => {
  if (pushTimer) clearTimeout(pushTimer);
  stopWatcher?.();
  stopWatcher = null;
  unsubscribe?.();
  unsubscribe = null;
  activeUid = null;
  initialized = false;
  lastRemoteFp = '';
  lastRemoteIds = new Set();
  lastPushedFp = '';
  window.removeEventListener('online', onlineHandler);
  window.removeEventListener('offline', offlineHandler);
};

/**
 * Two-way sync between the local activity store and
 * `users/{uid}/activities/{activityId}` in Firestore.
 * Last-write-wins per document (via updatedAt); localStorage stays as
 * the offline cache so the app works without connectivity.
 */
export const startSync = (uid: string) => {
  stopSync();
  activeUid = uid;
  status.value = 'connecting';
  errorMsg.value = null;
  window.addEventListener('online', onlineHandler);
  window.addEventListener('offline', offlineHandler);

  const store = useActivityStore();
  const colRef = collection(getFirebaseDb(), 'users', uid, 'activities');

  const pushNow = async () => {
    if (activeUid !== uid) return;
    const items = store.items;
    const fp = fingerprint(items);
    if (fp === lastRemoteFp) return; // nothing new vs. server
    status.value = 'saving';
    errorMsg.value = null;
    try {
      const now = new Date().toISOString();
      const writes = items.map((item) => {
        if (!item.updatedAt) item.updatedAt = now;
        return setDoc(doc(colRef, item.id), { ...toDoc(item), updatedAt: item.updatedAt });
      });
      const localIds = new Set(items.map((i) => i.id));
      const deletes = [...lastRemoteIds]
        .filter((id) => !localIds.has(id))
        .map((id) => deleteDoc(doc(colRef, id)));
      await Promise.all([...writes, ...deletes]);
      lastRemoteIds = localIds;
      lastPushedFp = fingerprint(store.items);
      lastRemoteFp = lastPushedFp;
      status.value = isOnline.value ? 'synced' : 'offline';
    } catch (err) {
      status.value = 'error';
      errorMsg.value = err instanceof Error ? err.message : 'Sync failed';
    }
  };

  const schedulePush = (immediate = false) => {
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(pushNow, immediate ? 50 : 800);
  };

  // Local edits -> debounced push to Firestore.
  stopWatcher = watch(
    () => store.items,
    () => {
      if (activeUid !== uid || !initialized) return;
      if (fingerprint(store.items) === lastRemoteFp) return; // just applied from server
      schedulePush();
    },
    { deep: true }
  );

  // Firestore -> local (realtime, incl. other devices).
  unsubscribe = onSnapshot(
    colRef,
    (snap) => {
      if (activeUid !== uid) return;
      const remote = sanitizeItems(
        snap.docs.map((d) => fromDoc(d.id, d.data() as Record<string, unknown>))
      );
      const fp = fingerprint(remote);
      lastRemoteIds = new Set(remote.map((r) => r.id));

      if (fp === lastPushedFp) {
        // Echo of our own write — adopt server state, don't re-apply.
        lastRemoteFp = fp;
        initialized = true;
        if (status.value === 'connecting' || status.value === 'saving') {
          status.value = isOnline.value ? 'synced' : 'offline';
        }
        return;
      }

      if (!initialized) {
        initialized = true;
        const local = store.items;
        if (local.length > 0 && remote.length === 0) {
          // First login with pre-existing local data — upload it.
          lastRemoteFp = fp;
          schedulePush(true);
          return;
        }
        if (local.length > 0 && remote.length > 0 && fp !== fingerprint(local)) {
          // Both sides have data (e.g. two devices) — union, newer doc wins.
          const byId = new Map<string, DailyActivity>();
          local.forEach((i) => byId.set(i.id, i));
          remote.forEach((r) => {
            const l = byId.get(r.id);
            if (!l) {
              byId.set(r.id, r);
            } else if (JSON.stringify({ ...toDoc(l), id: 0 }) !== JSON.stringify({ ...toDoc(r), id: 0 })) {
              const lt = l.updatedAt ?? '';
              const rt = r.updatedAt ?? '';
              byId.set(r.id, rt > lt ? r : l);
            }
          });
          const merged = [...byId.values()];
          lastRemoteFp = fp;
          store.replaceAll(merged);
          schedulePush(true);
          return;
        }
      }

      lastRemoteFp = fp;
      store.replaceAll(remote);
      status.value = isOnline.value ? 'synced' : 'offline';
    },
    (err) => {
      status.value = 'error';
      errorMsg.value = err?.message ?? 'Realtime sync failed';
    }
  );
};
