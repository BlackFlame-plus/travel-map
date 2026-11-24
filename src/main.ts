/**
 * 应用入口：挂载 Vue 根组件，并引入 Leaflet / 全局样式。
 * 地图真正的逻辑在 src/lib/map-engine.js，由 TravelMap.vue 在挂载后启动。
 */
import { createApp } from 'vue'
import 'leaflet/dist/leaflet.css'
import './assets/styles/map.css'
import App from './App.vue'

createApp(App).mount('#app')
