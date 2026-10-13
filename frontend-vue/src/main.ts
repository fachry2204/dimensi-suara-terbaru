import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import LandingView from './views/LandingView.vue'
import LoginView from './views/LoginView.vue'
import RegisterView from './views/RegisterView.vue'
import DashboardView from './views/DashboardView.vue'
import ReleasesView from './views/ReleasesView.vue'
import UsersView from './views/UsersView.vue'
import NewReleaseChoiceView from './views/NewReleaseChoiceView.vue'
import NewReleaseFormView from './views/NewReleaseFormView.vue'
import ContractsView from './views/ContractsView.vue'
import ContractSignView from './views/ContractSignView.vue'
import ReportsView from './views/ReportsView.vue'
import './style.css'
import './landing.css'
import './new-release.css'
import './new-release-responsive.css'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: LandingView },
    { path: '/login', component: LoginView },
    { path: '/register', component: RegisterView },
    { path: '/dashboard', component: DashboardView },
    { path: '/releases', component: ReleasesView },
    { path: '/new-release', component: NewReleaseChoiceView },
    { path: '/new-release/:kind(single|album)', component: NewReleaseFormView },
    { path: '/releases/:id(\\d+)/edit', component: NewReleaseFormView },
    { path: '/users', component: UsersView },
    { path: '/contracts', component: ContractsView },
    { path: '/reports', component: ReportsView },
    { path: '/contract/sign/:token', component: ContractSignView },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

createApp(App).use(router).mount('#app')
