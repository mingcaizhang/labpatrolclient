<template>
  <div class="examodule">
   <table-show show-type='examodule'></table-show>
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
