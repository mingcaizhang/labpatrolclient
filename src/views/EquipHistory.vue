<template>
  <div class="equip-history">
    <el-row type="flex" align="middle" class="filter-row">
      <el-col :span="4" class="filter-item">
        <span class="label-text">Type: </span>
        <el-select v-model="type" placeholder="Select type">
          <el-option label="Card" value="card"></el-option>
          <el-option label="Module" value="module"></el-option>
          <el-option label="ONT" value="ont"></el-option>
        </el-select>
      </el-col>
      <el-col :span="7" class="filter-item">
        <span class="label-text">SN: </span>
        <el-input v-model="sn" placeholder="Please input SN"></el-input>
      </el-col>
      <el-col :span="2" class="filter-item">
        <el-button @click="fetchData">submit</el-button>
      </el-col>
    </el-row>

    <el-table v-if="list.length > 0" :data="list" :border="true" style="width: 100%" :fit="true">
      <el-table-column
        v-for="item of headers"
        :key="item"
        :prop="item"
        :label="item"
        :autoFit="true"
        :fitHeader="true"
      >
      </el-table-column>
    </el-table>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import { getCardLocation, getOntLocation, getModuleLocation } from '@/api/DataFetch'

type HistoryItem = {
  [attr: string]: string
}

@Component
export default class EquipHistory extends Vue {
  private sn = ''
  private type = 'card'
  private headers: string[] = []
  private list: HistoryItem[] = []

  created(): void {
    this.sn = this.$store.state.equipHistorySn || ''
    this.type = this.$store.state.equipHistoryType || 'card'
    this.list = this.$store.state.equipHistoryList || []
    this.headers = this.$store.state.equipHistoryHeaders || []
  }

  private async fetchData() {
    if (!this.sn.trim()) {
      this.$message({
        showClose: true,
        message: 'SN is required',
        type: 'warning'
      })
      return
    }

    let res
    if (this.type === 'ont') {
      res = await getOntLocation({ sn: this.sn.trim() })
    } else if (this.type === 'module') {
      res = await getModuleLocation({ sn: this.sn.trim() })
    } else {
      res = await getCardLocation({ sn: this.sn.trim() })
    }

    const data = res.data

    if (data && data.code === 200 && data.message && data.message.res) {
      this.list = data.message.res as HistoryItem[]
      if (this.list.length > 0) {
        this.headers = Object.keys(this.list[0])
      } else {
        this.headers = []
        this.$message({
          showClose: true,
          message: 'No data found',
          type: 'info'
        })
      }
      this.$store.commit('setEquipHistorySn', this.sn.trim())
      this.$store.commit('setEquipHistoryType', this.type)
      this.$store.commit('setEquipHistoryData', { list: this.list, headers: this.headers })
    } else {
      this.list = []
      this.headers = []
      this.$message({
        showClose: true,
        message: 'Failed to fetch data',
        type: 'error'
      })
    }
  }
}
</script>

<style scoped lang="scss">
.equip-history {
  padding: 20px;
}
.filter-row {
  margin-bottom: 20px;
  display: flex;
  align-items: center;
}
.filter-item {
  display: flex;
  align-items: center;
}
.label-text {
  margin-right: 8px;
  font-weight: bold;
}
</style>
