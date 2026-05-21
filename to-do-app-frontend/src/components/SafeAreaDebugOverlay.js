/**
 * SafeAreaDebugOverlay
 *
 * Floating debug panel for diagnosing iOS PWA safe-area / viewport issues.
 * Mount it once at the root of the app (inside SafeAreaProvider).
 * Tap the "SA DBG" pill to expand/collapse the panel.
 * Tap "CLEAR LOG" to wipe the event log.
 *
 * REMOVE THIS COMPONENT BEFORE SHIPPING.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Platform, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── helpers ────────────────────────────────────────────────────────────────

function ts() {
  const d = new Date();
  return `${d.getHours().toString().padStart(2,"0")}:${d.getMinutes().toString().padStart(2,"0")}:${d.getSeconds().toString().padStart(2,"0")}.${d.getMilliseconds().toString().padStart(3,"0")}`;
}

function measureCssEnvBottom() {
  if (typeof document === "undefined") return 0;
  const el = document.createElement("div");
  el.style.cssText =
    "position:fixed;bottom:0;height:0;padding-bottom:env(safe-area-inset-bottom);visibility:hidden;pointer-events:none";
  document.body.appendChild(el);
  const val = parseFloat(window.getComputedStyle(el).paddingBottom) || 0;
  document.body.removeChild(el);
  return val;
}

function measureCssEnvTop() {
  if (typeof document === "undefined") return 0;
  const el = document.createElement("div");
  el.style.cssText =
    "position:fixed;top:0;height:0;padding-top:env(safe-area-inset-top);visibility:hidden;pointer-events:none";
  document.body.appendChild(el);
  const val = parseFloat(window.getComputedStyle(el).paddingTop) || 0;
  document.body.removeChild(el);
  return val;
}

function getDisplayMode() {
  if (typeof window === "undefined") return "unknown";
  if (window.navigator.standalone === true) return "standalone(apple)";
  if (window.matchMedia("(display-mode: standalone)").matches) return "standalone(w3c)";
  if (window.matchMedia("(display-mode: fullscreen)").matches) return "fullscreen";
  return "browser";
}

function snap() {
  if (typeof window === "undefined") return {};
  const cssEnvBottom = measureCssEnvBottom();
  const cssEnvTop = measureCssEnvTop();
  const vvHeight = window.visualViewport ? window.visualViewport.height : null;
  const vvWidth = window.visualViewport ? window.visualViewport.width : null;
  const vvOffsetTop = window.visualViewport ? window.visualViewport.offsetTop : null;
  const vvScale = window.visualViewport ? window.visualViewport.scale : null;
  return {
    innerHeight: window.innerHeight,
    innerWidth: window.innerWidth,
    vvHeight,
    vvWidth,
    vvOffsetTop,
    vvScale,
    cssEnvBottom,
    cssEnvTop,
    displayMode: getDisplayMode(),
    visibilityState: document.visibilityState,
    devicePixelRatio: window.devicePixelRatio,
    orientation: window.screen?.orientation?.angle ?? window.orientation ?? "?",
    scrollY: window.scrollY,
    docScrollHeight: document.documentElement.scrollHeight,
    docClientHeight: document.documentElement.clientHeight,
    bodyScrollHeight: document.body ? document.body.scrollHeight : "?",
  };
}

// ─── component ──────────────────────────────────────────────────────────────

export default function SafeAreaDebugOverlay() {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [metrics, setMetrics] = useState({});
  const [log, setLog] = useState([]);
  const logRef = useRef([]);
  const scrollRef = useRef(null);

  const addLog = useCallback((label, extra = {}) => {
    if (typeof window === "undefined") return;
    const entry = {
      t: ts(),
      label,
      data: { ...snap(), ...extra },
    };
    logRef.current = [entry, ...logRef.current].slice(0, 60);
    setLog([...logRef.current]);
  }, []);

  const refreshMetrics = useCallback(() => {
    if (typeof window === "undefined") return;
    setMetrics(snap());
  }, []);

  // Initial snapshot + RAF snapshot
  useEffect(() => {
    if (Platform.OS !== "web") return;
    refreshMetrics();
    addLog("MOUNT");
    const rafId = requestAnimationFrame(() => {
      refreshMetrics();
      addLog("RAF(post-mount)");
    });
    return () => cancelAnimationFrame(rafId);
  }, []);

  // Re-snapshot whenever react-native-safe-area-context updates insets
  useEffect(() => {
    if (Platform.OS !== "web") return;
    refreshMetrics();
    addLog("insets-changed", { rnInsetBottom: insets.bottom, rnInsetTop: insets.top });
  }, [insets.bottom, insets.top]);

  // All the lifecycle / viewport events
  useEffect(() => {
    if (Platform.OS !== "web") return;

    const handle = (label) => (e) => {
      refreshMetrics();
      const extra = {};
      if (e && e.persisted !== undefined) extra.persisted = e.persisted;
      if (e && e.type === "orientationchange") extra.newOrientation = window.orientation;
      addLog(label, extra);
    };

    const onResize = handle("resize");
    const onVisibility = handle("visibilitychange");
    const onPageShow = handle("pageshow");
    const onPageHide = handle("pagehide");
    const onFocus = handle("focus");
    const onBlur = handle("blur");
    const onOrient = handle("orientationchange");

    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("focus", onFocus);
    window.addEventListener("blur", onBlur);
    window.addEventListener("orientationchange", onOrient);

    // visualViewport events
    if (window.visualViewport) {
      const onVV = handle("visualViewport");
      window.visualViewport.addEventListener("resize", onVV);
      window.visualViewport.addEventListener("scroll", handle("visualViewport-scroll"));
    }

    return () => {
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("orientationchange", onOrient);
    };
  }, []);

  // Periodic refresh (every 2s) to catch anything that slips past events
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const id = setInterval(() => {
      const s = snap();
      setMetrics(s);
      // Only log if cssEnvBottom changed
      const prev = logRef.current[0]?.data?.cssEnvBottom;
      if (prev !== undefined && prev !== s.cssEnvBottom) {
        addLog("PERIODIC:env-changed", { prev, now: s.cssEnvBottom });
      }
    }, 2000);
    return () => clearInterval(id);
  }, []);

  if (Platform.OS !== "web") return null;

  const rnBottom = insets.bottom;
  const cssEnv = metrics.cssEnvBottom ?? "…";
  const mismatch = typeof rnBottom === "number" && typeof cssEnv === "number" && rnBottom !== cssEnv;

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        bottom: 0,
        right: 0,
        zIndex: 99999,
        maxWidth: open ? 340 : 80,
        maxHeight: open ? 480 : 36,
        overflow: "hidden",
      }}
    >
      {/* Pill toggle */}
      <TouchableOpacity
        onPress={() => setOpen((v) => !v)}
        style={{
          alignSelf: "flex-end",
          backgroundColor: mismatch ? "#e53935" : "#1565c0",
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: 8,
          margin: 6,
        }}
      >
        <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700", fontFamily: "monospace" }}>
          {open ? "✕ CLOSE" : `SA DBG${mismatch ? " ⚠" : ""}`}
        </Text>
      </TouchableOpacity>

      {open && (
        <View
          style={{
            backgroundColor: "rgba(0,0,0,0.88)",
            borderRadius: 8,
            margin: 6,
            marginTop: 0,
            padding: 8,
            width: 328,
          }}
        >
          {/* Live metrics */}
          <Text style={S.heading}>── LIVE METRICS ──</Text>
          <Row label="RN insets.bottom" value={rnBottom} warn={mismatch} />
          <Row label="CSS env() bottom" value={cssEnv} warn={mismatch} />
          <Row label="CSS env() top" value={metrics.cssEnvTop} />
          <Row label="window.innerHeight" value={metrics.innerHeight} />
          <Row label="window.innerWidth" value={metrics.innerWidth} />
          <Row label="visualViewport.h" value={metrics.vvHeight} />
          <Row label="visualViewport.w" value={metrics.vvWidth} />
          <Row label="vv.offsetTop" value={metrics.vvOffsetTop} />
          <Row label="vv.scale" value={metrics.vvScale} />
          <Row label="doc.clientHeight" value={metrics.docClientHeight} />
          <Row label="body.scrollHeight" value={metrics.bodyScrollHeight} />
          <Row label="displayMode" value={metrics.displayMode} />
          <Row label="visibilityState" value={metrics.visibilityState} />
          <Row label="orientation°" value={metrics.orientation} />
          <Row label="devicePixelRatio" value={metrics.devicePixelRatio} />
          {mismatch && (
            <Text style={{ color: "#ff5252", fontSize: 10, marginTop: 4, fontFamily: "monospace" }}>
              ⚠ RN insets ≠ CSS env — this is the bug
            </Text>
          )}

          {/* Event log */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
            <Text style={S.heading}>── EVENT LOG ──</Text>
            <TouchableOpacity onPress={() => { logRef.current = []; setLog([]); }}>
              <Text style={{ color: "#f48fb1", fontSize: 9, fontFamily: "monospace" }}>CLEAR</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            ref={scrollRef}
            style={{ maxHeight: 180 }}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd?.({ animated: false })}
          >
            {[...log].reverse().map((entry, i) => (
              <View key={i} style={{ marginBottom: 4 }}>
                <Text style={{ color: "#aed6f1", fontSize: 9, fontFamily: "monospace" }}>
                  {entry.t} {entry.label}
                </Text>
                <Text style={{ color: "#ccc", fontSize: 8, fontFamily: "monospace" }}>
                  {`  env⬇${entry.data.cssEnvBottom} rnBot:${entry.data.rnInsetBottom ?? "–"} iH:${entry.data.innerHeight} vvH:${entry.data.vvHeight ?? "–"} mode:${entry.data.displayMode} vis:${entry.data.visibilityState}${entry.data.persisted !== undefined ? ` persisted:${entry.data.persisted}` : ""}`}
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
    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 1 }}>
      <Text style={[S.label, warn && { color: "#ff5252" }]}>{label}</Text>
      <Text style={[S.value, warn && { color: "#ff5252" }]}>
        {value === null || value === undefined ? "—" : String(value)}
      </Text>
    </View>
  );
}

const S = {
  heading: {
    color: "#90caf9",
    fontSize: 9,
    fontFamily: "monospace",
    fontWeight: "700",
    marginBottom: 4,
  },
  label: {
    color: "#b0bec5",
    fontSize: 9,
    fontFamily: "monospace",
    flex: 1,
  },
  value: {
    color: "#ffffff",
    fontSize: 9,
    fontFamily: "monospace",
    textAlign: "right",
    marginLeft: 8,
  },
};
