<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>Your Stats</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="ion-padding">
      <div class="stats-grid">
        <ion-card
          v-for="(s, i) in statCards"
          :key="s.label"
          :class="['stat-card pressable dw-stagger', s.cls]"
          :style="{ '--d': i }"
        >
          <ion-card-content>
            <div class="stat-icon" :class="s.cls">
              <ion-icon :icon="s.icon" size="large"></ion-icon>
            </div>
            <h2 class="stat-value">{{ s.value }}</h2>
            <p class="stat-label">{{ s.label }}</p>
          </ion-card-content>
        </ion-card>
      </div>

      <ion-card class="weekly-card dw-hero dw-fade-up" style="--d: 2">
        <ion-card-header>
          <ion-card-title>Weekly Overview</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <div class="week-chart">
            <div
              v-for="(day, index) in weekData"
              :key="index"
              class="chart-bar-container"
              :style="{ '--d': index }"
            >
              <div
                class="chart-bar bar-grow"
                :style="{ height: day.minutes + 'px', animationDelay: `${index * 70}ms` }"
                :title="`${day.minutes} min`"
              ></div>
              <span class="chart-label">{{ day.day }}</span>
            </div>
          </div>
        </ion-card-content>
      </ion-card>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonCard, IonCardContent, IonCardHeader, IonCardTitle,
  IonIcon
} from '@ionic/vue';
import { flame, time } from 'ionicons/icons';

const statCards = [
  { label: 'Calories Today', value: '1,240', icon: flame, cls: 'is-warm' },
  { label: 'Active Minutes', value: '85', icon: time, cls: 'is-calm' }
];

const weekData = [
  { day: 'M', minutes: 40 },
  { day: 'T', minutes: 65 },
  { day: 'W', minutes: 30 },
  { day: 'T', minutes: 80 },
  { day: 'F', minutes: 55 },
  { day: 'S', minutes: 90 },
  { day: 'S', minutes: 20 }
];
</script>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.stat-card {
  border-radius: 20px;
  text-align: center;
  cursor: pointer;
}

.stat-icon {
  width: 52px;
  height: 52px;
  margin: 0 auto;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.stat-card:hover .stat-icon {
  transform: scale(1.1) rotate(-5deg);
}
.stat-icon.is-warm {
  background: linear-gradient(135deg, #f59e0b, #ef4444);
  box-shadow: 0 6px 16px rgba(239, 68, 68, 0.35);
}
.stat-icon.is-calm {
  background: linear-gradient(135deg, #4f46e5, #06b6d4);
  box-shadow: 0 6px 16px rgba(79, 70, 229, 0.35);
}

.stat-value {
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.5px;
  margin: 10px 0 4px;
}

.stat-label {
  font-size: 13px;
  color: var(--ion-color-medium);
}

.weekly-card {
  margin-top: 20px;
  border-radius: 20px;
}

.week-chart {
  display: flex;
  justify-content: space-around;
  align-items: flex-end;
  height: 130px;
  padding-top: 20px;
}

.chart-bar-container {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.chart-bar {
  width: 28px;
  background: linear-gradient(180deg, var(--ion-color-primary) 0%, var(--ion-color-tertiary) 100%);
  border-radius: 8px 8px 4px 4px;
  transform-origin: bottom;
  cursor: pointer;
  transition: filter 0.2s ease, transform 0.2s ease;
}
.chart-bar:hover {
  filter: brightness(1.1);
  transform: scaleY(1.03);
}

.bar-grow {
  animation: dw-bar-grow 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
}
@keyframes dw-bar-grow {
  from { transform: scaleY(0); opacity: 0; }
  to { transform: scaleY(1); opacity: 1; }
}

.chart-label {
  margin-top: 8px;
  font-size: 12px;
  font-weight: 700;
  color: var(--ion-color-medium);
}
</style>
