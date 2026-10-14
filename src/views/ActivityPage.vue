<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>Daily Activity</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="ion-padding">
      <!-- Create form -->
      <ion-card class="create-card dw-hero dw-fade-up">
        <ion-card-header>
          <ion-card-title>New Daily Activity</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-item class="field">
            <ion-label position="stacked">Type</ion-label>
            <ion-select v-model="form.type" interface="popover">
              <ion-select-option value="activity">Activity</ion-select-option>
              <ion-select-option value="workout">Workout</ion-select-option>
            </ion-select>
          </ion-item>

          <ion-item class="field">
            <ion-label position="stacked">Activity Name</ion-label>
            <ion-input
              v-model="form.name"
              placeholder="e.g. Morning routine / Leg day"
              @keyup.enter="createItem"
            />
          </ion-item>

          <ion-item class="field">
            <ion-label position="stacked">Time</ion-label>
            <ion-input v-model="form.time" type="time" />
          </ion-item>

          <div class="repeat-section">
            <ion-label class="repeat-title">Repeat every week on</ion-label>
            <div class="day-picker">
              <ion-chip
                v-for="d in WEEKDAYS"
                :key="d.value"
                :color="form.days.includes(d.value) ? 'primary' : 'medium'"
                :outline="!form.days.includes(d.value)"
                :class="['day-chip pressable', { 'is-on': form.days.includes(d.value) }]"
                @click="toggleFormDay(d.value)"
              >
                {{ d.short }}
              </ion-chip>
            </div>
            <p class="repeat-hint">{{ formatDays(form.days) }} • {{ form.time || 'anytime' }}</p>
          </div>

          <Transition name="dw-expand">
            <template v-if="form.type === 'workout'">
              <ion-list lines="none" class="checklist-editor">
                <ion-item>
                  <ion-label position="stacked">Workout List (exercises)</ion-label>
                </ion-item>
                <TransitionGroup name="dw-list">
                  <ion-item v-for="(entry, idx) in form.checklist" :key="`ex-${idx}`">
                    <ion-input
                      v-model="form.checklist[idx]"
                      :placeholder="`Exercise ${idx + 1} e.g. Squats 3x12`"
                    />
                    <ion-icon
                      slot="end"
                      :icon="closeCircle"
                      color="medium"
                      class="pressable"
                      @click="form.checklist.splice(idx, 1)"
                    />
                  </ion-item>
                </TransitionGroup>
                <ion-item button :detail="false" class="pressable" @click="form.checklist.push('')">
                  <ion-icon :icon="add" slot="start"></ion-icon>
                  <ion-label color="primary">Add exercise</ion-label>
                </ion-item>
              </ion-list>
            </template>
          </Transition>

          <ion-button
            expand="block"
            color="primary"
            :class="['ion-margin-top btn-shine pressable add-btn', { 'just-added': justAdded }]"
            @click="createItem"
          >
            {{ justAdded ? '✓ Added!' : 'Add to Daily Activity' }}
          </ion-button>
        </ion-card-content>
      </ion-card>

      <!-- Filter -->
      <ion-segment v-model="filter" class="ion-margin-top dw-fade-in filter-seg">
        <ion-segment-button value="today">
          <ion-label>Today ({{ todayItems.length }})</ion-label>
        </ion-segment-button>
        <ion-segment-button value="all">
          <ion-label>All ({{ store.items.length }})</ion-label>
        </ion-segment-button>
      </ion-segment>

      <!-- Daily list -->
      <ion-list class="daily-list" lines="none">
        <ion-list-header>
          <ion-label>
            {{ filter === 'today' ? `Today — ${todayLabel}` : 'All repeats' }}
            ({{ completedCount }}/{{ items.length }} done)
          </ion-label>
        </ion-list-header>

        <TransitionGroup name="dw-list">
          <ion-item
            v-for="(item, idx) in items"
            :key="item.id"
            button
            :detail="false"
            :class="['daily-item lift-on-hover dw-stagger', { 'is-done': item.completed }]"
            :style="{ '--d': Math.min(idx, 8) }"
          >
            <!-- checkbox in front -->
            <ion-checkbox
              slot="start"
              :checked="item.completed"
              :class="{ 'dw-check-pop': popId === item.id }"
              :aria-label="`Mark ${item.name} done`"
              @ionChange="toggleWithPop(item)"
            />
            <ion-label>
              <h2 :class="{ done: item.completed }">
                {{ item.name }}
                <ion-chip class="type-chip" :color="item.type === 'workout' ? 'tertiary' : 'success'">
                  {{ item.type }}
                </ion-chip>
              </h2>
              <p>
                {{ item.time || 'anytime' }} • {{ formatDays(item.days) }}
                <template v-if="item.checklist.length">
                  • {{ item.checklist.filter((c) => c.done).length }}/{{ item.checklist.length }} checks
                </template>
              </p>
              <div class="progress-track" v-if="item.checklist.length">
                <div
                  class="progress-fill"
                  :style="{ width: `${store.progress(item)}%` }"
                ></div>
              </div>
              <div class="day-row" @click.stop>
                <ion-chip
                  v-for="d in WEEKDAYS"
                  :key="d.value"
                  :class="['mini-day pressable', { 'is-on': normalizeDays(item.days).includes(d.value) }]"
                  :color="normalizeDays(item.days).includes(d.value) ? 'primary' : 'medium'"
                  :outline="!normalizeDays(item.days).includes(d.value)"
                  @click.stop="store.toggleDay(item, d.value)"
                >
                  {{ d.short.charAt(0) }}
                </ion-chip>
              </div>
            </ion-label>
            <ion-button
              v-if="item.type === 'workout'"
              slot="end"
              fill="outline"
              size="small"
              class="pressable"
              @click.stop="goToWorkout(item)"
            >
              Do Workout
            </ion-button>
            <ion-icon
              slot="end"
              :icon="trash"
              color="medium"
              class="delete-icon pressable"
              @click.stop="store.removeItem(item.id)"
            />
          </ion-item>
        </TransitionGroup>

        <ion-item v-if="items.length === 0" class="empty-state">
          <ion-label class="ion-text-center">
            <div class="dw-float empty-emoji">📝</div>
            <p>
              {{ filter === 'today'
                ? `Nothing scheduled for ${todayLabel} — create one above or switch to All.`
                : 'No daily activities yet — create your first one above.' }}
            </p>
          </ion-label>
        </ion-item>
      </ion-list>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonItem, IonLabel, IonInput, IonSelect, IonSelectOption,
  IonButton, IonList, IonListHeader, IonIcon, IonCheckbox, IonChip,
  IonSegment, IonSegmentButton
} from '@ionic/vue';
import { add, closeCircle, trash } from 'ionicons/icons';
import {
  useActivityStore,
  WEEKDAYS,
  ALL_DAYS,
  formatDays,
  normalizeDays,
  isScheduledToday,
  timeToMinutes,
  type DailyActivity,
  type Weekday
} from '../stores/activities';

const store = useActivityStore();
const router = useRouter();

const filter = ref<'today' | 'all'>('today');
const justAdded = ref(false);
const popId = ref<string | null>(null);
let popTimer: ReturnType<typeof setTimeout> | undefined;
let addedTimer: ReturnType<typeof setTimeout> | undefined;

const todayLabel = computed(() =>
  new Date().toLocaleDateString(undefined, { weekday: 'long' })
);

const sortByTime = (a: { time: string }, b: { time: string }) => {
  const ta = timeToMinutes(a.time);
  const tb = timeToMinutes(b.time);
  if (ta === null && tb === null) return 0;
  if (ta === null) return 1;
  if (tb === null) return -1;
  return ta - tb;
};

const items = computed(() => {
  if (filter.value === 'today') {
    return store.items.filter((i) => isScheduledToday(i)).sort(sortByTime);
  }
  return [...store.items].sort(sortByTime);
});

const todayItems = computed(() => store.items.filter((i) => isScheduledToday(i)));

const completedCount = computed(
  () => items.value.filter((i) => i.completed).length
);

const form = reactive({
  type: 'activity' as 'activity' | 'workout',
  name: '',
  time: '',
  checklist: [] as string[],
  days: [...ALL_DAYS] as number[]
});

const toggleFormDay = (day: Weekday) => {
  const set = new Set(form.days);
  if (set.has(day)) {
    set.delete(day);
  } else {
    set.add(day);
  }
  // Unchecking the last day = every day
  form.days = set.size === 0 ? [...ALL_DAYS] : [...set].sort((a, b) => a - b);
};

const toggleWithPop = (item: DailyActivity) => {
  store.toggleCompleted(item);
  popId.value = item.id;
  if (popTimer) clearTimeout(popTimer);
  popTimer = setTimeout(() => (popId.value = null), 350);
};

const createItem = () => {
  if (!form.name.trim()) return;
  store.addItem({
    type: form.type,
    name: form.name.trim(),
    time: form.time,
    days: form.days,
    checklist: form.type === 'workout'
      ? form.checklist.map((c) => c.trim()).filter(Boolean)
      : []
  });
  form.name = '';
  form.time = '';
  form.checklist = [];
  form.days = [...ALL_DAYS];
  justAdded.value = true;
  if (addedTimer) clearTimeout(addedTimer);
  addedTimer = setTimeout(() => (justAdded.value = false), 1200);
};

const goToWorkout = (item: { id: string }) => {
  router.push({ path: '/workout', query: { activityId: item.id } });
};
</script>

<style scoped>
.create-card {
  border-radius: 20px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.field {
  --border-radius: 12px;
  margin-bottom: 4px;
  transition: box-shadow 0.2s ease;
}
.field:focus-within {
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.18);
  border-radius: 12px;
}

.repeat-section {
  margin-top: 12px;
}

.repeat-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--ion-color-medium);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.day-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.day-chip {
  cursor: pointer;
  margin: 0;
  transition: transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease;
}
.day-chip.is-on {
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.35);
  transform: scale(1.05);
}
.day-chip:active {
  transform: scale(0.93);
}

.repeat-hint {
  font-size: 12px;
  color: var(--ion-color-medium);
  margin: 6px 0 0;
}

.checklist-editor {
  margin-top: 8px;
  border: 1px solid rgba(128, 128, 128, 0.25);
  border-radius: 14px;
}

.add-btn {
  --border-radius: 14px;
  font-weight: 700;
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.2s ease;
}
.add-btn.just-added {
  --background: var(--ion-color-success);
  transform: scale(1.02);
  animation: dw-pop-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.filter-seg {
  --background: var(--ion-card-background);
  border-radius: 14px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.daily-list {
  margin-top: 16px;
  border-radius: 12px;
  background: transparent;
}

.daily-item {
  --background: var(--ion-card-background);
  border-radius: 14px;
  margin-bottom: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.daily-item.is-done {
  opacity: 0.72;
}

h2.done {
  text-decoration: line-through;
  opacity: 0.55;
}

.type-chip {
  --background: rgba(128, 128, 128, 0.12);
  margin: 0 0 0 8px;
  height: 22px;
  font-size: 11px;
  text-transform: capitalize;
}

.progress-track {
  height: 5px;
  border-radius: 999px;
  background: rgba(128, 128, 128, 0.2);
  margin-top: 6px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--ion-color-tertiary), var(--ion-color-success));
  transition: width 0.5s cubic-bezier(0.22, 1, 0.36, 1);
}

.day-row {
  display: flex;
  gap: 3px;
  margin-top: 6px;
}

.mini-day {
  margin: 0;
  height: 24px;
  min-width: 28px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}
.mini-day.is-on {
  box-shadow: 0 2px 8px rgba(79, 70, 229, 0.3);
}

.delete-icon {
  font-size: 20px;
  padding: 6px;
  border-radius: 50%;
  transition: background 0.2s ease, color 0.2s ease, transform 0.15s ease;
}
.delete-icon:hover {
  background: rgba(239, 68, 68, 0.12);
  color: var(--ion-color-danger, #ef4444);
}

.empty-emoji {
  font-size: 44px;
  margin-bottom: 4px;
}

/* expand transition for workout editor */
.dw-expand-enter-active, .dw-expand-leave-active {
  transition: opacity 0.3s ease, transform 0.3s cubic-bezier(0.22, 1, 0.36, 1), max-height 0.35s ease;
  max-height: 600px;
  overflow: hidden;
}
.dw-expand-enter-from, .dw-expand-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.98);
  max-height: 0;
}
</style>
