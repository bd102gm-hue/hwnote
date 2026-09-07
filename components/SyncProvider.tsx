"use client";

import { useEffect, useState } from "react";
import { pullAll, subscribeRoom, syncNow, getProfile } from "@/lib/sync";

export default function SyncProvider() {
  const [roomId, setRoomId] = useState<string | undefined>(undefined);

  // ติดตามว่าเข้า/ออกห้องเมื่อไหร่
  useEffect(() => {
    const read = () => setRoomId(getProfile().roomId);
    read();
    window.addEventListener("hwnote:update", read);
    return () => window.removeEventListener("hwnote:update", read);
  }, []);

  // re-subscribe ทุกครั้งที่ห้องเปลี่ยน
  useEffect(() => {
    if (!roomId) return;

    void pullAll();
    void syncNow();

    const unsub = subscribeRoom();
    const iv = setInterval(() => void syncNow(), 30_000);
    const onFocus = () => {
      void syncNow();
      void pullAll();
    };
    window.addEventListener("focus", onFocus);

    return () => {
      unsub();
      clearInterval(iv);
      window.removeEventListener("focus", onFocus);
    };
  }, [roomId]);

  return null;
}
