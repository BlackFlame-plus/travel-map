<script setup lang="ts">
/**
 * 右上角地图控件：底图 + 地点名/区域名/计划 + 计划开启时的 Day 纵排
 * （引擎会把本节点挪进 #map；Day 嵌在控件内，避免被 H5 72vh 抽屉挡住）
 */
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { getMapApi, setBasemapHandler, subscribePlanState } from '../lib/map-bridge.js'

type DayBrief = { id: string; label: string }

const current = ref<'ofm' | 'outline'>('outline')
const showNames = ref(true)
const showAreas = ref(true)
/** 默认关闭计划模式 */
const planMode = ref(false)
const dayId = ref('')
const days = ref<DayBrief[]>([])

let unsubPlan: (() => void) | null = null

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

function onPlanChange(val: boolean | string | number) {
  const on = !!val
  planMode.value = on
  getMapApi()?.setPlanMode?.(on)
}

function pickDay(id: string) {
  dayId.value = id
  getMapApi()?.setPlanDay?.(id)
}

/** 按钮用短标签，完整主题留在侧栏 summary */
function dayBtnText(d: DayBrief) {
  if (d.id === 'day1') return 'Day 1'
  if (d.id === 'day2') return 'Day 2'
  if (d.id === 'day3') return 'Day 3'
  return d.label
}

onMounted(() => {
  setBasemapHandler((which: 'ofm' | 'outline') => {
    current.value = which
  })
  unsubPlan = subscribePlanState((payload: {
    planMode?: boolean
    dayId?: string
    days?: DayBrief[]
  }) => {
    if (typeof payload.planMode === 'boolean') planMode.value = payload.planMode
    if (payload.dayId != null) dayId.value = payload.dayId
    if (Array.isArray(payload.days)) days.value = payload.days
  })
  const api = getMapApi()
  if (api?.getBasemap) current.value = api.getBasemap()
  if (api?.getPlanState) {
    const s = api.getPlanState()
    planMode.value = !!s.planMode
    dayId.value = s.dayId || ''
    days.value = s.days || []
  }
})

onBeforeUnmount(() => {
  setBasemapHandler(null)
  unsubPlan?.()
  unsubPlan = null
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
      <div class="toggle-row">
        <span class="toggle-label">计划</span>
        <el-switch
          :model-value="planMode"
          size="small"
          inline-prompt
          active-text="开"
          inactive-text="关"
          @change="onPlanChange"
        />
      </div>
    </div>

    <div
      v-show="planMode && days.length"
      id="plan-day-switch"
      class="plan-days"
      role="tablist"
      aria-label="行程日"
    >
      <button
        v-for="d in days"
        :key="d.id"
        type="button"
        role="tab"
        class="plan-day-btn"
        :class="{ active: d.id === dayId }"
        :aria-selected="d.id === dayId ? 'true' : 'false'"
        @click="pickDay(d.id)"
      >
        {{ dayBtnText(d) }}
      </button>
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
.plan-days {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 6px;
  padding-top: 8px;
  border-top: 1px solid var(--line, #d8d0c4);
  max-height: min(28vh, 160px);
  overflow: auto;
}
.plan-day-btn {
  appearance: none;
  border: 1px solid var(--line, #d8d0c4);
  background: #fff;
  color: var(--ink, #1c2a2e);
  font: 650 12px/1.2 inherit;
  padding: 6px 10px;
  border-radius: 8px;
  min-width: 72px;
  cursor: pointer;
  text-align: center;
}
.plan-day-btn.active {
  background: var(--accent, #1a7a8c);
  border-color: var(--accent, #1a7a8c);
  color: #fff;
}
</style>
