import { useEffect, useState } from "react";
import { Platform } from "react-native";

const VISIT_COUNT_KEY = "orvia_pwa_visits";
const DISMISSED_AT_KEY = "orvia_pwa_dismissed_at";
const SESSION_KEY = "orvia_pwa_session";

const VISITS_REQUIRED = 2;
const DISMISS_COOLDOWN_DAYS = 0;
const DISMISS_COOLDOWN_MS = DISMISS_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

// True only for iPhone running Safari (not Chrome/Firefox/other iOS browsers).
// Chrome iOS reports "CriOS", Firefox iOS reports "FxiOS" — exclude those so
// we only show the sheet to users who can actually use Add to Home Screen.
function isIphoneSafari() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isIphone = /iphone/i.test(ua);
  const isSafari = /safari/i.test(ua) && !/crios|fxios|opios|mercury/i.test(ua);
  return isIphone && isSafari;
}

// True when the app is already running in standalone (installed) mode.
// navigator.standalone is an Apple-only property; display-mode covers the rest.
function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.navigator.standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches
  );
}

/**
 * Returns { shouldShow, dismiss }.
 *
 * shouldShow — true when ALL of these hold:
 *   • Platform is web
 *   • Running on iPhone Safari (not other iOS browsers)
 *   • App is not already installed (not standalone)
 *   • User has visited at least VISITS_REQUIRED times
 *   • User has not dismissed within the last DISMISS_COOLDOWN_DAYS days
 *
 * dismiss() — records the current timestamp so the sheet stays hidden
 * for DISMISS_COOLDOWN_DAYS days, then hides the sheet.
 *
 * To adjust when the sheet appears, change VISITS_REQUIRED (line above).
 * To change the snooze period, change DISMISS_COOLDOWN_DAYS.
 */
export function useIosInstallPrompt() {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    if (!isIphoneSafari()) return;
    if (isStandalone()) return;

    // Count unique visits using sessionStorage as a per-tab gate so that
    // navigating between screens doesn't artificially inflate the count.
    let visits = parseInt(localStorage.getItem(VISIT_COUNT_KEY) || "0", 10);
    if (!sessionStorage.getItem(SESSION_KEY)) {
      visits += 1;
      localStorage.setItem(VISIT_COUNT_KEY, String(visits));
      sessionStorage.setItem(SESSION_KEY, "1");
    }

    if (visits < VISITS_REQUIRED) return;

    const dismissedAt = localStorage.getItem(DISMISSED_AT_KEY);
    if (
      dismissedAt &&
      Date.now() - parseInt(dismissedAt, 10) < DISMISS_COOLDOWN_MS
    )
      return;

    setShouldShow(true);
  }, []);

  const dismiss = () => {
    if (Platform.OS !== "web") return;
    localStorage.setItem(DISMISSED_AT_KEY, String(Date.now()));
    setShouldShow(false);
  };

  return { shouldShow, dismiss };
}
