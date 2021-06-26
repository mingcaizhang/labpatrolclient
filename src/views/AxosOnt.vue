<template>
  <div class="axosont">
   <table-show show-type="axosont"></table-show>
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
export default class AxosOnt extends Vue {
}
</script>
