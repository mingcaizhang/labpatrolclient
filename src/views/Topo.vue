<template>
  <div class="topo">
    <div>
      <svg width="1900" height="1500"></svg>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Watch } from "vue-property-decorator";
import { DiagLldpConn, DiagLldpNode,  FetchTopoResponse} from "@/utils/DiagPub";
import {getAxosTopo} from '@/api/DataFetch'
import * as d3 from "d3";
interface EdgeData {
  source: number,
  target: number,
  startText: string, 
  endText:string
}

interface DiagLldpNodeData extends DiagLldpNode {
  id: number
}
@Component({
  name: "Topo",
})
export default class Topo extends Vue {
  private portColorDef = {
    green: "#92D050",
    grey: "#AFABAB",
    red: "#C00000",
    blue: "#8FAADC",
    yellow: "#FCE170",
  };
  buildTopoData(lldpNodes:DiagLldpNode[]) {
    let nodeMap = new Map<string, DiagLldpNodeData>()
    let id = 0
    for (let node of lldpNodes)
    {
      let extendNode = <DiagLldpNodeData>node
      extendNode.id = id
      id++
      nodeMap.set(node.selfIp, extendNode)
    }

    let edges:EdgeData[] = []
    for (let node of nodeMap.values()) {
      let nodeIp = node.selfIp
      for (let conn of node.conns) {
        let peerIp = conn.peerIp
        let idx1 = nodeMap.get(nodeIp)?.id
        let idx2 = nodeMap.get(peerIp)?.id
        let exist = false
        if (idx1 === undefined || idx2 === undefined) {
          console.log(`no map found for ${nodeIp} ${peerIp}`)
          continue
        }
        for (let existingEdge of edges) {
          if ((existingEdge.source === idx1 && existingEdge.target === idx2) || 
              (existingEdge.source === idx2 && existingEdge.target === idx1)) {
                exist = true
                break
              }
        }

        if (exist === false) {
          edges.push({source: idx1, target: idx2,
                       startText:conn.portSelf as string,
                      endText:conn.peerPort as string})
        }
      }
    }

    return {nodeMap, edges}
  }
  buildTestData() {
    let lldpConnS1: DiagLldpConn[] = [
      {
        portSelf: "1/1/x1",
        peerPort: "1/2/x5",
        peerIp: "10.245.33.2",
      },
      {
        portSelf: "1/2/x1",
        peerPort: "1/1/x2",
        peerIp: "10.245.33.3",
      },
    ];

    let lldpConnS2: DiagLldpConn[] = [
      {
        portSelf: "1/2/x5",
        peerPort: "1/1/x1",
        peerIp: "10.245.33.1",
      },
      {
        portSelf: "1/2/x1",
        peerPort: "1/1/x3",
        peerIp: "10.245.33.3",
      },
    ];

    let lldpConnS3: DiagLldpConn[] = [
      {
        portSelf: "1/1/x2",
        peerPort: "1/2/x1",
        peerIp: "10.245.33.1",
      },
      {
        portSelf: "1/1/x3",
        peerPort: "1/2/x1",
        peerIp: "10.245.33.2",
      },
    ];

    let lldpNodes:DiagLldpNode[] = [
      {
        selfIp:'10.245.33.1',
        conns:lldpConnS1,
        nodeName:'E7-2-A'
      },

      {
        selfIp:'10.245.33.2',
        conns:lldpConnS2,
        nodeName:'E7-2-B'
      },
      {
        selfIp:'10.245.33.3',
        conns:lldpConnS3,
        nodeName:'E7-2-C'
      },
    ]

    let nodeMap = new Map<string, DiagLldpNodeData>()
    let id = 0
    for (let node of lldpNodes) {
      let extendNode = <DiagLldpNodeData>(node)
      extendNode.id = id
      id++
      nodeMap.set(node.selfIp, extendNode)
    }
    let edges:EdgeData[] = []
    for (let node of nodeMap.values()) {
      let nodeIp = node.selfIp
      for (let conn of node.conns) {
        let peerIp = conn.peerIp
        let idx1 = nodeMap.get(nodeIp)?.id
        let idx2 = nodeMap.get(peerIp)?.id
        let exist = false
        if (idx1 === undefined || idx2 === undefined) {
          console.log(`no map found for ${nodeIp} ${peerIp}`)
          continue
        }
        for (let existingEdge of edges) {
          if ((existingEdge.source === idx1 && existingEdge.target === idx2) || 
              (existingEdge.source === idx2 && existingEdge.target === idx1)) {
                exist = true
                break
              }
        }

        if (exist === false) {
          edges.push({source: idx1, target: idx2,
                       startText:conn.portSelf as string,
                      endText:conn.peerPort as string})
        }
      }
    }

    return {nodeMap, edges}
  }


  async testDraw() {
    let that = this
    let res = await this.getTopo()
    if (res === -1) {
      return
    }
    let width = 1900 ,height = 1500
    let {nodeMap, edges} = this.buildTopoData(res as DiagLldpNode[])
    let nodes = [...nodeMap.values()]
    console.log(nodes.length)
    console.log(edges)


     let colorScale = d3.scaleOrdinal()      // @ts-ignore
      .domain(d3.range(nodes.length))
      .range(d3.schemeCategory10)   

    let forceSimulation = d3.forceSimulation()
      .force('link', d3.forceLink())
      .force('charge', d3.forceManyBody().strength(-30))
      .force('center', d3.forceCenter().strength(0.05))
      .force('collide', d3.forceCollide().radius(()=>40).iterations(2).strength(0.3))
      


    // @ts-ignore
    forceSimulation.nodes(nodes).on('tick', ticked)
    // @ts-ignore
    forceSimulation.force('link') // @ts-ignore
      .links(edges)               // @ts-ignore
      .distance(function (d) { // side length / 每一边的长度
        return  150
      })

    // @ts-ignore
    forceSimulation.force('center').x(width / 2)
      .y(height / 2)


    d3.select('svg').select('g').remove()
    let svg = d3.select('svg').attr('width', width).attr('height', height)
    let g = svg.append('g')
    let zoom =   d3.zoom().scaleExtent([.1, 3])
        .on('zoom', function (a) {
         svg.attr('transform', a.transform)
        })

    svg.call(
      // @ts-ignore
      zoom 
    )
// svg.call(d3.zoom().on("zoom", zoomed));
    // svg.call(d3.zoom().transform, d3.zoomIdentity);

    let links = g.append('g')
      .selectAll('line')
      .data(edges)
      .enter()
      .append('line')        // @ts-ignore
      .attr('stroke', function (d, i) {  // @ts-ignore
        return colorScale(i)
      })
      .attr('stroke-width', 1)       

    let linksText = g.append('g')
      .selectAll('text')
      .data(edges)
      .enter()
      .append('text')       // @ts-ignore
      .text(function (d) {
        // return (d as EdgeData).startText + '   ' + (d as EdgeData).endText
      })      
      
    let gs = g.selectAll('.circleText')
      .data(nodes)
      .enter()
      .append('g')
      .attr('transform', function (d) {      // @ts-ignore
        let cirX = d.x                      // @ts-ignore
        let cirY = d.y
        return 'translate(' + cirX + ',' + cirY + ')'
      })
    // gs.append('circle')
    //   .attr('r', 20)
    //   .attr('fill', function (d, i) { 
    //     return colorScale(i)
    //   })  
    let rectNode =  gs.append('rect')
      .attr('x', -15)
      .attr('y', -15)
      .attr('width',30)
      .attr('height',30)        // @ts-ignore
      .attr('fill', function (d, i) {       // @ts-ignore
        return colorScale(i)
        // return that.portColorDef.blue
      })      

   let labelNode = gs.append('text')
    .style("font", "14px times")
      .attr('x', -30)
      .attr('y', -10)
      .attr('dy', 10)
      .text(function (d) {
        return d.nodeName
      })   
      
    rectNode.on('mouseover', focus).on('mouseout', unfocus)     
    function neigh (a:DiagLldpNode, b:DiagLldpNode ):boolean {
        if (a === b) {
          return true
        }
        for (let lldp of a.conns) {
          if (lldp.peerIp === b.selfIp) {
            return true
          }
        }
        return false
    }   
    function focus (d:any) {
         // console.log(d) // eslint-disable-line
        let diagNode = d.target.__data__ as DiagLldpNode


        rectNode.style('opacity', function (o) { 
          return neigh(diagNode, o as DiagLldpNode) ? 1 : 0.1
        })
        labelNode.attr('display', function (o) {
          return neigh(diagNode, o as DiagLldpNode) ? 'block' : 'none'
        })

        links.style('opacity', function (o) {
          if (diagNode === o.source as unknown as DiagLldpNode || diagNode === o.target as unknown as DiagLldpNode) {
            return 1
          }else {
            return -1
          }
          // let match = neigh(diagNode, o.source as unknown as DiagLldpNode) || neigh(diagNode, o.target as unknow as DiagLldpNode) 
          // return match? 1: 0.1
         //  return o.source.index === index || o.target.index === index ? 1 : 0.1
        })
      }

      function unfocus () {
        labelNode.attr('display', 'block')
        rectNode.style('opacity', 1)
        links.style('opacity', 1)
      }

    function ticked () {
      links
        .attr('x1', function (d:any) { return d.source.x })
        .attr('y1', function (d:any) { return d.source.y })
        .attr('x2', function (d:any) { return d.target.x })
        .attr('y2', function (d:any) { return d.target.y })
      linksText
        .attr('x', function (d:any) { return (d.source.x + d.target.x) / 2 })
        .attr('y', function (d:any) { return (d.source.y + d.target.y) / 2 })
      gs
        .attr('transform', function (d:any) { return 'translate(' + d.x + ',' + d.y + ')' })
      // console.log(nodes[0])
    }
  }

  async getTopo(): Promise<DiagLldpNode[]| number> {
    let data:FetchTopoResponse
    data = (
      await getAxosTopo({})
    ).data

    if (data && data.code === 200) {
      if (data.message) {
        console.log(data.message.res)
        return data.message.res
      }
    }else {
      console.log('error to get the topo data')
      return -1
    }
    return -1
  }
  created(): void {}

  mounted(): void {
    this.testDraw();
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
