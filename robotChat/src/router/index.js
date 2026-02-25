// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import App from '../App.vue'
import ContactForm from '../components/ContactForm.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: App  // 原来的聊天界面
    },
    {
      path: '/contact',
      name: 'contact',
      component: ContactForm  // 新的联系表单
    }
  ],
})

export default router