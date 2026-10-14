import { createApp } from 'vue'
import '@dyne/vite-theme/style.css'
import './style.css'
import App from './App.vue'
import { router } from './router'

const app = createApp(App)
app.config.errorHandler = () => {
  const main = document.getElementById('main')
  if (main) {
    main.textContent = 'This reading page could not be opened. Please reload, or read the full original using the link below.'
    main.focus()
  }
}
app.use(router)
router.isReady().then(() => app.mount('#app')).catch(() => {
  const container = document.getElementById('app')
  if (container) container.textContent = 'The reading could not load. Reload this page or read the original below.'
})
