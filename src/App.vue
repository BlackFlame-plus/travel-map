<script setup lang="ts">
/**
 * 页面骨架。
 * 点地图地点只开左上角详情卡；H5 底部清单抽屉需用户手动点开。
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
    <TileBanner />
    <!-- 引擎挪进 #map：左上角悬浮详情卡 -->
    <div id="detail" class="detail-card" aria-live="polite" />
    <SidePanel />
  </div>
</template>
