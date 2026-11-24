<script setup lang="ts">
/**
 * PC：右侧常驻栏
 * H5：底部抽屉式面板（收起只留握把；展开约半屏）
 *
 * 不用 el-drawer 的原因：关闭时内容可能未挂载，#list/#detail 会被引擎写丢。
 * 这里用同一套 DOM + v-show，保证清单节点始终存在；控件仍全部用 Element Plus。
 */
import { nextTick, ref, watch } from 'vue'
import { ArrowDown, ArrowUp } from '@element-plus/icons-vue'
import PanelBody from './PanelBody.vue'
import { useIsMobile } from '../composables/useBreakpoint'
import { getMapApi } from '../lib/map-bridge.js'

const { isMobile } = useIsMobile()
const panelOpen = ref(true)

function notifyEngine() {
  const open = !isMobile.value || panelOpen.value
  getMapApi()?.setPanelOpen?.(open)
}

function togglePanel() {
  if (!isMobile.value) return
  panelOpen.value = !panelOpen.value
}

function openPanel() {
  panelOpen.value = true
}

watch(
  isMobile,
  (mobile) => {
    // H5 默认收起，避免挡住地图；PC 始终展开
    panelOpen.value = !mobile
    nextTick(() => {
      notifyEngine()
      getMapApi()?.refreshUi?.()
    })
  },
  { immediate: true },
)

watch(panelOpen, () => {
  nextTick(notifyEngine)
})

defineExpose({ openPanel, panelOpen })
</script>

<template>
  <aside
    id="panel"
    class="side-panel"
    :class="{
      'is-h5': isMobile,
      collapsed: isMobile && !panelOpen,
    }"
    aria-label="地点与说明"
  >
    <!-- H5 握把 / 标题条：展开与收起都显示 -->
    <button
      v-if="isMobile"
      type="button"
      id="panel-grip"
      class="h5-grip"
      :aria-expanded="panelOpen ? 'true' : 'false'"
      @click="togglePanel"
    >
      地点与说明
      <el-icon class="chev">
        <ArrowDown v-if="panelOpen" />
        <ArrowUp v-else />
      </el-icon>
      <span class="grip-action">{{ panelOpen ? '收起' : '展开' }}</span>
    </button>

    <div v-else class="pc-panel-title">地点与说明</div>

    <!-- v-show：收起时仍保留 DOM，引擎可继续写 #list -->
    <PanelBody v-show="!isMobile || panelOpen" />
  </aside>
</template>

<style scoped>
.side-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: var(--panel, #fffdf8);
  z-index: 30;
  pointer-events: auto;
}

/* —— PC —— */
.side-panel:not(.is-h5) {
  flex: 0 0 340px;
  width: 340px;
  max-width: 100%;
  border-left: 1px solid var(--line, #d8d0c4);
  box-shadow: -6px 0 20px rgba(28, 42, 46, 0.06);
}
.pc-panel-title {
  flex: 0 0 auto;
  padding: 12px 14px 8px;
  font-weight: 700;
  font-size: 14px;
  border-bottom: 1px solid var(--line, #d8d0c4);
}

/* —— H5：贴底抽屉 —— */
.side-panel.is-h5 {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  max-height: 52vh;
  border-left: 0;
  border-top: 1px solid var(--line, #d8d0c4);
  border-radius: 14px 14px 0 0;
  box-shadow: 0 -8px 24px rgba(28, 42, 46, 0.14);
  z-index: 2000;
}
.side-panel.is-h5.collapsed {
  max-height: calc(44px + env(safe-area-inset-bottom, 0px));
  overflow: hidden;
}
.h5-grip {
  flex: 0 0 auto;
  min-height: 44px;
  padding: 0 12px;
  padding-bottom: env(safe-area-inset-bottom, 0px);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  border: 0;
  background: var(--panel, #fffdf8);
  color: var(--ink, #1c2a2e);
  font: inherit;
  font-weight: 650;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}
.grip-action {
  margin-left: 4px;
  font-size: 12px;
  font-weight: 500;
  color: var(--muted, #5a686c);
}
.chev {
  font-size: 14px;
  color: var(--muted, #5a686c);
}
</style>
