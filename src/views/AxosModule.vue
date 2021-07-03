<template>
  <div class="axosmodule">
   <table-show show-type='axosmodule'></table-show>
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
