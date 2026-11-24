/**
 * Vue 组件 ↔ map-engine 的轻量桥。
 * TravelMap 启动引擎后 setMapApi；SidePanel / BasemapSwitch 通过 getMapApi 调能力。
 */
let api = null
let basemapHandler = null

export function setMapApi(next) {
  api = next
}

export function getMapApi() {
  return api
}

export function clearMapApi() {
  api = null
}

/** BasemapSwitch 注册，用于引擎自动回退轮廓时同步按钮高亮 */
export function setBasemapHandler(fn) {
  basemapHandler = fn
}

export function notifyBasemap(which) {
  if (typeof basemapHandler === 'function') basemapHandler(which)
}
