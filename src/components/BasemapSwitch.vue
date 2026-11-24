<!--
  右上角底图切换：
  - data-base="ofm"     → OpenFreeMap 街道图（需联网）
  - data-base="outline" → 内置离线轮廓（outline-fallback.json）

  点击逻辑在 map-engine 的 bindBasemapSwitch / requestBase；
  用户点击优先于启动时的默认加载，避免竞态。
-->
<template>
  <div id="basemap-switch" role="radiogroup" aria-label="底图">
    <button type="button" data-base="ofm" aria-pressed="false">街道图</button>
    <button type="button" data-base="outline" aria-pressed="false">内置轮廓</button>
  </div>
</template>
