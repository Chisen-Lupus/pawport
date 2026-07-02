import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor - add auth token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('pawport-token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  const showTestData = localStorage.getItem('pawport-show-test-data') !== 'false'
  config.headers['X-Pawport-Test-Data'] = showTestData ? 'true' : 'false'

  return config
})

// Response interceptor - handle errors
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('pawport-token')
      // Don't redirect here, let the store handle it
    }
    return Promise.reject(error)
  }
)

export default api
