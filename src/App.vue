<script setup lang="ts">
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
