<script setup lang="ts">
/**
 * 侧栏内容（PC 右侧栏 / H5 抽屉共用这一份，保证 #list #detail 只有一份 DOM）。
 * 交互走 Element Plus；真正改地图状态走 getMapApi()。
 */
import { onMounted, reactive, ref } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { getMapApi } from '../lib/map-bridge.js'

const CATS = [
  { key: 'scenic', label: '景点' },
  { key: 'food', label: '餐饮' },
  { key: 'bar', label: '酒馆' },
  { key: 'culture', label: '文创体验' },
] as const

const query = ref('')
const showNames = ref(true)
const showAreas = ref(true)
const catOn = reactive({
  scenic: true,
  food: true,
  bar: true,
  culture: true,
})

function api() {
  return getMapApi()
}

function onSearch(val: string) {
  query.value = val
  api()?.setQuery?.(val)
}

function onNamesChange(val: boolean | string | number) {
  const on = !!val
  showNames.value = on
  api()?.setShowNames?.(on)
}

function onAreasChange(val: boolean | string | number) {
  const on = !!val
  showAreas.value = on
  api()?.setShowAreas?.(on)
}

function onCatChange(key: keyof typeof catOn, checked: boolean) {
  catOn[key] = checked
  api()?.setCategory?.(key, checked)
}

/** PC↔H5 切换或抽屉重挂后，让引擎把清单重新灌进当前 #list */
onMounted(() => {
  api()?.refreshUi?.()
})
</script>

<template>
  <div id="panel-body" class="panel-body">
    <div class="tool-block switch-row">
      <div class="switch-item">
        <span class="switch-label">地点名</span>
        <el-switch
          :model-value="showNames"
          size="small"
          inline-prompt
          active-text="开"
          inactive-text="关"
          @change="onNamesChange"
        />
      </div>
      <div class="switch-item">
        <span class="switch-label">区域名</span>
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

    <el-input
      id="search"
      :model-value="query"
      clearable
      size="default"
      placeholder="搜索地点、地址或备注"
      :prefix-icon="Search"
      class="search-input"
      @update:model-value="onSearch"
    />

    <div class="tool-block">
      <el-space wrap :size="6">
        <el-check-tag
          v-for="c in CATS"
          :key="c.key"
          :checked="catOn[c.key]"
          @change="(v) => onCatChange(c.key, v)"
        >
          {{ c.label }}
        </el-check-tag>
      </el-space>
    </div>

    <div class="legend">
      <span><i class="swatch scenic" />景点（青/蓝）</span>
      <span><i class="swatch food" />餐饮（橙）</span>
      <span><i class="swatch bar" />酒馆（紫）</span>
      <span><i class="swatch culture" />文创体验（绿）</span>
    </div>

    <!-- 引擎灌行程说明 / 清单；详情 #detail 已改成地图上的悬浮卡（见 App.vue） -->
    <div id="doc-guide" />
    <div class="section-title">地点清单</div>
    <div id="list" />
  </div>
</template>

<style scoped>
.panel-body {
  flex: 1 1 auto;
  overflow: auto;
  overscroll-behavior: contain;
  padding: 10px 12px calc(16px + env(safe-area-inset-bottom, 0px));
  min-height: 0;
  -webkit-overflow-scrolling: touch;
}
.tool-block {
  margin: 0 0 8px;
}
.switch-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16px 20px;
  align-items: center;
}
.switch-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.switch-label {
  font-size: 13px;
  font-weight: 650;
  color: var(--ink, #1c2a2e);
}
.search-input {
  margin-bottom: 8px;
}
@media (max-width: 360px) {
  .panel-body {
    padding: 8px 8px calc(16px + env(safe-area-inset-bottom, 0px));
  }
}
</style>
