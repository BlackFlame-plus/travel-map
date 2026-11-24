<!--
  侧栏 / 移动端底部抽屉「地点与说明」。

  重要：下面这些 id 和 data-* 被 map-engine.js 用 getElementById / querySelector 绑定，
  改名会导致筛选、搜索、视图切换全部失效。

  - #panel / #panel-grip / #panel-body  面板壳与展开收起
  - [data-view]                         视图按钮（play/urban/… 对应 map-meta.views）
  - #btn-names / #btn-areas             地点名 / 区域名开关
  - #search                             搜索框
  - [data-cat]                          类型筛选（scenic/food/bar/culture）
  - #doc-guide / #list / #detail        由引擎动态填 HTML
-->
<template>
  <aside id="panel">
    <button type="button" id="panel-grip" aria-expanded="false">
      地点与说明 <span class="chev">展开 ▴</span>
    </button>
    <div id="panel-body">
      <div class="tools">
        <button type="button" data-view="play">游玩区</button>
        <button type="button" data-view="urban">市区</button>
        <button type="button" data-view="full">全域</button>
        <button type="button" data-view="oldtown">老城放大</button>
        <button type="button" data-view="east">东部岸线</button>
        <button type="button" data-view="taiqing">太清</button>
        <button type="button" id="btn-names" class="active">地点名</button>
        <button type="button" id="btn-areas" class="active">区域名</button>
      </div>
      <input
        id="search"
        type="search"
        enterkeyhint="search"
        placeholder="搜索地点、地址或备注"
        autocomplete="off"
      />
      <div class="tools">
        <button type="button" class="chip active" data-cat="scenic">景点</button>
        <button type="button" class="chip active" data-cat="food">餐饮</button>
        <button type="button" class="chip active" data-cat="bar">酒馆</button>
        <button type="button" class="chip active" data-cat="culture">文创体验</button>
      </div>
      <div class="legend">
        <span><i class="swatch scenic" />景点（青/蓝）</span>
        <span><i class="swatch food" />餐饮（橙）</span>
        <span><i class="swatch bar" />酒馆（紫）</span>
        <span><i class="swatch culture" />文创体验（绿）</span>
      </div>
      <p class="hint">
        地点名默认常显，图标不编号，用颜色区分类型。实心小点多为已核实精确位置；描边小点与虚线圈表示街区、院落或候选分店的<strong>约略范围</strong>，不是店门口实测。若两个点共用同一中心，图上会稍作偏移并用细线指回真实中心。
        底图默认尝试加载 OpenFreeMap 街道图（官方公开无密钥矢量服务，Liberty 样式，独立供应商，不是 OSM 官方瓦片的镜像或换域）。需联网读取其公开样式与矢量数据；失败则回到内置地理轮廓。右上角两个按钮只在「街道图」（OpenFreeMap）和「内置轮廓」之间切换。坐标均为 WGS84。本页不作预订。
      </p>
      <div id="doc-guide" />
      <div class="section-title">地点清单</div>
      <div id="list" />
      <div id="detail" />
    </div>
  </aside>
</template>
