<template>
  <div class="app" :style="appStyle">
    <header class="app-header" v-if="!isMapFullscreen">
      <div class="header-left">
        <router-link to="/" class="logo">
          <span class="logo-icon">🐾</span>
          <span class="logo-text">PawPort</span>
        </router-link>
      </div>
      
      <nav class="header-nav">
        <!-- 预留菜单扩展 -->
        <router-link to="/" class="nav-item">{{ $t('nav.home') }}</router-link>
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
          <component :is="Component" />
        </transition>
      </router-view>
      
      <!-- Side panel for logged-in user -->
      <transition name="slide-right">
        <aside class="side-panel" v-if="showPanel && authStore.isLoggedIn">
          <UserPanel @close="showPanel = false" />
        </aside>
      </transition>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import UserPanel from '@/components/UserPanel.vue'

const { locale } = useI18n()
const authStore = useAuthStore()
const themeStore = useThemeStore()

const showPanel = ref(false)
const isMapFullscreen = ref(false)
const extensions = ref({
  enableActiveUsers: false,
  enableFurryMeets: false,
})

const appStyle = computed(() => ({
  '--user-primary': authStore.isLoggedIn ? authStore.themeColor : 'var(--primary)',
}))

function toggleLocale() {
  const newLocale = themeStore.locale === 'zh' ? 'en' : 'zh'
  themeStore.setLocale(newLocale)
  locale.value = newLocale
}

onMounted(async () => {
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
}
</style>
