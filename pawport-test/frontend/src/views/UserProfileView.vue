<template>
  <div class="profile-page" v-if="userProfile">
    <div class="profile-header" :style="{ borderColor: userProfile.theme_color }">
      <div class="profile-avatar" :style="{ background: userProfile.theme_color }">
        <img v-if="userProfile.avatar_url" :src="userProfile.avatar_url" alt="" />
        <span v-else>{{ (userProfile.display_name || userProfile.username)[0] }}</span>
      </div>
      <h2>{{ userProfile.display_name || userProfile.username }}</h2>
      <p class="profile-bio" v-if="userProfile.bio">{{ userProfile.bio }}</p>
    </div>
    
    <div class="profile-cons" v-if="userProfile.cons">
      <h3>{{ $t('user.conHistory') }} ({{ userProfile.cons.length }})</h3>
      <div class="con-list">
        <div v-for="uc in userProfile.cons" :key="uc.id" class="con-item">
          <div class="con-item-color" :style="{ background: uc.Con?.theme_color }"></div>
          <div class="con-item-info">
            <div class="con-item-title">
              <h4>{{ uc.Con?.name }}</h4>
              <span
                v-if="shouldShowConStatus(uc)"
                class="con-status-badge"
                :class="`status-${conStatus(uc)}`"
              >
                {{ conStatusLabel(uc) }}
              </span>
            </div>
            <p>{{ uc.Con?.city }} · {{ uc.Con?.start_date }}</p>
            <p v-if="conStatusHint(uc)" class="con-status-hint">{{ conStatusHint(uc) }}</p>
            <p v-if="uc.comment" class="con-comment">"{{ uc.comment }}"</p>
          </div>
          <div class="con-item-rating" v-if="uc.rating">
            {{ '⭐'.repeat(uc.rating) }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import api from '@/utils/api'

const route = useRoute()
const { t } = useI18n()
const userProfile = ref(null)
const REVIEW_STATUSES = new Set(['pending', 'approved', 'rejected'])

function conStatus(visit) {
  const status = visit.Con?.status
  return REVIEW_STATUSES.has(status) ? status : 'approved'
}

function shouldShowConStatus(visit) {
  return conStatus(visit) !== 'approved'
}

function conStatusLabel(visit) {
  return t(`admin.status.${conStatus(visit)}`)
}

function conStatusHint(visit) {
  const status = conStatus(visit)
  if (status === 'pending') return t('user.pendingConHint')
  if (status === 'rejected') return t('user.rejectedConHint')
  return ''
}

onMounted(async () => {
  try {
    const res = await api.get(`/users/${route.params.id}`)
    userProfile.value = res.data.user
  } catch (error) {
    console.error('Failed to fetch profile:', error)
  }
})
</script>

<style scoped lang="scss">
.profile-page {
  padding: 40px;
  max-width: 600px;
  margin: 0 auto;
  height: 100%;
  overflow-y: auto;
}

.profile-header {
  text-align: center;
  padding-bottom: 24px;
  border-bottom: 3px solid;
  margin-bottom: 24px;
}

.profile-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  margin: 0 auto 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 2em;
  font-weight: 700;
  overflow: hidden;
  
  img { width: 100%; height: 100%; object-fit: cover; }
}

.profile-bio {
  color: var(--text-secondary);
  margin-top: 8px;
}

.profile-cons {
  h3 {
    margin-bottom: 16px;
    color: var(--text-secondary);
  }
}

.con-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.con-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: var(--radius-sm);
  
  .con-item-color {
    width: 4px;
    height: 40px;
    border-radius: 2px;
    flex-shrink: 0;
  }
  
  .con-item-info {
    flex: 1;
    
    h4 { font-size: 1em; margin-bottom: 2px; }
    p { font-size: 0.85em; color: var(--text-secondary); }
    .con-comment { font-style: italic; margin-top: 4px; }
    .con-status-hint { margin-top: 4px; }
  }

  .con-item-title {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
  }

  .con-status-badge {
    display: inline-flex;
    align-items: center;
    border-radius: var(--radius-full);
    padding: 2px 8px;
    font-size: 0.7em;
    font-weight: 800;

    &.status-pending {
      background: color-mix(in srgb, #F59E0B 16%, transparent);
      color: #D97706;
    }

    &.status-rejected {
      background: color-mix(in srgb, #DC2626 14%, transparent);
      color: #DC2626;
    }
  }
  
  .con-item-rating {
    font-size: 0.8em;
  }
}
</style>
