/**
 * 青岛候选地点地图引擎（从旧版单文件 HTML 迁出，行为尽量不变）。
 *
 * 读懂顺序建议：
 * 1. 本文件顶部的配置 import（places / map-meta / offsets / outline）
 * 2. state / CATS / PREC_LABEL —— 运行时状态与枚举文案
 * 3. 分区注释：底图状态机 → 离线轮廓 → 标记点 → 常显标签 → 侧栏列表 → UI 绑定 → init
 *
 * 对外只导出 bootQingdaoMap()：由 TravelMap.vue 在 onMounted 调用。
 * 改地点数据请改 src/config/places.json，说明见 src/config/README.md。
 */
import L from "leaflet";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "@maplibre/maplibre-gl-leaflet";
import leafletIcon from "leaflet/dist/images/marker-icon.png";
import leafletIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import leafletShadow from "leaflet/dist/images/marker-shadow.png";
import maplibreWorkerSource from "maplibre-gl/dist/maplibre-gl-csp-worker.js?raw";

import places from "../config/places.json";
import mapMeta from "../config/map-meta.json";
import offsets from "../config/marker-offsets.json";
import fallback from "../config/outline-fallback.json";
import { notifyBasemap } from "./map-bridge.js";

/** 把四分配置合成引擎用的 DATA 对象 */
function buildData() {
  return Object.assign({}, mapMeta, { places: places, fallback: fallback });
}

/**
 * MapLibre 需要 Web Worker；单文件/CSP 场景下用 Blob URL 加载内联 worker 源码。
 * 失败时不影响内置轮廓底图。
 */
function setupMaplibreWorker() {
  try {
    if (!maplibregl || typeof maplibregl.setWorkerUrl !== "function") return;
    var blob = new Blob([maplibreWorkerSource], { type: "text/javascript" });
    maplibregl.setWorkerUrl(URL.createObjectURL(blob));
  } catch (err) {
    /* OFM 会回退到内置轮廓 */
  }
}

/* 部分桥接/插件期望全局 L / maplibregl */
if (typeof window !== "undefined") {
  window.maplibregl = maplibregl;
  window.L = L;
}


  var DATA = buildData();

  /** 类型 → 中文名 + 圆点颜色（与侧栏 chip / legend 一致） */
  var CATS = {
    scenic: { label: "景点", color: "#1a7a8c" },
    food: { label: "餐饮", color: "#d26512" },
    bar: { label: "酒馆", color: "#6b3d9c" },
    culture: { label: "文创体验", color: "#2a8a4e" }
  };

  /** precision 字段 → 侧栏徽章文案 */
  var PREC_LABEL = {
    exact: "精确位置",
    approx: "约略位置",
    area: "街区/范围",
    "area-ref": "范围参考",
    candidate: "候选（未指定）",
    pending: "待定位"
  };

  /**
   * 运行时 UI 状态（不写进 JSON）。
   * catOn / query 控制哪些点可见；selected 是当前选中的 id。
   */
  var state = {
    showNames: true,
    showAreas: true,
    catOn: { scenic: true, food: true, bar: true, culture: true },
    query: "",
    selected: null,
    tilesOk: false,
    fallbackOn: false,
    panelOpen: true,
    viewKey: "play"
  };

  var map, layers = {}, fallbackGroup, highlightGroup, labelRoot, svgRoot;
  /** id → { place, cand?, latlng, visLatLng, marker, circle } 便于点击/筛选联动 */
  var featureIndex = {};

  function $(id) { return document.getElementById(id); }

  function isMobile() {
    return window.matchMedia("(max-width: 720px)").matches;
  }

  /**
   * 展开「主点 + 候选点」成统一列表项。
   * 每项：{ parent: 主地点, item: 实际坐标对象, isCand: 是否候选 }
   */
  function allMapItems() {
    var out = [];
    DATA.places.forEach(function (p) {
      if (p.candidates && p.candidates.length) {
        p.candidates.forEach(function (c) {
          out.push({ parent: p, item: c, isCand: true });
        });
      }
      if (!p.hideDot && p.lat != null) {
        out.push({ parent: p, item: p, isCand: false });
      }
    });
    return out;
  }

  /* 重合点显示偏移（只影响画点位置，真实中心仍用 lat/lon） */
  var FIXED_OFFSET = offsets;

  /** 图上显示用的经纬度（可能加了偏移） */
  function visLatLngOf(rec) {
    var it = rec.item;
    var o = FIXED_OFFSET[it.id];
    if (o) return L.latLng(it.lat + o.dlat, it.lon + o.dlon);
    return L.latLng(it.lat, it.lon);
  }

  /** 真实中心（偏移线的终点） */
  function trueLatLngOf(rec) {
    return L.latLng(rec.item.lat, rec.item.lon);
  }

  /** 当前筛选（类型 + 搜索词）下该点是否显示 */
  function itemVisible(rec) {
    var p = rec.parent;
    var it = rec.item;
    if (!state.catOn[p.category]) return false;
    var q = state.query.trim().toLowerCase();
    if (q) {
      var blob = [p.num, p.name, it.name, p.address, it.address, p.note, it.note, p.label, it.label]
        .filter(Boolean).join(" ").toLowerCase();
      if (blob.indexOf(q) === -1) return false;
    }
    return true;
  }

  /** 地图常显名：优先 item.label → 候选 name → parent.label → name */
  function displayName(rec) {
    var it = rec.item;
    if (it.label) return it.label;
    if (rec.isCand) return it.name;
    if (rec.parent.label) return rec.parent.label;
    return it.name;
  }

  /* ========== 底图：只允许 OpenFreeMap 街道图 + 内置离线轮廓 ==========
     政策说明：OSM.org / OSM.de / OpenTopoMap 官方瓦片曾返回 403 拒绝图，
     本页不再请求它们，也不用代理/换域绕过。
     用户点击 #basemap-switch 优先于启动时的默认 OFM 加载（用 switchGen 防竞态）。 */
  var wantedBase = "内置地理轮廓（离线）";
  var OUTLINE_NAME = "内置地理轮廓（离线）";
  var OFM_NAME = "街道图（OpenFreeMap）";
  var OFM_STYLE = "https://tiles.openfreemap.org/styles/liberty";
  var OFM_ATTR = '&copy; <a href="https://openfreemap.org/">OpenFreeMap</a> &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> Data from <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
  var ofmLayer = null;
  var ofmAttrOn = false;
  /** 每次切底图 +1；过期的异步回调看到 gen 不一致就直接放弃 */
  var switchGen = 0;
  var defaultOfmStarted = false;
  var baseAbort = null;
  var ofmLoadHandler = null;
  var ofmErrorHandler = null;
  var ofmGl = null;
  var outlineZoomGroups = [];

  function clearBaseTimers() {
    /* timers were replaced by AbortController + generation; kept no-op name-free */
  }
  function setOutlineBounds(on) {
    if (!map) return;
    var cov = DATA.fallback && DATA.fallback.coverage && DATA.fallback.coverage.bbox;
    if (on && cov) {
      var pad = 0.03;
      map.setMaxBounds([
        [cov[0][0] - pad, cov[0][1] - pad],
        [cov[1][0] + pad, cov[1][1] + pad]
      ]);
    } else {
      map.setMaxBounds(null);
    }
    var note = $("coverage-note");
    if (note) note.style.display = on ? "block" : "none";
  }
  function syncBasemapButtons(name) {
    /* Vue 底图按钮高亮由 BasemapSwitch 管；这里只通知当前底图 */
    notifyBasemap(name === OFM_NAME ? "ofm" : "outline");
    var root = $("basemap-switch");
    if (!root) return;
    var btns = root.querySelectorAll("[data-base]");
    for (var i = 0; i < btns.length; i++) {
      var btn = btns[i];
      var on = (btn.getAttribute("data-base") === "ofm" && name === OFM_NAME) ||
               (btn.getAttribute("data-base") === "outline" && name === OUTLINE_NAME);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    }
  }
  function setOfmAttribution(on) {
    if (!map || !map.attributionControl) return;
    if (on && !ofmAttrOn) {
      map.attributionControl.addAttribution(OFM_ATTR);
      ofmAttrOn = true;
    } else if (!on && ofmAttrOn) {
      map.attributionControl.removeAttribution(OFM_ATTR);
      ofmAttrOn = false;
    }
  }
  function abortPending() {
    if (baseAbort) {
      try { baseAbort.abort(); } catch (err) {}
      baseAbort = null;
    }
    if (ofmGl) {
      try {
        if (ofmLoadHandler && typeof ofmGl.off === "function") ofmGl.off("load", ofmLoadHandler);
        if (ofmErrorHandler && typeof ofmGl.off === "function") ofmGl.off("error", ofmErrorHandler);
      } catch (err) {}
    }
    ofmLoadHandler = null;
    ofmErrorHandler = null;
    ofmGl = null;
  }
  function showOutlineLayer() {
    if (fallbackGroup && map && !map.hasLayer(fallbackGroup)) map.addLayer(fallbackGroup);
    if (ofmLayer && map && map.hasLayer(ofmLayer)) map.removeLayer(ofmLayer);
    setOutlineBounds(true);
    state.fallbackOn = true;
    state.tilesOk = false;
    setOfmAttribution(false);
    syncBasemapButtons(OUTLINE_NAME);
  }
  function showOfmLayerOnly() {
    if (ofmLayer && map && !map.hasLayer(ofmLayer)) map.addLayer(ofmLayer);
    if (fallbackGroup && map && map.hasLayer(fallbackGroup)) map.removeLayer(fallbackGroup);
    setOutlineBounds(false);
    state.fallbackOn = false;
    state.tilesOk = true;
    setOfmAttribution(true);
    syncBasemapButtons(OFM_NAME);
  }
  function showBanner(html, sticky) {
    var el = $("tile-banner");
    if (!el) return;
    el.innerHTML = html;
    el.classList.add("show");
    el.dataset.sticky = sticky ? "1" : "0";
  }
  function hideBannerSoft() {
    var el = $("tile-banner");
    if (!el || el.dataset.sticky === "1") return;
    el.classList.remove("show");
  }
  function ofmReady() {
    return !!(window.maplibregl && typeof L.maplibreGL === "function");
  }
  function makeOfmLayer() {
    if (!ofmReady()) return null;
    return L.maplibreGL({
      style: OFM_STYLE,
      interactive: false,
      pane: "tilePane",
      attributionControl: false
    });
  }

  /**
   * 切换底图。source: "init" = 启动默认；"user" = 用户点按钮。
   * OFM 未就绪前先显示轮廓；成功后再换成街道图。失败则留在轮廓并提示。
   */
  function requestBase(name, source) {
    switchGen += 1;
    var gen = switchGen;
    abortPending();
    wantedBase = name;
    var banner = $("tile-banner");
    if (banner) banner.dataset.sticky = "0";

    if (name === OUTLINE_NAME) {
      showOutlineLayer();
      showBanner("已使用内置地理轮廓（离线，不请求在线瓦片）。", false);
      return gen;
    }

    if (name !== OFM_NAME) {
      wantedBase = OUTLINE_NAME;
      showOutlineLayer();
      showBanner("本页仅提供街道图与内置轮廓。", true);
      return gen;
    }

    if (!ofmLayer) {
      wantedBase = OUTLINE_NAME;
      showOutlineLayer();
      showBanner("本页未能初始化 MapLibre，无法启用 OpenFreeMap 街道图。已使用内置轮廓。", true);
      return gen;
    }

    /* Keep outline visible until OFM is actually ready. */
    if (fallbackGroup && map && !map.hasLayer(fallbackGroup)) map.addLayer(fallbackGroup);
    setOutlineBounds(true);
    state.fallbackOn = true;
    syncBasemapButtons(OFM_NAME);
    showBanner("正在检查街道图（OpenFreeMap 官方样式，仅读取一份样式文件）…", false);

    var ac = (typeof AbortController === "function") ? new AbortController() : null;
    baseAbort = ac;
    var settled = false;

    function stale() {
      return gen !== switchGen || wantedBase !== OFM_NAME;
    }
    function ok() {
      if (settled || stale()) return;
      settled = true;
      abortPending();
      showOfmLayerOnly();
      showBanner("已使用街道图（OpenFreeMap Liberty，公开无密钥服务）。数据来自 OpenStreetMap。若底图未能出现，请点「内置轮廓」。", false);
    }
    function fail(msg) {
      if (settled || stale()) return;
      settled = true;
      abortPending();
      wantedBase = OUTLINE_NAME;
      showOutlineLayer();
      showBanner(msg, true);
    }

    function probeThenActivate() {
      if (stale()) return;
      var fetchFn = (typeof fetch === "function") ? fetch : null;
      if (!fetchFn) { fail("本环境无法检查 OpenFreeMap 样式。已使用内置轮廓。"); return; }
      var opts = { method: "GET", mode: "cors", credentials: "omit", cache: "default", redirect: "follow" };
      if (ac) opts.signal = ac.signal;
      fetchFn(OFM_STYLE, opts)
        .then(function (res) {
          if (stale()) return;
          if (res.status === 403 || res.status === 401 || res.status === 429) {
            fail("OpenFreeMap 样式返回 HTTP " + res.status + "。已回到内置轮廓，未继续请求。");
            return;
          }
          if (!res.ok) {
            fail("OpenFreeMap 样式请求失败（HTTP " + res.status + "）。已回到内置轮廓。");
            return;
          }
          activate();
        })
        .catch(function (err) {
          if (stale()) return;
          if (err && err.name === "AbortError") return;
          fail("OpenFreeMap 样式请求失败。已回到内置轮廓。");
        });
    }

    function activate() {
      if (stale()) return;
      if (ofmLayer && map && !map.hasLayer(ofmLayer)) map.addLayer(ofmLayer);
      var gl = (typeof ofmLayer.getMaplibreMap === "function") ? ofmLayer.getMaplibreMap() : null;
      ofmGl = gl;
      if (gl && typeof gl.once === "function") {
        ofmLoadHandler = function () { ok(); };
        ofmErrorHandler = function () { fail("OpenFreeMap 报告加载错误，已回到内置轮廓，未继续自动重试。"); };
        gl.once("load", ofmLoadHandler);
        gl.once("error", ofmErrorHandler);
        try {
          if (typeof gl.loaded === "function" && gl.loaded()) ok();
        } catch (err) {}
      } else if (gl && typeof gl.on === "function") {
        ofmLoadHandler = function () { ok(); };
        ofmErrorHandler = function () { fail("OpenFreeMap 报告加载错误，已回到内置轮廓，未继续自动重试。"); };
        gl.on("load", ofmLoadHandler);
        gl.on("error", ofmErrorHandler);
        try {
          if (typeof gl.loaded === "function" && gl.loaded()) ok();
        } catch (err) {}
      } else {
        /* No MapLibre events: treat add as success so the user is not stuck. */
        ok();
      }
    }

    probeThenActivate();
    return gen;
  }

  function startDefaultOfm() {
    if (defaultOfmStarted) return;
    defaultOfmStarted = true;
    requestBase(OFM_NAME, "init");
  }

  /** Vue BasemapSwitch 调用：which = "ofm" | "outline" */
  function setBasemap(which) {
    if (which === "outline") requestBase(OUTLINE_NAME, "user");
    else requestBase(OFM_NAME, "user");
  }

  function getBasemap() {
    return wantedBase === OFM_NAME ? "ofm" : "outline";
  }

/* ---------- 底图状态机结束 ---------- */

  /* ========== 离线轮廓样式（道路颜色/线宽/按缩放显隐）========== */
  var QD_OUTLINE_RENDER = {
    landPane: "outlinePane",
    landPaneZ: 350,
    detailPane: "detailPane",
    detailPaneZ: 380,
    roadStyle: {
      trunk: { color: "#c4a15a", weight: 2.2, opacity: 0.92, minZ: 9 },
      primary: { color: "#d0b27a", weight: 1.8, opacity: 0.9, minZ: 9 },
      secondary: { color: "#b8a888", weight: 1.45, opacity: 0.86, minZ: 9 },
      tertiary: { color: "#a9a090", weight: 1.2, opacity: 0.82, minZ: 10 },
      residential: { color: "#8f8a82", weight: 1.05, opacity: 0.82, minZ: 11 },
      service: { color: "#9a948c", weight: 0.9, opacity: 0.75, minZ: 11 },
      track: { color: "#8a7a62", weight: 0.95, opacity: 0.78, dashArray: "5 4", minZ: 11 },
      pedestrian: { color: "#9a8f7a", weight: 1.15, opacity: 0.84, dashArray: "3 3", minZ: 12 },
      path: { color: "#8d8070", weight: 0.9, opacity: 0.72, dashArray: "2 3", minZ: 12 }
    }
  };
  if (typeof window !== "undefined") window.QD_OUTLINE_RENDER = QD_OUTLINE_RENDER;

  /** 按当前缩放级别显示/隐藏不同等级的路网图层 */
  function syncOutlineZoom() {
    if (!map || !fallbackGroup) return;
    var z = map.getZoom();
    outlineZoomGroups.forEach(function (sub) {
      var on = z >= sub._minZ && z <= sub._maxZ;
      if (on && !fallbackGroup.hasLayer(sub)) fallbackGroup.addLayer(sub);
      if (!on && fallbackGroup.hasLayer(sub)) fallbackGroup.removeLayer(sub);
    });
  }

  /** 从 outline-fallback.json 生成 Leaflet 图层组（陆地/水/海岸/路/铁路） */
  function buildFallback() {
    outlineZoomGroups = [];
    var g = L.layerGroup();
    var fb = DATA.fallback || {};
    var outlinePane = "outlinePane";
    var detailPane = "detailPane";
    /* Land/sea are opaque SVG. Leaflet CSS paints any map-pane SVG (z 200)
       above any map-pane canvas (z 100), so roads must live in a higher pane
       than land, not merely a later-added canvas in the same pane. */
    var fillRenderer = L.canvas({ pane: detailPane, padding: 0.5 });
    var lineRenderer = L.canvas({ pane: detailPane, padding: 0.6 });
    var polyOpt = { interactive: false, noClip: true, smoothFactor: 0, pane: outlinePane };
    var strokeOpt = { interactive: false, noClip: true, smoothFactor: 0, pane: detailPane };
    var fillOpt = { interactive: false, renderer: fillRenderer, pane: detailPane, smoothFactor: 0 };
    var lineOpt = { interactive: false, renderer: lineRenderer, pane: detailPane, smoothFactor: 0 };

    function isLatLngPair(pt) {
      return pt && typeof pt[0] === "number" && typeof pt[1] === "number";
    }
    function ringsTo(arr, opt, target) {
      (arr || []).forEach(function (pts) {
        if (!pts || !pts.length) return;
        if (isLatLngPair(pts[0])) {
          if (pts.length < 2) return;
          L.polygon(pts, opt).addTo(target);
        } else if (pts[0] && pts[0].length) {
          L.polygon(pts, opt).addTo(target);
        }
      });
    }
    function linesTo(arr, opt, target) {
      (arr || []).forEach(function (pts) {
        if (!pts || pts.length < 2) return;
        L.polyline(pts, opt).addTo(target);
      });
    }
    function zoomSub(minZ, maxZ) {
      var sub = L.layerGroup();
      sub._minZ = minZ;
      sub._maxZ = maxZ == null ? 22 : maxZ;
      outlineZoomGroups.push(sub);
      return sub;
    }

    /* Coverage box is sea; land from OSM coastline; outside box is neutral unloaded, not sea. */
    var cov = fb.coverage && fb.coverage.bbox;
    if (cov) {
      L.rectangle(cov, Object.assign({
        color: "#8fb4c2", weight: 0, fillColor: "#b9d4de", fillOpacity: 1
      }, polyOpt)).addTo(g);
    }
    ringsTo(fb.land, Object.assign({ color: "#d3c6ae", weight: 0.4, fillColor: "#efe6d4", fillOpacity: 1 }, polyOpt), g);
    ringsTo(fb.water, Object.assign({ color: "#7aa9b8", weight: 0.4, fillColor: "#c5dde4", fillOpacity: 0.92 }, fillOpt), g);
    ringsTo(fb.park, Object.assign({ color: "#8aaa7a", weight: 0.3, fillColor: "#cfe3c0", fillOpacity: 0.82 }, fillOpt), g);
    ringsTo(fb.beach, Object.assign({ color: "#d2c29a", weight: 0.3, fillColor: "#f0e3c0", fillOpacity: 0.9 }, fillOpt), g);
    if (fb.coast) linesTo(fb.coast, Object.assign({ color: "#3e6d7a", weight: 1.2, opacity: 0.8 }, lineOpt), g);
    ringsTo(fb.pier, Object.assign({ color: "#8a7a68", weight: 1, fillColor: "#d9d0c4", fillOpacity: 0.95 }, fillOpt), g);

    var roads = fb.roads || {};
    var roadStyle = QD_OUTLINE_RENDER.roadStyle;
    Object.keys(roadStyle).forEach(function (k) {
      var st = roadStyle[k];
      var sub = zoomSub(st.minZ, 18);
      linesTo(roads[k], Object.assign({
        color: st.color, weight: st.weight, opacity: st.opacity, dashArray: st.dashArray || null
      }, lineOpt), sub);
    });
    var railSub = zoomSub(9, 18);
    linesTo(fb.railways, Object.assign({
      color: "#6a6570", weight: 1.35, opacity: 0.75, dashArray: "6 5"
    }, lineOpt), railSub);

    if (cov) {
      L.rectangle(cov, Object.assign({
        color: "#5c5852", weight: 1.4, dashArray: "7 5", fill: false
      }, strokeOpt)).addTo(g);
    }
    return g;
  }

  /** 从 map-meta.highlights 画强调线（如特定步行路线） */
  function buildHighlights() {
    var g = L.layerGroup();
    var h = DATA.highlights || {};
    var optLine = { pane: "overlayPane", interactive: false, smoothFactor: 0 };
    if (h.qinyu) {
      L.polyline(h.qinyu, Object.assign({ color: "#1a7a8c", weight: 3, opacity: 0.55 }, optLine)).addTo(g);
    }
    if (h.zhongshan) {
      L.polyline(h.zhongshan, Object.assign({ color: "#1a7a8c", weight: 3, opacity: 0.4 }, optLine)).addTo(g);
    }
    if (h.badaguan) {
      L.polygon(h.badaguan, {
        pane: "overlayPane",
        color: "#1a7a8c", weight: 1.2, dashArray: "4 3",
        fillColor: "#1a7a8c", fillOpacity: 0.05, interactive: false
      }).addTo(g);
    }
    if (h.daxue) {
      L.polyline(h.daxue, Object.assign({ color: "#1a7a8c", weight: 3, opacity: 0.4 }, optLine)).addTo(g);
    }
    return g;
  }

  /* ========== 标记点（圆点 / 约略虚线圈 / 偏移指引线）========== */
  function colorOf(rec) {
    return (CATS[rec.parent.category] || CATS.scenic).color;
  }

  /** 遍历 allMapItems，创建圆点并写入 featureIndex */
  function addMarkers() {
    layers.markers = L.layerGroup().addTo(map);
    layers.ranges = L.layerGroup().addTo(map);
    layers.leaders = L.layerGroup().addTo(map);
    allMapItems().forEach(function (rec) {
      var it = rec.item;
      var trueLL = trueLatLngOf(rec);
      var visLL = visLatLngOf(rec);
      var color = colorOf(rec);
      var prec = it.precision || rec.parent.precision;
      var r = prec === "exact" ? 6 : 5.5;
      if (it.radiusM) {
        var ring = L.circle(trueLL, {
          pane: "rangePane",
          radius: it.radiusM,
          color: color,
          weight: 1.2,
          dashArray: "4 4",
          fillColor: color,
          fillOpacity: 0.08,
          interactive: false
        });
        rec.range = ring;
        ring.addTo(layers.ranges);
      }
      if (visLL.lat !== trueLL.lat || visLL.lng !== trueLL.lng) {
        var lead = L.polyline([trueLL, visLL], {
          pane: "rangePane",
          color: color, weight: 1.2, opacity: 0.7, interactive: false
        });
        rec.trueLead = lead;
        lead.addTo(layers.leaders);
        rec.trueTick = L.circleMarker(trueLL, {
          pane: "dotsPane",
          radius: 2.4, color: "#fff", weight: 1.2, fillColor: color, fillOpacity: 1, interactive: false
        });
        rec.trueTick.addTo(layers.leaders);
      }
      var marker = L.circleMarker(visLL, {
        pane: "dotsPane",
        radius: r,
        color: "#fff",
        weight: 2,
        fillColor: color,
        fillOpacity: prec === "exact" ? 1 : 0.9,
        opacity: 1
      });
      marker.on("click", function (e) {
        L.DomEvent.stopPropagation(e);
        selectItem(it.id, true);
      });
      rec.marker = marker;
      rec.trueLL = trueLL;
      rec.visLL = visLL;
      featureIndex[it.id] = rec;
      marker.addTo(layers.markers);
    });
  }


  /** 按筛选结果显示/隐藏标记，并刷新标签与列表 */
  function refreshVisibility() {
    Object.keys(featureIndex).forEach(function (id) {
      var rec = featureIndex[id];
      var on = itemVisible(rec);
      var shown = layers.markers.hasLayer(rec.marker);
      if (on && !shown) rec.marker.addTo(layers.markers);
      if (!on && shown) layers.markers.removeLayer(rec.marker);
      if (rec.range) {
        var ron = on && layers.ranges;
        if (on) rec.range.addTo(layers.ranges); else layers.ranges.removeLayer(rec.range);
      }
      if (rec.trueLead) {
        if (on) rec.trueLead.addTo(layers.leaders); else layers.leaders.removeLayer(rec.trueLead);
      }
      if (rec.trueTick) {
        if (on) rec.trueTick.addTo(layers.leaders); else layers.leaders.removeLayer(rec.trueTick);
      }
    });
    renderList();
    layoutLabels();
  }

  /* ========== 常显文字标签（地点名 + 区域名，带简单避让）========== */
  function layoutLabels() {
    labelRoot.innerHTML = "";
    svgRoot.innerHTML = "";
    var z = map.getZoom();
    if (state.showAreas) {
      (DATA.areaLabels || []).forEach(function (a) {
        if (z < a.minZ || z > a.maxZ) return;
        var pt = map.latLngToContainerPoint([a.lat, a.lon]);
        var el = document.createElement("div");
        el.className = "area-label " + (a.kind || "local");
        el.textContent = a.name;
        el.style.left = pt.x + "px";
        el.style.top = pt.y + "px";
        labelRoot.appendChild(el);
      });
    }
    if (!state.showNames) return;

    var vis = [];
    Object.keys(featureIndex).forEach(function (id) {
      var rec = featureIndex[id];
      if (!itemVisible(rec)) return;
      vis.push(rec);
    });

    /* Priority: named exact first, then named, then alt exact, then the rest; candidates last */
    vis.sort(function (a, b) {
      function score(r) {
        var p = r.parent, it = r.item;
        var s = 0;
        if ((it.precision || p.precision) === "exact") s += 20;
        if (!r.isCand) s += 8;
        if (p.category === "scenic") s += 2;
        return s;
      }
      return score(b) - score(a);
    });

    var font = z >= 15 ? 12 : z >= 13 ? 11 : z >= 12 ? 10 : 9;
    var placed = [];
    var size = map.getSize();
    var pad = 4;
    var padBottom = pad;
    if (isMobile()) {
      var sheet = $("panel");
      padBottom = ((sheet && !sheet.classList.contains("collapsed")) ? sheet.offsetHeight : 48) + 8;
    }

    function overlaps(b) {
      for (var i = 0; i < placed.length; i++) {
        var a = placed[i];
        if (b.x < a.x + a.w && b.x + b.w > a.x && b.y < a.y + a.h && b.y + b.h > a.y) return true;
      }
      return false;
    }

    vis.forEach(function (rec) {
      var name = displayName(rec);
      var w = Math.min(name.length * font * 0.95 + 6, z < 13 ? 130 : 170);
      var h = font + 4;
      var pt = map.latLngToContainerPoint(rec.visLL);
      var candidatesPos = [
        { x: pt.x + 8, y: pt.y - h / 2, anchor: "left", lx: pt.x + 6, ly: pt.y },
        { x: pt.x - w - 8, y: pt.y - h / 2, anchor: "right", lx: pt.x - 6, ly: pt.y },
        { x: pt.x - w / 2, y: pt.y - h - 8, anchor: "center", lx: pt.x, ly: pt.y - 6 },
        { x: pt.x - w / 2, y: pt.y + 8, anchor: "center", lx: pt.x, ly: pt.y + 6 },
        { x: pt.x + 8, y: pt.y - h - 6, anchor: "left", lx: pt.x + 5, ly: pt.y - 4 },
        { x: pt.x - w - 8, y: pt.y - h - 6, anchor: "right", lx: pt.x - 5, ly: pt.y - 4 },
        { x: pt.x + 8, y: pt.y + 6, anchor: "left", lx: pt.x + 5, ly: pt.y + 4 },
        { x: pt.x - w - 8, y: pt.y + 6, anchor: "right", lx: pt.x - 5, ly: pt.y + 4 },
        { x: pt.x + 14, y: pt.y - h / 2 - 14, anchor: "left", lx: pt.x + 6, ly: pt.y },
        { x: pt.x - w - 14, y: pt.y - h / 2 + 14, anchor: "right", lx: pt.x - 6, ly: pt.y }
      ];
      var chosen = null;
      for (var i = 0; i < candidatesPos.length; i++) {
        var c = candidatesPos[i];
        if (c.x < pad || c.y < pad || c.x + w > size.x - pad || c.y + h > size.y - padBottom) continue;
        var box = { x: c.x - 1, y: c.y - 1, w: w + 2, h: h + 2 };
        if (!overlaps(box)) { chosen = c; break; }
      }
      /* At mid-high zoom try harder to keep the name; at low zoom drop lower priority */
      if (!chosen) {
        if (z >= 14) {
          /* accept a slightly colliding leftover at far offset */
          for (var k = 0; k < candidatesPos.length; k++) {
            var c2 = candidatesPos[k];
            if (c2.x >= 0 && c2.y >= 0 && c2.x + w <= size.x && c2.y + h <= size.y - padBottom + pad) {
              chosen = c2; break;
            }
          }
        } else {
          return;
        }
      }
      if (!chosen) return;
      placed.push({ x: chosen.x - 1, y: chosen.y - 1, w: w + 2, h: h + 2 });

      var el = document.createElement("div");
      el.className = "place-label";
      var prec = rec.item.precision || rec.parent.precision;
      if (prec !== "exact") el.classList.add("approx-name");
      el.textContent = name;
      el.style.left = chosen.x + "px";
      el.style.top = (chosen.y + h / 2) + "px";
      el.style.fontSize = font + "px";
      el.style.color = colorOf(rec);
      if (rec.parent.id === state.selected || rec.item.id === state.selected) {
        el.style.fontWeight = "800";
        el.style.zIndex = "2";
      }
      labelRoot.appendChild(el);

      var needLeader = Math.hypot(chosen.lx - pt.x, chosen.ly - pt.y) > 10;
      if (needLeader) {
        var line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", pt.x);
        line.setAttribute("y1", pt.y);
        line.setAttribute("x2", chosen.lx);
        line.setAttribute("y2", chosen.ly);
        line.setAttribute("stroke", colorOf(rec));
        line.setAttribute("stroke-width", "1");
        line.setAttribute("stroke-opacity", "0.65");
        svgRoot.appendChild(line);
      }
    });
  }

  /* ========== 侧栏清单与详情 ========== */
  function precBadge(prec) {
    if (prec === "exact") return '<span class="badge exact">精确</span>';
    if (prec === "candidate") return '<span class="badge cand">候选</span>';
    if (prec === "pending") return '<span class="badge pending">待定位</span>';
    return '<span class="badge ref">参考</span>';
  }
  function verifyBadge(vs) {
    if (vs === "pinned") return '<span class="badge v-pin">核验已落点</span>';
    if (vs === "range") return '<span class="badge v-range">核验范围/候选</span>';
    if (vs === "uncertain") return '<span class="badge v-unc">核验仍待定</span>';
    return "";
  }

  function renderList() {
    var box = $("list");
    var html = "";
    DATA.places.forEach(function (p) {
      var recs = [];
      if (!p.hideDot && p.lat != null) recs.push({ parent: p, item: p, isCand: false });
      (p.candidates || []).forEach(function (c) {
        recs.push({ parent: p, item: c, isCand: true });
      });
      var any = recs.some(itemVisible) || (!recs.length && state.catOn[p.category]);
      /* text-only parent still filterable */
      if (p.hideDot && p.candidates) {
        any = recs.some(itemVisible);
      }
      if (!any) return;
      var q = state.query.trim().toLowerCase();
      if (q && p.hideDot) {
        var blob = [p.num, p.name, p.address, p.note].join(" ").toLowerCase();
        if (!recs.some(itemVisible) && blob.indexOf(q) === -1) return;
      }
      var color = (CATS[p.category] || CATS.scenic).color;
      var active = state.selected === p.id || (p.candidates || []).some(function (c) { return c.id === state.selected; });
      html += '<div class="item' + (active ? " active" : "") + '" data-id="' + p.id + '">';
      html += '<span class="dot" style="color:' + color + ';background:' + color + '"></span>';
      html += "<div><div class=\"name\">" + escapeHtml(p.num + "　" + p.name) +
        precBadge(p.precision) + "</div>";
      html += '<div class="meta">' + escapeHtml((CATS[p.category] || {}).label || "") +
        (p.address ? " · " + p.address : "") + "</div></div></div>";
    });
    if (!html) html = '<p class="hint">没有符合当前筛选的地点。</p>';
    box.innerHTML = html;
    box.querySelectorAll(".item").forEach(function (el) {
      el.addEventListener("click", function () { selectItem(el.getAttribute("data-id"), true); });
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }

  function findPlace(id) {
    for (var i = 0; i < DATA.places.length; i++) {
      var p = DATA.places[i];
      if (p.id === id) return { parent: p, item: p, isCand: false };
      var cs = p.candidates || [];
      for (var j = 0; j < cs.length; j++) {
        if (cs[j].id === id) return { parent: p, item: cs[j], isCand: true };
      }
    }
    return null;
  }

  var uiHooks = { onRequestOpenPanel: null };

  function selectItem(id, fly) {
    var found = findPlace(id);
    if (!found) return;
    state.selected = id;
    renderList();
    renderDetail(found);
    if (isMobile()) {
      state.panelOpen = true;
      if (typeof uiHooks.onRequestOpenPanel === "function") {
        uiHooks.onRequestOpenPanel();
      }
    }
    if (fly) {
      if (found.parent.candidates && found.parent.candidates.length && found.item === found.parent) {
        var b = L.latLngBounds(found.parent.candidates.map(function (c) { return [c.lat, c.lon]; }));
        map.fitBounds(b.pad(0.35));
      } else if (found.item.lat != null) {
        var rec = featureIndex[found.item.id];
        var ll = rec ? rec.visLL : L.latLng(found.item.lat, found.item.lon);
        var z = Math.max(map.getZoom(), found.item.precision === "exact" ? 16 : 15);
        map.setView(ll, z, { animate: true });
      }
    }
    layoutLabels();
  }

  function renderDetail(found) {
    var p = found.parent, it = found.item;
    var el = $("detail");
    var prec = it.precision || p.precision;
    var html = "<h2>" + escapeHtml(p.num + "  " + (it.name || p.name)) + "</h2>";
    html += "<p>" + precBadge(prec) + verifyBadge(p.verifyStatus) +
      ' <span class="meta">' + escapeHtml((CATS[p.category] || {}).label || "") + "</span></p>";
    if (p.verifiedDate) {
      html += '<p class="src">核验日期：' + escapeHtml(p.verifiedDate) + "（Asia/Shanghai）</p>";
    }
    if (it.address || p.address) {
      html += "<p><strong>地址 / 范围：</strong>" + escapeHtml(it.address || p.address) + "</p>";
    }
    html += "<p>" + escapeHtml(it.note || p.note || "").replace(/\n/g, "<br>") + "</p>";
    if (prec === "pending") {
      html += '<p class="hint">目前没有可核的门牌或唯一公开坐标，因此未在地图上落点，避免编造位置。</p>';
      var qPend = encodeURIComponent(it.searchQuery || p.searchQuery || ((it.name || p.name) + " 青岛"));
      html += '<div class="links"><a href="https://www.openstreetmap.org/search?query=' + qPend + '" target="_blank" rel="noopener noreferrer">在 OSM 搜索此名称</a></div>';
    } else if (prec !== "exact") {
      html += '<p class="hint">图上位置是约略或范围参考，不是精确店址或入口实测。真实坐标若有偏移，连线指向资料中的中心点。</p>';
    }
    if (it.lat != null) {
      html += '<p class="src">WGS84：' + it.lat.toFixed(6) + ", " + it.lon.toFixed(6);
      if (it.radiusM) html += "（参考范围约 " + it.radiusM + " 米）";
      html += "</p>";
      var osm = it.osmLink || p.osmLink ||
        ("https://www.openstreetmap.org/?mlat=" + it.lat + "&mlon=" + it.lon + "#map=17/" + it.lat + "/" + it.lon);
      html += '<div class="links"><a href="' + osm + '" target="_blank" rel="noopener noreferrer">在 OpenStreetMap 打开</a>';
      var q = encodeURIComponent(it.searchQuery || p.searchQuery || ((it.name || p.name) + " 青岛"));
      html += '<a href="https://www.openstreetmap.org/search?query=' + q + '" target="_blank" rel="noopener noreferrer">OSM 搜索</a></div>';
    }
    html += '<p class="src">来源：' + escapeHtml(it.source || p.source || "") + "</p>";
    if (p.candidates && p.candidates.length && !found.isCand) {
      html += '<div class="section-title">候选位置（未指定去哪一处）</div><div id="cand-mini">';
      p.candidates.forEach(function (c) {
        html += '<div class="item" data-id="' + c.id + '"><span class="dot" style="background:' +
          (CATS[p.category].color) + '"></span><div><div class="name">' + escapeHtml(c.name) +
          precBadge(c.precision) + '</div><div class="meta">' + escapeHtml(c.address || "") +
          "</div></div></div>";
      });
      html += "</div>";
    }
    if (p.id === "8") {
      html += '<p class="hint">另有黄岛「时光海岸店」（金沙滩滨海路1903号）。远离本次市区—崂山行程，公开资料未在本次主图范围内落到可核坐标，故仅文字说明、不上图。</p>';
    }
    el.innerHTML = html;
    el.classList.add("open");
    el.querySelectorAll("#cand-mini .item").forEach(function (n) {
      n.addEventListener("click", function (e) {
        e.stopPropagation();
        selectItem(n.getAttribute("data-id"), true);
      });
    });
  }

  function renderDocGuide() {
    var el = $("doc-guide");
    if (!el || !DATA.docGuide) return;
    var g = DATA.docGuide;
    var html = '<details id="doc-guide-box"><summary>' + escapeHtml(g.title) + "</summary>";
    html += '<p class="hint">' + escapeHtml(g.sourceNote) + "</p>";
    (g.days || []).forEach(function (d) {
      html += '<div class="section-title">' + escapeHtml(d.name) + '</div><ul class="doc-list">';
      (d.items || []).forEach(function (it) {
        html += "<li>" + escapeHtml(it) + "</li>";
      });
      html += "</ul>";
    });
    if (g.walk) html += "<p>" + escapeHtml(g.walk) + "</p>";
    if (g.image) html += '<p class="src">' + escapeHtml(g.image) + "</p>";
    html += '<p class="src">待定位的店名已列入下方清单，不在图上编造位置。</p></details>';
    el.innerHTML = html;
  }

  /* ========== 视图按钮 / 搜索 / 类型筛选 / 面板展开 ========== */
  /** key 对应 map-meta.json 的 views.play / urban / … */
  function fitView(key, opts) {
    var v = DATA.views[key];
    if (!v) return;
    state.viewKey = key;
    opts = opts || {};
    var pad = isMobile() ? 16 : 28;
    map.fitBounds(v.bounds, {
      padding: [pad, pad],
      animate: opts.animate !== false,
      maxZoom: 15
    });
  }

  /**
   * 侧栏控件已迁到 Vue + Element Plus；引擎只保留：
   * - 窗口尺寸变化时重算地图/标签
   * - 灌入行程说明 HTML
   */
  function bindUi() {
    renderDocGuide();
    if (isMobile()) state.panelOpen = false;
    window.addEventListener("resize", function () {
      map.invalidateSize();
      layoutLabels();
    });
  }

  function setQuery(q) {
    state.query = q || "";
    refreshVisibility();
  }
  function setCategory(cat, on) {
    if (!Object.prototype.hasOwnProperty.call(state.catOn, cat)) return;
    state.catOn[cat] = !!on;
    refreshVisibility();
  }
  function setShowNames(on) {
    state.showNames = !!on;
    layoutLabels();
  }
  function setShowAreas(on) {
    state.showAreas = !!on;
    layoutLabels();
  }
  function setPanelOpen(open) {
    state.panelOpen = !!open;
    setTimeout(function () {
      if (!map) return;
      map.invalidateSize();
      layoutLabels();
    }, 200);
  }
  function refreshUi() {
    renderDocGuide();
    renderList();
    if (state.selected) {
      var found = findPlace(state.selected);
      if (found) renderDetail(found);
    }
    layoutLabels();
  }

  /**
   * 启动顺序：
   * 建图 → 离线轮廓 → 尝试 OFM → 画高亮/点/标签 → 绑 UI → 默认视野 play → 默认加载街道图
   */
  function init() {
    L.Icon.Default.mergeOptions({
      iconUrl: leafletIcon,
      iconRetinaUrl: leafletIcon2x,
      shadowUrl: leafletShadow
    });

    map = L.map("map", {
      zoomControl: true,
      attributionControl: true,
      minZoom: 9,
      maxZoom: 18,
      zoomSnap: 0,
      zoomDelta: 1,
      worldCopyJump: false
    });
    map.createPane("outlinePane");
    map.getPane("outlinePane").style.zIndex = QD_OUTLINE_RENDER.landPaneZ;
    map.getPane("outlinePane").style.pointerEvents = "none";
    map.createPane("detailPane");
    map.getPane("detailPane").style.zIndex = QD_OUTLINE_RENDER.detailPaneZ;
    map.getPane("detailPane").style.pointerEvents = "none";
    map.createPane("rangePane");
    map.getPane("rangePane").style.zIndex = 615;
    map.createPane("dotsPane");
    map.getPane("dotsPane").style.zIndex = 640;
    fallbackGroup = buildFallback();
    ofmLayer = makeOfmLayer();
    fallbackGroup.addTo(map);
    state.fallbackOn = true;
    wantedBase = ofmLayer ? OFM_NAME : OUTLINE_NAME;
    map.attributionControl.addAttribution('内置轮廓数据简化自 <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>');
    map.on("zoomend", syncOutlineZoom);

    highlightGroup = buildHighlights().addTo(map);

    /* Subtle land tint when tiles work is provided by the basemap itself. */
    addMarkers();

    labelRoot = document.createElement("div");
    labelRoot.id = "label-layer";
    labelRoot.setAttribute("aria-hidden", "true");
    map.getContainer().appendChild(labelRoot);
    svgRoot = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    labelRoot.appendChild(svgRoot);
    var banner = $("tile-banner");
    if (banner) map.getContainer().appendChild(banner);
    var switchEl = $("basemap-switch");
    if (switchEl) map.getContainer().appendChild(switchEl);
    syncBasemapButtons(wantedBase);

    map.on("move zoom zoomend moveend viewreset", layoutLabels);
    map.on("click", function () {
      /* keep detail, just unhighlight? leave selected */
    });

    bindUi();
    map.invalidateSize();
    fitView("play", { animate: false });
    renderList();
    layoutLabels();
    if (ofmLayer) {
      startDefaultOfm();
    } else {
      requestBase(OUTLINE_NAME, "init");
      showBanner("未能初始化 MapLibre，已使用内置地理轮廓。OSM 官方瓦片已移除，不再请求。", true);
    }
    syncOutlineZoom();

    /* Refit default/current view after the pane has its real size (PC and narrow). */
    setTimeout(function () {
      map.invalidateSize();
      fitView(state.viewKey, { animate: false });
      syncOutlineZoom();
      layoutLabels();
    }, 300);
  }

  /** Vue 卸载时调用，释放 Leaflet 实例 */
  function destroy() {
    try {
      if (map) {
        map.off();
        map.remove();
        map = null;
      }
    } catch (e) { /* ignore */ }
  }

  /**
   * 对外入口。TravelMap.vue：
   *   onMounted → bootQingdaoMap({ onRequestOpenPanel })
   *   onBeforeUnmount → handle.destroy()
   *
   * 返回的 API 供 Vue（Element Plus 侧栏 / 底图按钮）调用，不再手写 DOM 绑定。
   */
  export function bootQingdaoMap(options) {
    options = options || {};
    uiHooks.onRequestOpenPanel = options.onRequestOpenPanel || null;
    setupMaplibreWorker();
    init();
    return {
      destroy: destroy,
      getMap: function () { return map; },
      setQuery: setQuery,
      setCategory: setCategory,
      setShowNames: setShowNames,
      setShowAreas: setShowAreas,
      fitView: fitView,
      setPanelOpen: setPanelOpen,
      setBasemap: setBasemap,
      getBasemap: getBasemap,
      selectItem: selectItem,
      refreshUi: refreshUi
    };
  }
