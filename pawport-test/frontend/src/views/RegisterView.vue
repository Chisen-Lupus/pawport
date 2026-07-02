<template>
  <div class="auth-page">
    <div class="auth-card animate-float-in">
      <h2>{{ $t('auth.register') }}</h2>
      <p class="auth-subtitle">{{ $t('app.tagline') }}</p>
      
      <form @submit.prevent="handleRegister" class="auth-form">
        <div class="form-group">
          <label>{{ $t('user.username') }} *</label>
          <input v-model="form.username" type="text" required minlength="3" />
        </div>
        
        <div class="form-group">
          <label>{{ $t('user.email') }}</label>
          <input v-model="form.email" type="email" />
        </div>
        
        <div class="form-group">
          <label>{{ $t('user.displayName') }}</label>
          <input v-model="form.display_name" type="text" />
        </div>
        
        <div class="form-group">
          <label>{{ $t('auth.password') }} *</label>
          <input v-model="form.password" type="password" required minlength="6" />
        </div>
        
        <div class="form-group">
          <label>{{ $t('auth.confirmPassword') }} *</label>
          <input v-model="form.confirmPassword" type="password" required />
        </div>
        
        <p v-if="error" class="error-msg">{{ error }}</p>
        
        <button type="submit" class="btn btn-primary btn-full" :disabled="loading">
          {{ loading ? $t('common.loading') : $t('auth.register') }}
        </button>
      </form>
      
      <p class="auth-link">
        {{ $t('auth.hasAccount') }}
        <router-link to="/login">{{ $t('auth.login') }}</router-link>
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

const form = ref({ username: '', email: '', display_name: '', password: '', confirmPassword: '' })
const error = ref('')
const loading = ref(false)

async function handleRegister() {
  error.value = ''
  
  if (form.value.password !== form.value.confirmPassword) {
    error.value = 'Passwords do not match'
    return
  }
  
  loading.value = true
  try {
    await authStore.register({
      username: form.value.username,
      email: form.value.email || undefined,
      display_name: form.value.display_name || form.value.username,
      password: form.value.password,
    })
    router.push('/')
  } catch (e) {
    error.value = e.response?.data?.error || 'Registration failed'
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
  
  h2 { font-size: 1.6em; margin-bottom: 4px; }
  .auth-subtitle { color: var(--text-secondary); margin-bottom: 24px; }
}

.auth-form { display: flex; flex-direction: column; gap: 16px; }

.form-group {
  display: flex; flex-direction: column; gap: 6px;
  label { font-size: 0.9em; font-weight: 500; color: var(--text-secondary); }
  input {
    padding: 12px 16px; border: 1px solid var(--border); border-radius: var(--radius-sm);
    font-size: 1em; background: var(--bg); color: var(--text);
    &:focus { outline: none; border-color: var(--user-primary, var(--primary)); }
  }
}

.error-msg { color: #E53E3E; font-size: 0.85em; }
.btn-full { width: 100%; padding: 12px; font-size: 1em; margin-top: 8px; }
.auth-link {
  text-align: center; margin-top: 20px; color: var(--text-secondary); font-size: 0.9em;
  a { color: var(--user-primary, var(--primary)); text-decoration: none; font-weight: 500; }
}
</style>
