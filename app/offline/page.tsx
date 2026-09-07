export default function Offline() {
  return (
    <main className="flex min-h-[80vh] flex-col items-center justify-center gap-3 px-8 text-center">
      <div className="text-5xl">🌙</div>
      <h1 className="text-lg font-bold text-slate-800">ยังไม่มีอินเทอร์เน็ต</h1>
      <p className="text-sm text-slate-500">แต่การบ้านที่จดไว้ยังเปิดดูได้ตามปกตินะ</p>
      <a href="/" className="mt-2 rounded-2xl bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white">
        กลับหน้าแรก
      </a>
    </main>
  );
}
