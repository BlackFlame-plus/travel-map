/**
 * Vue 组件 ↔ map-engine 的轻量桥。
 * TravelMap 启动引擎后 setMapApi；SidePanel / BasemapSwitch 通过 getMapApi 调能力。
 */
let api = null
let basemapHandler = null
let panelCloseHandler = null
/** @type {Set<Function>} */
const planStateHandlers = new Set()

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

/** SidePanel 注册：H5 从清单点选地点后收起底部菜单 */
export function setPanelCloseHandler(fn) {
  panelCloseHandler = fn
}

export function notifyPanelClose() {
  if (typeof panelCloseHandler === 'function') panelCloseHandler()
}

/**
 * 订阅计划模式状态（BasemapSwitch / PlanDaySwitch / PanelBody 可同时订）。
 * 返回取消订阅函数。
 */
export function subscribePlanState(fn) {
  if (typeof fn !== 'function') return () => {}
  planStateHandlers.add(fn)
  return () => {
    planStateHandlers.delete(fn)
  }
}

/** @deprecated 单槽位；请用 subscribePlanState */
export function setPlanStateHandler(fn) {
  planStateHandlers.clear()
  if (typeof fn === 'function') planStateHandlers.add(fn)
}

export function notifyPlanState(payload) {
  planStateHandlers.forEach((fn) => {
    try {
      fn(payload)
    } catch (e) {
      /* ignore subscriber errors */
    }
  })
}
