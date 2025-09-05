import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import image from '../assets/image';
import concertsData from '../data/concerts';

const areaMap = {
  'rock-left': '搖滾區左',
  'rock-center': '搖滾區中',
  'rock-right': '搖滾區右',
  'a-area': 'A區',
  'b-area': 'B區',
  'c-area': 'C區',
  'd-area': 'D區'
};

const seatConfig = [
  { id: 'rock-left', rows: 5, cols: 10, className: 'bg-red-500' },
  { id: 'rock-center', rows: 5, cols: 20, className: 'bg-red-500' },
  { id: 'rock-right', rows: 5, cols: 10, className: 'bg-red-500' },
  { id: 'b-area', rows: 20, cols: 10, className: 'bg-orange-400' },
  { id: 'a-area', rows: 20, cols: 20, className: 'bg-yellow-300' },
  { id: 'c-area', rows: 20, cols: 10, className: 'bg-pink-300' },
  { id: 'd-area', rows: 10, cols: 20, className: 'bg-purple-300' }
];

// 小工具：把 fetch 的請求與回應完整印出
async function logFetch(url, options) {
  console.groupCollapsed(`[fetch] ${options?.method || 'GET'} ${url}`);
  if (options?.body) {
    try { console.log('Request JSON:', JSON.parse(options.body)); }
    catch { console.log('Request body (raw):', options.body); }
  } else {
    console.log('Request: (no body)');
  }
  try {
    const res = await fetch(url, options);
    const raw = await res.clone().text(); // 先抓 raw，避免 JSON parse 失敗沒線索
    console.log('Status:', res.status);
    console.log('Headers:', Object.fromEntries(res.headers.entries()));
    console.log('Raw response:', raw);
    let json = null;
    try { json = JSON.parse(raw); } catch {}
    if (json) console.log('Parsed JSON:', json);
    console.groupEnd();
    return { res, raw, json };
  } catch (err) {
    console.error('[fetch error]', err);
    console.groupEnd();
    throw err;
  }
}

export default function Ticket() {
  const { id } = useParams();                     
  const eventIdFromUrl = Number(id);
  const concert = concertsData.find(c => String(c.id) === String(id));

  const [selected, setSelected] = useState(null);
  const [eventTitle, setEventTitle] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventID, setEventID] = useState(null);   
  const [purchased, setPurchased] = useState([]); 
  const [showConfirm, setShowConfirm] = useState(false);
  const [showVerify, setShowVerify] = useState(false);
  const [verifyCode, setVerifyCode] = useState('');

  // 🟢 新增 Debug function
  const debugAll = () => {
    console.log("=== Debug 全部狀態 ===", {
      eventID,
      eventIdFromUrl,
      eventTitle,
      eventLocation,
      selected,
      purchased,
      verifyCode
    });
  };

  // ... useEffect 與其他程式保持不變

  const confirmSubmit = async () => {
    const finalEventId = Number(eventID ?? eventIdFromUrl);
    if (!finalEventId) {
      alert('尚未取得活動代號，請重新整理後再試');
      console.error('[confirmSubmit] event_id 無效：', { eventID, eventIdFromUrl });
      return;
    }

    const payload = {
      area: areaMap[selected.area] || selected.area,
      row: selected.row,
      column: selected.col,
      totpcode_input: verifyCode,
      event_id: finalEventId
    };

    // 🟢 送出前印 payload
    console.log("=== 購票送出 payload ===");
    console.table(payload);

    try {
      const { res, json } = await logFetch(
        'https://reactticketsystem-production.up.railway.app/ticket',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload) // ✅ 扁平送出
        }
      );

      // 🟢 收到回應後印出
      console.log("=== 後端回應 ===", json);

      if (!res.ok) {
        alert(`購票失敗（HTTP ${res.status}）`);
        return;
      }

      if (json?.status) {
        alert('購票成功');
        setShowVerify(false);
        setShowConfirm(false);
        setPurchased(prev => [...prev, [payload.area, payload.row, payload.column]]);
        setSelected(null);
        setVerifyCode('');
      } else {
        alert(json?.notify || '購票失敗');
      }
    } catch (e) {
      console.error('購票發生錯誤', e);
      alert('購票失敗，請稍後再試');
    }
  };

  // ... isDisabled 與 renderSection 保持不變

  if (!concert) {
    return (
      <div className="mt-20 p-6 text-center">
        <h1 className="text-2xl font-bold">找不到這場演唱會資料</h1>
      </div>
    );
  }

  return (
    <div className="mt-20 p-6 text-center">
      <h1 className="text-3xl font-bold mb-1">{eventTitle}</h1>
      <h3 className="text-base mb-4 opacity-70">{eventLocation && `${eventLocation} 場`}</h3>
      <div className="bg-black text-white w-[760px] mx-auto py-2 font-bold mb-6">-----------------</div>

      {/* 🟢 Debug 按鈕 */}
      <button
        onClick={debugAll}
        className="mb-4 px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600"
      >
        Debug 印出所有狀態
      </button>

      {/* 上層：搖滾區 */}
      <div className="flex justify-center gap-8 mb-2">
        {seatConfig.slice(0, 3).map(renderSection)}
      </div>

      {/* 中層：B A C 區 */}
      <div className="flex justify-center gap-8 mb-2">
        {seatConfig.slice(3, 6).map(renderSection)}
      </div>

      {/* 下層：D 區 */}
      <div className="flex justify-center mb-4">
        {renderSection(seatConfig[6])}
      </div>
      
      <p className="mt-4 font-semibold text-red-600">
        {selected
          ? `${areaMap[selected.area] || selected.area} ${selected.row}排 ${selected.col}位`
          : '尚未選擇任何座位'}
      </p>

      <button
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        onClick={handleSubmit}
      >
        確定
      </button>

      {/* 確認 Dialog */}
      {showConfirm && selected && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50">
          <div className="bg-white p-6 rounded shadow text-left">
            <p className="font-bold mb-4">請確認您的訂票內容：</p>
            <table className="mb-4">
              <tbody>
                <tr><td className="pr-2">場次：</td><td>{eventTitle}</td></tr>
                <tr><td className="pr-2">區域：</td><td>{areaMap[selected.area] || selected.area}</td></tr>
                <tr><td className="pr-2">位置：</td><td>{selected.row}排{selected.col}位</td></tr>
              </tbody>
            </table>
            <div className="text-right">
              <button
                onClick={() => { setShowConfirm(false); setShowVerify(true); }}
                className="bg-green-600 text-white px-4 py-2 rounded mr-2"
              >
                確定
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="bg-red-500 text-white px-4 py-2 rounded"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 驗證碼 Dialog */}
      {showVerify && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50">
          <div className="bg-white p-6 rounded shadow text-center">
            <p className="font-bold mb-2">請輸入驗證碼：</p>
            <input
              id="verifyCode"
              name="verifyCode"
              type="text"
              value={verifyCode}
              onChange={e => setVerifyCode(e.target.value)}
              className="border p-2 rounded w-48 mb-4"
              inputMode="numeric"
              placeholder="6 位數"
              autoComplete="one-time-code"
            />
            <div>
              <button
                onClick={confirmSubmit}
                className="bg-blue-600 text-white px-4 py-2 rounded mr-2"
              >
                送出
              </button>
              <button
                onClick={() => setShowVerify(false)}
                className="bg-gray-500 text-white px-4 py-2 rounded"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
