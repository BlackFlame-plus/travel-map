<script setup lang="ts">
/**
 * 页面骨架（从上到下）：
 * 1. AppHeader     — 顶栏标题
 * 2. #main 内：
 *    - TravelMap     — Leaflet 地图容器（真正逻辑在 map-engine）
 *    - BasemapSwitch — 右上角「街道图 / 内置轮廓」
 *    - coverage-note — 离线轮廓时的范围提示
 *    - TileBanner    — 底图加载状态黄条
 *    - SidePanel     — 右侧/底部「地点与说明」面板
 *
 * 注意：侧栏按钮、搜索、列表点击等事件，是 map-engine 用原生 DOM
 * 按固定 id / data-* 绑定的，所以这些 id 不要随便改。
 */
import AppHeader from './components/AppHeader.vue'
import TravelMap from './components/TravelMap.vue'
import SidePanel from './components/SidePanel.vue'
import BasemapSwitch from './components/BasemapSwitch.vue'
import TileBanner from './components/TileBanner.vue'
</script>

<template>
  <AppHeader
    title="元旦青岛候选地点地图"
    subtitle="用于行程筛选 · 名单 1–26 全部保留，并已补入用户文档地点，42项待定位已逐条核验 · 坐标 WGS84 · 约略点不是精确店址"
  />
  <div id="main">
    <TravelMap />
    <BasemapSwitch />
    <div id="coverage-note">虚线框内为已加载的离线陆海；框外是未加载范围，不是海。</div>
    <TileBanner />
    <SidePanel />
  </div>
</template>
