<script setup lang="ts">
/**
 * PC：右侧常驻栏
 * H5：底部 el-drawer（Element Plus）+ 收起时底部悬浮按钮
 *
 * PC / H5 互斥挂载，保证 PanelBody（#list）同一时间只有一份。
 * 抽屉 destroy-on-close=false，打开过后清单 DOM 会保留。
 */
import { nextTick, ref, watch } from 'vue'
import { ArrowDown, ArrowUp } from '@element-plus/icons-vue'
import PanelBody from './PanelBody.vue'
import { useIsMobile } from '../composables/useBreakpoint'
import { getMapApi } from '../lib/map-bridge.js'

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

  <!-- ===== H5：Element Plus 底部抽屉 ===== -->
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

    <el-drawer
      v-model="panelOpen"
      class="h5-place-drawer"
      direction="btt"
      size="58%"
      :with-header="true"
      :show-close="false"
      :append-to-body="true"
      :destroy-on-close="false"
      :modal="false"
      :z-index="3000"
    >
      <template #header>
        <div class="h5-drawer-head">
          <span class="h5-drawer-title">地点与说明</span>
          <el-button text type="primary" @click="closePanel">
            收起
            <el-icon class="el-icon--right"><ArrowDown /></el-icon>
          </el-button>
        </div>
      </template>
      <PanelBody />
    </el-drawer>
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

.h5-drawer-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 8px;
}
.h5-drawer-title {
  font-weight: 700;
  font-size: 15px;
}
</style>

<style>
/* drawer 挂到 body，需全局样式 */
.h5-place-drawer.el-drawer {
  border-radius: 16px 16px 0 0;
  overflow: hidden;
  background: var(--panel, #fffdf8);
}
.h5-place-drawer .el-drawer__header {
  margin-bottom: 0;
  padding: 12px 14px;
  border-bottom: 1px solid var(--line, #d8d0c4);
}
.h5-place-drawer .el-drawer__body {
  padding: 0;
  overflow: auto;
  -webkit-overflow-scrolling: touch;
  background: var(--panel, #fffdf8);
}
/* 无 mask：全屏容器不拦事件，只有抽屉本体可点；地图可继续拖 */
body .el-overlay-dialog:has(.h5-place-drawer),
body .el-drawer__container:has(.h5-place-drawer) {
  pointer-events: none !important;
  background: transparent !important;
}
.h5-place-drawer.el-drawer {
  box-shadow: 0 -10px 28px rgba(28, 42, 46, 0.18);
  pointer-events: auto !important;
}
</style>
