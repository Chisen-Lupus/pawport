<template>
  <div class="con-detail" v-if="con">
    <div class="con-header" :style="{ background: con.theme_color }">
      <h2>{{ con.name }}</h2>
      <p>{{ con.start_date }} - {{ con.end_date }}</p>
      <p>📍 {{ con.venue }}, {{ con.city }}</p>
    </div>
    <div class="con-body">
      <p v-if="con.description">{{ con.description }}</p>
      <a v-if="con.website" :href="con.website" target="_blank">{{ $t('con.website') }}</a>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useConsStore } from '@/stores/cons'

const route = useRoute()
const consStore = useConsStore()
const con = ref(null)

onMounted(async () => {
  con.value = await consStore.fetchCon(route.params.id)
})
</script>

<style scoped lang="scss">
.con-detail {
  max-width: 600px;
  margin: 40px auto;
  padding: 0 20px;
}

.con-header {
  padding: 32px;
  border-radius: var(--radius);
  color: white;
  margin-bottom: 24px;
  
  h2 { margin-bottom: 8px; }
  p { opacity: 0.9; }
}

.con-body {
  padding: 20px;
  
  a {
    color: var(--primary);
  }
}
</style>
