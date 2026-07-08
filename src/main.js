import { createApp } from 'vue'
import 'element-plus/es/components/date-picker/style/css'
import App from './App.vue'
import router from './router'
import './styles/main.css'

createApp(App).use(router).mount('#app')
