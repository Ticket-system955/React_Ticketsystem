// src/pages/Ticket.jsx
import { useEffect, useState, useCallback } from 'react'
import image from '../assets/image'

const API = 'https://reactticketsystem-production.up.railway.app'

const areaMap = {
  'rock-left': '搖滾區左',
  'rock-center': '搖滾區中',
  'rock-right': '搖滾區右',
  'a-area': 'A區',
  'b-area': 'B區',
  'c-area': 'C區',
  'd-area': 'D區'
}

const seatConfig = [
  { id: 'rock-left', rows: 5, cols: 10, className: 'bg-red-500' },
  { id: 'rock-center', rows: 5, cols: 20, className: 'bg-red-500' },
  { id: 'rock-right', rows: 5, cols: 10, className: 'bg-red-500' },
  { id: 'b-area', rows: 20, cols: 10, className: 'bg-orange-400' },
  { id: 'a-area', rows: 20, cols: 20, className: 'bg-yellow-300' },
  { id: 'c-area', rows: 20, cols: 10, className: 'bg-pink-300' },  
  { id: 'd-area', rows: 10, cols: 20, className: 'bg-purple-300' }
]

export default function Ticket() {
  const [selected, setSelected] = useState(null)
  const [eventTitle, setEventTitle] = useState('STAGE')
  const [eventID, setEventID] = useState(null)
  const [purchased, setPurchased] = useState([])
  const [showConfirm, setShowConfirm] = useState(false)
  const [showVerify, setShowVerify] = useState(false)
  const [verifyCode, setVerifyCode] = useState('')

  const [ready, setReady] = useState(false)       // availability 是否載入完成
  const [errMsg, setErrMsg] = useState('')        // 顯示錯誤
  const [loadingSubmit, setLoadingSubmit] = useState(false)

  // 讀 URL 的 title
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const title = decodeURIComponent(params.get('title') || 'STAGE')
    setEventTitle(title)
  }, [])

  // 取已購與 event_id（可重試）
  const fetchAvailability = useCallback(async () => {
    setReady(false)
    setErrMsg('')
    try {
      const res = await fetch(`${API}/ticket/availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: eventTitle }),
        credentials: 'include'
      })
      if (!res.ok) {
        const txt = await res.text()
        console.error('Availability HTTP Error:', res.status, txt)
        setErrMsg(`載入失敗 (${res.status})`)
        return
      }
      const json = await res.json()
      console.log('[availability] response:', json) // 方便排錯
      if (!json?.status) {
        setErrMsg(json?.notify || '無法取得活動資訊（title 可能對不到）')
        return
      }
      setEventID(json.event_id)
      setPurchased(json.purchased || [])
    } catch (e) {
      console.error('Fetch availability failed', e)
      setErrMsg('網路錯誤，請稍後重試')
    } finally {
      setReady(true)
    }
  }, [eventTitle])

  useEffect(() => {
    fetchAvailability()
  }, [fetchAvailability])

  const handleSelect = (seat) => {
    if (seat.disabled) return
    setSelected(seat)
  }

  const handleSubmit = () => {
    if (!selected) return alert('請先選擇一個座位')
    setShowConfirm(true)
  }

  const confirmSubmit = async () => {
    if (!selected) return alert('請先選擇一個座位')
    if (!verifyCode) return alert('請輸入驗證碼')

    // 若 eventID 還沒就緒，先嘗試再抓一次（JIT 兜底）
    if (!eventID) {
      await fetchAvailability()
      if (!eventID) {
        alert('尚未取得 event_id，請確認網址上的 title 是否正確，或稍後再試')
        return
      }
    }

    const flat = {
      area: areaMap[selected.area] || selected.area,
      row: selected.row,
      column: selected.col,
      totpcode_input: verifyCode,
      event_id: eventID
    }

    try {
      setLoadingSubmit(true)
      const res = await fetch(`${API}/ticket`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        // 雙軌送法：平鋪 + payload，讓後端不論怎麼解包都能拿到
        body: JSON.stringify({ ...flat, payload: { ...flat } })
      })
      if (!res.ok) {
        const txt = await res.text()
        console.error('Purchase HTTP Error:', res.status, txt)
        alert('伺服器錯誤，請稍後再試')
        return
      }
      const data = await res.json()
      console.log('[purchase] response:', data)

      if (data.status) {
        alert('購票成功')
        setShowVerify(false)
        setShowConfirm(false)
        setSelected(null)
        setVerifyCode('')
        // 成功後刷新已購
        await fetchAvailability()
      } else {
        alert(data.notify || '購票失敗')
      }
    } catch (e) {
      console.error('confirmSubmit error:', e)
      alert('網路異常，請稍後再試')
    } finally {
      setLoadingSubmit(false)
    }
  }

  const isDisabled = (area, row, col) =>
    purchased.some(
      ([dbArea, dbRow, dbCol]) =>
        dbArea === areaMap[area] &&
        Number(dbRow) === Number(row) &&
        Number(dbCol) === Number(col)
    )

  const renderSection = ({ id, rows, cols, className }) => (
    <div key={id} className="flex flex-col gap-[2px]">
      {[...Array(rows)].map((_, r) => (
        <div key={r} className="flex justify-center gap-[2px]">
          {[...Array(cols)].map((_, c) => {
            const row = r + 1
            const col = c + 1
            const used = isDisabled(id, row, col)
            const sel =
              selected &&
              selected.area === id &&
              selected.row === row &&
              selected.col === col
            return (
              <button
                key={c}
                disabled={used || !ready || !!errMsg}
                onClick={() => handleSelect({ area: id, row, col, disabled: used })}
                className={`
                  w-6 h-6 p-0 m-[1px] flex items-center justify-center rounded
                  ${used
                    ? 'bg-gray-400 cursor-not-allowed'
                    : sel
                      ? 'bg-blue-600 text-white'
                      : `${className} hover:opacity-80 active:scale-95`}
                `}
                title={`${areaMap[id]} ${row}排 ${col}位`}
              >
                <img src={image.chair} alt="chair" className="w-4 h-4" />
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )

  return (
    <div className="mt-20 p-6 text-center">
      <h1 className="text-3xl font-bold mb-4">{eventTitle}</h1>

      {!ready && !errMsg && <p className="text-gray-600 mb-3">載入中...</p>}
      {!!errMsg && (
        <div className="mb-3 text-red-600">
          {errMsg}{' '}
          <button
            onClick={fetchAvailability}
            className="ml-2 underline text-blue-600"
          >
            重試
          </button>
        </div>
      )}

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
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        onClick={() => {
          if (!ready) return
          if (!!errMsg) return alert(errMsg)
          handleSubmit()
        }}
        disabled={!ready || !!errMsg || !selected || loadingSubmit}
      >
        {loadingSubmit ? '送出中…' : '確定'}
      </button>

      {/* 確認 Dialog */}
      {showConfirm && selected && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50">
          <div className="bg-white p-6 rounded shadow text-left">
            <p className="font-bold mb-4">請確認您的訂票內容：</p>
            <table className="mb-4">
              <tbody>
                <tr><td className="pr-2">場次：</td><td>{eventTitle}</td></tr>
                <tr><td className="pr-2">區域：</td><td>{areaMap[selected.area]}</td></tr>
                <tr><td className="pr-2">位置：</td><td>{selected.row}排{selected.col}位</td></tr>
              </tbody>
            </table>
            <div className="text-right">
              <button
                onClick={() => { setShowConfirm(false); setShowVerify(true) }}
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
      {showVerify && selected && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50">
          <div className="bg-white p-6 rounded shadow text-center">
            <p className="font-bold mb-2">請輸入驗證碼：</p>
            <input
              type="text"
              value={verifyCode}
              onChange={e => setVerifyCode(e.target.value)}
              className="border p-2 rounded w-48 mb-4"
            />
            <div>
              <button
                onClick={confirmSubmit}
                className="bg-blue-600 text-white px-4 py-2 rounded mr-2"
                disabled={!ready || !!errMsg || loadingSubmit}
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
  )
}
