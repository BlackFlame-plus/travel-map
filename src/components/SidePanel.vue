<script setup lang="ts">
/**
 * PC：右侧常驻栏
 * H5：底部半屏面板（贴在 #main 里，不占满全屏、无遮罩），上方地图可继续拖动
 *
 * PC / H5 互斥挂载，保证 PanelBody（#list）同一时间只有一份。
 */
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ArrowDown, ArrowUp } from '@element-plus/icons-vue'
import PanelBody from './PanelBody.vue'
import { useIsMobile } from '../composables/useBreakpoint'
import { getMapApi, setPanelCloseHandler } from '../lib/map-bridge.js'

const { isMobile } = useIsMobile()
/** 仅 H5 使用；PC 始终可视 */
const panelOpen = ref(false)

function notifyEngine() {
  const open = !isMobile.value || panelOpen.value
  getMapApi()?.setPanelOpen?.(open)
}

function openPanel() {
  panelOpen.value = true
}

function closePanel() {
  panelOpen.value = false
}

onMounted(() => {
  setPanelCloseHandler(() => {
    if (isMobile.value) closePanel()
  })
})

onBeforeUnmount(() => {
  setPanelCloseHandler(null)
})

watch(
  isMobile,
  (mobile) => {
    panelOpen.value = !mobile
    nextTick(() => {
      notifyEngine()
      getMapApi()?.refreshUi?.()
    })
  },
  { immediate: true },
)

watch(panelOpen, (open) => {
  nextTick(() => {
    notifyEngine()
    if (open) getMapApi()?.refreshUi?.()
  })
})

defineExpose({ openPanel, closePanel, panelOpen })
</script>

<template>
  <!-- ===== PC：右侧固定栏 ===== -->
  <aside
    v-if="!isMobile"
    id="panel"
    class="pc-panel"
    aria-label="地点与说明"
  >
    <div class="pc-panel-title">地点与说明</div>
    <PanelBody />
  </aside>

  <!-- ===== H5：底部半屏（无全屏遮罩，地图上半区可交互） ===== -->
  <template v-else>
    <div
      v-show="!panelOpen"
      class="h5-dock"
      id="panel-grip"
    >
      <el-button
        type="primary"
        round
        size="large"
        class="h5-dock-btn"
        aria-expanded="false"
        @click="openPanel"
      >
        地点与说明
        <el-icon class="el-icon--right"><ArrowUp /></el-icon>
      </el-button>
    </div>

    <aside
      v-show="panelOpen"
      id="h5-sheet"
      class="h5-sheet"
      aria-label="地点与说明"
    >
      <div class="h5-sheet-head">
        <span class="h5-sheet-title">地点与说明</span>
        <el-button text type="primary" @click="closePanel">
          收起
          <el-icon class="el-icon--right"><ArrowDown /></el-icon>
        </el-button>
      </div>
      <PanelBody />
    </aside>
  </template>
</template>

<style scoped>
.pc-panel {
  flex: 0 0 340px;
  width: 340px;
  max-width: 100%;
  background: var(--panel, #fffdf8);
  border-left: 1px solid var(--line, #d8d0c4);
  display: flex;
  flex-direction: column;
  min-height: 0;
  z-index: 30;
  box-shadow: -6px 0 20px rgba(28, 42, 46, 0.06);
}
.pc-panel-title {
  flex: 0 0 auto;
  padding: 12px 14px 8px;
  font-weight: 700;
  font-size: 14px;
  border-bottom: 1px solid var(--line, #d8d0c4);
}

.h5-dock {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 2001;
  display: flex;
  justify-content: center;
  padding: 10px 16px calc(10px + env(safe-area-inset-bottom, 0px));
  pointer-events: none;
}
.h5-dock-btn {
  pointer-events: auto;
  min-width: 168px;
  box-shadow: 0 8px 24px rgba(28, 42, 46, 0.18);
}

/* 只占底部 ~55%，不盖住地图上半部分，因此地图仍可拖 */
.h5-sheet {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 2000;
  height: min(55vh, 520px);
  max-height: calc(100% - 72px);
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: var(--panel, #fffdf8);
  border-top: 1px solid var(--line, #d8d0c4);
  border-radius: 16px 16px 0 0;
  box-shadow: 0 -10px 28px rgba(28, 42, 46, 0.18);
  pointer-events: auto;
}
.h5-sheet-head {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--line, #d8d0c4);
}
.h5-sheet-title {
  font-weight: 700;
  font-size: 15px;
}
.h5-sheet :deep(.panel-body) {
  flex: 1 1 auto;
  min-height: 0;
}
</style>
