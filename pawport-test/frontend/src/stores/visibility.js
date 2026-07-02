import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

const STORAGE_KEY = 'pawport-show-test-data'

export const useVisibilityStore = defineStore('visibility', () => {
  const showTestData = ref(localStorage.getItem(STORAGE_KEY) !== 'false')

  watch(showTestData, (value) => {
    localStorage.setItem(STORAGE_KEY, value ? 'true' : 'false')
  }, { immediate: true })

  function toggleTestData() {
    showTestData.value = !showTestData.value
  }

  function setTestData(value) {
    showTestData.value = Boolean(value)
  }

  return { showTestData, toggleTestData, setTestData }
})
