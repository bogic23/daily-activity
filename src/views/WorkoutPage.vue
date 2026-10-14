<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-back-button default-href="/activity" slot="start"></ion-back-button>
        <ion-title>Do Workout</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="ion-padding">
      <ion-card v-if="workout" class="workout-card dw-hero dw-fade-up">
        <!-- confetti overlay on completion -->
        <div v-if="workout.completed" class="dw-confetti" aria-hidden="true">
          <span
            v-for="(c, i) in confetti"
            :key="i"
            :style="{
              left: c.left,
              background: c.color,
              animationDuration: c.duration,
              animationDelay: c.delay,
              width: c.w,
              transform: `rotate(${c.rot}deg)`
            }"
          />
        </div>

        <ion-card-header>
          <ion-card-title>{{ workout.name }}</ion-card-title>
          <ion-card-subtitle>{{ workout.time || 'anytime' }} • {{ progressPercent }}% complete</ion-card-subtitle>
        </ion-card-header>

        <ion-card-content>
          <TransitionGroup name="dw-list">
            <ion-item
              v-for="(entry, idx) in workout.checklist"
              :key="entry.id"
              button
              :detail="false"
              :class="['exercise-row lift-on-hover dw-stagger', { 'is-done': entry.done }]"
              :style="{ '--d': Math.min(idx, 8) }"
              @click="toggle(entry.id)"
            >
              <ion-checkbox
                slot="start"
                :checked="entry.done"
                :class="{ 'dw-check-pop': popId === entry.id }"
                :aria-label="`Mark ${entry.label} done`"
                @ionChange="toggle(entry.id)"
                @click.stop
              />
              <ion-label>
                <h2 :class="{ done: entry.done }">{{ entry.label }}</h2>
              </ion-label>
              <div v-if="entry.done" class="check-burst dw-pop-in">✓</div>
            </ion-item>
          </TransitionGroup>

          <ion-item v-if="!workout.checklist.length">
            <ion-label class="ion-text-center">
              <p>No exercises in this workout — check it off directly from Daily Activity.</p>
            </ion-label>
          </ion-item>

          <div class="progress-wrap">
            <div class="progress-labels">
              <span>Progress</span>
              <span class="pct" :key="progressPercent">{{ progressPercent }}%</span>
            </div>
            <ion-progress-bar
              :value="progressValue"
              class="animated-bar dw-shimmer-bar"
            ></ion-progress-bar>
          </div>

          <Transition name="dw-celebrate">
            <ion-text v-if="workout && workout.completed" color="success" class="done-note">
              <p class="celebrate-text">🎉 All exercises done — this workout is checked off in your Daily Activity!</p>
            </ion-text>
          </Transition>
        </ion-card-content>
      </ion-card>

      <ion-card v-else class="workout-card dw-fade-up">
        <ion-card-content>
          <p class="ion-text-center">
            Workout not found. It may have been deleted.
          </p>
          <ion-button expand="block" class="btn-shine" @click="router.push('/activity')">
            Back to Daily Activity
          </ion-button>
        </ion-card-content>
      </ion-card>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonBackButton, IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle,
  IonCardContent, IonItem, IonLabel, IonCheckbox,
  IonProgressBar, IonButton, IonText, toastController
} from '@ionic/vue';
import { useActivityStore, type DailyActivity } from '../stores/activities';

const route = useRoute();
const router = useRouter();
const store = useActivityStore();

const workout = computed<DailyActivity | undefined>(() => {
  const id = route.query.activityId as string | undefined;
  return id ? store.getItem(id) : undefined;
});

const progressPercent = computed(() => (workout.value ? store.progress(workout.value) : 0));
const progressValue = computed(() => progressPercent.value / 100);

const popId = ref<string | null>(null);
let popTimer: ReturnType<typeof setTimeout> | undefined;
const toggle = (entryId: string) => {
  if (!workout.value) return;
  store.toggleChecklistItem(workout.value, entryId);
  popId.value = entryId;
  if (popTimer) clearTimeout(popTimer);
  popTimer = setTimeout(() => (popId.value = null), 350);
};

// Deterministic confetti pieces (no random per render to avoid flicker)
const confetti = computed(() => {
  const colors = ['#4f46e5', '#7c3aed', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];
  return Array.from({ length: 28 }, (_, i) => ({
    left: `${(i * 37) % 100}%`,
    color: colors[i % colors.length],
    duration: `${2.2 + ((i * 13) % 20) / 10}s`,
    delay: `${((i * 7) % 10) / 10}s`,
    w: `${6 + ((i * 5) % 5)}px`,
    rot: (i * 47) % 360
  }));
});

// Toast + auto-return to Daily Activity when the workout becomes fully complete
const previouslyCompleted = ref(false);
watch(
  () => workout.value?.completed,
  (nowComplete, wasComplete) => {
    if (nowComplete && !wasComplete && !previouslyCompleted.value) {
      previouslyCompleted.value = true;
      toastController
        .create({
          message: 'Workout completed — checked off in Daily Activity!',
          duration: 2500,
          color: 'success'
        })
        .then((t) => t.present());
      setTimeout(() => router.push('/activity'), 2800);
    }
    if (!nowComplete) {
      previouslyCompleted.value = false;
    }
  }
);
</script>

<style scoped>
.workout-card {
  position: relative;
  border-radius: 20px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.exercise-list, ion-list {
  background: transparent;
}

.exercise-row {
  --background: var(--ion-card-background);
  border: 1px solid rgba(128, 128, 128, 0.18);
  border-radius: 14px;
  margin-bottom: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}
.exercise-row.is-done {
  border-color: rgba(16, 185, 129, 0.4);
  background: linear-gradient(90deg, rgba(16,185,129,0.08), transparent);
}

.check-burst {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--ion-color-success);
  color: #fff;
  font-weight: 800;
  font-size: 14px;
  flex-shrink: 0;
}

h2.done {
  text-decoration: line-through;
  opacity: 0.55;
}

.progress-wrap {
  margin-top: 16px;
}
.progress-labels {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 700;
  color: var(--ion-color-medium);
  margin-bottom: 6px;
}
.pct {
  color: var(--ion-color-primary);
  display: inline-block;
  animation: dw-pop-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.animated-bar {
  --progress-background: linear-gradient(90deg, var(--ion-color-primary), var(--ion-color-tertiary), var(--ion-color-success));
  --buffer-background: rgba(128, 128, 128, 0.2);
  height: 10px;
  border-radius: 999px;
  overflow: hidden;
}
.animated-bar::part(track) {
  border-radius: 999px;
}
.animated-bar::part(progress) {
  border-radius: 999px;
  transition: width 0.5s cubic-bezier(0.22, 1, 0.36, 1);
}

.done-note {
  display: block;
  margin-top: 12px;
  text-align: center;
}
.celebrate-text {
  font-weight: 700;
  background: linear-gradient(90deg, #10b981, #06b6d4, #4f46e5);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.dw-celebrate-enter-active {
  animation: dw-pop-in 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
.dw-celebrate-leave-active {
  transition: opacity 0.2s ease;
}
.dw-celebrate-leave-to {
  opacity: 0;
}
</style>
