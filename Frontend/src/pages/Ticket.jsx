// src/pages/Ticket.jsx
import { useEffect, useMemo, useRef, useState } from 'react'
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
  const [restoring, setRestoring] = useState(false)
  const [restoreLeftSec, setRestoreLeftSec] = useState(0)
  const [loading, setLoading] = useState(false)

  // 記錄「目前被我鎖住」的座位，離開頁面時釋放用
  const lockedSeatRef = useRef(null)

  // 從 URL 拿 title（你的 /ticket/availability 以 title 換 event_id）
  const params = useMemo(() => new URLSearchParams(window.location.search), [])
  const qTitle = useMemo(() => decodeURIComponent(params.get('title') || 'STAGE'), [params])

  useEffect(() => {
    setEventTitle(qTitle)

    const init = async () => {
      try {
        // 1) 先拿已購清單 & event_id（注意 body 傳 { title }）
        const res = await fetch(`${API}/ticket/availability`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ title: qTitle })
        })
        if (!res.ok) {
          const t = await res.text()
          console.error('Availability Error:', res.status, t)
          return
        }
        const j = await res.json()
        if (j?.status) {
          setEventID(j.event_id)
          setPurchased(j.purchased || [])
        } else {
          console.error('Get availability fail:', j)
        }

        // 2) 嘗試還原鎖
        const restore = await fetch(`${API}/ticket/restore`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({})
        })
        const rj = await restore.json()
        if (rj?.status && Array.isArray(rj.seat)) {
          const [rid, areaDisplay, row, column] = rj.seat
          // 後端回 seat 用中文區名（areaDisplay），我們需要找回對應 id
          const areaId = toAreaId(areaDisplay)
          if (Number(rid) === Number(j?.event_id)) {
            setSelected({ area: areaId, row, col: column, disabled: false })
            setRestoring(true)
            setRestoreLeftSec(rj.time ?? 0)
            lockedSeatRef.current = {
              event_id: j.event_id,
              area: areaDisplay,
              row,
              column
            }
          }
        }
      } catch (err) {
        console.error('Init error:', err)
      }
    }

    init()
  }, [qTitle])

  // 還原倒數
  useEffect(() => {
    if (!restoring || restoreLeftSec <= 0) return
    const timer = setInterval(() => {
      setRestoreLeftSec(sec => {
        if (sec <= 1) {
          setRestoring(false)
          lockedSeatRef.current = null
          return 0
        }
        return sec - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [restoring, restoreLeftSec])

  // 離開頁面釋放鎖
  useEffect(() => {
    const onUnload = async () => {
      if (!lockedSeatRef.current) return
      const { event_id, area, row, column } = lockedSeatRef.current
      try {
        await fetch(`${API}/ticket/cancel`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          keepalive: true,
          body: JSON.stringify({ event_id, area, row, column })
        })
      } catch (_) {}
    }
    window.addEventListener('beforeunload', onUnload)
    return () => window.removeEventListener('beforeunload', onUnload)
  }, [])

  const toAreaId = (displayName) => {
    const found = Object.entries(areaMap).find(([, zh]) => zh === displayName)
    return found ? found[0] : displayName
  }

  const handleSelect = async (seat) => {
    if (seat.disabled || !eventID || loading) return

    setLoading(true)
    try {
      // 先檢查一人一票
      const check = await fetch(`${API}/ticket/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ event_id: eventID })
      }).then(r => r.json())

      if (!check?.status) {
        alert(check?.notify || '不可購買')
        return
      }

      // 鎖票（後端吃中文區名）
      const lockRes = await fetch(`${API}/ticket/lock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          event_id: eventID,
          area: areaMap[seat.area] || seat.area,
          row: seat.row,
          column: seat.col
        })
      }).then(r => r.json())

      if (!lockRes?.status) {
        alert(lockRes?.notify || '鎖票失敗')
        return
      }

      // 鎖成功才記錄選取 & 本地鎖
      setSelected(seat)
      lockedSeatRef.current = {
        event_id: eventID,
        area: areaMap[seat.area] || seat.area,
        row: seat.row,
        column: seat.col
      }
      setRestoring(true)
      setRestoreLeftSec(lockRes.expire_seconds ?? 0)
    } catch (err) {
      console.error('handleSelect error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = () => {
    if (!selected) return alert('請先選擇一個座位')
    setShowConfirm(true)
  }

  const cancelLock = async () => {
    if (!lockedSeatRef.current) return
    const { event_id, area, row, column } = lockedSeatRef.current
    try {
      const cancel = await fetch(`${API}/ticket/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ event_id, area, row, column })
      }).then(r => r.json())
      if (!cancel?.status) console.warn('取消鎖票失敗：', cancel?.notify)
    } catch (err) {
      console.error('cancelLock error:', err)
    } finally {
      lockedSeatRef.current = null
    }
  }

  const confirmSubmit = async () => {
    if (!selected || !eventID) return
    if (!verifyCode) return alert('請輸入驗證碼')

    const body = {
      event_id: eventID,
      area: areaMap[selected.area] || selected.area,
      row: selected.row,
      column: selected.col,
      totpcode_input: verifyCode
    }

    try {
      const res = await fetch(`${API}/ticket`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body)
      })
      const data = await res.json()

      if (data.status) {
        alert('購票成功')
        setShowVerify(false)
        setShowConfirm(false)
        setSelected(null)
        setVerifyCode('')
        lockedSeatRef.current = null

        // 重新載入已購，將剛買到的座位灰掉
        const avail = await fetch(`${API}/ticket/availability`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ title: eventTitle })
        }).then(r => r.json())
        if (avail?.status) {
          setEventID(avail.event_id)
          setPurchased(avail.purchased || [])
        }
      } else {
        alert(data.notify || '購票失敗')
      }
    } catch (err) {
      console.error('confirmSubmit error:', err)
      alert('購票失敗，請稍後再試')
    }
  }

  const isDisabled = (areaId, row, col) =>
    purchased.some(
      ([dbArea, dbRow, dbCol]) =>
        dbArea === (areaMap[areaId] || areaId) &&
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
                disabled={used || loading}
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
      <h1 className="text-3xl font-bold mb-2">{eventTitle}</h1>
      {restoring && restoreLeftSec > 0 && (
        <p className="text-sm text-orange-600 mb-2">
          已為你保留上一個座位（{restoreLeftSec}s）
        </p>
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

      <div className="mt-4 flex items-center justify-center gap-3">
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          onClick={handleSubmit}
          disabled={!selected || loading}
        >
          確定
        </button>
        {lockedSeatRef.current && (
          <button
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            onClick={async () => {
              await cancelLock()
              setSelected(null)
              setShowConfirm(false)
              setShowVerify(false)
              setRestoring(false)
              setRestoreLeftSec(0)
            }}
          >
            釋放座位
          </button>
        )}
      </div>

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
                onClick={async () => {
                  setShowConfirm(false)
                  await cancelLock()
                }}
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
              >
                送出
              </button>
              <button
                onClick={() => setShowVerify(false)}
                className="bg-gray-500 text-white px-4 py-2 rounded"
              >
                返回
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
