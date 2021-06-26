<template>
  <div class="e7ont">
   <table-show show-type="exaont"></table-show>
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
export default class E7Ont extends Vue {
}
</script>
