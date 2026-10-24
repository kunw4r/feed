"use client";

import { useEffect, useState } from "react";

const BASE = process.env.NEXT_PUBLIC_STATIC === "true" ? "/feed" : "";

interface NetworkInformation {
  saveData?: boolean;
}

// Registers the service worker (production only), asks it to save today's
// edition for offline reading, and shows a quiet notice when offline.
export default function AppRuntime() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);

    if (process.env.NEXT_PUBLIC_STATIC === "true" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register(`${BASE}/sw.js`, { scope: `${BASE}/` })
        .then(async () => {
          const reg = await navigator.serviceWorker.ready;
          const conn = (navigator as Navigator & { connection?: NetworkInformation }).connection;
          if (!conn?.saveData) {
            const warm = () => reg.active?.postMessage({ type: "warm" });
            if ("requestIdleCallback" in window) requestIdleCallback(warm, { timeout: 5000 });
            else setTimeout(warm, 3000);
          }
        })
        .catch(() => {
          // offline support is optional
        });
    }

    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!offline) return null;
  return (
    <div role="status" className="animate-in fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-full bg-content px-4 py-2 text-[13px] text-surface shadow-2xl">
      Offline — reading your saved edition
    </div>
  );
}
