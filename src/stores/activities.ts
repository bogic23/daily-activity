import { reactive, computed } from 'vue';

export type ItemType = 'activity' | 'workout';

/** 0 = Sunday … 6 = Saturday (matches Date.getDay()) */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const WEEKDAYS: { value: Weekday; short: string; full: string }[] = [
  { value: 0, short: 'Sun', full: 'Sunday' },
  { value: 1, short: 'Mon', full: 'Monday' },
  { value: 2, short: 'Tue', full: 'Tuesday' },
  { value: 3, short: 'Wed', full: 'Wednesday' },
  { value: 4, short: 'Thu', full: 'Thursday' },
  { value: 5, short: 'Fri', full: 'Friday' },
  { value: 6, short: 'Sat', full: 'Saturday' }
];

export const ALL_DAYS: Weekday[] = [0, 1, 2, 3, 4, 5, 6];

export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

export interface DailyActivity {
  id: string;
  type: ItemType;
  name: string;
  time: string; // "HH:MM" or "" = anytime
  /** weekly repeat — weekdays this item is scheduled. Empty = every day (back-compat). */
  days: Weekday[];
  checklist: ChecklistItem[];
  /** derived: all checklist items done (for today) */
  completed: boolean;
  /** YYYY-MM-DD of the last completion; used to reset daily */
  completedDate?: string;
  /** ISO timestamp of last modification; used for Firestore conflict resolution */
  updatedAt?: string;
}

interface ActivityStore {
  items: DailyActivity[];
}

const STORAGE_KEY_BASE = 'daily-activities-v1';
/** Local cache is namespaced per signed-in user; logged-out uses the base key. */
let storageKey = STORAGE_KEY_BASE;

export const todayKey = (d = new Date()): string => {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/** Empty / missing days means "every day" so old items keep showing daily. */
export const normalizeDays = (days?: number[] | null): Weekday[] => {
  if (!days || days.length === 0) return [...ALL_DAYS];
  return [...new Set(days.filter((d) => d >= 0 && d <= 6))].sort() as Weekday[];
};

export const isScheduledOn = (item: DailyActivity, date: Date): boolean =>
  normalizeDays(item.days).includes(date.getDay() as Weekday);

export const isScheduledToday = (item: DailyActivity, now = new Date()): boolean =>
  isScheduledOn(item, now);

/** "HH:MM" -> minutes since midnight, null when empty/invalid */
export const timeToMinutes = (time: string): number | null => {
  const m = /^(\d{1,2}):(\d{2})/.exec((time || '').trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
};

export const nowMinutes = (now = new Date()): number =>
  now.getHours() * 60 + now.getMinutes();

/**
 * True when the item is still upcoming today:
 * - no time set ("anytime") counts as upcoming
 * - otherwise time >= current time
 */
export const isUpcoming = (item: DailyActivity, now = new Date()): boolean => {
  const t = timeToMinutes(item.time);
  if (t === null) return true;
  return t >= nowMinutes(now);
};

export const isCompletedToday = (item: DailyActivity, today = todayKey()): boolean =>
  item.completed && item.completedDate === today;

export const formatDays = (days?: number[] | null): string => {
  const n = normalizeDays(days);
  if (n.length === 7) return 'Every day';
  if (n.length === 0) return 'Every day';
  if (n.length === 5 && [1, 2, 3, 4, 5].every((d) => n.includes(d as Weekday)))
    return 'Weekdays';
  if (n.length === 2 && n.includes(0) && n.includes(6)) return 'Weekends';
  const short = (v: number) => WEEKDAYS.find((w) => w.value === v)?.short ?? '';
  return n.map(short).join(', ');
};

const sortByTime = (a: DailyActivity, b: DailyActivity): number => {
  const ta = timeToMinutes(a.time);
  const tb = timeToMinutes(b.time);
  if (ta === null && tb === null) return 0;
  if (ta === null) return 1; // anytime goes last
  if (tb === null) return -1;
  return ta - tb;
};

/** Sanitize raw items (from cache or Firestore): normalize days + reset stale daily completions. */
export const sanitizeItems = (raw: DailyActivity[]): DailyActivity[] => {
  const today = todayKey();
  return (raw || []).map((item) => {
    const days = normalizeDays((item as Partial<DailyActivity>).days as number[]);
    if (item.completedDate !== today) {
      return {
        ...item,
        days,
        completed: false,
        completedDate: undefined,
        checklist: (item.checklist || []).map((c) => ({ ...c, done: false }))
      };
    }
    return { ...item, days, checklist: item.checklist || [] };
  });
};

const readKey = (key: string): DailyActivity[] => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as DailyActivity[]) : [];
  } catch {
    return [];
  }
};

const loadItems = (): DailyActivity[] => sanitizeItems(readKey(storageKey));

const state = reactive<ActivityStore>({
  items: loadItems()
});

const persist = () => {
  try {
    localStorage.setItem(storageKey, JSON.stringify(state.items));
  } catch {
    /* storage unavailable — keep working in-memory */
  }
};

/**
 * Switch the active owner (Firebase uid, or null when logged out).
 * Reloads items from that owner's local cache, migrating any pre-login
 * (base key) items into the account once.
 */
const setOwner = (uid: string | null) => {
  const nextKey = uid ? `${STORAGE_KEY_BASE}-${uid}` : STORAGE_KEY_BASE;
  if (nextKey === storageKey) return;
  storageKey = nextKey;
  let items = sanitizeItems(readKey(storageKey));
  if (uid && items.length === 0) {
    const legacy = sanitizeItems(readKey(STORAGE_KEY_BASE));
    if (legacy.length > 0) {
      items = legacy;
      try {
        localStorage.setItem(storageKey, JSON.stringify(items));
        localStorage.removeItem(STORAGE_KEY_BASE);
      } catch {
        /* keep working in-memory */
      }
    }
  }
  state.items.splice(0, state.items.length, ...items);
};

/** Replace all items (used when applying a Firestore snapshot). */
const replaceAll = (items: DailyActivity[], persistLocal = true) => {
  const clean = sanitizeItems(items);
  state.items.splice(0, state.items.length, ...clean);
  if (persistLocal) persist();
};

const uid = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const isAllDone = (item: DailyActivity): boolean =>
  item.checklist.length > 0
    ? item.checklist.every((c) => c.done)
    : item.completed; // plain activity with no checklist toggles directly

const touch = (item: DailyActivity) => {
  item.updatedAt = new Date().toISOString();
};

export const useActivityStore = () => {
  const addItem = (data: {
    type: ItemType;
    name: string;
    time: string;
    checklist: string[];
    days?: number[];
  }) => {
    state.items.unshift({
      id: uid(),
      type: data.type,
      name: data.name,
      time: data.time,
      days: normalizeDays(data.days),
      completed: false,
      completedDate: undefined,
      updatedAt: new Date().toISOString(),
      checklist: data.checklist.map((label) => ({
        id: uid(),
        label,
        done: false
      }))
    });
    persist();
  };

  const removeItem = (id: string) => {
    const index = state.items.findIndex((i) => i.id === id);
    if (index !== -1) state.items.splice(index, 1);
    persist();
  };

  const getItem = (id: string): DailyActivity | undefined =>
    state.items.find((i) => i.id === id);

  const updateItemDays = (id: string, days: number[]) => {
    const item = getItem(id);
    if (!item) return;
    item.days = normalizeDays(days);
    touch(item);
    persist();
  };

  const toggleDay = (item: DailyActivity, day: Weekday) => {
    const current = new Set(normalizeDays(item.days));
    if (current.has(day)) {
      current.delete(day);
    } else {
      current.add(day);
    }
    // Unchecking the last day = every day (so the item doesn't disappear forever)
    item.days = current.size === 0 ? [...ALL_DAYS] : ([...current].sort() as Weekday[]);
    touch(item);
    persist();
  };

  /** Toggle the checkbox in front of the daily activity entry */
  const toggleCompleted = (item: DailyActivity) => {
    if (item.type === 'workout') return; // workouts auto-complete only
    if (item.checklist.length > 0) {
      const target = !isCompletedToday(item);
      item.checklist.forEach((c) => (c.done = target));
      item.completed = target;
    } else {
      item.completed = !isCompletedToday(item);
    }
    item.completedDate = item.completed ? todayKey() : undefined;
    touch(item);
    persist();
  };

  /** Toggle one checklist item; when all done, item auto-completes */
  const toggleChecklistItem = (item: DailyActivity, itemId: string) => {
    const entry = item.checklist.find((c) => c.id === itemId);
    if (!entry) return;
    entry.done = !entry.done;
    item.completed = isAllDone(item);
    item.completedDate = item.completed ? todayKey() : undefined;
    touch(item);
    persist();
  };

  const progress = (item: DailyActivity): number => {
    if (item.checklist.length === 0) return isCompletedToday(item) ? 100 : 0;
    return Math.round(
      (item.checklist.filter((c) => c.done).length / item.checklist.length) * 100
    );
  };

  /** All items scheduled for a given date (default today), sorted by time. */
  const scheduledFor = (date = new Date()): DailyActivity[] =>
    state.items.filter((i) => isScheduledOn(i, date)).sort(sortByTime);

  const todayItems = computed(() => scheduledFor(new Date()));

  /**
   * Today's remaining activities: scheduled today, not completed,
   * and with time >= now (anytime items always included).
   */
  const upcomingToday = (now = new Date()): DailyActivity[] =>
    scheduledFor(now).filter((i) => !isCompletedToday(i) && isUpcoming(i, now));

  const upcomingTodayComputed = computed(() => upcomingToday(new Date()));

  /** The single next activity (closest upcoming time today). */
  const nextActivity = (now = new Date()): DailyActivity | undefined =>
    upcomingToday(now)[0];

  const nextActivityComputed = computed(() => nextActivity(new Date()));

  const completedCount = computed(
    () => state.items.filter((i) => isCompletedToday(i)).length
  );

  const todayDoneCount = computed(
    () => todayItems.value.filter((i) => isCompletedToday(i)).length
  );

  return {
    items: state.items,
    addItem,
    removeItem,
    getItem,
    updateItemDays,
    toggleDay,
    toggleCompleted,
    toggleChecklistItem,
    progress,
    scheduledFor,
    upcomingToday,
    nextActivity,
    todayItems,
    upcomingTodayComputed,
    nextActivityComputed,
    completedCount,
    todayDoneCount,
    setOwner,
    replaceAll
  };
};
