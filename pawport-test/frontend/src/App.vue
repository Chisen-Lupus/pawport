<template>
  <div class="app" :style="appStyle">
    <header class="app-header" v-if="!isMapFullscreen">
      <div class="header-left">
        <router-link to="/" class="logo">
          <span class="logo-icon">🐾</span>
          <span class="logo-text">PawPort</span>
        </router-link>
        <button
          class="test-data-btn"
          :class="{ active: visibilityStore.showTestData }"
          type="button"
          :aria-pressed="visibilityStore.showTestData"
          :title="visibilityStore.showTestData ? $t('nav.testDataOff') : $t('nav.testDataOn')"
          @click="visibilityStore.toggleTestData()"
        >
          <span class="test-data-dot"></span>
          <span>{{ visibilityStore.showTestData ? $t('nav.testDataOn') : $t('nav.testDataOff') }}</span>
        </button>
      </div>
      
      <nav class="header-nav" v-if="extensions.enableActiveUsers || extensions.enableFurryMeets">
        <!-- 预留菜单扩展 -->
        <router-link to="/explore" class="nav-item" v-if="extensions.enableActiveUsers">{{ $t('nav.explore') }}</router-link>
        <router-link to="/stats" class="nav-item" v-if="extensions.enableFurryMeets">{{ $t('nav.stats') }}</router-link>
      </nav>
      
      <div class="header-right">
        <button class="icon-btn" @click="themeStore.toggleDark()" :title="themeStore.darkMode ? 'Light Mode' : 'Dark Mode'">
          {{ themeStore.darkMode ? '☀️' : '🌙' }}
        </button>
        <button class="icon-btn" @click="toggleLocale" :title="themeStore.locale === 'zh' ? 'English' : '中文'">
          {{ themeStore.locale === 'zh' ? 'EN' : '中' }}
        </button>
        
        <template v-if="authStore.isLoggedIn">
          <div class="user-avatar-btn" @click="showPanel = !showPanel">
            <img v-if="authStore.user?.avatar_url" :src="authStore.user.avatar_url" alt="avatar" class="avatar-img" />
            <div v-else class="avatar-placeholder" :style="{ background: authStore.themeColor }">
              {{ authStore.user?.display_name?.[0] || '?' }}
            </div>
          </div>
        </template>
        <template v-else>
          <router-link to="/login" class="btn btn-primary btn-sm">{{ $t('nav.login') }}</router-link>
        </template>
      </div>
    </header>
    
    <main class="app-main">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" :key="pageKey" />
        </transition>
      </router-view>
      
      <!-- Side panel for logged-in user -->
      <transition name="slide-right">
        <aside class="side-panel" v-if="showPanel && authStore.isLoggedIn">
          <UserPanel @close="showPanel = false" />
        </aside>
      </transition>
    </main>

    <transition name="welcome-fade">
      <div v-if="showWelcomeModal" class="welcome-overlay" @click.self="closeWelcomeModal">
        <section
          class="welcome-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="welcome-title"
        >
          <button class="welcome-close" type="button" :aria-label="$t('welcome.closeLabel')" @click="closeWelcomeModal">
            ×
          </button>

          <div class="welcome-heading">
            <span class="welcome-mark">🐾</span>
            <div>
              <p class="welcome-kicker">{{ $t('app.subtitle') }}</p>
              <h2 id="welcome-title">{{ $t('welcome.title') }}</h2>
            </div>
          </div>

          <div class="welcome-copy">
            <p>{{ $t('welcome.intro') }}</p>
            <p>{{ $t('welcome.profile') }}</p>
            <p>{{ $t('welcome.testing') }}</p>
            <p>{{ $t('welcome.sources') }}</p>
            <p>{{ $t('welcome.eastAsia') }}</p>
            <p>
              {{ $t('welcome.feedback') }}
              <a href="https://github.com/Chisen-Lupus/pawport" target="_blank" rel="noreferrer">
                https://github.com/Chisen-Lupus/pawport
              </a>
            </p>
          </div>

          <div class="welcome-actions">
            <label class="welcome-check">
              <input v-model="welcomeDontShowAgain" type="checkbox" />
              <span>{{ $t('welcome.dontShowAgain') }}</span>
            </label>

            <div class="welcome-buttons">
              <button class="btn welcome-secondary" type="button" @click="closeWelcomeModal">
                {{ $t('welcome.laterAction') }}
              </button>
              <button class="btn btn-primary" type="button" @click="closeWelcomeModal">
                {{ $t('welcome.primaryAction') }}
              </button>
            </div>
          </div>
        </section>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { useVisibilityStore } from '@/stores/visibility'
import UserPanel from '@/components/UserPanel.vue'

const { locale } = useI18n()
const route = useRoute()
const authStore = useAuthStore()
const themeStore = useThemeStore()
const visibilityStore = useVisibilityStore()

const WELCOME_STORAGE_KEY = 'pawport-welcome-dismissed-v1'

const showPanel = ref(false)
const isMapFullscreen = ref(false)
const showWelcomeModal = ref(false)
const welcomeDontShowAgain = ref(false)
const extensions = ref({
  enableActiveUsers: false,
  enableFurryMeets: false,
})

const appStyle = computed(() => ({
  '--user-primary': authStore.isLoggedIn ? authStore.themeColor : 'var(--primary)',
}))

const pageKey = computed(() => `${route.fullPath}:${visibilityStore.showTestData ? 'tests-on' : 'tests-off'}`)

function toggleLocale() {
  const newLocale = themeStore.locale === 'zh' ? 'en' : 'zh'
  themeStore.setLocale(newLocale)
  locale.value = newLocale
}

function welcomeDismissed() {
  try {
    return window.localStorage.getItem(WELCOME_STORAGE_KEY) === 'true'
  } catch (error) {
    return false
  }
}

function closeWelcomeModal() {
  if (welcomeDontShowAgain.value) {
    try {
      window.localStorage.setItem(WELCOME_STORAGE_KEY, 'true')
    } catch (error) {
      console.warn('Failed to save welcome preference')
    }
  }
  showWelcomeModal.value = false
}

onMounted(async () => {
  showWelcomeModal.value = !welcomeDismissed()

  if (authStore.token) {
    await authStore.fetchProfile()
  }
  // Fetch app config
  try {
    const res = await fetch('/api/config')
    const config = await res.json()
    if (config.extensions) {
      extensions.value = config.extensions
    }
  } catch (e) {
    console.warn('Failed to fetch config')
  }
})
</script>

<style scoped lang="scss">
.app {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  background: var(--bg-card);
  border-bottom: 1px solid var(--border);
  z-index: 1000;
  position: relative;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  color: var(--text);
  font-weight: 700;
  font-size: 1.2em;
  
  .logo-icon {
    font-size: 1.4em;
  }
}

.test-data-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 34px;
  padding: 6px 12px;
  border-radius: var(--radius-full);
  border: 1px solid var(--border);
  background: color-mix(in srgb, var(--bg-card) 90%, transparent);
  color: var(--text-secondary);
  font: inherit;
  font-size: 0.84em;
  font-weight: 700;
  cursor: pointer;
  box-shadow: var(--shadow);
  backdrop-filter: blur(14px);
  transition: color var(--transition), border-color var(--transition), background var(--transition), transform var(--transition);

  &:hover {
    transform: translateY(-1px);
    color: var(--text);
  }

  &.active {
    color: var(--user-primary, var(--primary));
    border-color: var(--user-primary, var(--primary));
  }
}

.test-data-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.9;
  flex: 0 0 auto;
}

.header-nav {
  display: flex;
  gap: 24px;
  
  .nav-item {
    text-decoration: none;
    color: var(--text-secondary);
    font-weight: 500;
    transition: color var(--transition);
    
    &:hover, &.router-link-active {
      color: var(--user-primary, var(--primary));
    }
  }
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.icon-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 1.2em;
  cursor: pointer;
  padding: 6px;
  border-radius: var(--radius-sm);
  transition: background var(--transition), color var(--transition);
  
  &:hover {
    background: color-mix(in srgb, var(--text-secondary) 10%, transparent);
    color: var(--text);
  }
}

.btn {
  padding: 8px 16px;
  border-radius: var(--radius-full);
  border: none;
  cursor: pointer;
  font-weight: 500;
  text-decoration: none;
  transition: all var(--transition);
  
  &-primary {
    background: var(--user-primary, var(--primary));
    color: white;
    
    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(108, 99, 255, 0.3);
    }
  }
  
  &-sm {
    padding: 6px 14px;
    font-size: 0.9em;
  }
}

.user-avatar-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  overflow: hidden;
  cursor: pointer;
  transition: transform var(--transition);
  
  &:hover {
    transform: scale(1.1);
  }
  
  .avatar-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  .avatar-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 700;
    font-size: 0.9em;
  }
}

.app-main {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.side-panel {
  position: absolute;
  top: 0;
  right: 0;
  width: 380px;
  max-width: 100%;
  height: 100%;
  background: var(--bg-card);
  border-left: 1px solid var(--border);
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.1);
  z-index: 900;
  overflow-y: auto;
}

.welcome-overlay {
  position: fixed;
  inset: 0;
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: color-mix(in srgb, var(--bg) 38%, rgba(15, 23, 42, 0.58));
  backdrop-filter: blur(12px);
}

.welcome-dialog {
  position: relative;
  width: min(640px, 100%);
  max-height: min(82vh, 760px);
  overflow-y: auto;
  padding: 28px;
  border: 1px solid var(--border);
  border-radius: 18px;
  background: var(--bg-card);
  color: var(--text);
  box-shadow: 0 28px 80px rgba(15, 23, 42, 0.28);
}

.welcome-close {
  position: absolute;
  top: 14px;
  right: 14px;
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border: 1px solid var(--border);
  border-radius: 50%;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  font-size: 1.1em;
  cursor: pointer;
  transition: border-color var(--transition), color var(--transition), transform var(--transition);

  &:hover {
    border-color: var(--user-primary, var(--primary));
    color: var(--user-primary, var(--primary));
    transform: translateY(-1px);
  }
}

.welcome-heading {
  display: flex;
  align-items: center;
  gap: 14px;
  padding-right: 36px;
  margin-bottom: 18px;

  h2 {
    margin: 2px 0 0;
    font-size: 1.55em;
    line-height: 1.2;
  }
}

.welcome-mark {
  width: 46px;
  height: 46px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border-radius: 14px;
  background: color-mix(in srgb, var(--user-primary, var(--primary)) 16%, transparent);
  font-size: 1.45em;
}

.welcome-kicker {
  margin: 0;
  color: var(--user-primary, var(--primary));
  font-weight: 700;
  font-size: 0.82em;
}

.welcome-copy {
  display: grid;
  gap: 12px;

  p {
    margin: 0;
    color: var(--text-secondary);
    line-height: 1.62;
  }

  a {
    color: var(--user-primary, var(--primary));
    font-weight: 700;
    overflow-wrap: anywhere;
  }
}

.welcome-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 24px;
}

.welcome-check {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--text-secondary);
  font-size: 0.9em;
  cursor: pointer;

  input {
    width: 16px;
    height: 16px;
    accent-color: var(--user-primary, var(--primary));
  }
}

.welcome-buttons {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 0 0 auto;
}

.welcome-secondary {
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-secondary);

  &:hover {
    color: var(--text);
    border-color: var(--text-secondary);
  }
}

// Transitions
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

.slide-right-enter-active, .slide-right-leave-active {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.slide-right-enter-from, .slide-right-leave-to {
  transform: translateX(100%);
}

.welcome-fade-enter-active,
.welcome-fade-leave-active {
  transition: opacity 0.2s ease;

  .welcome-dialog {
    transition: transform 0.24s ease, opacity 0.2s ease;
  }
}

.welcome-fade-enter-from,
.welcome-fade-leave-to {
  opacity: 0;

  .welcome-dialog {
    opacity: 0;
    transform: translateY(10px) scale(0.98);
  }
}

// Mobile responsive
@media (max-width: 768px) {
  .app-header {
    padding: 10px 16px;
  }
  
  .header-nav {
    display: none;
  }
  
  .side-panel {
    width: 100%;
    border-left: none;
  }

  .welcome-overlay {
    align-items: flex-end;
    padding: 12px;
  }

  .welcome-dialog {
    max-height: 88vh;
    padding: 22px;
    border-radius: 16px;
  }

  .welcome-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .welcome-buttons {
    width: 100%;

    .btn {
      flex: 1;
      justify-content: center;
    }
  }
}
</style>
