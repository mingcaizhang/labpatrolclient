<template>
  <div class="xcommand">
    <el-tabs v-model="activeName">
      <el-tab-pane label="device" name="device">
    <el-row>
  <el-col :span=4><div ><el-tag>IP List</el-tag></div></el-col>
  <el-col :span=3><div ><el-tag>Command List</el-tag></div></el-col>
  <el-col :span=2><el-checkbox v-model="exaCardChk">EXA</el-checkbox> </el-col>   
  <el-col :span=2><el-checkbox v-model="shellChk">Shell Cmd</el-checkbox> </el-col>   
</el-row>    
    <el-row>
      <el-col :span=4>       
         <el-input
          placeholder=""
          v-model="ipListStr"
          type="textarea"
          rows="100"
        ></el-input> 
     </el-col>     
      <el-col :span=16>       
         <el-input
          placeholder=""
          v-model="commandListStr"
          type="textarea"
          rows="100"
        ></el-input> 
     </el-col>  

         </el-row>
      </el-tab-pane>
      <el-tab-pane label="result" name="result">
        <el-button @click="webSocketConnect" :disabled='execDisable'>Exec </el-button>
        <p>{{resultInfo}}</p>
        <el-table :data="tableData" style="width: 100%">
          <el-table-column prop="ip" label="Ip" width="180">
          </el-table-column>
          <el-table-column prop="response" label="Response" width='1000'>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Watch } from 'vue-property-decorator'


import store from '@/store'

export enum WSBunchCmdsMessgeID  {
    WSBunchMessgeID_Cmds_Request = 1,
    WSBunchMessgeID_Cmds_Response = 2,
    WSBunchMessgeID_Cmds_Res_Finish = 3,
    WSBunchMessgeID_Cmds_Res_Pend = 4
}

export enum LabPatroType {
    LabPatrolType_AXOSCard = 0x1,
    LabPatrolType_E7Card = 0x2,
    LabPatrolType_ONT = 0x4,    
    LabPatrolType_Module = 0x8,
}

export enum CommandType {
    CommandType_CLI = 1,
    CommandType_SHELL =2,
}

export interface BunchCommands {
    cardType: LabPatroType
    cmdType: CommandType
    ipList: string []
    cmdList: string[]
}

interface WSBunchCmdsRequest {
    msgId: number
    cmds: BunchCommands
}

export interface WSBunchCmdsResponse {
    msgId: number
    cmds?: BunchCommands
    res: {ipAddr:string, response:string}
}

@Component({
  name: 'XCommand',
})

export default class XCommand extends Vue {
  private wsSocket: WebSocket | undefined = undefined;
  // private ipListStr = '10.245.34.155\n10.245.34.156\n10.245.34.133\n';
  private ipListStr = ''
  private commandListStr = 'show card\nshow version\n'
  private activeName = 'device'
  private ipList:string[] = []
  private cmdList:string[] = []
  private ipResList:string[] = []
  private tableData:any[] = []
  private execDisable = false
  private resultInfo = ''
  private wsTimerHandle:NodeJS.Timeout | undefined = undefined
  private shellChk = false
  private exaCardChk = false

  created(): void {
    console.log('XCommand created ')
    this.ipListStr = this.$store.state.xCommandIpList.join('\r\n')
    if (this.$store.state.xCardType === 'exa') {
      this.exaCardChk = true
    }else {
      this.exaCardChk = false
    }
  }

  setResultInfo(res:string) {
    this.resultInfo = res
  }

  execDisableSet(disable:boolean) {
    this.execDisable = disable
  }
  // @Watch('ipListStr')
  // onChangeValue(newVal: string, oldVal: string) {
  //   console.log('iplist changed')
  // }

  // get ipListStr() {
  //   return this.$store.state.xCommandIpList.join('\r\n')
  // }

  // set ipListStr(value) {
    
  // }

  async webSocketConnect() {
    if (this.wsSocket) {
      this.wsSocket.close();
    }
    try {
      this.ipList = this.ipListStr.replaceAll('\r','').split('\n')
      this.cmdList = this.commandListStr.replaceAll('\r','').split('\n')
      this.$store.commit('setXCmdIpList', this.ipList)
      this.$store.commit('setXCardType', this.exaCardChk? 'exa':'axos')
      this.ipResList =[]
      this.tableData = []
    }catch(e) {
      this.setResultInfo('error to prase ip or command')
      return
    }

    if (this.ipList.length === 0 || this.cmdList.length === 0) {
      this.setResultInfo('please input correct ip and command')
      return
    }

    try {
      
      // this.$store.commit('setXCmdIpList', ["10.245.34.155", "10.245.34.156"])
      // console.log(this.$store.state.xCommandIpList)
      // this.ipList = this.$store.state.xCommandIpList
      this.execDisableSet(true)
      this.wsSocket = new WebSocket("ws://localhost:8081");
      this.wsSocket.onopen = this.webSocketOnOpen;
      this.wsSocket.onmessage = this.webSocketOnMsg;
      this.wsSocket.onclose = this.webSocketOnClose;
      this.wsSocket.onerror = this.webSocketOnError
      this.wsConnectTimerStart()
    } catch (e) {
      this.setResultInfo('error to connect the server')
      this.execDisableSet(false)
    }
  }

  webSocketOnOpen() {
    this.setResultInfo('Server connected')
    let wsRequest: WSBunchCmdsRequest = {
        msgId: WSBunchCmdsMessgeID.WSBunchMessgeID_Cmds_Request,
        cmds: {
            ipList: this.ipList,
            cmdList:this.cmdList,
            cardType: this.exaCardChk? LabPatroType.LabPatrolType_E7Card: LabPatroType.LabPatrolType_AXOSCard,
            cmdType: this.shellChk? CommandType.CommandType_SHELL: CommandType.CommandType_CLI
        }
    }    
    
    if (this.wsSocket) {
      this.wsSocket.send(JSON.stringify(wsRequest))
    }
  }

  wsConnectTimerStart() {
    if (this.wsTimerHandle === undefined) {
      this.wsTimerHandle = setTimeout(()=>{
        if (this.wsSocket) {
          this.wsSocket.close()
          this.execDisableSet(false)
        }
      }, 10000)
    }else {
      clearTimeout(this.wsTimerHandle)
      this.wsTimerHandle = setTimeout(()=>{
        if (this.wsSocket) {
          this.wsSocket.close()
          this.execDisableSet(false)
        }
      }, 10000)
    }
  }

  wsConnectTimerStop() {
    if (this.wsTimerHandle) {
      clearTimeout(this.wsTimerHandle)
      this.wsTimerHandle = undefined
    }
  }

  webSocketOnClose(e: CloseEvent) {
    this.execDisableSet(false)
    console.log(e);
  }

  webSocketOnError(e: Event) {
    this.setResultInfo('web server error')
    this.execDisableSet(false)
  }
  
  webSocketOnMsg(e: MessageEvent) {

    let res:WSBunchCmdsResponse = JSON.parse(e.data.toString())
    if (!res) {
        return
    }

    switch(res.msgId) {
        case WSBunchCmdsMessgeID.WSBunchMessgeID_Cmds_Response:
            this.tableData.push({
              'ip':res.res.ipAddr,
              'response':  res.res.response
            })
            this.ipResList.push(res.res.ipAddr)
            this.setResultInfo(`total device ${this.ipList.length} total response ${this.ipResList.length}`)
            this.wsConnectTimerStart()
            // console.log(res.res.response)
            break
        case WSBunchCmdsMessgeID.WSBunchMessgeID_Cmds_Res_Finish:
            this.setResultInfo(`total device ${this.ipList.length} total response ${this.ipResList.length} done!`)
            this.execDisableSet(false)
            this.wsSocket?.close()
            this.wsSocket = undefined
            this.wsConnectTimerStop()
            break
        case WSBunchCmdsMessgeID.WSBunchMessgeID_Cmds_Res_Pend:
            this.setResultInfo(res.res.response)
            this.wsConnectTimerStop()
            break
        default:
            break
    }
  }
}
</script>

<style>
 .xcommand .el-table td,
  .xcommand .el-table th.is-leaf,
  .xcommand .el-table--border,
  .xcommand .el-table--group {
    border: none;
    cursor: pointer;
  }
  .xcommand .el-table::before {
    height: 0;
  }
.xcommand .el-table .cell {
white-space: pre-line;
}    
</style>
