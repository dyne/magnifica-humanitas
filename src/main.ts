import { t } from './messages'
import { createApp } from 'vue'
import '@dyne/vite-theme/style.css'
import './polish-fonts.css'
import './belarusian-fonts.css'
import './style.css'
import App from './App.vue'
import { router } from './router'

const app = createApp(App)
app.config.errorHandler = () => {
  const main = document.getElementById('main')
  if (main) {
    main.textContent = t('load.page_error')
    main.focus()
  }
}
app.use(router)
router.isReady().then(() => app.mount('#app')).catch(() => {
  const container = document.getElementById('app')
  if (container) container.textContent = t('load.initial_error')
})
