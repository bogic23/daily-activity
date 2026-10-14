<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>Daily Activity</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="ion-padding dw-page">
      <!-- Hero -->
      <div class="welcome-section dw-hero dw-fade-up">
        <div class="hero-top">
          <div>
            <h1 class="greeting">Good {{ timeOfDay }}</h1>
            <p class="subtitle">{{ todayLong }} • {{ clock }}</p>
            <p class="subtitle small">
              {{ doneCount }}/{{ todayItems.length }} done today
              <template v-if="upcoming.length"> • {{ upcoming.length }} upcoming</template>
            </p>
          </div>
          <div class="ring-wrap" :title="`${dayProgress}% of today complete`">
            <svg viewBox="0 0 72 72" class="ring">
              <circle cx="36" cy="36" r="30" class="ring-bg" />
              <circle
                cx="36" cy="36" r="30"
                class="ring-fg dw-ring-fg"
                :stroke-dasharray="circumference"
                :stroke-dashoffset="ringOffset"
              />
            </svg>
            <div class="ring-label">{{ dayProgress }}%</div>
          </div>
        </div>
        <div class="day-bar dw-shimmer-bar">
          <div class="day-bar-fill" :style="{ width: `${dayProgress}%` }"></div>
        </div>
      </div>

      <!-- Up next -->
      <ion-card v-if="next" :key="next.id" class="next-card dw-glow dw-pop-in">
        <ion-card-header>
          <ion-card-subtitle>Up next • {{ next.time || 'anytime' }}</ion-card-subtitle>
          <ion-card-title>{{ next.name }}</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <p class="next-meta">
            <ion-chip :color="next.type === 'workout' ? 'tertiary' : 'success'" class="type-chip">
              {{ next.type }}
            </ion-chip>
            <span class="dw-pill"><span class="dot"></span>{{ countdown }}</span>
          </p>
          <div class="next-actions">
            <ion-button
              v-if="next.type === 'activity'"
              size="small"
              class="btn-shine pressable"
              @click="completeNext"
            >
              Mark done
            </ion-button>
            <ion-button
              v-else
              size="small"
              class="btn-shine pressable"
              @click="goToWorkout(next!)"
            >
              Do Workout
            </ion-button>
            <ion-button size="small" fill="clear" @click="goToActivity">
              View all
            </ion-button>
          </div>
        </ion-card-content>
      </ion-card>

      <ion-card v-else class="next-card empty dw-fade-up">
        <ion-card-content>
          <div class="dw-float empty-emoji">{{ todayItems.length === 0 ? '🌴' : '🎉' }}</div>
          <p class="ion-text-center">
            {{ todayItems.length === 0
              ? `Nothing scheduled for ${todayWeekday}. Enjoy your rest day!`
              : 'All done for today — nothing left on the schedule.' }}
          </p>
          <ion-button expand="block" size="small" class="btn-shine" @click="goToActivity">
            Manage activities
          </ion-button>
        </ion-card-content>
      </ion-card>

      <!-- Remaining today (time >= now) -->
      <ion-list lines="none" class="dash-list" v-if="upcoming.length > 0">
        <ion-list-header>
          <ion-label>Today remaining (from {{ clock }})</ion-label>
        </ion-list-header>
        <TransitionGroup name="dw-list">
          <ion-item
            v-for="(item, idx) in upcoming"
            :key="item.id"
            :detail="false"
            class="dash-item lift-on-hover dw-stagger"
            :style="{ '--d': idx }"
          >
            <ion-checkbox
              v-if="item.type === 'activity'"
              slot="start"
              :checked="item.completed"
              :class="{ 'dw-check-pop': popId === item.id }"
              :aria-label="`Mark ${item.name} done`"
              @ionChange="toggleWithPop(item)"
            />
            <ion-icon v-else slot="start" :icon="fitness" color="tertiary" class="item-icon"></ion-icon>
            <ion-label>
              <h2>{{ item.name }}</h2>
              <p>{{ item.time || 'anytime' }} • {{ item.type }}</p>
            </ion-label>
            <ion-button
              v-if="item.type === 'workout'"
              slot="end"
              fill="outline"
              size="small"
              class="pressable"
              @click="goToWorkout(item)"
            >
              Do
            </ion-button>
          </ion-item>
        </TransitionGroup>
      </ion-list>

      <!-- Earlier / done today -->
      <ion-list lines="none" class="dash-list" v-if="earlier.length > 0">
        <ion-list-header>
          <ion-label>Earlier / done today</ion-label>
        </ion-list-header>
        <TransitionGroup name="dw-list">
          <ion-item
            v-for="(item, idx) in earlier"
            :key="item.id"
            :detail="false"
            class="dash-item is-done dw-stagger"
            :style="{ '--d': idx }"
          >
            <ion-checkbox
              v-if="item.type === 'activity'"
              slot="start"
              :checked="item.completed"
              disabled
            />
            <ion-icon v-else slot="start" :icon="checkmarkCircle" color="success"></ion-icon>
            <ion-label>
              <h2 class="done">{{ item.name }}</h2>
              <p>{{ item.time || 'anytime' }} • {{ item.completed ? 'done' : 'passed' }}</p>
            </ion-label>
          </ion-item>
        </TransitionGroup>
      </ion-list>

      <div class="nav-row">
        <ion-card
          v-for="(card, i) in navCards"
          :key="card.title"
          class="action-card pressable dw-stagger"
          :style="{ '--d': i + 2 }"
          @click="card.go()"
        >
          <ion-card-content>
            <div class="action-icon" :class="card.cls">
              <ion-icon :icon="card.icon" size="large"></ion-icon>
            </div>
            <h2>{{ card.title }}</h2>
            <p>{{ card.sub }}</p>
          </ion-card-content>
        </ion-card>
      </div>

      <!-- Account / sync -->
      <ion-card class="account-card dw-fade-in">
        <ion-card-content class="account-row">
          <div class="avatar">{{ (auth.user.value?.email ?? 'U').charAt(0).toUpperCase() }}</div>
          <div class="account-info">
            <strong>{{ auth.user.value?.displayName ?? 'Signed in' }}</strong>
            <p>{{ auth.user.value?.email ?? '' }}</p>
            <p class="sync-line" :title="syncError ?? ''">
              <ion-icon :icon="syncIcon" :color="syncStatus === 'error' ? 'danger' : 'success'"></ion-icon>
              {{ syncLabel }}
            </p>
          </div>
          <ion-button size="small" fill="clear" class="pressable" @click="signOut">
            <ion-icon slot="start" :icon="logOut"></ion-icon>
            Out
          </ion-button>
        </ion-card-content>
      </ion-card>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonCardSubtitle,
  IonIcon, IonList, IonListHeader, IonItem, IonLabel, IonCheckbox,
  IonChip, IonButton
} from '@ionic/vue';
import { add, barChart, fitness, checkmarkCircle, logOut, cloudDone, cloudOffline, cloudUpload } from 'ionicons/icons';
import {
  useActivityStore,
  isCompletedToday,
  isUpcoming,
  timeToMinutes,
  type DailyActivity
} from '../stores/activities';
import { useAuthStore } from '../stores/auth';
import { useSyncStatus } from '../lib/activitySync';

const router = useRouter();
const store = useActivityStore();
const auth = useAuthStore();
const { status: syncStatus, errorMsg: syncError, isOnline } = useSyncStatus();

const syncLabel = computed(() => {
  if (!isOnline.value) return 'offline';
  switch (syncStatus.value) {
    case 'synced': return 'synced';
    case 'saving': return 'saving…';
    case 'connecting': return 'connecting…';
    case 'error': return 'sync error';
    default: return String(syncStatus.value);
  }
});

const syncIcon = computed(() => {
  if (!isOnline.value) return cloudOffline;
  if (syncStatus.value === 'saving' || syncStatus.value === 'connecting') return cloudUpload;
  return cloudDone;
});

const signOut = async () => {
  try {
    await auth.signOut();
  } finally {
    router.replace('/login');
  }
};

// Tick every 20s so "upcoming from current time" stays fresh
const now = ref(new Date());
let timer: ReturnType<typeof setInterval> | undefined;
onMounted(() => {
  timer = setInterval(() => {
    now.value = new Date();
  }, 20000);
});
onUnmounted(() => {
  if (timer) clearInterval(timer);
});

// Small pop feedback when checking items
const popId = ref<string | null>(null);
let popTimer: ReturnType<typeof setTimeout> | undefined;
const toggleWithPop = (item: DailyActivity) => {
  store.toggleCompleted(item);
  popId.value = item.id;
  if (popTimer) clearTimeout(popTimer);
  popTimer = setTimeout(() => (popId.value = null), 350);
};
const completeNext = () => {
  if (next.value) toggleWithPop(next.value);
};

const timeOfDay = computed(() => {
  const hour = now.value.getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
});

const todayLong = computed(() =>
  now.value.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  })
);

const todayWeekday = computed(() =>
  now.value.toLocaleDateString(undefined, { weekday: 'long' })
);

const clock = computed(() =>
  now.value.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
);

const todayItems = computed(() => store.scheduledFor(now.value));

const doneCount = computed(
  () => todayItems.value.filter((i) => isCompletedToday(i)).length
);

const dayProgress = computed(() => {
  if (todayItems.value.length === 0) return 0;
  return Math.round((doneCount.value / todayItems.value.length) * 100);
});

const circumference = 2 * Math.PI * 30;
const ringOffset = computed(
  () => circumference - (circumference * dayProgress.value) / 100
);

/** Scheduled today, not done, time >= now — sorted by time. */
const upcoming = computed(() => store.upcomingToday(now.value));

const next = computed<DailyActivity | undefined>(() => upcoming.value[0]);

/** Everything scheduled today that is NOT upcoming (done or time passed). */
const earlier = computed(() =>
  todayItems.value.filter(
    (i) => isCompletedToday(i) || !isUpcoming(i, now.value)
  )
);

const countdown = computed(() => {
  if (!next.value) return '';
  const t = timeToMinutes(next.value.time);
  if (t === null) return 'anytime today';
  const diff = t - (now.value.getHours() * 60 + now.value.getMinutes());
  if (diff <= 0) return 'now';
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  if (h > 0) return `in ${h}h ${m}m`;
  return `in ${m} min`;
});

const goToActivity = () => router.push('/activity');
const goToStats = () => router.push('/stats');
const goToWorkout = (item: DailyActivity) => {
  router.push({ path: '/workout', query: { activityId: item.id } });
};

const navCards = [
  { title: 'Manage', sub: 'Weekly repeats', icon: add, cls: 'is-primary', go: goToActivity },
  { title: 'Stats', sub: 'Progress', icon: barChart, cls: 'is-secondary', go: goToStats }
];
</script>

<style scoped>
.dw-page {
  --background: transparent;
}

.welcome-section {
  margin-bottom: 16px;
  background: var(--ion-card-background);
  border-radius: 20px;
  padding: 18px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.hero-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.greeting {
  font-size: 32px;
  font-weight: 800;
  letter-spacing: -0.5px;
  margin: 0;
}

.subtitle {
  font-size: 15px;
  color: var(--ion-color-medium);
  margin: 4px 0 0;
}

.subtitle.small {
  font-size: 13px;
}

.ring-wrap {
  position: relative;
  width: 72px;
  height: 72px;
  flex-shrink: 0;
}

.ring {
  width: 72px;
  height: 72px;
  transform: rotate(-90deg);
}

.ring-bg {
  fill: none;
  stroke: rgba(128, 128, 128, 0.2);
  stroke-width: 7;
}

.ring-fg {
  fill: none;
  stroke: url(#dwRingGrad);
  stroke: var(--ion-color-primary);
  stroke-width: 7;
  stroke-linecap: round;
}

.ring-label {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 800;
}

.day-bar {
  margin-top: 14px;
  height: 8px;
  border-radius: 999px;
  background: rgba(128, 128, 128, 0.18);
}
.day-bar-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--ion-color-primary), var(--ion-color-secondary), var(--ion-color-tertiary));
  background-size: 200% 100%;
  animation: dw-bar-slide 6s ease-in-out infinite alternate;
  transition: width 0.6s cubic-bezier(0.22, 1, 0.36, 1);
}
@keyframes dw-bar-slide {
  from { background-position: 0% 0; }
  to { background-position: 100% 0; }
}

.next-card {
  border-radius: 20px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(79, 70, 229, 0.35);
  background:
    linear-gradient(var(--ion-card-background), var(--ion-card-background)) padding-box,
    linear-gradient(135deg, #4f46e5, #7c3aed, #06b6d4) border-box;
}

.next-card.empty {
  border-style: dashed;
  text-align: center;
}

.empty-emoji {
  font-size: 40px;
  line-height: 1;
  margin-bottom: 8px;
}

.next-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--ion-color-medium);
  margin: 0 0 12px;
  flex-wrap: wrap;
}

.next-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.type-chip {
  margin: 0;
  height: 22px;
  font-size: 11px;
  text-transform: capitalize;
}

.dash-list {
  margin-top: 16px;
  border-radius: 16px;
  background: transparent;
}

.dash-item {
  --background: var(--ion-card-background);
  --border-radius: 14px;
  margin-bottom: 8px;
  border-radius: 14px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.dash-item.is-done {
  opacity: 0.65;
}

.item-icon {
  font-size: 22px;
}

h2.done {
  text-decoration: line-through;
  opacity: 0.55;
}

.nav-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 16px;
  padding-bottom: 12px;
}

.action-card {
  border-radius: 20px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
  cursor: pointer;
  margin: 0;
}

.action-icon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.action-card:hover .action-icon {
  transform: scale(1.08) rotate(-4deg);
}
.action-icon.is-primary {
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  box-shadow: 0 6px 16px rgba(79, 70, 229, 0.35);
}
.action-icon.is-secondary {
  background: linear-gradient(135deg, #06b6d4, #10b981);
  box-shadow: 0 6px 16px rgba(6, 182, 212, 0.35);
}

.action-card h2 {
  margin: 12px 0 4px;
  font-size: 16px;
  font-weight: 700;
}

.action-card p {
  margin: 0;
  color: var(--ion-color-medium);
  font-size: 13px;
}

.account-card {
  margin-top: 12px;
  margin-bottom: 12px;
  border-radius: 16px;
}

.account-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 18px;
  color: #fff;
  background: var(--dw-grad-hero);
}

.account-info {
  flex: 1;
  min-width: 0;
}

.account-info p {
  margin: 0;
  font-size: 12px;
  color: var(--ion-color-medium);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sync-line {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 2px !important;
  font-weight: 600;
}
</style>
