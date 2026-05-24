import { ElMenuItem } from 'element-ui/types/menu-item'
import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

export default new Vuex.Store({
  state: {
    xCommandIpList: [],
    that: this,
    xCardType: 'axos',
    equipHistorySn: '',
    equipHistoryType: 'card',
    equipHistoryList: [],
    equipHistoryHeaders: []
    // xCommandIpStr:'192.168.3.3'
  },
  mutations: {
    setXCmdIpList: (state, ipList) => {
      state.xCommandIpList = ipList
    },
    setXCardType: (state, caTdType) => {
      state.xCardType = caTdType
    },
    setEquipHistorySn: (state, sn) => {
      state.equipHistorySn = sn
    },
    setEquipHistoryType: (state, type) => {
      state.equipHistoryType = type
    },
    setEquipHistoryData: (state, payload) => {
      state.equipHistoryList = payload.list
      state.equipHistoryHeaders = payload.headers
    }
  },
  actions: {
  },
  modules: {
  }
})
