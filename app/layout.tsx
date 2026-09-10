import type { Metadata, Viewport } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import BottomNav from "@/components/BottomNav";
import OfflineBanner from "@/components/OfflineBanner";
import InstallPrompt from "@/components/InstallPrompt";
import SyncProvider from "@/components/SyncProvider";
import "./globals.css";

const thai = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "HomeworkNote · ม.2/2",
  description: "จดการบ้านง่าย ๆ ใช้ได้แม้ไม่มีเน็ต",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "HomeworkNote" },
  icons: { apple: "/icons/icon-192.png" },
};

export const viewport: Viewport = {
  themeColor: "#6366f1",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
       <body className={`${thai.className} bg-[#f6f7fb] antialiased`}>
        <SyncProvider />
        <div className="mx-auto min-h-screen max-w-md bg-[#f6f7fb] pb-24 shadow-xl">
          <OfflineBanner />
          {children}
        </div>
        <InstallPrompt />
        <BottomNav />
      </body>
    </html>
  );
}
