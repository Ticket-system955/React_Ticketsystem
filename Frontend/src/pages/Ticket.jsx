import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  { id: '搖滾區左', rows: 5, cols: 10, className: 'bg-red-500' },
  { id: '搖滾區中', rows: 5, cols: 20, className: 'bg-red-500' },
  { id: '搖滾區右', rows: 5, cols: 10, className: 'bg-red-500' },
  { id: 'A區', rows: 20, cols: 10, className: 'bg-orange-400' },
  { id: 'B區', rows: 20, cols: 20, className: 'bg-yellow-300' },
  { id: 'C區', rows: 20, cols: 10, className: 'bg-pink-300' },
  { id: 'D區', rows: 10, cols: 20, className: 'bg-purple-300' }
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
    const raw = await res.clone().text();
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
  const navigate = useNavigate();
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
  const [isLocking, setIsLocking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 本地鎖與倒數（避免驗證失敗/取消時座位長期反灰）
  const [lockedByMe, setLockedByMe] = useState(null); // {area,row,column,expiresAt}
  const [lockCountdown, setLockCountdown] = useState(null); 

  const isCodeReady = /^\d{6}$/.test(verifyCode);

  // 頁面初始化：抓活動資料 & 已售/已鎖座位
  useEffect(() => {
    if (!concert) {
      console.warn('[Ticket] 找不到演唱會資料，id =', id);
      return;
    }

    const title = concert.name ?? concert.title ?? `活動 #${eventIdFromUrl}`;
    const location = concert.location ?? '';
    setEventTitle(title);
    setEventLocation(location);

    (async () => {
      try {
        const { res, json } = await logFetch(
          'https://reactticketsystem-production.up.railway.app/ticket/availability',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ event_id: eventIdFromUrl })
          }
        );

        if (!res.ok) return;

        const incomingEventId = json?.event_id ?? eventIdFromUrl;
        console.log('[availability] resolved event_id =', incomingEventId);
        setEventID(incomingEventId);

        const purchasedList = Array.isArray(json?.purchased) ? json.purchased : [];
        console.log('[availability] purchased seats =', purchasedList);
        setPurchased(purchasedList);
      } catch (err) {
        console.error('Fetch availability failed', err);
      }
    })();
  }, [concert, id, eventIdFromUrl]);

  // 倒數計時：每秒 -1，為 0 時自動解除鎖
  useEffect(() => {
    if (lockCountdown == null) return;
    if (lockCountdown <= 0) {
      if (lockedByMe) {
        alert('鎖位逾時，已釋放座位');
        unlockSeat(); // 自動釋放
      }
      return;
    }
    const t = setInterval(() => setLockCountdown(v => (v ? v - 1 : v)), 1000);
    return () => clearInterval(t);
  }, [lockCountdown, lockedByMe]);

  // 解除鎖（取消/逾時/錯誤時呼叫）
  async function unlockSeat() {
    try {
      if (!lockedByMe) { cleanupLockUI(); return; }
      const finalEventId = Number(eventID ?? eventIdFromUrl);
      await logFetch('https://reactticketsystem-production.up.railway.app/ticket/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          event_id: finalEventId,
          area: lockedByMe.area,
          row: lockedByMe.row,
          column: lockedByMe.column
        })
      });
    } catch (e) {
      console.warn('[unlockSeat] 解除鎖失敗（可忽略，TTL 會自動釋放）', e);
    } finally {
      cleanupLockUI();
    }
  }

  function cleanupLockUI() {
    setLockedByMe(null);
    setLockCountdown(null);
    setShowVerify(false);
    setShowConfirm(false);
  }

  async function checkAndLock() {
    const finalEventId = Number(eventID ?? eventIdFromUrl);
    if (!selected || !finalEventId) {
      alert('缺少座位或活動編號'); 
      return;
    }
    if (isLocking) return;                 
    setIsLocking(true);

    try {
      // 先檢查一人限購
      const { res, json } = await logFetch(
        'https://reactticketsystem-production.up.railway.app/ticket/check',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ event_id: finalEventId }),
        }
      );

      if (!res.ok || !json?.status) {
        alert(json?.notify || '您已經購買過本場票券，無法再次購買');
        return;
      }

      // 通過檢查才進行鎖位
      await lockSeat();
    } catch (e) {
      console.error('[checkAndLock] error', e);
      alert('檢查失敗，請稍後再試');
    } finally {
      setIsLocking(false);
    }
  }

  // 鎖位
  async function lockSeat() {
    const finalEventId = Number(eventID ?? eventIdFromUrl);
    if (!selected || !finalEventId) {
      alert('缺少座位或活動編號'); return;
    }
    if (isLocking) return;
    setIsLocking(true);

    const payload = {
      event_id: finalEventId,
      area: selected.area,    
      row: selected.row,
      column: selected.col
    };

    console.log('[lockSeat] payload =', payload);

    try {
      const { res, json } = await logFetch(
        'https://reactticketsystem-production.up.railway.app/ticket/lock',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload)
        }
      );

      if (!res.ok || !json?.status) {
        alert(json?.notify || `鎖位失敗（HTTP ${res.status}）`);
        return;
      }

      // 設定本地鎖 & 倒數
      const ttlSec = Number(json.ttl || 60);
      setLockedByMe({ area: payload.area, row: payload.row, column: payload.column, expiresAt: Date.now() + ttlSec * 1000 });
      setLockCountdown(ttlSec);

      setShowConfirm(false);
      setShowVerify(true);
    } finally {
      setIsLocking(false);
    }
  }

  // 送出驗證（正式購票）
  async function confirmSubmit() {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const finalEventId = Number(eventID ?? eventIdFromUrl);

      // 基本驗證
      if (!selected) { alert('尚未選擇座位'); return; }
      if (!Number.isFinite(finalEventId)) {
        console.error('[confirmSubmit] 無效的 event_id:', { eventID, eventIdFromUrl });
        alert('活動代號錯誤，請重新整理頁面'); return;
      }
      if (!/^\d{6}$/.test(verifyCode)) {
        alert('請輸入 6 位數驗證碼'); return;
      }

      const payload = {
        event_id: finalEventId,
        area: selected.area, 
        row: selected.row,
        column: selected.col,
        totpcode_input: verifyCode
      };

      console.log('=== [confirmSubmit] payload ===');
      console.table(payload);
      Object.entries(payload).forEach(([key, value]) => {
        console.log(`${key}: ${value}`);
      });  
    const { res, json } = await logFetch(
        'https://reactticketsystem-production.up.railway.app/ticket',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload)
        }
      );

      if (!res.ok || !json?.status) {
        alert(json?.notify || `購票失敗（HTTP ${res.status}）`);
        await unlockSeat();
        return;
      }

  alert(json.notify || '購票成功');

      // 成功後清理 UI 狀態
      setShowVerify(false);
      setShowConfirm(false);
      setSelected(null);
      setVerifyCode('');
      setLockedByMe(null);
      setLockCountdown(null);
      navigate('/');

      // 重新抓一次 purchased，確保畫面同步
      try {
        const { res: r2, json: j2 } = await logFetch(
          'https://reactticketsystem-production.up.railway.app/ticket/availability',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ event_id: finalEventId })
          }
        );
        if (r2.ok && Array.isArray(j2?.purchased)) {
          setPurchased(j2.purchased);
        }
      } catch (e2) {
        console.warn('[confirmSubmit] 重新載入 purchased 失敗（忽略）', e2);
      }

    } catch (e) {
      console.error('購票發生錯誤', e);
      alert('購票失敗，請稍後再試');
    } finally {
      setIsSubmitting(false);
    }
  }

  // 檢查是否已被購/鎖
  const isDisabled = (areaKey, row, col) => {
    const displayArea = areaMap[areaKey] || areaKey;
    const used = purchased.some(([dbArea, dbRow, dbCol]) =>
      dbArea === displayArea && Number(dbRow) === Number(row) && Number(dbCol) === Number(col)
    );
    const lockedMine = lockedByMe &&
      lockedByMe.area === displayArea &&
      Number(lockedByMe.row) === Number(row) &&
      Number(lockedByMe.column) === Number(col);
    return used || lockedMine;
  };

  const handleSelect = (seat) => {
    if (seat.disabled) return;
    setSelected(seat);
  };

  const handleSubmit = () => {
    if (!selected) return alert('請先選擇一個座位');
    setShowConfirm(true);
  };

  const renderSection = ({ id: sectionId, rows, cols, className }) => (
    <div key={sectionId} className="flex flex-col gap-[2px]">
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex justify-center gap-[2px]">
          {Array.from({ length: cols }, (_, c) => {
            const row = r + 1;
            const col = c + 1;
            const used = isDisabled(sectionId, row, col);
            const sel = selected && selected.area === sectionId && selected.row === row && selected.col === col;
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
      <h1 className="text-3xl font-bold mb-1">{eventTitle}</h1>
      <h3 className="text-base mb-4 opacity-70">{eventLocation && `${eventLocation} 場`}</h3>
      <div className="bg-black text-white w-[760px] mx-auto py-2 font-bold mb-6">-----------------</div>

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
          ? `${areaMap[selected.area]} ${selected.row}排 ${selected.col}位`
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
                <tr><td className="pr-2">區域：</td><td>{selected.area}</td></tr>
                <tr><td className="pr-2">位置：</td><td>{selected.row}排{selected.col}位</td></tr>
              </tbody>
            </table>
            <div className="text-right">
              <button
                onClick={checkAndLock}
                disabled={isLocking}
                className="bg-green-600 text-white px-4 py-2 rounded mr-2"
              >
                {isLocking ? '鎖定中…' : '確定'}
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
            <p className="font-bold mb-2">
              請輸入驗證碼{lockCountdown != null && `（剩餘 ${lockCountdown}s）`}
            </p>
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
            <div className="flex justify-center gap-2">
              <button
                onClick={confirmSubmit}
                disabled={!isCodeReady || isSubmitting}
                className="bg-blue-600 text-white px-4 py-2 rounded"
              >
                {isSubmitting ? '送出中…' : '送出'}
              </button>
              <button
                onClick={unlockSeat}
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
//新增返回上一步取消索票