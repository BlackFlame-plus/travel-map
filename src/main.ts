/**
 * 应用入口：Vue + Element Plus（中文）+ Leaflet / 全局样式。
 * 地图逻辑在 map-engine；侧栏交互在 Vue 组件里用 Element Plus。
 */
import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import 'element-plus/dist/index.css'
import 'leaflet/dist/leaflet.css'
import './assets/styles/map.css'
import App from './App.vue'

const app = createApp(App)
app.use(ElementPlus, { locale: zhCn, size: 'default' })
app.mount('#app')
