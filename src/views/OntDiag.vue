<template>
  <div class="ontdiag">
    <div>
      <el-row :align="bottom">
        <el-col :span="4"
          ><div>
            <el-input placeholder="" v-model="ipStr">
              <template slot="prepend">IpAddr</template>
            </el-input>
          </div></el-col
        >
        <el-col :span="3"
          ><el-select v-model="checkOnt" placeholder="Ont" :allow-create=true :filterable=true>
            <el-option
              v-for="item in ontlist"
              :key="item.ontId"
              :label="item.ontId"
              :value="item.ontId"
            >
            <span style="float: left">{{ item.ontId }}</span>
            <span style="float: right; color: #8492a6; font-size: 13px">{{ item.state === 'present'? '*' + item.linkPon: item.linkPon}}</span>
            </el-option> </el-select
        ></el-col>
        <el-col :span="2"
          ><el-button @click="getOnts">GetOnts</el-button>
        </el-col>
        <el-col :span="3"
          ><el-button @click="ontPortrait">OntPortrait</el-button>
        </el-col>
        <el-col :span="2">
          <el-checkbox v-model="forceRebuild">forcerebuild</el-checkbox>
        </el-col>
          <el-col :span="10"> <p>{{ resultInfo }}</p>
        </el-col>
      </el-row>
    </div>
    <div>
      <svg width="1900" height="1000"></svg>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Watch } from "vue-property-decorator";
import {
  DiagOntIfPortrait,
  DiagOntPortrait,
  DiagOltPortPortrait,
  DiagOltPortrait,
  DiagFlowPortrait,
  DiagCompose,
  DiagCardPos,
  DiagWSHeader,
  DiagWSMsgType,
  DiagWSMsgAllOntReq,
  DiagWSMsgAllOntRes,
  DiagWSMsgOntDiagReq,
  DiagWSMsgOntDiagRes,
  DiagFlowIngressQos,
  DiagFlowEgressQos,
  DiagWSMsgOntFlowStatsRes,
  DiagOntAllFlowStats,
  DiagOntLink,
  DiagWSMsgOntFlowStatsReq
} from "@/utils/DiagPub"

import * as d3 from "d3"
import { timer } from "d3";


interface DiagRectRec {
  x: number,
  y: number,
  width: number,
  height: number,
  name: string,
  color?: string,
  rectType?: DiagRectType
}

interface DiagOltCardRectRec extends DiagRectRec {
  cardPos: DiagCardPos
}

interface DiagBpVlanRectRec extends DiagRectRec {
  cardPos: DiagCardPos,
  vlan: number
}

interface DiagOltPortRectRec extends DiagRectRec {
  cardPos: DiagCardPos
}

interface DiagPoint {
  x: number,
  y: number,
  pointType?: FlowPointType
}

enum DiagRectType {
  DiagRectTypeNone = 1,
  DiagRectTypeOnt,
  DiagRectTypeOntUni,
  DiagRectTypeOntVeip,
  DiagRectTypeOntInter,
  DiagRectTypeOltPon,
  DiagRectTypeOltPonBackend,
  DiagRectTypeOlt,
  DiagRectTypeOltEther,
}

enum FlowPointType {
  FlowPointTypeNone,
  FlowPointTypeOntUni = 1,
  FlowPointTypeOntVeip,
  FlowPointTypeOntInter,
  FLowPointTypeOltPon,
  FlowPointTypeOltPonBackend,
  FLowPointTypeOltBackplaneIngress,
  FLowPointTypeOltBackplaneEgress,
  FlowPointTypeOltOutEther,
}

interface DiagPointTree {
  node: DiagPoint[],
  splitTree?: DiagPointTree[]
}

interface DiagFlowPath {
  flowId: number,
  nodes: DiagPointTree
}

interface DiagFlowDirectPath {
  flowId: number,
  nodes: DiagPoint[]
}

interface DiagLine {
  start:DiagPoint,
  end:DiagPoint,
  name:string,
  label:string,
  labelPos:DiagPoint,
  labelRotate:number
  key:string
}

interface DiagLable {
  name: string
  label: string
  labelPos:DiagPoint,
  labelRotate:number
}
@Component({
  name: "OntDiag",
})
export default class OntDiag extends Vue {
  private ontPortDef = { wid: 30, hei: 40 }
  private ontDef = { wid: 200, hei: 300 }
  private ponPortDef = { wid: 100, hei: 300 }
  private oltDef = { wid: 200, hei: 350 }
  private oltEtherPortDef = { wid: 20, hei: 20 }
  private oltBpVlanRecDef = { wid: 40, hei: 20 }
  private ontOltDist = 200
  private svgWid = 1200
  private svgHei = 1000
  private rightMarigin = 100
  private oltDistY = 100
  private oltDistX = 150
  private tContFlowStartY = 15
  private tContInterVal = 20   // interval between each bunch tcont flows
  private tcontFlowMaxInterval = 30
  private portColorDef = {
    green: "#92D050",
    grey: "#AFABAB",
    red: "#C00000",
    blue: "#8FAADC",
    yellow: "#FCE170",
    greywhite:"#C0C0C0"
  };
  private ipStr: string = "10.245.34.156"
  private ontlist: DiagOntLink[] = []
  private checkOnt: string = ""
  private execOnt:string = ""
  private wsSocket: WebSocket | undefined = undefined
  private wsConnected:boolean = false
  private webSocketIp = '127.0.0.1' // '10.245.251.172' 
  private resultInfo: string = ""
  private execType: "Onts" | "OntPortrait" |"OntFlowStats" | "none" = "none"
  private statInterHandler:NodeJS.Timer|undefined
  private forceRebuild = false
  async getOnts() {
    this.execType = 'Onts'
    if (!this.wsSocket) {
      await this.webSocketConnect() 
    }else {
      if (this.statInterHandler) {
        clearInterval(this.statInterHandler)
      } 
      this.webSocketMsgSend(this.execType)     
    }
  }

  async ontPortrait() {
    this.execType = 'OntPortrait'
    this.execOnt = this.checkOnt
    if (!this.wsSocket) {
      await this.webSocketConnect() 
    }else {
      if (this.statInterHandler) {
        clearInterval(this.statInterHandler)
      }
      this.webSocketMsgSend(this.execType)
    }
  }

  async OntFlowStat() {
    this.execType = 'OntFlowStats'
     if (!this.wsSocket) {
       console.log('WSocket not connected')
       if (this.statInterHandler) {
         clearInterval(this.statInterHandler)
       }
     }else {
        this.webSocketMsgSend('OntFlowStats')
     }
  }

  async webSocketConnect() {
    if (this.wsSocket) {
      // this.wsSocket.close();
      return
    }

    try {
      this.wsSocket = new WebSocket(`ws://${this.webSocketIp}:8082`);
      this.wsSocket.onopen = this.webSocketOnOpen;
      this.wsSocket.onmessage = this.webSocketOnMsg;
      this.wsSocket.onclose = this.webSocketOnClose;
      this.wsSocket.onerror = this.webSocketOnError;
    } catch (e) {
      this.setResultInfo("error to connect the server");
    }
  }

  webSocketMsgSend(execType:string) {
    let wsRequest = undefined;
    do {
      if (execType=== "Onts") {
        wsRequest = {
          header: { cmdId: DiagWSMsgType.DiagWSMsgTypeAllOntREQ, resCode: 0 },
          ipAddr: this.ipStr,
        } as DiagWSMsgAllOntReq;
      } else if (execType === "OntPortrait") {
        if (this.execOnt === "") {
          this.setResultInfo("no select Ont");
          break;
        }
        wsRequest = {
          header: { cmdId: DiagWSMsgType.DiagWSMsgTypeOntDiagREQ, resCode: 0 },
          ipAddr: this.ipStr,
          ontId: this.execOnt,
          forceOlt:this.forceRebuild,
          forceOnt:this.forceRebuild
        } as DiagWSMsgOntDiagReq;
      } else if (execType === 'OntFlowStats') {
         if (this.execOnt === "") {
          this.setResultInfo("no select Ont");
          break;
        }
        wsRequest = {
          header: { cmdId: DiagWSMsgType.DiagWSMsgTypeOntFlowStatREQ, resCode: 0 },
          ontId: this.execOnt,
        } as DiagWSMsgOntFlowStatsReq;       
      }else {
        
      }
    } while (0);
    if (this.wsSocket && wsRequest) {
      this.setResultInfo(`sent request ${this.execType} wait response ...`)
      this.wsSocket.send(JSON.stringify(wsRequest));
    }else {
      // this.wsSocket?.close()
    }    
  }

  webSocketOnOpen() {
    let wsRequest = undefined;
    this.wsConnected = true
    do {
      this.setResultInfo("Server connected");
      if (this.ipStr === "") {
        this.setResultInfo("invalid ip address");
        break;
      }

      this.webSocketMsgSend(this.execType)
    } while (0);

  }

  setResultInfo(res: string) {
    this.resultInfo = res;
  }

  webSocketOnClose(e: CloseEvent) {
    console.log(e);
    this.wsSocket = undefined
    this.wsConnected = false
  }

  webSocketOnError(e: Event) {
    this.setResultInfo("web server error");
    this.wsSocket = undefined
    this.wsConnected = false
    if (this.statInterHandler) {
      clearInterval(this.statInterHandler)
    }
  }

  webSocketOnMsg(e: MessageEvent) {
    let res = JSON.parse(e.data.toString());
    console.log(res)
    if (!res) {
      return;
    }

    switch (res.header.cmdId) {
      case (DiagWSMsgType.DiagWSMsgTypeAllOntRES):
        this.setResultInfo(`${this.execType} response`)
        let ontsRes = res as unknown as DiagWSMsgAllOntRes
        if (ontsRes.header.resCode === -1) {
          this.setResultInfo(`${this.execType} response error`)
        }
        this.ontlist = []
        this.ontlist.push(...ontsRes.ontList)
        break
      case DiagWSMsgType.DiagWSMsgTypeOntDiagRES:
        this.setResultInfo(`OntPortrait response`)
        let diagRes = res as unknown as DiagWSMsgOntDiagRes
        if (diagRes.OntCompose) {
          this.testDrawWithQos(diagRes.OntCompose, true)
        }else {
          if (diagRes.header.resCode === -1) {
            this.setResultInfo('Ont portrait respone error')
          }else {
            this.setResultInfo('Ont portrait none')
          }
        }
        break
      case DiagWSMsgType.DiagWSMsgTypeOntFlowStatRES:
        this.setResultInfo(`OntFlowStats response`)
         let diagStatRes = res as unknown as DiagWSMsgOntFlowStatsRes
        if (diagStatRes.flowStats) {
          this.updateOntFlowSpeed(diagStatRes.flowStats)
        }else {
          // this.setResultInfo('Ont stats arriva')
        }       
        
        break
      default:
        break
    }
    // this.wsSocket?.close()
    // this.wsSocket = undefined
  }
  buildTestData() {
    let ontOutIf: DiagOntIfPortrait[] = [
      {
        ifname: "g1",
        veipIf: "",
        adminState: "enable",
        operState: "up",
      },
      {
        ifname: "g2",
        veipIf: "G1",
        adminState: "disable",
        operState: "down",
      },
      {
        ifname: "g3",
        veipIf: "",
        adminState: "enable",
        operState: "down",
      },
    ];

    let ontInIf: DiagOntIfPortrait[] = [
      {
        ifname: "i0",
        veipIf: "",
        adminState: "enable",
        operState: "up",
      },
      {
        ifname: "i1",
        veipIf: "",
        adminState: "enable",
        operState: "up",
      },
    ];


    let veipIf: DiagOntIfPortrait[] = [
      {
        ifname: "F1",
        veipIf: "",
        adminState: "enable",
        operState: "up",
      },
      {
        ifname: "G1",
        veipIf: "",
        adminState: "enable",
        operState: "up",
      },
    ];
    let ont: DiagOntPortrait = {
      ontId: "onttest",
      state:"present",
      ontOutInterface: ontOutIf,
      ontInInterface: ontInIf,
      ontVeipInterface:veipIf,
      connPon: "1/1/gp1",
    };

    let ingQos:DiagFlowIngressQos = {
     provCir:1000,
     provEir:1000,
     ponCos:'cos-1', 
     dbaPriority:"be4", 
     ponCosCir:0,
     ponCosAir:2000,
     ponCosEir:2000     
    }
    let ingQos1:DiagFlowIngressQos = {
     provCir:1000,
     provEir:1000,
     ponCos:'cos-2', 
     dbaPriority:"AF2", 
     ponCosCir:0,
     ponCosAir:2000,
     ponCosEir:2000     
    }

    let egrQos:DiagFlowEgressQos = {
      minimum:0,
      minBurst:0,
      maximum:0,
      maxBurst:0,
      schedulingType:'wrr',
      weight:0,
      queueDep:0,
      discardPolicy:'wrr', 
      bwp:'null',
      minParentCos:'null',
      maxParentCos:'null'

    }

    let ontFlow: DiagFlowPortrait[] = [
      {
        flowId: 1,
        key:'',
        ontId: "onttest",
        ontPort: "g1",
        match: ["vlan 10"],
        ontOutVlan: 10,
        gemId: [133],
        oltPonPort: "1/1/gp1",
        tid: [21],
        oltOutVlan: 1021,
        oltVlanAction: "add",
        oltOutPorts: [
          {
            shelf: 1,
            slot: 1,
            ifname: "x1",
          },
        ],
        ingressQos:[ingQos],
        egressQos:[egrQos],
        interPon:0 
      },
      {
        flowId: 2,
        key:'',
        ontId: "onttest",
        ontPort: "g3",
        match: ["vlan 30"],
        ontOutVlan: 30,
        gemId: [134],
        oltPonPort: "1/1/gp1",
        tid: [22],
        oltOutVlan: 1022,
        oltVlanAction: "add",
        oltOutPorts: [
          {
            shelf: 1,
            slot: 2,
            ifname: "x3",
          },
        ],
        ingressQos:[ingQos1],
        egressQos:[egrQos],
        interPon:0 
      },
      {
        flowId: 4,
        key:'',
        ontId: "onttest",
        ontPort: "i1",
        match: ["vlan 40"],
        ontOutVlan: 50,
        gemId: [136],
        oltPonPort: "1/1/gp1",
        tid: [23],
        oltOutVlan: 1023,
        oltVlanAction: "add",
        oltOutPorts: [
          {
            shelf: 1,
            slot: 2,
            ifname: "x3",
          },
        ],
        ingressQos:[ingQos],
        egressQos:[egrQos],
        interPon:0 
      },
      {
        flowId: 5,
        key:'',
        ontId: "onttest",
        ontPort: "g1",
        match: ["vlan 100"],
        ontOutVlan: 100,
        gemId: [133],
        oltPonPort: "1/1/gp1",
        tid: [21],
        oltOutVlan: 1023,
        oltVlanAction: "add",
        oltOutPorts: [
          {
            shelf: 1,
            slot: 1,
            ifname: "x1",
          },
        ],
        ingressQos:[ingQos1],
        egressQos:[egrQos],
        interPon:0 
      },
    ];

    let olt1EtherPorts: DiagOltPortPortrait[] = [
      {
        shelf: 1,
        slot: 1,
        ifname: "x1",
        adminState: "enable",
        operState: "up",
      },
      {
        shelf: 1,
        slot: 1,
        ifname: "x2",
        adminState: "enable",
        operState: "up",
      },
      {
        shelf: 1,
        slot: 1,
        ifname: "x3",
        adminState: "enable",
        operState: "up",
      },
      {
        shelf: 1,
        slot: 1,
        ifname: "x4",
        adminState: "enable",
        operState: "up",
      },
    ];

    let olt2EtherPorts: DiagOltPortPortrait[] = [
      {
        shelf: 1,
        slot: 2,
        ifname: "x1",
        adminState: "enable",
        operState: "up",
      },
      {
        shelf: 1,
        slot: 2,
        ifname: "x2",
        adminState: "enable",
        operState: "up",
      },
      {
        shelf: 1,
        slot: 2,
        ifname: "x3",
        adminState: "enable",
        operState: "up",
      },
      {
        shelf: 1,
        slot: 2,
        ifname: "x4",
        adminState: "enable",
        operState: "down",
      },
    ];

    let oltCards: DiagOltPortrait[] = [
      {
        shelf: 1,
        slot: 1,
        ponPorts: [],
        ethPorts: olt1EtherPorts,
      },
      {
        shelf: 1,
        slot: 2,
        ponPorts: [],
        ethPorts: olt2EtherPorts,
      },
    ];

    let diagCom: DiagCompose = {
      olts: oltCards,
      ont: ont,
      flows: ontFlow,
    };
    return diagCom;
  }

  buildTestData2() {
    let str = {
      olts: [
        {
          shelf: 1,
          slot: 1,
          ponPorts: [],
          ethPorts: [
            {
              shelf: 1,
              slot: 1,
              ifname: "q1",
              adminState: "disable",
              operState: "down",
            },
            {
              shelf: 1,
              slot: 1,
              ifname: "q2",
              adminState: "disable",
              operState: "down",
            },
            {
              shelf: 1,
              slot: 1,
              ifname: "q3",
              adminState: "disable",
              operState: "down",
            },
            {
              shelf: 1,
              slot: 1,
              ifname: "q4",
              adminState: "disable",
              operState: "down",
            },
            {
              shelf: 1,
              slot: 1,
              ifname: "x1",
              adminState: "enable",
              operState: "down",
            },
            {
              shelf: 1,
              slot: 1,
              ifname: "x2",
              adminState: "disable",
              operState: "down",
            },
            {
              shelf: 1,
              slot: 1,
              ifname: "x3",
              adminState: "enable",
              operState: "up",
            },
            {
              shelf: 1,
              slot: 1,
              ifname: "x4",
              adminState: "enable",
              operState: "up",
            },
          ],
        },
      ],
      ont: {
        ontId: "836",
        connPon: "1/1/xp5",
        ontOutInterface: [
          { ifname: "g1", veipIf: "", adminState: "enable", operState: "up" },
          { ifname: "g2", veipIf: "", adminState: "enable", operState: "down" },
          {
            ifname: "g3",
            veipIf: "F1",
            adminState: "enable",
            operState: "down",
          },
          {
            ifname: "g4",
            veipIf: "G1",
            adminState: "disable",
            operState: "down",
          },
        ],
        ontInInterface: [],
        
      },
      flows: [
        {
          flowId: 1,
          ontId: "836",
          ontPort: "g1",
          match: [],
          ontOutVlan: 1021,
          gemId: [],
          oltPonPort: "",
          tid: [],
          oltOutVlan: 1021,
          oltVlanAction: "none",
          oltOutPorts: [
            { shelf: 1, slot: 1, ifname: "q3" },
            { shelf: 1, slot: 1, ifname: "x3" },
            { shelf: 1, slot: 1, ifname: "x4" },
          ],
        },
      ],
    };
    return str;
  }

  testDrawWithQos(diagCom:DiagCompose|undefined = undefined, withFlowStat:boolean=false) {
    if (!diagCom) {
      diagCom = this.buildTestData();
    }
    let heiMid = this.svgHei / 2;
    let startX = this.svgWid - this.rightMarigin;
    let ontRect: DiagRectRec = {
      x: startX - this.ontDef.wid,
      y: heiMid - this.ontDef.hei / 2,
      width: this.ontDef.wid,
      height: this.ontDef.hei,
      name: diagCom.ont.ontId,
    };
    let ontOutIntfRect: DiagRectRec[] = [];
    let ontInIntfRect: DiagRectRec[] = [];
    let ontVeipRect: DiagRectRec[] = [];
    let ontPortRect: DiagRectRec[] = [];
    let oltRects: DiagOltCardRectRec[] = [];
    let oltEthPortRect: DiagOltPortRectRec[][] = [];
    let ponPortRect: DiagRectRec = {
      x: ontRect.x - this.ontOltDist - this.ponPortDef.wid,
      y: heiMid - this.ponPortDef.hei / 2,
      width: this.ponPortDef.wid,
      height: this.ponPortDef.hei,
      name: diagCom.ont.connPon,
    };

    let oltPonBackend: DiagRectRec = {
      x: ponPortRect.x - this.oltDef.wid,
      y: heiMid - this.oltDef.hei / 2,
      width: this.oltDef.wid,
      height: this.oltDef.hei,
      name: "",
    };
    d3.select('svg').select('g').remove()

    let ontg = d3.select("svg").append("g");

    ontg
      .append("rect")
      .attr("x", ontRect.x)
      .attr("y", ontRect.y)
      .attr("width", ontRect.width)
      .attr("height", ontRect.height)
      .attr("class", "ont")
      .attr("fill", ()=>{
        if (diagCom?.ont.state === 'present') {
          return this.portColorDef.blue
        }else {
          return this.portColorDef.greywhite
        }
        

      });

    ontg
      .append("text")
      .attr("x", ontRect.x)
      .attr("y", ontRect.y + 20)
      .attr("class", "ont")
      .attr("fill", "white")
      .text(ontRect.name);

    let posX = ontRect.x + ontRect.width - this.ontPortDef.wid / 2;
    let posYStart = ontRect.y;
    let yInterVal =
      ontRect.height /
      (diagCom.ont.ontOutInterface.length +
        diagCom.ont.ontInInterface.length +
        1);
    for (let ii = 0; ii < diagCom.ont.ontOutInterface.length; ii++) {
      let color;
      if (diagCom.ont.ontOutInterface[ii].adminState === "disable") {
        color = this.portColorDef.grey;
      } else {
        if (diagCom.ont.ontOutInterface[ii].operState === "up") {
          color = this.portColorDef.green;
        } else {
          color = this.portColorDef.red;
        }
      }

      let intfRect: DiagRectRec = {
        x: posX,
        y: posYStart + yInterVal * (ii + 1) - this.ontPortDef.hei / 2,
        width: this.ontPortDef.wid,
        height: this.ontPortDef.hei,
        name: diagCom.ont.ontOutInterface[ii].ifname,
        rectType: DiagRectType.DiagRectTypeOntUni,
        color: color,
      };
      ontOutIntfRect.push(intfRect);
    }

    let interStart = diagCom.ont.ontOutInterface.length;
    posX = ontRect.x + ontRect.width / 2 - this.ontPortDef.wid / 2;
    for (let ii = 0; ii < diagCom.ont.ontInInterface.length; ii++) {
      let color;
      if (diagCom.ont.ontInInterface[ii].adminState === "disable") {
        color = this.portColorDef.grey;
      } else {
        color = this.portColorDef.green;
      }
      let intfRect: DiagRectRec = {
        x: posX,
        y:
          posYStart +
          yInterVal * (ii + interStart + 1) -
          this.ontPortDef.hei / 2,
        width: this.ontPortDef.wid,
        height: this.ontPortDef.hei,
        name: diagCom.ont.ontInInterface[ii].ifname,
        rectType: DiagRectType.DiagRectTypeOntInter,
        color: color,
      };
      ontInIntfRect.push(intfRect);
    }

    // ======= deduce the veip===
    let veip = new Set<string>();
    for (let ii = 0; ii < diagCom.ont.ontOutInterface.length; ii++) {
      if (diagCom.ont.ontOutInterface[ii].veipIf != "") {
        veip.add(diagCom.ont.ontOutInterface[ii].veipIf);
      }
    }

    // Add to veip ports if the veip interface has service provision
    for (let oo of diagCom.ont.ontVeipInterface) {
      for (let flow of diagCom.flows) {
        if (flow.ontPort === oo.ifname) {
          veip.add(oo.ifname)
        }
      }
    }


    if (veip.size > 0) {
      posX = ontRect.x + ontRect.width / 2 - this.ontPortDef.wid / 2;
      posYStart = ontRect.y;
      yInterVal =
        (yInterVal * (diagCom.ont.ontOutInterface.length + 1)) /
        (veip.size + 1);
      let idx = 0;
      for (let item of veip) {
        let intfRect: DiagRectRec = {
          x: posX,
          y: posYStart + yInterVal * (idx + 1) - this.ontPortDef.hei / 2,
          width: this.ontPortDef.wid,
          height: this.ontPortDef.hei,
          name: item,
          rectType: DiagRectType.DiagRectTypeOntVeip,
          color: this.portColorDef.green,
        };
        idx++;
        ontVeipRect.push(intfRect);
      }
    }

    // ======================== ont  port==============
    let ontPort = [...ontInIntfRect, ...ontOutIntfRect, ...ontVeipRect];
    ontPortRect = ontPort;
    ontg
      .selectAll("rect.ontoutport")
      .data(ontPort)
      .enter()
      .append("rect")
      .classed("ontoutport", true)
      .attr("x", function (d, i) {
        // console.log('x ' + ontRect[0][2])
        return (d as DiagRectRec).x;
      })
      .attr("y", function (d, i) {
        return (d as DiagRectRec).y;
      })
      .attr("width", function (d, i) {
        return (d as DiagRectRec).width;
      })
      .attr("height", function (d, i) {
        return (d as DiagRectRec).height;
      })
      .attr("fill", function (d, i) {
        return (d as DiagRectRec).color as string;
      });

    ontg
      .selectAll("text.ontoutport")
      .data(ontPort)
      .enter()
      .append("text")
      .classed("ontoutport", true)
      .attr("x", function (d, i) {
        // console.log('x ' + ontRect[0][2])
        return (d as DiagRectRec).x;
      })
      .attr("y", function (d, i) {
        return (d as DiagRectRec).y + ((d as DiagRectRec).height * 3) / 4; // experiment value 3/4
      })
      .text(function (d, i) {
        return (d as DiagRectRec).name;
      })
      .attr("fill", "white");
    // .style("font", "14px times")

    // ========================ONT ethport to veip port ====================
    let diagVeipLines:DiagLine[] = []
    for (let port of diagCom.ont.ontOutInterface) {
      if (port.veipIf != '') {
        let startP:DiagPoint | undefined = undefined
        let endP:DiagPoint | undefined = undefined
        for (let ethRect of ontOutIntfRect) {
          if (port.ifname === ethRect.name) {
            startP = {
              x:ethRect.x,
              y:ethRect.y + ethRect.height/2
            }
            break
          }
        }

        for (let veipRect of ontVeipRect) {
          if (veipRect.name === port.veipIf) {
            endP= {
              x:veipRect.x + veipRect.width,
              y:veipRect.y + veipRect.height/2
            }
          }
        }

        if (startP != undefined && endP != undefined) {
          diagVeipLines.push({
            start:{x:startP.x, y:startP.y},
            end:{x:endP.x, y:endP.y},
            label:'',
            name:'',
            labelPos:{x:0, y:0},
            labelRotate:0,
            key:""
          })
        }
      }
    }

    ontg.selectAll('line.veip').data(diagVeipLines).enter().append('line')
    .classed('veip', true)
    .attr("stroke", "steelblue")
    .attr("stroke-width", 1)
  .attr('x1', function(d, i) {return (d as DiagLine).start.x})
  .attr('y1', function(d, i) {return (d as DiagLine).start.y})
  .attr('x2', function(d, i) {return (d as DiagLine).end.x})
  .attr('y2', function(d,i) {return (d as DiagLine).end.y})
    // ======================== olt pon port and bankend olt==============
    let cardName = "";
    let res = /(\d+)\/(\d+)/.exec(ponPortRect.name);
    if (res) {
      cardName = res[0];
    }
    ontg
      .append("rect")
      .attr("x", ponPortRect.x)
      .attr("y", ponPortRect.y)
      .attr("width", ponPortRect.width)
      .attr("height", ponPortRect.height)
      .attr("class", "ponport")
      .attr("fill", this.portColorDef.blue)
      .style("stroke-width", 1)
      .style("stroke", "blue");
    ontg
      .append("text")
      .attr("x", ponPortRect.x)
      .attr("y", ponPortRect.y + 20)
      .attr("class", "ponport")
      .attr("fill", "white")
      .text(ponPortRect.name);

    ontg
      .append("rect")
      .attr("x", oltPonBackend.x)
      .attr("y", oltPonBackend.y)
      .attr("width", oltPonBackend.width)
      .attr("height", oltPonBackend.height)
      .attr("class", "ponbackend")
      .attr("fill", this.portColorDef.blue)
      .style("stroke-width", 1)
      .style("stroke", "blue");
    ontg
      .append("text")
      .attr("x", oltPonBackend.x)
      .attr("y", oltPonBackend.y + 20)
      .attr("class", "ponbackend")
      .attr("fill", "white")
      .text(cardName);

    // =============== draw OLT card ==============
    // temporarily max two cards
    if (diagCom.olts.length > 2) {
      console.log("max support two olt cards in temp");
      return;
    }
    let oltStartY = 0;
    let oltStartX = oltPonBackend.x - this.oltDistX - this.oltDef.wid;
    if (diagCom.olts.length % 2 === 1) {
      oltStartY = heiMid - this.oltDef.hei / 2;
      oltStartY -=
        (diagCom.olts.length / 2) * (this.oltDef.hei + this.oltDistY);
    } else {
      oltStartY =
        heiMid -
        (diagCom.olts.length / 2) * (this.oltDef.hei + this.oltDistY) +
        this.oltDistY / 2;
    }

    for (let ii = 0; ii < diagCom.olts.length; ii++) {
      let cardRef: DiagCardPos = {
        shelf: diagCom.olts[ii].shelf,
        slot: diagCom.olts[ii].slot,
      };
      let oltRect: DiagOltCardRectRec = {
        x: oltStartX,
        y: oltStartY + ii * (this.oltDef.hei + this.oltDistY),
        width: this.oltDef.wid,
        height: this.oltDef.hei,
        name: `${diagCom.olts[ii].shelf}/${diagCom.olts[ii].slot}`,
        cardPos: cardRef,
      };
      oltRects.push(oltRect);
    }

    ontg
      .selectAll("rect.oltcard")
      .data(oltRects)
      .enter()
      .append("rect")
      .classed("oltcard", true)
      .attr("x", function (d, i) {
        // console.log('x ' + ontRect[0][2])
        return (d as DiagRectRec).x;
      })
      .attr("y", function (d, i) {
        return (d as DiagRectRec).y;
      })
      .attr("width", function (d, i) {
        return (d as DiagRectRec).width;
      })
      .attr("height", function (d, i) {
        return (d as DiagRectRec).height;
      })
      .attr("fill", this.portColorDef.blue);

    ontg
      .selectAll("text.oltcard")
      .data(oltRects)
      .enter()
      .append("text")
      .classed("oltcard", true)
      .attr("x", function (d, i) {
        // console.log('x ' + ontRect[0][2])
        return (d as DiagRectRec).x;
      })
      .attr("y", function (d, i) {
        return (d as DiagRectRec).y + 20;
      })
      .text(function (d, i) {
        return (d as DiagRectRec).name;
      })

      .attr("fill", "white");

    // =============== draw OLT backplane vlan ==============
    let bpVlans: DiagBpVlanRectRec[] = [];
    let bpVlansCardMap = new Map<string, DiagBpVlanRectRec[]>();

    let vlanMap = this.mCardVlans(diagCom);
    for (let entry of vlanMap.entries()) {
      let cardPos = this.mToDiagCardPos(entry[0]);
      let vlanSet = entry[1];
      let bpVlansOneCard: DiagBpVlanRectRec[] = [];
      for (let oo of oltRects) {
        if (
          oo.cardPos.shelf === cardPos.shelf &&
          oo.cardPos.slot === cardPos.slot
        ) {
          let interY = oo.height / (vlanSet.size + 1);
          let startY = oo.y;
          let idx = 0;
          for (let item of vlanSet) {
            let diagBPvlan: DiagBpVlanRectRec = {
              x: oo.x + oo.width - this.oltBpVlanRecDef.wid / 2,
              y: (idx + 1) * interY + startY,
              width: this.oltBpVlanRecDef.wid,
              height: this.oltBpVlanRecDef.hei,
              name: item.toString(),
              cardPos: { shelf: cardPos.shelf, slot: cardPos.slot },
              vlan: item,
            };
            idx++;
            bpVlansOneCard.push(diagBPvlan);
          }
        }
      }
      bpVlans.push(...bpVlansOneCard);
      bpVlansCardMap.set(
        this.mToDiagCardPosStr({ shelf: cardPos.shelf, slot: cardPos.slot }),
        bpVlansOneCard
      );
    }

    ontg
      .selectAll("rect.bpvlan")
      .data(bpVlans)
      .enter()
      .append("rect")
      .classed("bpvlan", true)
      .attr("x", function (d, i) {
        // console.log('x ' + ontRect[0][2])
        return (d as DiagRectRec).x;
      })
      .attr("y", function (d, i) {
        return (d as DiagRectRec).y;
      })
      .attr("width", function (d, i) {
        return (d as DiagRectRec).width;
      })
      .attr("height", function (d, i) {
        return (d as DiagRectRec).height;
      })
      .attr("fill", "green");

    ontg
      .selectAll("text.bpvlan")
      .data(bpVlans)
      .enter()
      .append("text")
      .classed("bpvlan", true)
      .attr("x", function (d, i) {
        // console.log('x ' + ontRect[0][2])
        return (d as DiagRectRec).x;
      })
      .attr("y", function (d, i) {
        return (d as DiagRectRec).y + ((d as DiagRectRec).height * 3) / 4; // experiment value 3/4
      })
      .text(function (d, i) {
        return (d as DiagRectRec).name;
      })
      .attr("fill", "white");

    // ======================== olt etherPort==========
    for (let ii = 0; ii < diagCom.olts.length; ii++) {
      let oltEthPorts: DiagOltPortRectRec[] = [];
      let posX = oltRects[ii].x - this.oltEtherPortDef.wid / 2;
      let startY = oltRects[ii].y;
      if (diagCom.olts[ii].ethPorts.length === 0) {
        oltEthPortRect.push(oltEthPorts);
        continue;
      }
      let interY = oltRects[ii].height / (diagCom.olts[ii].ethPorts.length + 1);
      for (let jj = 0; jj < diagCom.olts[ii].ethPorts.length; jj++) {
        let color;
        if (diagCom.olts[ii].ethPorts[jj].adminState === "disable") {
          color = this.portColorDef.grey;
        } else {
          if (diagCom.olts[ii].ethPorts[jj].operState === "up") {
            color = this.portColorDef.green;
          } else {
            color = this.portColorDef.red;
          }
        }
        let ethPort: DiagOltPortRectRec = {
          x: posX,
          y: startY + (jj + 1) * interY,
          width: this.oltEtherPortDef.wid,
          height: this.oltEtherPortDef.hei,
          name: diagCom.olts[ii].ethPorts[jj].ifname,
          color: color,
          cardPos: {
            shelf: diagCom.olts[ii].shelf,
            slot: diagCom.olts[ii].slot,
          },
        };
        oltEthPorts.push(ethPort);
      }
      oltEthPortRect.push(oltEthPorts);
    }

    let oltEthPortFlat = [];
    for (let ii = 0; ii < oltEthPortRect.length; ii++) {
      oltEthPortFlat.push(...oltEthPortRect[ii]);
    }

    ontg
      .selectAll("rect.oltethport")
      .data(oltEthPortFlat)
      .enter()
      .append("rect")
      .classed("oltethport", true)
      .attr("x", function (d, i) {
        // console.log('x ' + ontRect[0][2])
        return (d as DiagRectRec).x;
      })
      .attr("y", function (d, i) {
        return (d as DiagRectRec).y;
      })
      .attr("width", function (d, i) {
        return (d as DiagRectRec).width;
      })
      .attr("height", function (d, i) {
        return (d as DiagRectRec).height;
      })
      .attr("fill", function (d, i) {
        return (d as DiagRectRec).color as string;
      });

    ontg
      .selectAll("text.oltethport")
      .data(oltEthPortFlat)
      .enter()
      .append("text")
      .classed("oltethport", true)
      .attr("x", function (d, i) {
        // console.log('x ' + ontRect[0][2])
        return (d as DiagRectRec).x;
      })
      .attr("y", function (d, i) {
        return (d as DiagRectRec).y + ((d as DiagRectRec).height * 3) / 4;
      })
      .text(function (d, i) {
        return (d as DiagRectRec).name;
      })
      .attr("fill", "white");

    // ================ buid the flow path ========
    // first calculate each port service count
    let ontPortFlowMap = new Map<string, number[]>();
    for (let flow of diagCom.flows) {
      let flowArray = ontPortFlowMap.get(flow.ontPort);
      if (flowArray) {
        flowArray.push(flow.flowId);
      } else {
        ontPortFlowMap.set(flow.ontPort, [flow.flowId]);
      }
    }

    interface MapTcontFlowInfo {
      flowIds:number[]
      posX:number,
      posY:number
    }
    // build Tcont/flows map
    let ontTcontFlowMap = new Map<string, MapTcontFlowInfo>()
    for (let flowInfo of diagCom.flows) {
      for (let ingQos of flowInfo.ingressQos) {
        let flowArray = ontTcontFlowMap.get(ingQos.ponCos)
        if (flowArray) {
          flowArray.flowIds.push(flowInfo.flowId)
        }else {
          ontTcontFlowMap.set(ingQos.ponCos, {flowIds:[flowInfo.flowId], posX:-1, posY:-1})
        }
      }
    }

    // calculate each TCONT position and height
    let totalFlowsMapedTcont = 0
    let totalInter = ontTcontFlowMap.size -1 
    let totalUsedHeight =  ontRect.height - this.tContFlowStartY * 2
    let eachFlowLen = 0
    for (let tcontInfo of ontTcontFlowMap.values()) {
      totalFlowsMapedTcont += tcontInfo.flowIds.length
    }
    
    eachFlowLen = (totalUsedHeight - totalInter * this.tContInterVal)/totalFlowsMapedTcont
    eachFlowLen = (eachFlowLen > this.tcontFlowMaxInterval)?this.tcontFlowMaxInterval:eachFlowLen

    // calu each Tcont bundle posX/Y
    let tcontFlowStart = this.tContFlowStartY + ontRect.y
    for (let flowTcont of ontTcontFlowMap.values()) {
      flowTcont.posY = tcontFlowStart + this.tContInterVal
      tcontFlowStart += flowTcont.flowIds.length * eachFlowLen
    }


    let diagFlows: DiagFlowPath[] = [];
    let diagLines:DiagLine[] = []
    let diagLabel:DiagLable[] = []
    for (let ii = 0; ii < diagCom.flows.length; ii++) {
      let diagFlow: DiagFlowPath = {
        flowId: diagCom.flows[ii].flowId,
        nodes: { node: [] },
      };
      diagFlows.push(diagFlow);
      let flow = diagCom.flows[ii];
      let posRect = this.mFindOntPortRect(flow.ontPort, ontPortRect);
      if (posRect === -1) {
        console.log(
          `flow ${flow.flowId} port ${flow.ontPort} no Ont port found`
        );
        continue;
      }

      let portFlowArr = ontPortFlowMap.get(diagCom.flows[ii].ontPort);
      if (!portFlowArr || portFlowArr.length === 0) {
        console.log(`${diagCom.flows[ii].ontPort} no flowMap`);
        continue;
      }

      let flowIdx = portFlowArr.indexOf(diagCom.flows[ii].flowId);
      let flowPosY;
      if (flowIdx === -1) {
        console.log(`${diagCom.flows[ii].ontPort} not in flowMap`);
        continue;
      }

      if (portFlowArr.length === 1) {
        flowPosY =
          (posRect as DiagRectRec).y + (posRect as DiagRectRec).height / 2;
      } else {
        flowPosY =
          (posRect as DiagRectRec).y +
          flowIdx *
            ((posRect as DiagRectRec).height / (portFlowArr.length - 1));
      }

      // match rule line
      diagLines.push({
        start: {x:(posRect as DiagRectRec).x + (posRect as DiagRectRec).width,
                 y:flowPosY },
        end: {x:(posRect as DiagRectRec).x + (posRect as DiagRectRec).width + 50,
                 y:flowPosY},
        name:'',
        label: flow.match.join(','),
        labelRotate: 0,
        labelPos: {x:(posRect as DiagRectRec).x + (posRect as DiagRectRec).width,
                 y:flowPosY },
        key:""
      })

      // if has ingressQos info, need a TCONT bundle 
      // only use first one qos Info
      if (flow.ingressQos[0]) {
        let tcontFlows = ontTcontFlowMap.get(flow.ingressQos[0].ponCos) 
        if (!tcontFlows) {
          console.error(
            `flow ${flow.flowId} port ${flow.ontPort} no Tcont Map found`
          );    
          continue    
        }     

        let idx = tcontFlows.flowIds.indexOf(flow.flowId)
      
        diagFlow.nodes.node.push({
          x: (posRect as DiagRectRec).x,
          y: flowPosY,
          pointType: this.mRectTypeToPointType(
            (posRect as DiagRectRec).rectType as DiagRectType
          ),
        });

        // Change the flowPosY for the PON port posistion use
        flowPosY = tcontFlows.posY + (idx + 1)* eachFlowLen * tcontFlows.flowIds.length/(tcontFlows.flowIds.length + 1)
        diagFlow.nodes.node.push({
          x: (ontRect as DiagRectRec).x,
          y: flowPosY,
          pointType: this.mRectTypeToPointType(
            (posRect as DiagRectRec).rectType as DiagRectType
          ),
        });      
        // ont out vlan line and label
        diagLines.push({
          start: {x: ponPortRect.x + ponPortRect.width, y: flowPosY},
          end: {x:(ontRect as DiagRectRec).x ,
                  y:flowPosY},
          name:'ontoutvlan',
          label: 'vlan ' + flow.ontOutVlan.toString(),
          labelRotate: 0,
          labelPos: {x: ponPortRect.x + ponPortRect.width, y: flowPosY},
          key: flow.key
        })  

        if (idx === 0) {
        diagLabel.push({
          name:"",
          label:flow.ingressQos[0].ponCos + 
                      " cir/" + flow.ingressQos[0].ponCosCir +
                      ' air/' + flow.ingressQos[0].ponCosAir + 
                      ' eir/' + flow.ingressQos[0].ponCosEir,
          labelRotate:0,
          labelPos: {x: ponPortRect.x + ponPortRect.width + 20 ,
                    y: flowPosY - 15}
        })

        }


      }else {
        // start ont point
        diagFlow.nodes.node.push({
          x: (posRect as DiagRectRec).x,
          y: flowPosY,
          pointType: this.mRectTypeToPointType(
            (posRect as DiagRectRec).rectType as DiagRectType
          ),
        });
      // ont out vlan line and label
      diagLines.push({
        start: {x: ponPortRect.x + ponPortRect.width, y: flowPosY},
        end: {x:(posRect as DiagRectRec).x ,
                 y:flowPosY},
        name:'ontoutvlan',
        label: 'vlan ' + flow.ontOutVlan.toString(),
        labelRotate: 0,
        labelPos: {x: ponPortRect.x + ponPortRect.width, y: flowPosY},
        key:flow.key
      })     
      }
      

      // to olt pon port
      diagFlow.nodes.node.push({
        x: ponPortRect.x + ponPortRect.width,
        y: flowPosY,
        pointType: FlowPointType.FLowPointTypeOltPon,
      });

 

      // to pon switch connect
      diagFlow.nodes.node.push({
        x: ponPortRect.x,
        y: flowPosY,
        pointType: FlowPointType.FlowPointTypeOltPonBackend,
      });

      // to backplane ingress
      diagFlow.nodes.node.push({
        x: oltPonBackend.x,
        y: flowPosY,
        pointType: FlowPointType.FLowPointTypeOltBackplaneIngress,
      });

      // olt out vlan label 
      let oltOutVlan = 'vlan' + flow.oltOutVlan.toString()
      if (flow.oltVlanAction === 'add') {
        oltOutVlan += `/${flow.ontOutVlan}`
      }
      diagLines.push({
          start: {x: oltPonBackend.x , y: flowPosY},
          end: {x:ponPortRect.x ,
                  y:flowPosY},
          name:'',
          label: oltOutVlan,
          labelRotate: 0,
          labelPos: {x: oltPonBackend.x, y: flowPosY},
          key:''
        })  

      // to backplane egress
      diagFlow.nodes.splitTree = [];
      for (let oo of flow.oltOutPorts) {
        let cardPos: DiagCardPos = { shelf: oo.shelf, slot: oo.slot };
        let bpVlanItem = bpVlansCardMap.get(this.mToDiagCardPosStr(cardPos));
        if (!bpVlanItem) {
          console.log(
            `Not found oltOutPort ${cardPos.shelf}/${cardPos.slot}/${oo.ifname} `
          );
          continue;
        }
        for (let ll of bpVlanItem) {
          if (ll.vlan === flow.oltOutVlan) {
            let diagSubTree: DiagPointTree = {
              node: [],
            };
            diagFlow.nodes.splitTree.push(diagSubTree);
            diagSubTree.node.push({
              x: ll.x + ll.width,
              y: ll.y + ll.height / 2,
              pointType: FlowPointType.FLowPointTypeOltBackplaneEgress,
            });

            let OutRect = this.mFindOltPortRectRec(
              oltEthPortRect,
              { shelf: oo.shelf, slot: oo.slot },
              oo.ifname
            );
            if (OutRect != -1) {
              diagSubTree.node.push({
                x:
                  (OutRect as DiagOltPortRectRec).x +
                  (OutRect as DiagOltPortRectRec).width,
                y:
                  (OutRect as DiagOltPortRectRec).y +
                  (OutRect as DiagOltPortRectRec).height / 2,
                pointType: FlowPointType.FlowPointTypeOltOutEther,
              });
            }
          }
        }
      }

      // to outside ether port

      // console.log('diag flows')
      // console.log(diagFlows)

      // console.log(flowDirectPathList)
    }
    console.log(diagFlows)
    let flowDirectPathList: DiagFlowDirectPath[] = [];
    this.mFlowPathToDirectPath(diagFlows, flowDirectPathList);
    console.log(flowDirectPathList)
    for (let path of flowDirectPathList) {
      //     ontg.append('line').data(path.nodes)
      // .attr("stroke", "blue")
      // .attr("stroke-width", 2)
      // .attr('text', 'haha')
      // .attr('x1', function(d, i) {return (d as unknown as DiagPoint).x})
      // .attr('y1', function(d, i) {return (d as unknown as DiagPoint).y})
      // .attr('x2', function(d, i) {
      //   console.log(i)
      //   if (i === path.nodes.length -1) {
      //     return (d as unknown as DiagPoint).x
      //   }else {
      //     return path.nodes[i+1].x
      //   }
      // })
      // .attr('y2', function(d, i) {
      //       if (i === path.nodes.length -1) {
      //     return (d as unknown as DiagPoint).y
      //   }else {
      //     return path.nodes[i+1].y
      //   }
      // })

      // const line = d3
      // .line()
      // .x(function (d) {
      //   return (d as unknown as DiagPoint).x
      // })
      // .y(function (d) {
      //   return (d as unknown as DiagPoint).y
      // })

      // ontg.append('path')
      // .datum(path.nodes)
      // .attr("class", `flow${path.flowId}`)
      // .attr('fill', 'none')
      // .attr('stroke', 'steelblue')
      // .attr('stroke-linejoin', 'round')
      // .attr('stroke-linecap', 'round')
      // .attr('stroke-width', 1.5)
      // .attr('d', line)
      let d3path = d3.path();
      if (!path.nodes[0]) {
        continue
      }
      d3path.moveTo(path.nodes[0].x, path.nodes[0].y);
      for (let ii = 1; ii < path.nodes.length; ii++) {
        d3path.lineTo(path.nodes[ii].x, path.nodes[ii].y);
      }
      ontg
        .append("path")
        .attr("class", `flow${path.flowId}`)
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-linejoin", "round")
        .attr("stroke-linecap", "round")
        .attr("stroke-width", 1.5)    // @ts-ignore
        .attr("d", d3path);
    } 

    ontg.selectAll('line.flowmatch').data(diagLines).enter().append('line')
    .classed('flowmatch', true)
    .attr("stroke", "steelblue")
    .attr("stroke-width", 1)
  .attr('x1', function(d, i) {return (d as DiagLine).start.x})
  .attr('y1', function(d, i) {return (d as DiagLine).start.y})
  .attr('x2', function(d, i) {return (d as DiagLine).end.x})
  .attr('y2', function(d,i) {return (d as DiagLine).end.y})

    ontg.selectAll('text.flowmatch').data(diagLines).enter().append('text')
    .classed('flowmatch', true)
    .attr("stroke", "steelblue")
    .attr("stroke-width", 1)
  .attr('x', function(d, i) {return (d as DiagLine).start.x})
  .attr('y', function(d, i) {return (d as DiagLine).start.y - 2})
        .text(function (d, i) {
        return (d as DiagLine).label;
      })
      .style("font-size", function(){
        return '15px'
        })
      .attr("fill", "blue");

    ontg.selectAll('text.label').data(diagLabel).enter().append('text')
    .classed('label', true)
    .attr("stroke", "steelblue")
  .attr('x', function(d, i) {return (d as DiagLable).labelPos.x})
  .attr('y', function(d, i) {return (d as DiagLable).labelPos.y})
        .text(function (d, i) {
        return (d as DiagLable).label;
      })
      .attr("fill", "blue")
      .style("font-size", function(){
        return '10px'
        })

    ontg.selectAll('text.flowmatch')
    .filter((d)=>(d as DiagLable).name === 'ontoutvlan')
    .style("font-size", function(){
        return '10px'
        }).text((d)=>{
          return (d as DiagLine).label
        })

    if (this.statInterHandler != undefined) {
      clearInterval(this.statInterHandler)
    }

    if (withFlowStat) {
      let that = this
      if (that.statInterHandler) {
        clearInterval(that.statInterHandler)
      }
      that.statInterHandler = setInterval(async ()=>{
        await that.OntFlowStat()
      }, 10000)
    }


    // ontg.selectAll('text.label').each(()=>{}
    // ).text((d,i)=> {
    //   console.log(d)
    //   return (d as DiagLable).label + 'hah'
    // })

  }

  updateOntFlowSpeed(flowStats:DiagOntAllFlowStats) {
    let ontg = d3.select('svg').select('g')
    ontg.selectAll('text.flowmatch').filter((d)=>((d as DiagLine).name === 'ontoutvlan'))
    .text((d)=>{
      let key = (d as DiagLine).key
      let found = false
      for (let flow of flowStats.flows) {
        if (flow.key === key) {
          found = true
          return (d as DiagLine).label + `  us:${(Math.floor(flow.usRate/1000)/1000).toFixed(1)}kbs  ds:${(Math.floor(flow.dsRate)/1000).toFixed(1)}kbs`
        }
      }
      return (d as DiagLine).label
    })
   
  }

  testDraw(diagCom:DiagCompose|undefined = undefined) {
    if (!diagCom) {
      diagCom = this.buildTestData();
    }
    let heiMid = this.svgHei / 2;
    let startX = this.svgWid - this.rightMarigin;
    let ontRect: DiagRectRec = {
      x: startX - this.ontDef.wid,
      y: heiMid - this.ontDef.hei / 2,
      width: this.ontDef.wid,
      height: this.ontDef.hei,
      name: diagCom.ont.ontId,
    };
    let ontOutIntfRect: DiagRectRec[] = [];
    let ontInIntfRect: DiagRectRec[] = [];
    let ontVeipRect: DiagRectRec[] = [];
    let ontPortRect: DiagRectRec[] = [];
    let oltRects: DiagOltCardRectRec[] = [];
    let oltEthPortRect: DiagOltPortRectRec[][] = [];
    let ponPortRect: DiagRectRec = {
      x: ontRect.x - this.ontOltDist - this.ponPortDef.wid,
      y: heiMid - this.ponPortDef.hei / 2,
      width: this.ponPortDef.wid,
      height: this.ponPortDef.hei,
      name: diagCom.ont.connPon,
    };

    let oltPonBackend: DiagRectRec = {
      x: ponPortRect.x - this.oltDef.wid,
      y: heiMid - this.oltDef.hei / 2,
      width: this.oltDef.wid,
      height: this.oltDef.hei,
      name: "",
    };
    d3.select('svg').select('g').remove()

    let ontg = d3.select("svg").append("g");

    ontg
      .append("rect")
      .attr("x", ontRect.x)
      .attr("y", ontRect.y)
      .attr("width", ontRect.width)
      .attr("height", ontRect.height)
      .attr("class", "ont")
      .attr("fill", this.portColorDef.blue);

    ontg
      .append("text")
      .attr("x", ontRect.x)
      .attr("y", ontRect.y + 20)
      .attr("class", "ont")
      .attr("fill", "white")
      .text(ontRect.name);

    let posX = ontRect.x + ontRect.width - this.ontPortDef.wid / 2;
    let posYStart = ontRect.y;
    let yInterVal =
      ontRect.height /
      (diagCom.ont.ontOutInterface.length +
        diagCom.ont.ontInInterface.length +
        1);
    for (let ii = 0; ii < diagCom.ont.ontOutInterface.length; ii++) {
      let color;
      if (diagCom.ont.ontOutInterface[ii].adminState === "disable") {
        color = this.portColorDef.grey;
      } else {
        if (diagCom.ont.ontOutInterface[ii].operState === "up") {
          color = this.portColorDef.green;
        } else {
          color = this.portColorDef.red;
        }
      }

      let intfRect: DiagRectRec = {
        x: posX,
        y: posYStart + yInterVal * (ii + 1) - this.ontPortDef.hei / 2,
        width: this.ontPortDef.wid,
        height: this.ontPortDef.hei,
        name: diagCom.ont.ontOutInterface[ii].ifname,
        rectType: DiagRectType.DiagRectTypeOntUni,
        color: color,
      };
      ontOutIntfRect.push(intfRect);
    }

    let interStart = diagCom.ont.ontOutInterface.length;
    posX = ontRect.x + ontRect.width / 2 - this.ontPortDef.wid / 2;
    for (let ii = 0; ii < diagCom.ont.ontInInterface.length; ii++) {
      let color;
      if (diagCom.ont.ontInInterface[ii].adminState === "disable") {
        color = this.portColorDef.grey;
      } else {
        color = this.portColorDef.green;
      }
      let intfRect: DiagRectRec = {
        x: posX,
        y:
          posYStart +
          yInterVal * (ii + interStart + 1) -
          this.ontPortDef.hei / 2,
        width: this.ontPortDef.wid,
        height: this.ontPortDef.hei,
        name: diagCom.ont.ontInInterface[ii].ifname,
        rectType: DiagRectType.DiagRectTypeOntInter,
        color: color,
      };
      ontInIntfRect.push(intfRect);
    }

    // ======= deduce the veip===
    let veip = new Set<string>();
    for (let ii = 0; ii < diagCom.ont.ontOutInterface.length; ii++) {
      if (diagCom.ont.ontOutInterface[ii].veipIf != "") {
        veip.add(diagCom.ont.ontOutInterface[ii].veipIf);
      }
    }

    if (veip.size > 0) {
      posX = ontRect.x + ontRect.width / 2 - this.ontPortDef.wid / 2;
      posYStart = ontRect.y;
      yInterVal =
        (yInterVal * (diagCom.ont.ontOutInterface.length + 1)) /
        (veip.size + 1);
      let idx = 0;
      for (let item of veip) {
        let intfRect: DiagRectRec = {
          x: posX,
          y: posYStart + yInterVal * (idx + 1) - this.ontPortDef.hei / 2,
          width: this.ontPortDef.wid,
          height: this.ontPortDef.hei,
          name: item,
          rectType: DiagRectType.DiagRectTypeOntVeip,
          color: this.portColorDef.green,
        };
        idx++;
        ontVeipRect.push(intfRect);
      }
    }

    // ======================== ont  port==============
    let ontPort = [...ontInIntfRect, ...ontOutIntfRect, ...ontVeipRect];
    ontPortRect = ontPort;
    ontg
      .selectAll("rect.ontoutport")
      .data(ontPort)
      .enter()
      .append("rect")
      .classed("ontoutport", true)
      .attr("x", function (d, i) {
        // console.log('x ' + ontRect[0][2])
        return (d as DiagRectRec).x;
      })
      .attr("y", function (d, i) {
        return (d as DiagRectRec).y;
      })
      .attr("width", function (d, i) {
        return (d as DiagRectRec).width;
      })
      .attr("height", function (d, i) {
        return (d as DiagRectRec).height;
      })
      .attr("fill", function (d, i) {
        return (d as DiagRectRec).color as string;
      });

    ontg
      .selectAll("text.ontoutport")
      .data(ontPort)
      .enter()
      .append("text")
      .classed("ontoutport", true)
      .attr("x", function (d, i) {
        // console.log('x ' + ontRect[0][2])
        return (d as DiagRectRec).x;
      })
      .attr("y", function (d, i) {
        return (d as DiagRectRec).y + ((d as DiagRectRec).height * 3) / 4; // experiment value 3/4
      })
      .text(function (d, i) {
        return (d as DiagRectRec).name;
      })
      .attr("fill", "white");
    // .style("font", "14px times")

    // ========================ONT ethport to veip port ====================
    let diagVeipLines:DiagLine[] = []
    for (let port of diagCom.ont.ontOutInterface) {
      if (port.veipIf != '') {
        let startP:DiagPoint | undefined = undefined
        let endP:DiagPoint | undefined = undefined
        for (let ethRect of ontOutIntfRect) {
          if (port.ifname === ethRect.name) {
            startP = {
              x:ethRect.x,
              y:ethRect.y + ethRect.height/2
            }
            break
          }
        }

        for (let veipRect of ontVeipRect) {
          if (veipRect.name === port.veipIf) {
            endP= {
              x:veipRect.x + veipRect.width,
              y:veipRect.y + veipRect.height/2
            }
          }
        }

        if (startP != undefined && endP != undefined) {
          diagVeipLines.push({
            start:{x:startP.x, y:startP.y},
            end:{x:endP.x, y:endP.y},
            label:'',
            name:'',
            labelPos:{x:0, y:0},
            labelRotate:0,
            key:""
          })
        }
      }
    }

    ontg.selectAll('line.veip').data(diagVeipLines).enter().append('line')
    .classed('veip', true)
    .attr("stroke", "steelblue")
    .attr("stroke-width", 1)
  .attr('x1', function(d, i) {return (d as DiagLine).start.x})
  .attr('y1', function(d, i) {return (d as DiagLine).start.y})
  .attr('x2', function(d, i) {return (d as DiagLine).end.x})
  .attr('y2', function(d,i) {return (d as DiagLine).end.y})
    // ======================== olt pon port and bankend olt==============
    let cardName = "";
    let res = /(\d+)\/(\d+)/.exec(ponPortRect.name);
    if (res) {
      cardName = res[0];
    }
    ontg
      .append("rect")
      .attr("x", ponPortRect.x)
      .attr("y", ponPortRect.y)
      .attr("width", ponPortRect.width)
      .attr("height", ponPortRect.height)
      .attr("class", "ponport")
      .attr("fill", this.portColorDef.blue)
      .style("stroke-width", 1)
      .style("stroke", "blue");
    ontg
      .append("text")
      .attr("x", ponPortRect.x)
      .attr("y", ponPortRect.y + 20)
      .attr("class", "ponport")
      .attr("fill", "white")
      .text(ponPortRect.name);

    ontg
      .append("rect")
      .attr("x", oltPonBackend.x)
      .attr("y", oltPonBackend.y)
      .attr("width", oltPonBackend.width)
      .attr("height", oltPonBackend.height)
      .attr("class", "ponbackend")
      .attr("fill", this.portColorDef.blue)
      .style("stroke-width", 1)
      .style("stroke", "blue");
    ontg
      .append("text")
      .attr("x", oltPonBackend.x)
      .attr("y", oltPonBackend.y + 20)
      .attr("class", "ponbackend")
      .attr("fill", "white")
      .text(cardName);

    // =============== draw OLT card ==============
    // temporarily max two cards
    if (diagCom.olts.length > 2) {
      console.log("max support two olt cards in temp");
      return;
    }
    let oltStartY = 0;
    let oltStartX = oltPonBackend.x - this.oltDistX - this.oltDef.wid;
    if (diagCom.olts.length % 2 === 1) {
      oltStartY = heiMid - this.oltDef.hei / 2;
      oltStartY -=
        (diagCom.olts.length / 2) * (this.oltDef.hei + this.oltDistY);
    } else {
      oltStartY =
        heiMid -
        (diagCom.olts.length / 2) * (this.oltDef.hei + this.oltDistY) +
        this.oltDistY / 2;
    }

    for (let ii = 0; ii < diagCom.olts.length; ii++) {
      let cardRef: DiagCardPos = {
        shelf: diagCom.olts[ii].shelf,
        slot: diagCom.olts[ii].slot,
      };
      let oltRect: DiagOltCardRectRec = {
        x: oltStartX,
        y: oltStartY + ii * (this.oltDef.hei + this.oltDistY),
        width: this.oltDef.wid,
        height: this.oltDef.hei,
        name: `${diagCom.olts[ii].shelf}/${diagCom.olts[ii].slot}`,
        cardPos: cardRef,
      };
      oltRects.push(oltRect);
    }

    ontg
      .selectAll("rect.oltcard")
      .data(oltRects)
      .enter()
      .append("rect")
      .classed("oltcard", true)
      .attr("x", function (d, i) {
        // console.log('x ' + ontRect[0][2])
        return (d as DiagRectRec).x;
      })
      .attr("y", function (d, i) {
        return (d as DiagRectRec).y;
      })
      .attr("width", function (d, i) {
        return (d as DiagRectRec).width;
      })
      .attr("height", function (d, i) {
        return (d as DiagRectRec).height;
      })
      .attr("fill", this.portColorDef.blue);

    ontg
      .selectAll("text.oltcard")
      .data(oltRects)
      .enter()
      .append("text")
      .classed("oltcard", true)
      .attr("x", function (d, i) {
        // console.log('x ' + ontRect[0][2])
        return (d as DiagRectRec).x;
      })
      .attr("y", function (d, i) {
        return (d as DiagRectRec).y + 20;
      })
      .text(function (d, i) {
        return (d as DiagRectRec).name;
      })

      .attr("fill", "white");

    // =============== draw OLT backplane vlan ==============
    let bpVlans: DiagBpVlanRectRec[] = [];
    let bpVlansCardMap = new Map<string, DiagBpVlanRectRec[]>();

    let vlanMap = this.mCardVlans(diagCom);
    for (let entry of vlanMap.entries()) {
      let cardPos = this.mToDiagCardPos(entry[0]);
      let vlanSet = entry[1];
      let bpVlansOneCard: DiagBpVlanRectRec[] = [];
      for (let oo of oltRects) {
        if (
          oo.cardPos.shelf === cardPos.shelf &&
          oo.cardPos.slot === cardPos.slot
        ) {
          let interY = oo.height / (vlanSet.size + 1);
          let startY = oo.y;
          let idx = 0;
          for (let item of vlanSet) {
            let diagBPvlan: DiagBpVlanRectRec = {
              x: oo.x + oo.width - this.oltBpVlanRecDef.wid / 2,
              y: (idx + 1) * interY + startY,
              width: this.oltBpVlanRecDef.wid,
              height: this.oltBpVlanRecDef.hei,
              name: item.toString(),
              cardPos: { shelf: cardPos.shelf, slot: cardPos.slot },
              vlan: item,
            };
            idx++;
            bpVlansOneCard.push(diagBPvlan);
          }
        }
      }
      bpVlans.push(...bpVlansOneCard);
      bpVlansCardMap.set(
        this.mToDiagCardPosStr({ shelf: cardPos.shelf, slot: cardPos.slot }),
        bpVlansOneCard
      );
    }

    ontg
      .selectAll("rect.bpvlan")
      .data(bpVlans)
      .enter()
      .append("rect")
      .classed("bpvlan", true)
      .attr("x", function (d, i) {
        // console.log('x ' + ontRect[0][2])
        return (d as DiagRectRec).x;
      })
      .attr("y", function (d, i) {
        return (d as DiagRectRec).y;
      })
      .attr("width", function (d, i) {
        return (d as DiagRectRec).width;
      })
      .attr("height", function (d, i) {
        return (d as DiagRectRec).height;
      })
      .attr("fill", "green");

    ontg
      .selectAll("text.bpvlan")
      .data(bpVlans)
      .enter()
      .append("text")
      .classed("bpvlan", true)
      .attr("x", function (d, i) {
        // console.log('x ' + ontRect[0][2])
        return (d as DiagRectRec).x;
      })
      .attr("y", function (d, i) {
        return (d as DiagRectRec).y + ((d as DiagRectRec).height * 3) / 4; // experiment value 3/4
      })
      .text(function (d, i) {
        return (d as DiagRectRec).name;
      })
      .attr("fill", "white");

    // ======================== olt etherPort==========
    for (let ii = 0; ii < diagCom.olts.length; ii++) {
      let oltEthPorts: DiagOltPortRectRec[] = [];
      let posX = oltRects[ii].x - this.oltEtherPortDef.wid / 2;
      let startY = oltRects[ii].y;
      if (diagCom.olts[ii].ethPorts.length === 0) {
        oltEthPortRect.push(oltEthPorts);
        continue;
      }
      let interY = oltRects[ii].height / (diagCom.olts[ii].ethPorts.length + 1);
      for (let jj = 0; jj < diagCom.olts[ii].ethPorts.length; jj++) {
        let color;
        if (diagCom.olts[ii].ethPorts[jj].adminState === "disable") {
          color = this.portColorDef.grey;
        } else {
          if (diagCom.olts[ii].ethPorts[jj].operState === "up") {
            color = this.portColorDef.green;
          } else {
            color = this.portColorDef.red;
          }
        }
        let ethPort: DiagOltPortRectRec = {
          x: posX,
          y: startY + (jj + 1) * interY,
          width: this.oltEtherPortDef.wid,
          height: this.oltEtherPortDef.hei,
          name: diagCom.olts[ii].ethPorts[jj].ifname,
          color: color,
          cardPos: {
            shelf: diagCom.olts[ii].shelf,
            slot: diagCom.olts[ii].slot,
          },
        };
        oltEthPorts.push(ethPort);
      }
      oltEthPortRect.push(oltEthPorts);
    }

    let oltEthPortFlat = [];
    for (let ii = 0; ii < oltEthPortRect.length; ii++) {
      oltEthPortFlat.push(...oltEthPortRect[ii]);
    }

    ontg
      .selectAll("rect.oltethport")
      .data(oltEthPortFlat)
      .enter()
      .append("rect")
      .classed("oltethport", true)
      .attr("x", function (d, i) {
        // console.log('x ' + ontRect[0][2])
        return (d as DiagRectRec).x;
      })
      .attr("y", function (d, i) {
        return (d as DiagRectRec).y;
      })
      .attr("width", function (d, i) {
        return (d as DiagRectRec).width;
      })
      .attr("height", function (d, i) {
        return (d as DiagRectRec).height;
      })
      .attr("fill", function (d, i) {
        return (d as DiagRectRec).color as string;
      });

    ontg
      .selectAll("text.oltethport")
      .data(oltEthPortFlat)
      .enter()
      .append("text")
      .classed("oltethport", true)
      .attr("x", function (d, i) {
        // console.log('x ' + ontRect[0][2])
        return (d as DiagRectRec).x;
      })
      .attr("y", function (d, i) {
        return (d as DiagRectRec).y + ((d as DiagRectRec).height * 3) / 4;
      })
      .text(function (d, i) {
        return (d as DiagRectRec).name;
      })
      .attr("fill", "white");

    // ================ buid the flow path ========
    // first calculate each port service count
    let ontPortFlowMap = new Map<string, number[]>();
    for (let flow of diagCom.flows) {
      let flowArray = ontPortFlowMap.get(flow.ontPort);
      if (flowArray) {
        flowArray.push(flow.flowId);
      } else {
        ontPortFlowMap.set(flow.ontPort, [flow.flowId]);
      }
    }

    let diagFlows: DiagFlowPath[] = [];
    let diagLines:DiagLine[] = []
    for (let ii = 0; ii < diagCom.flows.length; ii++) {
      let diagFlow: DiagFlowPath = {
        flowId: diagCom.flows[ii].flowId,
        nodes: { node: [] },
      };
      diagFlows.push(diagFlow);
      let flow = diagCom.flows[ii];
      let posRect = this.mFindOntPortRect(flow.ontPort, ontPortRect);
      if (posRect === -1) {
        console.log(
          `flow ${flow.flowId} port ${flow.ontPort} no Ont port found`
        );
        continue;
      }

      let portFlowArr = ontPortFlowMap.get(diagCom.flows[ii].ontPort);
      if (!portFlowArr || portFlowArr.length === 0) {
        console.log(`${diagCom.flows[ii].ontPort} no flowMap`);
        continue;
      }

      let flowIdx = portFlowArr.indexOf(diagCom.flows[ii].flowId);
      let flowPosY;
      if (flowIdx === -1) {
        console.log(`${diagCom.flows[ii].ontPort} not in flowMap`);
        continue;
      }

      if (portFlowArr.length === 1) {
        flowPosY =
          (posRect as DiagRectRec).y + (posRect as DiagRectRec).height / 2;
      } else {
        flowPosY =
          (posRect as DiagRectRec).y +
          flowIdx *
            ((posRect as DiagRectRec).height / (portFlowArr.length - 1));
      }

      // match rule line
      diagLines.push({
        start: {x:(posRect as DiagRectRec).x + (posRect as DiagRectRec).width,
                 y:flowPosY },
        end: {x:(posRect as DiagRectRec).x + (posRect as DiagRectRec).width + 50,
                 y:flowPosY},
        name:'',
        label: flow.match.join(','),
        labelRotate: 0,
        labelPos: {x:(posRect as DiagRectRec).x + (posRect as DiagRectRec).width,
                 y:flowPosY },
        key:""
      })

      // start ont point
      diagFlow.nodes.node.push({
        x: (posRect as DiagRectRec).x,
        y: flowPosY,
        pointType: this.mRectTypeToPointType(
          (posRect as DiagRectRec).rectType as DiagRectType
        ),
      });

      // to olt pon port
      diagFlow.nodes.node.push({
        x: ponPortRect.x + ponPortRect.width,
        y: flowPosY,
        pointType: FlowPointType.FLowPointTypeOltPon,
      });

      // ont out vlan line and label
      diagLines.push({
        start: {x: ponPortRect.x + ponPortRect.width, y: flowPosY},
        end: {x:(posRect as DiagRectRec).x ,
                 y:flowPosY},
        name:'',
        label: 'vlan ' + flow.ontOutVlan.toString(),
        labelRotate: 0,
        labelPos: {x: ponPortRect.x + ponPortRect.width, y: flowPosY},
        key:flow.key
      })      

      // to pon switch connect
      diagFlow.nodes.node.push({
        x: ponPortRect.x,
        y: flowPosY,
        pointType: FlowPointType.FlowPointTypeOltPonBackend,
      });

      // to backplane ingress
      diagFlow.nodes.node.push({
        x: oltPonBackend.x,
        y: flowPosY,
        pointType: FlowPointType.FLowPointTypeOltBackplaneIngress,
      });

      // to backplane egress
      diagFlow.nodes.splitTree = [];
      for (let oo of flow.oltOutPorts) {
        let cardPos: DiagCardPos = { shelf: oo.shelf, slot: oo.slot };
        let bpVlanItem = bpVlansCardMap.get(this.mToDiagCardPosStr(cardPos));
        if (!bpVlanItem) {
          console.log(
            `Not found oltOutPort ${cardPos.shelf}/${cardPos.slot}/${oo.ifname} `
          );
          continue;
        }
        for (let ll of bpVlanItem) {
          if (ll.vlan === flow.oltOutVlan) {
            let diagSubTree: DiagPointTree = {
              node: [],
            };
            diagFlow.nodes.splitTree.push(diagSubTree);
            diagSubTree.node.push({
              x: ll.x + ll.width,
              y: ll.y + ll.height / 2,
              pointType: FlowPointType.FLowPointTypeOltBackplaneEgress,
            });
''
            let OutRect = this.mFindOltPortRectRec(
              oltEthPortRect,
              { shelf: oo.shelf, slot: oo.slot },
              oo.ifname
            );
            if (OutRect != -1) {
              diagSubTree.node.push({
                x:
                  (OutRect as DiagOltPortRectRec).x +
                  (OutRect as DiagOltPortRectRec).width,
                y:
                  (OutRect as DiagOltPortRectRec).y +
                  (OutRect as DiagOltPortRectRec).height / 2,
                pointType: FlowPointType.FlowPointTypeOltOutEther,
              });
            }
          }
        }
      }

      // to outside ether port

      // console.log('diag flows')
      // console.log(diagFlows)

      // console.log(flowDirectPathList)
    }
    console.log(diagFlows)
    let flowDirectPathList: DiagFlowDirectPath[] = [];
    this.mFlowPathToDirectPath(diagFlows, flowDirectPathList);
    console.log(flowDirectPathList)
    for (let path of flowDirectPathList) {
      //     ontg.append('line').data(path.nodes)
      // .attr("stroke", "blue")
      // .attr("stroke-width", 2)
      // .attr('text', 'haha')
      // .attr('x1', function(d, i) {return (d as unknown as DiagPoint).x})
      // .attr('y1', function(d, i) {return (d as unknown as DiagPoint).y})
      // .attr('x2', function(d, i) {
      //   console.log(i)
      //   if (i === path.nodes.length -1) {
      //     return (d as unknown as DiagPoint).x
      //   }else {
      //     return path.nodes[i+1].x
      //   }
      // })
      // .attr('y2', function(d, i) {
      //       if (i === path.nodes.length -1) {
      //     return (d as unknown as DiagPoint).y
      //   }else {
      //     return path.nodes[i+1].y
      //   }
      // })

      // const line = d3
      // .line()
      // .x(function (d) {
      //   return (d as unknown as DiagPoint).x
      // })
      // .y(function (d) {
      //   return (d as unknown as DiagPoint).y
      // })

      // ontg.append('path')
      // .datum(path.nodes)
      // .attr("class", `flow${path.flowId}`)
      // .attr('fill', 'none')
      // .attr('stroke', 'steelblue')
      // .attr('stroke-linejoin', 'round')
      // .attr('stroke-linecap', 'round')
      // .attr('stroke-width', 1.5)
      // .attr('d', line)
      let d3path = d3.path();
      d3path.moveTo(path.nodes[0].x, path.nodes[0].y);
      for (let ii = 1; ii < path.nodes.length; ii++) {
        d3path.lineTo(path.nodes[ii].x, path.nodes[ii].y);
      }
      ontg
        .append("path")
        .attr("class", `flow${path.flowId}`)
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-linejoin", "round")
        .attr("stroke-linecap", "round")
        .attr("stroke-width", 1.5)    // @ts-ignore
        .attr("d", d3path);
    } 

    ontg.selectAll('line.flowmatch').data(diagLines).enter().append('line')
    .classed('flowmatch', true)
    .attr("stroke", "steelblue")
    .attr("stroke-width", 1)
  .attr('x1', function(d, i) {return (d as DiagLine).start.x})
  .attr('y1', function(d, i) {return (d as DiagLine).start.y})
  .attr('x2', function(d, i) {return (d as DiagLine).end.x})
  .attr('y2', function(d,i) {return (d as DiagLine).end.y})

    ontg.selectAll('text.flowmatch').data(diagLines).enter().append('text')
    .classed('flowmatch', true)
    .attr("stroke", "steelblue")
    .attr("stroke-width", 1)
  .attr('x', function(d, i) {return (d as DiagLine).start.x})
  .attr('y', function(d, i) {return (d as DiagLine).start.y})
        .text(function (d, i) {
        return (d as DiagLine).label;
      })
      .attr("fill", "blue");



  }

  mFindOltPortRectRec(
    portList: DiagOltPortRectRec[][],
    cardPos: DiagCardPos,
    portName: string
  ): DiagOltPortRectRec | number {
    for (let oo of portList) {
      for (let zz of oo) {
        if (
          zz.cardPos.shelf === cardPos.shelf &&
          zz.cardPos.slot === cardPos.slot &&
          zz.name === portName
        ) {
          return zz;
        }
      }
    }
    return -1;
  }

  mFlowPathToDirectPath(paths: DiagFlowPath[], result: DiagFlowDirectPath[]) {
    function mRecurDiagPointTree(
      tree: DiagPointTree,
      prePath: DiagFlowDirectPath,
      result: DiagFlowDirectPath[]
    ) {
      let directPath: DiagFlowDirectPath = { flowId: 0, nodes: [] };
      for (let node of tree.node) {
        directPath.nodes.push({
          x: node.x,
          y: node.y,
        });
      }

      if (tree.splitTree && tree.splitTree.length > 0) {
        let appendPrePath: DiagFlowDirectPath = {
          flowId: prePath.flowId,
          nodes: [],
        };
        appendPrePath.nodes.push(...prePath.nodes);
        appendPrePath.nodes.push(...directPath.nodes);
        for (let item of tree.splitTree) {
          mRecurDiagPointTree(item, appendPrePath, result);
        }
      } else {
        let resultPath: DiagFlowDirectPath = {
          flowId: prePath.flowId,
          nodes: [],
        };
        resultPath.nodes.push(...prePath.nodes);
        resultPath.nodes.push(...directPath.nodes);
        console.log(' push result')
        result.push(resultPath);
      }
    }

    for (let path of paths) {
      let prePath: DiagFlowDirectPath = { flowId: path.flowId, nodes: [] };
      mRecurDiagPointTree(path.nodes, prePath, result);
    }
  }

  mToDiagCardPosStr(pos: DiagCardPos): string {
    return `sh${pos.shelf}sl${pos.slot}`;
  }

  mToDiagCardPos(posStr: string): DiagCardPos {
    let repStr = posStr.replace("sh", " ").replace("sl", " ").trim();
    let splitList = repStr.split(" ");
    return { shelf: parseInt(splitList[0]), slot: parseInt(splitList[1]) };
  }

  mCardVlans(ontCompose: DiagCompose): Map<string, Set<number>> {
    let cardMap = new Map<string, Set<number>>();
    for (let oo of ontCompose.flows) {
      let vlan = oo.oltOutVlan;
      for (let card of oo.oltOutPorts) {
        let cardPos: DiagCardPos = {
          shelf: card.shelf,
          slot: card.slot,
        };
        let oriVlans = cardMap.get(this.mToDiagCardPosStr(cardPos));
        if (oriVlans) {
          oriVlans.add(vlan);
        } else {
          oriVlans = new Set<number>();
          oriVlans.add(vlan);
          cardMap.set(this.mToDiagCardPosStr(cardPos), oriVlans);
        }
      }
    }

    return cardMap;
  }

  mFindOntPortRect(
    portName: string,
    ontPort: DiagRectRec[]
  ): DiagRectRec | number {
    for (let ii = 0; ii < ontPort.length; ii++) {
      if (ontPort[ii].name.indexOf(portName) != -1) {
        return ontPort[ii];
      }
    }
    return -1;
  }

  mRectTypeToPointType(recType: DiagRectType): FlowPointType {
    return FlowPointType.FlowPointTypeNone;
    let pointType;
    switch (recType) {
      case DiagRectType.DiagRectTypeOntUni:
        pointType = FlowPointType.FlowPointTypeOntUni;
        break;
      case DiagRectType.DiagRectTypeOntVeip:
        pointType = FlowPointType.FlowPointTypeOntVeip;
        break;
      case DiagRectType.DiagRectTypeOntInter:
        pointType = FlowPointType.FlowPointTypeOntInter;
        break;
      case DiagRectType.DiagRectTypeOltPon:
        pointType = FlowPointType.FLowPointTypeOltPon;
        break;
      case DiagRectType.DiagRectTypeOltPonBackend:
        pointType = FlowPointType.FlowPointTypeOltPonBackend;
        break;
      default:
        pointType = FlowPointType.FlowPointTypeNone;
        break;
    }
    return pointType;
  }

  created(): void {}

  mounted(): void {
    this.testDrawWithQos();
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
