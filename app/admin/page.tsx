"use client"; 
import { useState, useEffect } from "react";
// เปลี่ยนจาก import { sb } จาก ... เป็น import { sb, adminResetPassword, deleteMember }
import { sb, adminResetPassword, deleteMember } from "@/lib/auth";

// ใน useEffect ให้เปลี่ยนจาก sb() เป็น sb (ไม่มีวงเล็บ)
useEffect(() => {
  const fetchMembers = async () => {
    const { data } = await sb.from("students").select("*").order("username"); // ลบ () หลัง sb ออก
    setMembers(data || []);
  };
  fetchMembers();
}, []);import { adminResetPassword, deleteMember } from "@/lib/auth";

export default function AdminPage() {
  const [tab, setTab] = useState<"tt" | "members">("members");
  const [members, setMembers] = useState<any[]>([]);

  useEffect(() => {
    const fetchMembers = async () => {
      const { data } = await sb().from("students").select("*").order("username");
      setMembers(data || []);
    };
    fetchMembers();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* เมนู Tab */}
      <div className="flex gap-2 p-4">
        <button onClick={() => setTab("tt")} className={`flex-1 p-2 rounded-xl text-sm ${tab==="tt"?"bg-slate-800 text-white":"bg-white"}`}>ตาราง</button>
        <button onClick={() => setTab("members")} className={`flex-1 p-2 rounded-xl text-sm ${tab==="members"?"bg-slate-800 text-white":"bg-white"}`}>สมาชิก</button>
      </div>

      {/* หน้าสมาชิก */}
      {tab === "members" && (
        <div className="px-4 space-y-3">
          {members.map((m) => (
            <div key={m.username} className="bg-white p-4 rounded-xl shadow-sm flex justify-between items-center">
              <div>
                <p className="font-bold text-sm">{m.nickname}</p>
                <p className="text-[10px] text-slate-400">รหัส: {m.username}</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={async () => {
                    if (!confirm(`รีเซ็ตรหัสผ่านของ ${m.nickname}?`)) return;
                    try {
                      await adminResetPassword(m.username);
                      alert("รีเซ็ตเรียบร้อย เพื่อนตั้งรหัสใหม่ได้เลย");
                    } catch (e: any) { alert(e.message); }
                  }}
                  className="bg-amber-50 text-amber-600 px-3 py-1 rounded text-[10px] font-bold"
                >
                  รีเซ็ต
                </button>
                <button 
                  onClick={async () => {
                    if (!confirm(`ลบ ${m.nickname} ออกจากระบบ?`)) return;
                    try {
                      await deleteMember(m.username);
                      setMembers(members.filter(x => x.username !== m.username));
                      alert("ลบเรียบร้อย");
                    } catch (e: any) { alert(e.message); }
                  }}
                  className="bg-rose-50 text-rose-600 px-3 py-1 rounded text-[10px] font-bold"
                >
                  ลบ
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
