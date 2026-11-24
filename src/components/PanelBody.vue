<script setup lang="ts">
/**
 * 侧栏内容（PC 右侧栏 / H5 抽屉共用这一份，保证 #list #detail 只有一份 DOM）。
 * 浏览模式：按类型筛选；计划模式：引擎按当日节点灌 #list。
 */
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { getMapApi, subscribePlanState } from '../lib/map-bridge.js'

const CATS = [
  { key: 'scenic', label: '景点' },
  { key: 'food', label: '餐饮' },
  { key: 'coffee', label: '咖啡' },
  { key: 'bar', label: '酒馆' },
  { key: 'culture', label: '文创体验' },
] as const

const query = ref('')
const planMode = ref(true)
const contentStatus = ref('awaiting-planner')
const skipHints = ref<string[]>([])
const catOn = reactive({
  scenic: true,
  food: true,
  coffee: true,
  bar: true,
  culture: true,
})

let unsub: (() => void) | null = null

const listTitle = computed(() => (planMode.value ? '当日行程节点' : '地点清单'))

function api() {
  return getMapApi()
}

function onSearch(val: string) {
  query.value = val
  api()?.setQuery?.(val)
}

function onCatChange(key: keyof typeof catOn, checked: boolean) {
  catOn[key] = checked
  api()?.setCategory?.(key, checked)
}

onMounted(() => {
  unsub = subscribePlanState((payload: {
    planMode?: boolean
    contentStatus?: string
    skipHints?: string[]
  }) => {
    if (typeof payload.planMode === 'boolean') planMode.value = payload.planMode
    if (payload.contentStatus != null) contentStatus.value = payload.contentStatus
    if (Array.isArray(payload.skipHints)) skipHints.value = payload.skipHints
  })
  const s = api()?.getPlanState?.()
  if (s) {
    planMode.value = !!s.planMode
    contentStatus.value = s.contentStatus || contentStatus.value
    skipHints.value = s.skipHints || []
  }
  api()?.refreshUi?.()
})

onBeforeUnmount(() => {
  unsub?.()
  unsub = null
})
</script>

<template>
  <div id="panel-body" class="panel-body">
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
      <p v-if="planMode" class="filter-hint">
        类型标签在计划模式下仍过滤当日节点内地点；关闭「计划」可浏览全部地点。
      </p>
    </div>

    <div v-if="!planMode" class="legend">
      <span><i class="swatch scenic" />景点（青/蓝）</span>
      <span><i class="swatch food" />餐饮（橙）</span>
      <span><i class="swatch coffee" />咖啡（棕）</span>
      <span><i class="swatch bar" />酒馆（紫）</span>
      <span><i class="swatch culture" />文创体验（绿）</span>
    </div>

    <div v-if="planMode" class="plan-banner">
      <p v-if="contentStatus === 'awaiting-planner'" class="hint">
        行程内容待策划写入 <code>trip-plan.json</code>（当前为 schema 骨架，非最终行程）。
      </p>
      <ul v-if="skipHints.length" class="plan-skip-hints">
        <li v-for="(h, i) in skipHints" :key="i">{{ h }}</li>
      </ul>
    </div>

    <!-- 浏览模式：行程说明；计划模式隐藏，避免与节点清单混淆 -->
    <div v-show="!planMode" id="doc-guide" />
    <div class="section-title">{{ listTitle }}</div>
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
.search-input {
  margin-bottom: 8px;
}
.filter-hint {
  margin: 6px 0 0;
  font-size: 11px;
  color: var(--muted, #5c6568);
  line-height: 1.35;
}
.plan-banner {
  margin: 0 0 8px;
}
.plan-banner .hint {
  margin: 0;
  font-size: 12px;
  color: var(--muted, #5c6568);
  line-height: 1.4;
}
.plan-banner code {
  font-size: 11px;
}
.plan-skip-hints {
  margin: 6px 0 0;
  padding-left: 18px;
  font-size: 11px;
  color: #8a4b1a;
  line-height: 1.4;
}
@media (max-width: 360px) {
  .panel-body {
    padding: 8px 8px calc(16px + env(safe-area-inset-bottom, 0px));
  }
}
</style>
