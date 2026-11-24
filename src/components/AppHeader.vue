<script setup lang="ts">
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
