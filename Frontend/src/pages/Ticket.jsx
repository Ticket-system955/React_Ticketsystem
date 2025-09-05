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

export default function Ticket() {
  const { id } = useParams();
  const concert = concertsData.find(c => String(c.id) === String(id));

  // ✅ 單一真實來源：用路由參數轉數字，整支檔案統一用它當 event_id
  const eventId = Number(id);

  const [selected, setSelected] = useState(null);
  const [eventTitle, setEventTitle] = useState('');
  const [eventlocation, setEventLocation] = useState('');
  const [eventID, setEventID] = useState(null);   // 後端若回傳 event_id 就存這裡
  const [purchased, setPurchased] = useState([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showVerify, setShowVerify] = useState(false);
  const [verifyCode, setVerifyCode] = useState('');

  useEffect(() => {
    if (!concert) return;

    setEventTitle(concert.title);
    setEventLocation(concert.location);

    const fetchSeats = async () => {
      try {
        const res = await fetch('https://reactticketsystem-production.up.railway.app/ticket/availability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            data: {
              event_id: eventId, // ✅ 傳數字，不要傳物件
            }
          })
        });

        if (!res.ok) {
          const txt = await res.text();
          console.error('Availability Error:', res.status, txt);
          return;
        }

        const json = await res.json();
        setEventID(Number(json.event_id ?? eventId));      // ✅ 確保是數字
        setPurchased(Array.isArray(json.purchased) ? json.purchased : []);
      } catch (err) {
        console.error('Fetch availability failed', err);
      }
    };

    fetchSeats();
  }, [concert, eventId]); // ✅ eventId 已定義

  const handleSelect = (seat) => {
    if (seat.disabled) return;
    setSelected(seat);
  };

  const handleSubmit = () => {
    if (!selected) return alert('請先選擇一個座位');
    setShowConfirm(true);
  };

  const confirmSubmit = async () => {
    const finalEventId = Number(eventID ?? eventId); // ✅ 以後端回傳為主，否則用路由 id
    if (!finalEventId || Number.isNaN(finalEventId)) {
      alert('尚未取得活動代號，請重新整理後再試');
      return;
    }

    const payload = {
      // ✅ 後端建議用英文 key；顯示再用 areaMap 轉中文
      area: selected.area,
      row: selected.row,
      column: selected.col,
      totpcode_input: verifyCode,
      event_id: finalEventId
    };

    try {
      const res = await fetch('https://reactticketsystem-production.up.railway.app/ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ data: payload })
      });
      const data = await res.json();

      if (data.status) {
        alert('購票成功');
        setShowVerify(false);
        setShowConfirm(false);
        // 樂觀更新，避免重複選
        setPurchased(prev => [...prev, [payload.area, payload.row, payload.column]]);
        setSelected(null);
        setVerifyCode('');
      } else {
        alert(data.notify || '購票失敗');
      }
    } catch (e) {
      console.error('購票發生錯誤', e);
      alert('購票失敗，請稍後再試');
    }
  };

  // ❗ 如果後端的 purchased 用中文儲存，就把 dbArea 先轉回英文比對
  const isDisabled = (areaKey, row, col) =>
    purchased.some(([dbArea, dbRow, dbCol]) =>
      (dbArea === areaKey || areaMap[areaKey] === dbArea) && // 同時相容英文/中文
      Number(dbRow) === Number(row) &&
      Number(dbCol) === Number(col)
    );

  const renderSection = ({ id: sectionId, rows, cols, className }) => (
    <div key={sectionId} className="flex flex-col gap-[2px]">
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex justify-center gap-[2px]">
          {Array.from({ length: cols }, (_, c) => {
            const row = r + 1;
            const col = c + 1;
            const used = isDisabled(sectionId, row, col);
            const sel =
              selected &&
              selected.area === sectionId &&
              selected.row === row &&
              selected.col === col;
            return (
              <button
                key={c}
                disabled={used}
                onClick={() => handleSelect({ area: sectionId, row, col, disabled: used })}
                className={`
                  w-6 h-6 p-0 m-[1px] flex items-center justify-center rounded
                  ${used
                    ? 'bg-gray-400 cursor-not-allowed'
                    : sel
                      ? 'bg-blue-600 text-white'
                      : `${className} hover:opacity-80 active:scale-95`}
                `}
              >
                <img src={image.chair} alt="chair" className="w-4 h-4" />
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );

  if (!concert) {
    return (
      <div className="mt-20 p-6 text-center">
        <h1 className="text-2xl font-bold">找不到這場演唱會資料</h1>
      </div>
    );
  }

  return (
    <div className="mt-20 p-6 text-center">
      <h1 className="text-3xl font-bold mb-4">{eventTitle}</h1><br/>
      <h3 className="text-3xl font-bold mb-4">{eventlocation}場</h3>
      <div className="bg-black text-white w-[760px] mx-auto py-2 font-bold mb-6">-----------------</div>

      {/* 上層：搖滾區 */}
      <div className="flex justify-center gap-8 mb-2">
        {seatConfig.slice(0, 3).map(renderSection)}
      </div>

      {/* 中層：B A C 區 */}
      <div className="flex justify中心 gap-8 mb-2">
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
        <div className="fixed inset-0 flex items-center justify-center bg黑/50">
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
        <div className="fixed inset-0 flex items-center justify-center bg黑/50">
          <div className="bg-white p-6 rounded shadow text-center">
            <p className="font-bold mb-2">請輸入驗證碼：</p>
            <input
              type="text"
              value={verifyCode}
              onChange={e => setVerifyCode(e.target.value)}
              className="border p-2 rounded w-48 mb-4"
              inputMode="numeric"
              placeholder="6 位數"
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
