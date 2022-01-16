import request from '@/utils/request'
export const getAxosCard = (params: any) =>
  request({
    url: '/axoscard',
    method: 'get',
    params
  })

export const getExaCard = (params: any) =>
  request({
    url: '/exacard',
    method: 'get',
    params
  })

export const getAxosOnt = (params: any) =>
  request({
    url: '/axosont',
    method: 'get',
    params
  })

export const getExaOnt = (params: any) =>
  request({
    url: '/exaont',
    method: 'get',
    params
  })

export const getExaModule = (params: any) =>
  request({
    url: '/examodule',
    method: 'get',
    params
  })

export const getAxosModule = (params: any) =>
  request({
    url: '/axosmodule',
    method: 'get',
    params
  })

  export const getAxosCardIp = (params: any) =>
  request({
    url: '/axoscardip',
    method: 'get',
    params
  })

export const getExaCardIp = (params: any) =>
  request({
    url: '/exacardip',
    method: 'get',
    params
  })

export const getAxosOntIp = (params: any) =>
  request({
    url: '/axosontip',
    method: 'get',
    params
  })

export const getExaOntIp = (params: any) =>
  request({
    url: '/exaontip',
    method: 'get',
    params
  })

export const getExaModuleIp = (params: any) =>
  request({
    url: '/examoduleip',
    method: 'get',
    params
  })

export const getAxosModuleIp = (params: any) =>
  request({
    url: '/axosmoduleip',
    method: 'get',
    params
  })  

  export const getAxosTopo = (params: any) =>
  request({
    url: '/axostopo',
    method: 'get',
    params
  })    