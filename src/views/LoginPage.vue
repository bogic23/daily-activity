<template>
  <ion-page>
    <ion-content :fullscreen="true" class="ion-padding login-page">
      <div class="login-wrap dw-fade-up">
        <div class="dw-float logo">🏋️</div>
        <h1 class="title">Daily <span class="dw-gradient-text">Activity</span></h1>
        <p class="subtitle">Sign in to sync your workouts across devices</p>

        <ion-card class="login-card dw-hero">
          <ion-card-content>
            <ion-button
              expand="block"
              class="btn-shine google-btn"
              :disabled="auth.busy.value"
              @click="signIn"
            >
              <ion-icon slot="start" :icon="logoGoogle"></ion-icon>
              {{ auth.busy.value ? 'Signing in…' : 'Continue with Google' }}
            </ion-button>

            <p v-if="auth.error.value" class="error">{{ auth.error.value }}</p>
            <p class="hint">Your activities are stored per account in Firestore.</p>
          </ion-card-content>
        </ion-card>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { watch } from 'vue';
import { useRouter } from 'vue-router';
import {
  IonPage, IonContent, IonCard, IonCardContent, IonButton, IonIcon
} from '@ionic/vue';
import { logoGoogle } from 'ionicons/icons';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const auth = useAuthStore();

const signIn = async () => {
  try {
    await auth.signInWithGoogle();
    router.replace('/home');
  } catch {
    /* error shown inline via auth.error */
  }
};

watch(
  () => auth.user.value,
  (user) => {
    if (user) router.replace('/home');
  },
  { immediate: true }
);
</script>

<style scoped>
.login-page {
  --background: transparent;
}

.login-wrap {
  max-width: 420px;
  margin: 12vh auto 0;
  text-align: center;
}

.logo {
  font-size: 64px;
  line-height: 1;
}

.title {
  font-size: 34px;
  font-weight: 800;
  letter-spacing: -0.5px;
  margin: 12px 0 4px;
}

.subtitle {
  color: var(--ion-color-medium);
  margin: 0 0 20px;
}

.login-card {
  border-radius: 20px;
  text-align: center;
}

.google-btn {
  --border-radius: 14px;
  font-weight: 700;
  margin-top: 4px;
}

.error {
  color: var(--ion-color-danger, #ef4444);
  font-size: 12px;
  margin: 12px 0 0;
  text-align: left;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 220px;
  overflow-y: auto;
  background: rgba(239, 68, 68, 0.08);
  border-radius: 10px;
  padding: 10px;
}

.hint {
  color: var(--ion-color-medium);
  font-size: 12px;
  margin: 12px 0 0;
}
</style>
