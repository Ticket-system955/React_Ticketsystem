import { useEffect, useMemo, useState } from "react";

const BASE_URL = "https://reactticketsystem-production.up.railway.app"; // 改成你的 API Host

// ---- 小工具：包裝 fetch ----
async function apiPost(path, body) {
  const resp = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include", // 讓 cookie / session 帶上
    body: JSON.stringify(body || {}),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    // 非 2xx 異常也走這裡
    return { status: false, notify: data?.notify || `HTTP ${resp.status}` };
  }
  return data;
}

export default function TicketDemo() {
  // ---- 表單狀態 ----
  const [eventId, setEventId] = useState(1001);
  const [area, setArea] = useState("a-area");
  const [row, setRow] = useState(1);
  const [column, setColumn] = useState(1);
  const [totp, setTotp] = useState("");

  // ---- UI 狀態 ----
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState([]);
  const [purchased, setPurchased] = useState([]);

  const payloadLock = useMemo(() => ({ event_id: Number(eventId), area, row: Number(row), column: Number(column) }), [eventId, area, row, column]);
  const payloadBuy = useMemo(() => ({ ...payloadLock, totpcode_input: totp }), [payloadLock, totp]);

  const pushLog = (msg) => {
    const time = new Date().toLocaleTimeString();
    setLog((prev) => [{ time, msg }, ...prev].slice(0, 100));
  };

  // ---- API Actions ----
  const lockSeat = async () => {
    setLoading(true);
    const res = await apiPost("/ticket/lock", { data: payloadLock });
    pushLog(`[lock] ${res.status ? "✅" : "❌"} ${res.notify ?? JSON.stringify(res)}`);
    setLoading(false);
  };

  const checkMyStatus = async () => {
    setLoading(true);
    const res = await apiPost("/ticket/check", { data: { event_id: Number(eventId) } });
    pushLog(`[check] ${res.status ? "✅" : "❌"} ${res.notify ?? JSON.stringify(res)}`);
    setLoading(false);
  };

  const cancelSeat = async () => {
    setLoading(true);
    const res = await apiPost("/ticket/cancel", { data: payloadLock });
    pushLog(`[cancel] ${res.status ? "✅" : "❌"} ${res.notify ?? JSON.stringify(res)}`);
    setLoading(false);
  };

  const restoreSeat = async () => {
    setLoading(true);
    const res = await apiPost("/ticket/restore", {}); // 後端會從 session 取 UserID
    pushLog(`[restore] ${res.status ? "✅" : "❌"} ${res.notify ?? JSON.stringify(res)}`);
    setLoading(false);
  };

  const purchase = async () => {
    if (!totp || totp.length < 6) {
      pushLog("[ticket] ⚠️ 請輸入 6 位數 TOTP 驗證碼");
      return;
    }
    setLoading(true);
    const res = await apiPost("/ticket", { data: payloadBuy });
    pushLog(`[ticket] ${res.status ? "✅" : "❌"} ${res.notify ?? JSON.stringify(res)}`);
    setLoading(false);
  };

  const fetchPurchased = async () => {
    setLoading(true);
    const res = await apiPost("/ticket/purchased", { data: { event_id: Number(eventId) } });
    if (res.status) {
      setPurchased(res.purchased || []);
    }
    pushLog(`[purchased] ${res.status ? "✅" : "❌"} 取回 ${Array.isArray(res.purchased) ? res.purchased.length : 0} 筆`);
    setLoading(false);
  };

  // 初次掛載時嘗試 restore（使用者重新整理頁面可復原鎖位）
  useEffect(() => {
    restoreSeat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900 p-6">
      <div className="max-w-4xl mx-auto grid gap-6">
        {/* Header */}
        <header className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold">🎟️ Ticket Flow Demo</h1>
            <p className="text-sm text-neutral-600">前端 React 範本：鎖位 / 檢查 / 取消 / 恢復 / 購買 / 查詢已售出</p>
          </div>
          <div className="text-xs text-neutral-500 select-all">API: {BASE_URL}</div>
        </header>

        {/* Form */}
        <section className="bg-white rounded-2xl shadow p-4 grid md:grid-cols-2 gap-4">
          <div className="grid gap-3">
            <label className="grid gap-1">
              <span className="text-sm">Event ID</span>
              <input type="number" className="border rounded-lg px-3 py-2" value={eventId} onChange={(e) => setEventId(e.target.value)} />
            </label>
            <label className="grid gap-1">
              <span className="text-sm">Area</span>
              <select className="border rounded-lg px-3 py-2" value={area} onChange={(e) => setArea(e.target.value)}>
                <option value="rock-left">搖滾區左</option>
                <option value="rock-center">搖滾區中</option>
                <option value="rock-right">搖滾區右</option>
                <option value="a-area">A區</option>
                <option value="b-area">B區</option>
                <option value="c-area">C區</option>
                <option value="d-area">D區</option>
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1">
                <span className="text-sm">Row</span>
                <input type="number" className="border rounded-lg px-3 py-2" value={row} min={1} onChange={(e) => setRow(e.target.value)} />
              </label>
              <label className="grid gap-1">
                <span className="text-sm">Column</span>
                <input type="number" className="border rounded-lg px-3 py-2" value={column} min={1} onChange={(e) => setColumn(e.target.value)} />
              </label>
            </div>
          </div>

          <div className="grid gap-3">
            <label className="grid gap-1">
              <span className="text-sm">TOTP 驗證碼（購買時必填）</span>
              <input
                className="border rounded-lg px-3 py-2 tracking-widest"
                placeholder="000000"
                value={totp}
                onChange={(e) => setTotp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
              />
            </label>

            <div className="flex flex-wrap gap-2 pt-1">
              <button disabled={loading} onClick={lockSeat} className="px-3 py-2 rounded-xl bg-black text-white disabled:opacity-50">鎖定座位</button>
              <button disabled={loading} onClick={checkMyStatus} className="px-3 py-2 rounded-xl bg-neutral-800 text-white disabled:opacity-50">檢查狀態</button>
              <button disabled={loading} onClick={cancelSeat} className="px-3 py-2 rounded-xl bg-neutral-200 disabled:opacity-50">取消鎖位</button>
              <button disabled={loading} onClick={restoreSeat} className="px-3 py-2 rounded-xl bg-neutral-200 disabled:opacity-50">恢復鎖位</button>
              <button disabled={loading} onClick={purchase} className="px-3 py-2 rounded-xl bg-emerald-600 text-white disabled:opacity-50">完成購買</button>
              <button disabled={loading} onClick={fetchPurchased} className="px-3 py-2 rounded-xl bg-sky-600 text-white disabled:opacity-50">已售出清單</button>
            </div>
          </div>
        </section>

        {/* Purchased List */}
        <section className="bg-white rounded-2xl shadow p-4">
          <h2 className="font-semibold mb-2">已售出清單（event_id = {String(eventId)}）</h2>
          <div className="overflow-auto border rounded-xl">
            <table className="min-w-full text-sm">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="px-3 py-2 text-left">#</th>
                  <th className="px-3 py-2 text-left">Area</th>
                  <th className="px-3 py-2 text-left">Row</th>
                  <th className="px-3 py-2 text-left">Column</th>
                </tr>
              </thead>
              <tbody>
                {purchased?.length ? (
                  purchased.map((it, idx) => (
                    <tr className="border-t" key={`${it.area}-${it.row}-${it.column}-${idx}`}>
                      <td className="px-3 py-2">{idx + 1}</td>
                      <td className="px-3 py-2">{it.area}</td>
                      <td className="px-3 py-2">{it.row}</td>
                      <td className="px-3 py-2">{it.column}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-3 py-4 text-neutral-500" colSpan={4}>（尚無資料）</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Console */}
        <section className="bg-black text-white rounded-2xl p-3 font-mono text-xs leading-5">
          <div className="opacity-70 mb-2">Console</div>
          <ul className="space-y-1">
            {log.map((l, i) => (
              <li key={i} className="whitespace-pre-wrap">{l.time} — {l.msg}</li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
