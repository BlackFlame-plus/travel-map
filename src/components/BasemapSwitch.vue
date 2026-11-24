<script setup lang="ts">
/**
 * 右上角底图切换（PC / H5 同一套，引擎会把本节点挪进 #map）。
 */
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { getMapApi, setBasemapHandler } from '../lib/map-bridge.js'

const current = ref<'ofm' | 'outline'>('ofm')

function pick(which: 'ofm' | 'outline') {
  current.value = which
  getMapApi()?.setBasemap?.(which)
}

onMounted(() => {
  setBasemapHandler((which: 'ofm' | 'outline') => {
    current.value = which
  })
  const api = getMapApi()
  if (api?.getBasemap) current.value = api.getBasemap()
})

onBeforeUnmount(() => {
  setBasemapHandler(null)
})
</script>

<template>
  <div id="basemap-switch" role="radiogroup" aria-label="底图">
    <el-button
      size="small"
      :type="current === 'ofm' ? 'primary' : 'default'"
      :aria-pressed="current === 'ofm' ? 'true' : 'false'"
      data-base="ofm"
      @click="pick('ofm')"
    >
      街道图
    </el-button>
    <el-button
      size="small"
      :type="current === 'outline' ? 'primary' : 'default'"
      :aria-pressed="current === 'outline' ? 'true' : 'false'"
      data-base="outline"
      @click="pick('outline')"
    >
      内置轮廓
    </el-button>
  </div>
</template>
