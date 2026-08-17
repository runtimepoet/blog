import { createRouter, createWebHistory } from 'vue-router'
import Home from './pages/Home.vue'
import Projects from './pages/Projects.vue'
import Posts from './pages/Posts.vue'
import Post from './pages/Post.vue'
import About from './pages/About.vue'
import AdminLogin from './admin/Login.vue'
import AdminLayout from './admin/Layout.vue'
import AdminPosts from './admin/Posts.vue'
import AdminProjects from './admin/Projects.vue'
import AdminImages from './admin/Images.vue'

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: Home },
    { path: '/projects', name: 'projects', component: Projects },
    { path: '/posts', name: 'posts', component: Posts },
    { path: '/post/:slug', name: 'post', component: Post },
    { path: '/about', name: 'about', component: About },
    { path: '/admin/login', name: 'admin-login', component: AdminLogin },
    {
      path: '/admin',
      component: AdminLayout,
      children: [
        { path: '', redirect: '/admin/posts' },
        { path: 'posts', component: AdminPosts },
        { path: 'projects', component: AdminProjects },
        { path: 'images', component: AdminImages },
      ],
    },
  ],
  scrollBehavior: () => ({ top: 0 }),
})
