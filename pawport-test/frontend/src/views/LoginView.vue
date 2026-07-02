<template>
  <div class="auth-page">
    <div class="auth-card animate-float-in">
      <h2>{{ $t('auth.login') }}</h2>
      <p class="auth-subtitle">{{ $t('app.tagline') }}</p>
      
      <form @submit.prevent="handleLogin" class="auth-form">
        <div class="form-group">
          <label>{{ $t('user.email') }} / {{ $t('user.username') }}</label>
          <input v-model="form.login" type="text" required autofocus />
        </div>
        
        <div class="form-group">
          <label>{{ $t('auth.password') }}</label>
          <input v-model="form.password" type="password" required />
        </div>
        
        <p v-if="error" class="error-msg">{{ error }}</p>
        
        <button type="submit" class="btn btn-primary btn-full" :disabled="loading">
          {{ loading ? $t('common.loading') : $t('auth.login') }}
        </button>
      </form>
      
      <div class="auth-divider">
        <span>OR</span>
      </div>
      
      <div class="oauth-buttons">
        <button class="oauth-btn google" disabled>
          {{ $t('auth.loginWith', { provider: 'Google' }) }}
        </button>
        <button class="oauth-btn wechat" disabled>
          {{ $t('auth.loginWith', { provider: 'WeChat' }) }}
        </button>
      </div>
      
      <p class="auth-link">
        {{ $t('auth.noAccount') }}
        <router-link to="/register">{{ $t('auth.register') }}</router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const form = ref({ login: '', password: '' })
const error = ref('')
const loading = ref(false)

async function handleLogin() {
  error.value = ''
  loading.value = true
  try {
    await authStore.login(form.value.login, form.value.password)
    router.push('/')
  } catch (e) {
    error.value = e.response?.data?.error || 'Login failed'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped lang="scss">
.auth-page {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: var(--bg-secondary);
}

.auth-card {
  background: var(--bg-card);
  border-radius: var(--radius);
  padding: 40px;
  width: 100%;
  max-width: 420px;
  box-shadow: var(--shadow);
  
  h2 {
    font-size: 1.6em;
    margin-bottom: 4px;
  }
  
  .auth-subtitle {
    color: var(--text-secondary);
    margin-bottom: 24px;
  }
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  
  label {
    font-size: 0.9em;
    font-weight: 500;
    color: var(--text-secondary);
  }
  
  input {
    padding: 12px 16px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    font-size: 1em;
    background: var(--bg);
    color: var(--text);
    transition: border-color var(--transition);
    
    &:focus {
      outline: none;
      border-color: var(--user-primary, var(--primary));
    }
  }
}

.error-msg {
  color: #E53E3E;
  font-size: 0.85em;
}

.btn-full {
  width: 100%;
  padding: 12px;
  font-size: 1em;
  margin-top: 8px;
}

.auth-divider {
  display: flex;
  align-items: center;
  margin: 24px 0;
  
  &::before, &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--border);
  }
  
  span {
    padding: 0 12px;
    color: var(--text-secondary);
    font-size: 0.85em;
  }
}

.oauth-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.oauth-btn {
  padding: 10px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--text);
  cursor: pointer;
  font-size: 0.9em;
  transition: all var(--transition);
  
  &:hover:not(:disabled) {
    background: var(--bg-secondary);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.auth-link {
  text-align: center;
  margin-top: 20px;
  color: var(--text-secondary);
  font-size: 0.9em;
  
  a {
    color: var(--user-primary, var(--primary));
    text-decoration: none;
    font-weight: 500;
  }
}
</style>
