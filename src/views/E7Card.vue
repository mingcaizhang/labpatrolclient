<template>
  <div class="e7card">
   <table-show show-type="exacard"></table-show>
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
export default class E7Card extends Vue {
}
</script>
