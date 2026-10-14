import { createRouter, createWebHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';
import { awaitAuthReady, useAuthStore } from '../stores/auth';

// Lazy-load views so each page becomes its own chunk
// (keeps the initial bundle small — fixes the >500 kB chunk warning).
const HomePage = () => import('../views/HomePage.vue');
const ActivityPage = () => import('../views/ActivityPage.vue');
const WorkoutPage = () => import('../views/WorkoutPage.vue');
const StatsPage = () => import('../views/StatsPage.vue');
const LoginPage = () => import('../views/LoginPage.vue');

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    redirect: '/home'
  },
  {
    path: '/login',
    name: 'Login',
    component: LoginPage
  },
  {
    path: '/home',
    name: 'Home',
    component: HomePage
  },
  {
    path: '/activity',
    name: 'Activity',
    component: ActivityPage
  },
  {
    path: '/workout',
    name: 'Workout',
    component: WorkoutPage
  },
  {
    path: '/stats',
    name: 'Stats',
    component: StatsPage
  }
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
});

// Pages that need a signed-in user (data lives per-account in Firestore).
router.beforeEach(async (to) => {
  // Never let navigation hang: if Firebase Auth takes longer than 8s
  // (blocked network, etc.), proceed as logged-out instead of blank-screening.
  await Promise.race([
    awaitAuthReady(),
    new Promise((resolve) => setTimeout(resolve, 8000))
  ]);
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated.value && to.path !== '/login') {
    return { path: '/login' };
  }
  if (isAuthenticated.value && to.path === '/login') {
    return { path: '/home' };
  }
  return true;
});

export default router;
