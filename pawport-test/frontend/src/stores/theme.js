import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export const useThemeStore = defineStore('theme', () => {
  const darkMode = ref(localStorage.getItem('pawport-dark') === 'true')
  const locale = ref(localStorage.getItem('pawport-locale') || 'zh')
  
  watch(darkMode, (val) => {
    localStorage.setItem('pawport-dark', val)
    document.documentElement.classList.toggle('dark', val)
  }, { immediate: true })
  
  watch(locale, (val) => {
    localStorage.setItem('pawport-locale', val)
  })
  
  function toggleDark() {
    darkMode.value = !darkMode.value
  }
  
  function setLocale(l) {
    locale.value = l
  }
  
  return { darkMode, locale, toggleDark, setLocale }
})
