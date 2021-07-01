import Vue from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import 'normalize.css'

import '@/styles/element-variables.scss'
import '@/styles/index.scss'
import ElementUI from 'element-ui'
import ExTableColumn from 'ex-table-column'

Vue.config.productionTip = false

Vue.use(ElementUI)
Vue.component(ExTableColumn.name, ExTableColumn);
new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')
