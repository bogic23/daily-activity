<template>
  <ion-app>
    <ion-router-outlet />
  </ion-app>
</template>

<script setup lang="ts">
import { watch } from 'vue';
import { IonApp, IonRouterOutlet } from '@ionic/vue';
import { useAuthStore } from './stores/auth';
import { useActivityStore } from './stores/activities';
import { startSync, stopSync } from './lib/activitySync';

const auth = useAuthStore();
const activities = useActivityStore();

// Switch local cache namespace + (re)start Firestore sync on sign-in/out.
watch(
  () => auth.user.value?.uid ?? null,
  (uid) => {
    activities.setOwner(uid);
    if (uid) {
      startSync(uid);
    } else {
      stopSync();
    }
  },
  { immediate: true }
);
</script>
