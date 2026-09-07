"use client";

import { useEffect, useState } from "react";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("hwnote:install-dismissed")) return;
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const dismiss = () => {
    localStorage.setItem("hwnote:install-dismissed", "1");
    setShow(false);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-x-0 bottom-[80px] z-50 mx-auto max-w-md px-4">
      <div className="flex items-center gap-3 rounded-2xl bg-white p-3.5 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
        <span className="text-2xl">📲</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-800">ติดตั้งลงหน้าจอ</p>
          <p className="text-[11px] text-slate-500">เปิดเร็วขึ้น + ใช้ได้ตอนไม่มีเน็ต</p>
        </div>
        <button onClick={dismiss} className="shrink-0 text-xs text-slate-400">
          ไว้ก่อน
        </button>
        <button
          onClick={install}
          className="shrink-0 rounded-xl bg-gradient-to-r from-indigo-500 to-sky-400 px-3.5 py-2 text-xs font-semibold text-white"
        >
          ติดตั้ง
        </button>
      </div>
    </div>
  );
}
