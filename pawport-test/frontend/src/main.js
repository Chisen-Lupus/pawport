import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import { createI18n } from 'vue-i18n'
import App from './App.vue'
import zh from './i18n/zh.json'
import en from './i18n/en.json'
import './assets/styles/global.scss'

// Router
const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'Home',
      component: () => import('./views/HomeView.vue'),
    },
    {
      path: '/login',
      name: 'Login',
      component: () => import('./views/LoginView.vue'),
    },
    {
      path: '/register',
      name: 'Register',
      component: () => import('./views/RegisterView.vue'),
    },
    {
      path: '/user/:id',
      name: 'UserProfile',
      component: () => import('./views/UserProfileView.vue'),
    },
    {
      path: '/con/:id',
      name: 'ConDetail',
      component: () => import('./views/ConDetailView.vue'),
    },
    {
      path: '/admin',
      name: 'Admin',
      component: () => import('./views/AdminView.vue'),
    },
    // 预留扩展页面
    {
      path: '/explore',
      name: 'Explore',
      component: () => import('./views/ExploreView.vue'),
    },
    {
      path: '/stats',
      name: 'Stats',
      component: () => import('./views/StatsView.vue'),
    },
  ],
})

// i18n
const i18n = createI18n({
  legacy: false,
  locale: localStorage.getItem('pawport-locale') || 'zh',
  fallbackLocale: 'en',
  messages: { zh, en },
})

// Create app
const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(i18n)
app.mount('#app')
