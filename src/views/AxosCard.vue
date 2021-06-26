<template>
  <div class="axoscard">
   <table-show show-type='axoscard'></table-show>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import TableShow from '@/components/TableShow.vue'
@Component({
  components: {
    TableShow
  }
})
export default class AxosCard extends Vue {
}
</script>
