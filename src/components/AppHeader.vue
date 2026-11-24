<script setup lang="ts">
/**
 * 顶栏：标题 + 副标题。
 * 移动端 CSS 会隐藏 .sub，并给 header 加顶部内边距，避免贴住微信浏览器顶栏。
 */
defineProps<{
  title: string
  subtitle: string
}>()
</script>

<template>
  <header class="app-head">
    <div class="head-text">
      <h1>{{ title }}</h1>
      <div class="sub">{{ subtitle }}</div>
    </div>
  </header>
</template>
