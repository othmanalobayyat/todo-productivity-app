/**
 * SafeAreaDebugOverlay — v2
 *
 * Captures viewport-height instability on iOS PWA relaunch.
 * Specifically instruments: 100dvh vs window.innerHeight discrepancy,
 * actual DOM element heights (body/html/#root), env(safe-area-inset-top),
 * and a synchronous baseline captured before any React effects run.
 *
 * REMOVE THIS COMPONENT BEFORE SHIPPING.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Platform, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── synchronous baseline ────────────────────────────────────────────────────
// Captured at module evaluation time — before SafeAreaProvider, before any
// React effects, before any async work. This is the "raw" iOS value.
const SYNC_INNER_HEIGHT =
  typeof window !== "undefined" ? window.innerHeight : null;

// ─── helpers ────────────────────────────────────────────────────────────────

function ts() {
  const d = new Date();
  return [
    d.getHours().toString().padStart(2, "0"),
    d.getMinutes().toString().padStart(2, "0"),
    d.getSeconds().toString().padStart(2, "0"),
  ].join(":") + "." + d.getMilliseconds().toString().padStart(3, "0");
}

// Measure a CSS length value by applying it to a throw-away div.
function measureCssLength(cssProp, cssValue) {
  if (typeof document === "undefined") return null;
  try {
    const el = document.createElement("div");
    el.style.cssText =
      `position:fixed;top:0;left:0;visibility:hidden;pointer-events:none;${cssProp}:${cssValue}`;
    document.body.appendChild(el);
    const rect = el.getBoundingClientRect();
    const val = cssProp === "height" || cssProp === "min-height"
      ? rect.height
      : parseFloat(window.getComputedStyle(el)[cssProp.replace(/-([a-z])/g, (_, c) => c.toUpperCase())]) || 0;
    document.body.removeChild(el);
    return val;
  } catch {
    return null;
  }
}

function measureEnv(inset /* "top" | "bottom" | "left" | "right" */) {
  if (typeof document === "undefined") return null;
  const prop = `padding-${inset}`;
  const val = `env(safe-area-inset-${inset})`;
  try {
    const el = document.createElement("div");
    el.style.cssText = `position:fixed;${inset}:0;height:0;${prop}:${val};visibility:hidden;pointer-events:none`;
    document.body.appendChild(el);
    const px = parseFloat(window.getComputedStyle(el)[`padding${inset[0].toUpperCase()}${inset.slice(1)}`]) || 0;
    document.body.removeChild(el);
    return px;
  } catch {
    return null;
  }
}

function getDisplayMode() {
  if (typeof window === "undefined") return "unknown";
  if (window.navigator.standalone === true) return "standalone(apple)";
  if (window.matchMedia("(display-mode: standalone)").matches) return "standalone(w3c)";
  if (window.matchMedia("(display-mode: fullscreen)").matches) return "fullscreen";
  return "browser";
}

function getDomHeights() {
  if (typeof document === "undefined") return {};
  const root = document.getElementById("root");
  return {
    htmlOffsetH: document.documentElement.offsetHeight,
    htmlClientH: document.documentElement.clientHeight,
    bodyOffsetH: document.body ? document.body.offsetHeight : null,
    bodyClientH: document.body ? document.body.clientHeight : null,
    bodyScrollH: document.body ? document.body.scrollHeight : null,
    rootOffsetH: root ? root.offsetHeight : null,
  };
}

function snap() {
  if (typeof window === "undefined") return {};

  // CSS viewport-unit heights — may differ from window.innerHeight on iOS
  const dvh100  = measureCssLength("height", "100dvh");
  const svh100  = measureCssLength("height", "100svh");
  const lvh100  = measureCssLength("height", "100lvh");
  const wfa     = measureCssLength("height", "-webkit-fill-available");

  const envBottom = measureEnv("bottom");
  const envTop    = measureEnv("top");
  const envLeft   = measureEnv("left");
  const envRight  = measureEnv("right");

  const vv = window.visualViewport;

  return {
    // ── Viewport JS values ──
    innerHeight : window.innerHeight,
    innerWidth  : window.innerWidth,
    syncBaseline: SYNC_INNER_HEIGHT,           // captured before any React
    scrollY     : window.scrollY,

    // ── CSS unit measurements ──
    dvh100,
    svh100,
    lvh100,
    wfa,
    // derived: is 100dvh != window.innerHeight?
    dvhDrift: dvh100 !== null ? dvh100 - window.innerHeight : null,

    // ── visualViewport ──
    vvHeight   : vv ? vv.height   : null,
    vvWidth    : vv ? vv.width    : null,
    vvOffsetTop: vv ? vv.offsetTop: null,
    vvScale    : vv ? vv.scale    : null,

    // ── env() safe-area ──
    envBottom,
    envTop,
    envLeft,
    envRight,

    // ── actual DOM element heights ──
    ...getDomHeights(),

    // ── context ──
    displayMode    : getDisplayMode(),
    visibilityState: document.visibilityState,
    orientation    : window.screen?.orientation?.angle ?? window.orientation ?? "?",
    dpr            : window.devicePixelRatio,
    screenH        : window.screen ? window.screen.height : null,
    screenW        : window.screen ? window.screen.width  : null,
    screenAvailH   : window.screen ? window.screen.availHeight : null,
  };
}

// ─── component ──────────────────────────────────────────────────────────────

export default function SafeAreaDebugOverlay() {
  const insets = useSafeAreaInsets();
  const [open, setOpen]       = useState(false);
  const [metrics, setMetrics] = useState(() =>
    Platform.OS === "web" ? snap() : {}
  );
  const [log, setLog]   = useState([]);
  const logRef          = useRef([]);
  const scrollRef       = useRef(null);

  const addLog = useCallback((label, extra = {}) => {
    if (typeof window === "undefined") return;
    const s = snap();
    const entry = { t: ts(), label, data: { ...s, ...extra } };
    logRef.current = [entry, ...logRef.current].slice(0, 80);
    setLog([...logRef.current]);
    setMetrics(s);
  }, []);

  // Mount + first RAF
  useEffect(() => {
    if (Platform.OS !== "web") return;
    addLog("MOUNT");
    const id = requestAnimationFrame(() => addLog("RAF"));
    return () => cancelAnimationFrame(id);
  }, []);

  // Log whenever react-native-safe-area-context reports new insets
  useEffect(() => {
    if (Platform.OS !== "web") return;
    addLog("RN-insets", { rnBot: insets.bottom, rnTop: insets.top,
                          rnLeft: insets.left,  rnRight: insets.right });
  }, [insets.bottom, insets.top, insets.left, insets.right]);

  // All lifecycle / viewport events
  useEffect(() => {
    if (Platform.OS !== "web") return;

    const on = (label) => (e) => {
      const extra = {};
      if (e?.persisted !== undefined) extra.persisted = e.persisted;
      addLog(label, extra);
    };

    window  .addEventListener("resize",           on("resize"));
    document.addEventListener("visibilitychange", on("visibilitychange"));
    window  .addEventListener("pageshow",         on("pageshow"));
    window  .addEventListener("pagehide",         on("pagehide"));
    window  .addEventListener("focus",            on("focus"));
    window  .addEventListener("blur",             on("blur"));
    window  .addEventListener("orientationchange",on("orientationchange"));

    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", on("vv-resize"));
      window.visualViewport.addEventListener("scroll", on("vv-scroll"));
    }

    return () => {
      window  .removeEventListener("resize",           on("resize"));
      document.removeEventListener("visibilitychange", on("visibilitychange"));
      window  .removeEventListener("pageshow",         on("pageshow"));
      window  .removeEventListener("pagehide",         on("pagehide"));
      window  .removeEventListener("focus",            on("focus"));
      window  .removeEventListener("blur",             on("blur"));
      window  .removeEventListener("orientationchange",on("orientationchange"));
    };
  }, []);

  // 2-second poll — catches silent viewport changes that fire no event
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const prevRef = { iH: null, dvh: null, bodyH: null };
    const id = setInterval(() => {
      const s = snap();
      const changed =
        s.innerHeight  !== prevRef.iH   ||
        s.dvh100       !== prevRef.dvh  ||
        s.bodyOffsetH  !== prevRef.bodyH;
      if (changed) {
        addLog("POLL:changed", {
          prev_iH: prevRef.iH,   prev_dvh: prevRef.dvh,
          prev_bodyH: prevRef.bodyH,
        });
        prevRef.iH    = s.innerHeight;
        prevRef.dvh   = s.dvh100;
        prevRef.bodyH = s.bodyOffsetH;
      } else {
        setMetrics(s); // silent refresh — keep display live
      }
    }, 2000);
    return () => clearInterval(id);
  }, []);

  if (Platform.OS !== "web") return null;

  // ── derived flags ──
  const dvhDrift   = metrics.dvhDrift;          // 100dvh - innerHeight
  const bodyBloat  = metrics.bodyOffsetH != null && metrics.innerHeight != null
    ? metrics.bodyOffsetH - metrics.innerHeight  // > 0 means body > viewport
    : null;
  const hasAnomaly = dvhDrift !== 0 && dvhDrift !== null;
  const pill = hasAnomaly
    ? `⚠ DVH+${dvhDrift}`
    : bodyBloat > 0
      ? `⚠ BODY+${bodyBloat}`
      : "VP DBG";

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        bottom: 0,
        right: 0,
        zIndex: 99999,
        maxWidth: open ? 350 : 100,
        maxHeight: open ? 560 : 36,
        overflow: "hidden",
      }}
    >
      <TouchableOpacity
        onPress={() => setOpen((v) => !v)}
        style={{
          alignSelf: "flex-end",
          backgroundColor: hasAnomaly || bodyBloat > 0 ? "#b71c1c" : "#1a237e",
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: 8,
          margin: 6,
        }}
      >
        <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700",
                       fontFamily: "monospace" }}>
          {open ? "✕ CLOSE" : pill}
        </Text>
      </TouchableOpacity>

      {open && (
        <View style={{
          backgroundColor: "rgba(0,0,0,0.9)",
          borderRadius: 8,
          margin: 6, marginTop: 0,
          padding: 8,
          width: 338,
        }}>

          {/* ── VIEWPORT UNITS ── */}
          <Text style={S.h}>── VIEWPORT (JS) ──</Text>
          <Row label="window.innerHeight"    value={metrics.innerHeight} />
          <Row label="sync baseline (pre-React)" value={metrics.syncBaseline}
               warn={metrics.syncBaseline !== metrics.innerHeight} />
          <Row label="visualViewport.height" value={metrics.vvHeight}
               warn={metrics.vvHeight !== metrics.innerHeight} />
          <Row label="vv.offsetTop"          value={metrics.vvOffsetTop} />
          <Row label="scrollY"               value={metrics.scrollY} />
          <Row label="screen.height"         value={metrics.screenH} />
          <Row label="screen.availH"         value={metrics.screenAvailH} />

          <Text style={[S.h, { marginTop: 6 }]}>── CSS VIEWPORT UNITS ──</Text>
          <Row label="100dvh"  value={metrics.dvh100}
               warn={metrics.dvh100 !== metrics.innerHeight} />
          <Row label="100svh"  value={metrics.svh100} />
          <Row label="100lvh"  value={metrics.lvh100} />
          <Row label="-webkit-fill-available" value={metrics.wfa} />
          <Row label="dvh − innerHeight (drift)" value={dvhDrift}
               warn={dvhDrift !== 0 && dvhDrift !== null} />

          {/* ── DOM HEIGHTS ── */}
          <Text style={[S.h, { marginTop: 6 }]}>── DOM HEIGHTS ──</Text>
          <Row label="html.offsetHeight" value={metrics.htmlOffsetH}
               warn={metrics.htmlOffsetH > metrics.innerHeight} />
          <Row label="html.clientHeight" value={metrics.htmlClientH} />
          <Row label="body.offsetHeight" value={metrics.bodyOffsetH}
               warn={bodyBloat > 0} />
          <Row label="body.clientHeight" value={metrics.bodyClientH} />
          <Row label="body − viewport"   value={bodyBloat}
               warn={bodyBloat > 0} />
          <Row label="#root.offsetHeight" value={metrics.rootOffsetH}
               warn={metrics.rootOffsetH > metrics.innerHeight} />

          {/* ── SAFE AREA ── */}
          <Text style={[S.h, { marginTop: 6 }]}>── env() SAFE AREA ──</Text>
          <Row label="env(top)"    value={metrics.envTop} />
          <Row label="env(bottom)" value={metrics.envBottom} />
          <Row label="env(left)"   value={metrics.envLeft} />
          <Row label="env(right)"  value={metrics.envRight} />
          <Row label="RN insets.top"    value={insets.top} />
          <Row label="RN insets.bottom" value={insets.bottom} />

          {/* ── CONTEXT ── */}
          <Text style={[S.h, { marginTop: 6 }]}>── CONTEXT ──</Text>
          <Row label="displayMode"     value={metrics.displayMode} />
          <Row label="visibilityState" value={metrics.visibilityState} />
          <Row label="orientation°"    value={metrics.orientation} />
          <Row label="devicePixelRatio" value={metrics.dpr} />

          {/* anomaly summaries */}
          {dvhDrift !== 0 && dvhDrift !== null && (
            <Text style={S.warn}>
              ⚠ 100dvh is {dvhDrift > 0 ? "LARGER" : "SMALLER"} than innerHeight
              by {Math.abs(dvhDrift)}px — min-height:100dvh stretches body
            </Text>
          )}
          {bodyBloat > 0 && (
            <Text style={S.warn}>
              ⚠ body is {bodyBloat}px TALLER than viewport — layout overflow
            </Text>
          )}

          {/* ── EVENT LOG ── */}
          <View style={{ flexDirection: "row", justifyContent: "space-between",
                         marginTop: 8 }}>
            <Text style={S.h}>── EVENT LOG ({log.length}) ──</Text>
            <TouchableOpacity onPress={() => { logRef.current = []; setLog([]); }}>
              <Text style={{ color: "#f48fb1", fontSize: 9, fontFamily: "monospace" }}>
                CLEAR
              </Text>
            </TouchableOpacity>
          </View>
          <ScrollView ref={scrollRef} style={{ maxHeight: 160 }}>
            {log.map((e, i) => (
              <View key={i} style={{ marginBottom: 3 }}>
                <Text style={{ color: "#aed6f1", fontSize: 9, fontFamily: "monospace" }}>
                  {e.t} {e.label}
                </Text>
                <Text style={{ color: "#ccc", fontSize: 8, fontFamily: "monospace" }}>
                  {`  iH:${e.data.innerHeight} dvh:${e.data.dvh100} bodyH:${e.data.bodyOffsetH} rootH:${e.data.rootOffsetH} envB:${e.data.envBottom} envT:${e.data.envTop} mode:${e.data.displayMode}${e.data.persisted !== undefined ? ` pst:${e.data.persisted}` : ""}`}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

function Row({ label, value, warn }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between",
                   marginBottom: 1 }}>
      <Text style={[S.lbl, warn && { color: "#ff5252" }]}>{label}</Text>
      <Text style={[S.val, warn && { color: "#ff5252", fontWeight: "700" }]}>
        {value === null || value === undefined ? "—" : String(value)}
      </Text>
    </View>
  );
}

const S = {
  h:   { color: "#90caf9", fontSize: 9, fontFamily: "monospace",
         fontWeight: "700", marginBottom: 3 },
  lbl: { color: "#b0bec5", fontSize: 9, fontFamily: "monospace", flex: 1 },
  val: { color: "#ffffff", fontSize: 9, fontFamily: "monospace",
         textAlign: "right", marginLeft: 6 },
  warn:{ color: "#ff5252", fontSize: 9, fontFamily: "monospace",
         marginTop: 3, lineHeight: 13 },
};
