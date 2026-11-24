<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { bootQingdaoMap } from '../lib/map-engine.js'

let handle: { destroy: () => void } | null = null

onMounted(() => {
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
