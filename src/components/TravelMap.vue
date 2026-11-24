<script setup lang="ts">
/**
 * 地图壳组件：只负责提供 #map 容器，并在挂载时启动 / 卸载时销毁引擎。
 * 不要在这里写 Leaflet 逻辑；全部在 ../lib/map-engine.js。
 */
import { onBeforeUnmount, onMounted } from 'vue'
import { bootQingdaoMap } from '../lib/map-engine.js'

let handle: { destroy: () => void } | null = null

onMounted(() => {
  // 启动地图：读 JSON 配置、画点、绑侧栏事件、切底图
  handle = bootQingdaoMap()
})

onBeforeUnmount(() => {
  handle?.destroy()
  handle = null
})
</script>

<template>
  <div id="map" role="application" aria-label="青岛候选地点地图" />
</template>
