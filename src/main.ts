import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import Test from './views/Test.vue'
import './style.css'

const app = createApp(Test)

app.use(ElementPlus)

// 全局注册所有 Element Plus 图标（Test.vue 及子组件以全局组件形式使用 <Upload/> 等）
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.mount('#app')
