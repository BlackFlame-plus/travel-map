<script setup lang="ts">
/**
 * 顶栏：PC 显示标题+副标题；H5 只显示标题（副标题用 CSS/此处 v-if 藏）
 * 顶部 padding 含 safe-area，避免微信里贴顶。
 */
import { useIsMobile } from '../composables/useBreakpoint'

defineProps<{
  title: string
  subtitle: string
}>()

const { isMobile } = useIsMobile()
</script>

<template>
  <header class="app-head">
    <div class="head-text">
      <h1>{{ title }}</h1>
      <div v-if="!isMobile" class="sub">{{ subtitle }}</div>
    </div>
  </header>
</template>
