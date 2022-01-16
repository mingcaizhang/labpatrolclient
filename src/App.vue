<template>
  <div id="app">
    <div id="nav">
    </div>
    <div>
    </div>
  <el-container style="border: 1px solid #eee">
  <el-aside width="200px" style="background-color: rgb(238, 241, 246)">
    <el-menu>
      <el-menu-item index="1" @click="loadAxos">AxosCard</el-menu-item>
      <el-menu-item index="2" @click="loadExa">ExaCard</el-menu-item>
      <el-menu-item index="3" @click="loadAxosOnt">AxosOnt</el-menu-item>
      <el-menu-item index="4" @click="loadExaOnt">ExaOnt</el-menu-item>
      <el-menu-item index="5" @click="loadAxosModule">AxosModule</el-menu-item>
      <el-menu-item index="6" @click="loadExaModule">ExaModule</el-menu-item>
       <el-menu-item index="7" @click="loadXCommand">XCommand</el-menu-item>
       <el-menu-item index="8" @click="loadOntDiag">OntDiag</el-menu-item>
      <el-menu-item index="8" @click="loadTopo">Topo</el-menu-item>

    </el-menu>
  </el-aside>

  <el-container>
    <el-main>
      <router-view/>
    </el-main>
  </el-container>
</el-container>

  </div>

</template>

<style>
  .el-header {
    background-color: #B3C0D1;
    color: #333;
    line-height: 60px;
  }

  .el-aside {
    color: #333;
  }
</style>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'

@Component({
  name: 'App'
})
export default class extends Vue {
  private loadAxos() {
    this.$router.push({ path: '/axoscard' }).catch(err => {
      console.warn(err)
    })
  }

  private loadExa() {
    this.$router.push({ path: '/exacard' }).catch(err => {
      console.warn(err)
    })
  }

  private loadAxosOnt() {
    this.$router.push({ path: '/axosont' }).catch(err => {
      console.warn(err)
    })
  }

  private loadExaOnt() {
    this.$router.push({ path: '/exaont' }).catch(err => {
      console.warn(err)
    })
  }

  private loadExaModule() {
    this.$router.push({ path: '/examodule' }).catch(err => {
      console.warn(err)
    })
  }

  private loadAxosModule() {
    this.$router.push({ path: '/axosmodule' }).catch(err => {
      console.warn(err)
    })
  }
 
  private loadXCommand() {
    this.$router.push({ path: '/xcommand' }).catch(err => {
      console.warn(err)
    })
  }

  private loadOntDiag() {
    this.$router.push({ path: '/ontdiag' }).catch(err => {
      console.warn(err)
    })    
  }

  private loadTopo() {
    this.$router.push({ path: '/topo' }).catch(err => {
      console.warn(err)
    })    
  }  
}
</script>
