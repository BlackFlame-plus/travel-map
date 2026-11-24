<script setup lang="ts">
/**
 * 地图壳：启动引擎、挂到 bridge，并在选中地点时通知 H5 打开侧栏。
 */
import { inject, onBeforeUnmount, onMounted } from 'vue'
import { bootQingdaoMap } from '../lib/map-engine.js'
import { clearMapApi, setMapApi } from '../lib/map-bridge.js'

let handle: { destroy: () => void } | null = null
const openSidePanel = inject<() => void>('openSidePanel', () => {})

onMounted(() => {
  handle = bootQingdaoMap({
    onRequestOpenPanel: () => openSidePanel(),
  })
  setMapApi(handle)
  handle.refreshUi?.()
})

onBeforeUnmount(() => {
  handle?.destroy()
  handle = null
  clearMapApi()
})
</script>

<template>
  <div id="map" role="application" aria-label="青岛候选地点地图" />
</template>
