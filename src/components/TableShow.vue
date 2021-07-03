/* eslint-disable semi */
/* eslint-disable comma-dangle */
/* eslint-disable no-empty */
/* eslint-disable prefer-const */
<template>
  <div class="app-container">
    <el-row>
      <el-col :span="3"
        ><el-button @click="exportCsv">exportCsv</el-button></el-col>
       <el-col :span="3"
        ><el-button @click="exportText">exportTxt</el-button></el-col>
      <el-col :span="1"
        ><el-link v-on:click="fetchData(currentPage - 1)"
          >Prev</el-link
        ></el-col
      >
      <el-col :span="1"
        ><el-link v-on:click="fetchData(currentPage + 1)"
          >Next</el-link
        ></el-col
      >
      <el-col :span="2"
        ><label name='pageinfo'>{{ currentPage }}/{{ totalPageCount }} </label></el-col
      >

      <el-col :span="2" class="demo-input-suffix">
        <el-input
          v-model="filterResult">
        </el-input>
      </el-col>
        <el-col :span="2"
          ><el-button @click="fetchData(1)">search</el-button>
      </el-col>
    </el-row>

    <el-dialog
      title="progress"
      :visible.sync="dialogVisible"
      width="20%">
      <el-progress type="circle" :percentage="exportPerc"></el-progress>
    </el-dialog>
    <el-table ref="multipleTable" :data="list" :border="true" style="width:150%" :fit="true">
      <el-table-column
        v-for="item of headers"
        :key="item"
        :prop="item"
        :label="item"
        :autoFit='true'
        :fitHeader='true'
      >
      </el-table-column>
    </el-table>
  </div>
</template>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
.el-table .cell {
  white-space: nowrap;
  width: fit-content;
}
</style>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator'
import {
  getExaCard,
  getAxosCard,
  getAxosOnt,
  getExaOnt,
  getAxosModule,
  getExaModule
} from '@/api/DataFetch'
import CsvExportor from 'csv-exportor'
import printf from 'printf'
// import axios from 'axios'

type oneCardInfo = {
  [attr: string]: string
};

interface ShowFilter {
  [attr: string]: string[]
}

@Component({
  name: 'TableShow'
})
export default class TableShow extends Vue {
  @Prop({ default: 'axoscard' }) private showType!: string;
  private headers: string[] = [];
  private filter: ShowFilter = {
    axoscard: ['cardPosition', 'MODEL', 'SERIAL NO', 'timestamp', 'details'],
    e7card: [],
    ont: []
  };

  fontRate = {
    CHAR_RATE: 1.1, // 汉字比率
    NUM_RATE: 0.65, // 数字
    OTHER_RATE: 0.8 // 除汉字和数字以外的字符的比率
  }

  private list: oneCardInfo[] = [];
  private cardFilter: string[] = [
    'cardPosition',
    'PROVISION TYPE',
    'CARD STATE',
    'MODEL',
    'details'
  ];

  private currentPage = 1;
  private totalPageCount = 1;
  private oneShowCount = 50;
  private dialogVisible = false
  private exportPerc = 0
  private filterResult = ''
  created(): void {
    this.fetchData(1)
  }

  private async getDataResult(pageNum: number, filter = ''):Promise<oneCardInfo[]> {
    let data

    if (this.showType === 'axoscard') {
      data = (
        await getAxosCard({ pageNum: pageNum, eachFetch: this.oneShowCount, filter: filter })
      ).data
    } else if (this.showType === 'exacard') {
      data = (
        await getExaCard({ pageNum: pageNum, eachFetch: this.oneShowCount, filter: filter })
      ).data
    } else if (this.showType === 'axosont') {
      data = (await getAxosOnt({
        pageNum: pageNum,
        eachFetch: this.oneShowCount,
        filter: filter
      })).data
    } else if (this.showType === 'exaont') {
      data = (await getExaOnt({
        pageNum: pageNum,
        eachFetch: this.oneShowCount,
        filter: filter
      })).data
    } else if (this.showType === 'axosmodule') {
      data = (await getAxosModule({
        pageNum: pageNum,
        eachFetch: this.oneShowCount,
        filter: filter
      })).data
    } else if (this.showType === 'examodule') {
      data = (await getExaModule({
        pageNum: pageNum,
        eachFetch: this.oneShowCount,
        filter: filter
      })).data
    }

    if (data && data.code === 200) {
      if (data.message) {
        this.totalPageCount =
          Math.floor(data.message.totalCount / this.oneShowCount) + 1
        this.currentPage = pageNum
        const res = data.message.res as oneCardInfo[]
        console.log(res)
        return res
      }
    } else {
      return [] as oneCardInfo[]
    }
    return []
  }

  private async fetchData(pageNum: number) {
    const dataList = await this.getDataResult(pageNum, this.filterResult)
    if (!dataList || dataList.length === 0) {
      this.list = []
      return
    }
    for (let ii = 0; ii < dataList.length; ii++) {
      for (const key in dataList[ii]) {
        if (key.indexOf('.') !== -1) {
          dataList[ii][key.replaceAll('.', '')] = dataList[ii][key].trim()
          delete dataList[ii][key]
        }
      }
    }
    this.list = dataList
    this.headers = []
    for (const item in this.list[0]) {
      this.headers.push(item.replaceAll('.', '').trim())
    }
  }

  private async exportCsv() {
    // const tableData = [['1'], '2', '3']
    // const header = ['坐标lng', '坐标lat', '地址']
    // CsvExportor.downloadCsv(tableData, { header }, 'test.csv')
    let data
    let pageNum = 1
    let needPage = 0
    const csvData = []
    const header: string[] = []
    this.exportPerc = 0
    this.dialogVisible = true
    try {
      while (true) {
        if (this.showType === 'axoscard') {
          data = (
            await getAxosCard({ pageNum: pageNum, eachFetch: this.oneShowCount })
          ).data
        } else if (this.showType === 'exacard') {
          data = (
            await getExaCard({ pageNum: pageNum, eachFetch: this.oneShowCount })
          ).data
        } else if (this.showType === 'axosont') {
          data = (await getAxosOnt({
            pageNum: pageNum,
            eachFetch: this.oneShowCount
          })).data
        } else if (this.showType === 'exaont') {
          data = (await getExaOnt({
            pageNum: pageNum,
            eachFetch: this.oneShowCount
          })).data
        } else if (this.showType === 'axosmodule') {
          data = (await getAxosModule({
            pageNum: pageNum,
            eachFetch: this.oneShowCount
          })).data
        } else if (this.showType === 'examodule') {
          data = (await getExaModule({
            pageNum: pageNum,
            eachFetch: this.oneShowCount
          })).data
        }
        console.log('fetch page ' + pageNum)
        if (data && data.code === 200) {
          if (data.message) {
            needPage =
              Math.floor(data.message.totalCount / this.oneShowCount) + 1
            pageNum++
            if (this.showType === 'axoscard' || this.showType === 'exacard') {
              for (let ii = 0; ii < data.message.res.length; ii++) {
                const dataItem = []
                for (const key in data.message.res[ii]) {
                  dataItem.push(data.message.res[ii][key])
                }
                csvData.push(dataItem)
              }
            } else {
              for (let ii = 0; ii < data.message.res.length; ii++) {
                const dataItem = []
                for (const key in data.message.res[ii]) {
                  dataItem.push(data.message.res[ii][key])
                }
                csvData.push(dataItem)
              }
            }
            if (header.length === 0) {
              for (const key in data.message.res[0]) {
                header.push(key)
              }
            }
            this.exportPerc = Math.floor(pageNum * 100 / needPage)
            if (pageNum > needPage) {
              break
            }
          } else {
            break
          }
        } else {
          break
        }
      }
    } catch (e) {
      this.$message({
        showClose: true,
        message: 'export failed',
        type: 'warning'
      })
    }

    if (csvData.length > 0) {
      CsvExportor.downloadCsv(csvData, { header }, this.showType + '.csv')
      this.$message({
        showClose: true,
        message: 'export success',
        type: 'success'
      })
    }
    this.dialogVisible = false
  }

  private async exportText() {
    // const tableData = [['1'], '2', '3']
    // const header = ['坐标lng', '坐标lat', '地址']
    // CsvExportor.downloadCsv(tableData, { header }, 'test.csv')
    let data
    let pageNum = 1
    let needPage = 0
    const csvData = []
    const header: string[] = []
    while (true && pageNum < 20) {
      if (this.showType === 'axoscard') {
        data = (
          await getAxosCard({ pageNum: pageNum, eachFetch: this.oneShowCount })
        ).data
      } else if (this.showType === 'exacard') {
        data = (
          await getExaCard({ pageNum: pageNum, eachFetch: this.oneShowCount })
        ).data
      } else if (this.showType === 'axosont') {
        data = (await getAxosOnt({
          pageNum: pageNum,
          eachFetch: this.oneShowCount
        })).data
      } else if (this.showType === 'exaont') {
        data = (await getExaOnt({
          pageNum: pageNum,
          eachFetch: this.oneShowCount
        })).data
      } else if (this.showType === 'axosmodule') {
        data = (await getAxosModule({
          pageNum: pageNum,
          eachFetch: this.oneShowCount
        })).data
      } else if (this.showType === 'examodule') {
        data = (await getExaModule({
          pageNum: pageNum,
          eachFetch: this.oneShowCount
        })).data
      }

      if (data && data.code === 200) {
        if (data.message) {
          needPage =
            Math.floor(data.message.totalCount / this.oneShowCount) + 1
          pageNum++
          if (this.showType === 'axoscard' || this.showType === 'exacard') {
            for (let ii = 0; ii < data.message.res.length; ii++) {
              const dataItem = []
              for (const key in data.message.res[ii]) {
                dataItem.push(data.message.res[ii][key])
              }
              csvData.push(dataItem)
            }
          } else {
            for (let ii = 0; ii < data.message.res.length; ii++) {
              const dataItem = []
              for (const key in data.message.res[ii]) {
                dataItem.push(data.message.res[ii][key])
              }
              csvData.push(dataItem)
            }
          }
          if (header.length === 0) {
            for (const key in data.message.res[0]) {
              header.push(key)
            }
          }
          if (pageNum > needPage) {
            break
          }
        } else {
          break
        }
      } else {
        break
      }
    }
    if (csvData.length > 0) {
      this.downloadText(csvData, header, this.showType + '.txt')
    }
  }

  private async downloadText(txtData:string[][], header:string[], fileName:string) {
    const maxLen:number[] = []
    let strOut = ''
    for (let ii = 0; ii < header.length; ii++) {
      maxLen.push(header[ii].length)
    }

    for (let ii = 0; ii < txtData.length; ii++) {
      for (let jj = 0; jj < txtData[ii].length; jj++) {
        if (maxLen[jj] < txtData[ii][jj].length) {
          maxLen[jj] = txtData[ii][jj].length
        }
      }
    }

    let headerStr = ''
    let brokenLine = ''
    for (let ii = 0; ii < header.length; ii++) {
      headerStr += printf(`%-${maxLen[ii]}s `, header[ii])
      brokenLine += '-'.repeat(maxLen[ii]) + ' '
    }
    strOut += headerStr + '\r\n'
    strOut += brokenLine + '\r\n'

    for (let ii = 0; ii < txtData.length; ii++) {
      let contentLine = ''
      for (let jj = 0; jj < txtData[ii].length && jj < maxLen.length; jj++) {
        contentLine += printf(`%-${maxLen[jj]}s `, (txtData[ii][jj] === '') ? '-' : txtData[ii][jj])
      }
      strOut += contentLine + '\r\n'
    }

    const exportBob = new Blob([strOut])
    const saveLink = document.createElement('a')
    saveLink.href = window.URL.createObjectURL(exportBob)
    saveLink.download = fileName
    const ev = document.createEvent('MouseEvents')
    ev.initMouseEvent(
      'click',
      true,
      false,
      window,
      0,
      0,
      0,
      0,
      0,
      false,
      false,
      false,
      false,
      0,
      null
    )
    saveLink.dispatchEvent(ev)
  }
}
</script>
