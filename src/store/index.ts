import { ElMenuItem } from 'element-ui/types/menu-item'
import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

export default new Vuex.Store({
  state: {
    xCommandIpList:[],
    that:this,
    xCardType:'axos'
    // xCommandIpStr:'192.168.3.3'
  },
  mutations: {
    setXCmdIpList:(state, ipList)=>{
      state.xCommandIpList = ipList
    },
    setXCardType:(state, caTdType)=>{
      state.xCardType = caTdType
    }
  },
  actions: {
  },
  modules: {
  }
})
