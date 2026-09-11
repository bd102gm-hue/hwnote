"use client";

import { useEffect } from "react";
import { pullAll, subscribeAll, syncNow, initSchedule } from "@/lib/sync";
import { cachedMe } from "@/lib/auth";

export default function SyncProvider() {
  useEffect(() => {
    let unsub = () => {};
    const start = async () => {
      if (!cachedMe()) return;
      await initSchedule();
      await pullAll();
      void syncNow();
      unsub = subscribeAll();
    };
    const t = setTimeout(start, 400);
    const iv = setInterval(() => void syncNow(), 30_000);
    const onFocus = () => { void syncNow(); void pullAll(); };
    window.addEventListener("focus", onFocus);
    return () => { clearTimeout(t); clearInterval(iv); unsub(); window.removeEventListener("focus", onFocus); };
  }, []);
  return null;
}
