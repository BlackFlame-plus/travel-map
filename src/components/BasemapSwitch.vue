<script setup lang="ts">
/**
 * 右上角地图控件：底图切换 + 地点名 / 区域名开关
 * （引擎会把本节点挪进 #map）
 */
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { getMapApi, setBasemapHandler } from '../lib/map-bridge.js'

const current = ref<'ofm' | 'outline'>('outline')
const showNames = ref(true)
const showAreas = ref(true)

function pick(which: 'ofm' | 'outline') {
  current.value = which
  getMapApi()?.setBasemap?.(which)
}

function onNamesChange(val: boolean | string | number) {
  const on = !!val
  showNames.value = on
  getMapApi()?.setShowNames?.(on)
}

function onAreasChange(val: boolean | string | number) {
  const on = !!val
  showAreas.value = on
  getMapApi()?.setShowAreas?.(on)
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
  <div id="basemap-switch" aria-label="地图显示">
    <div class="basemap-btns" role="radiogroup" aria-label="底图">
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

    <div class="label-toggles">
      <div class="toggle-row">
        <span class="toggle-label">地点名</span>
        <el-switch
          :model-value="showNames"
          size="small"
          inline-prompt
          active-text="开"
          inactive-text="关"
          @change="onNamesChange"
        />
      </div>
      <div class="toggle-row">
        <span class="toggle-label">区域名</span>
        <el-switch
          :model-value="showAreas"
          size="small"
          inline-prompt
          active-text="开"
          inactive-text="关"
          @change="onAreasChange"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.basemap-btns {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.label-toggles {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 2px;
  padding-top: 8px;
  border-top: 1px solid var(--line, #d8d0c4);
}
.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 88px;
}
.toggle-label {
  font-size: 12px;
  font-weight: 650;
  color: var(--ink, #1c2a2e);
  white-space: nowrap;
}
</style>
