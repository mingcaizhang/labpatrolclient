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
