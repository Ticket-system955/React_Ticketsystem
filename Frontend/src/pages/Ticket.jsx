import { useEffect, useMemo, useRef, useState } from 'react'
import image from '../assets/image'

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

const API = 'https://reactticketsystem-production.up.railway.app'

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

  const lockedSeatRef = useRef(null)

  const params = useMemo(() => new URLSearchParams(window.location.search), [])
  const qTitle = useMemo(() => decodeURIComponent(params.get('title') || 'STAGE'), [params])
  const qEventId = useMemo(() => {
    const id = params.get('id')
    return id ? Number(id) : null
  }, [params])

  useEffect(() => {
    setEventTitle(qTitle)
  }, [qTitle])

  useEffect(() => {
    let cancelled = false

    const init = async () => {
      try {
        let eid = qEventId
        if (!eid) {
          const res = await fetch(`${API}/ticket`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ event_id: null, title: qTitle }) // 後端若必填 event_id，請改成提供 id；否則讓後端支援 title 解析。
          })
          const data = await res.json()
          if (data?.status && data?.data?.event?.id) {
            eid = Number(data.data.event.id)
            if (!cancelled) {
              setEventID(eid)
              setEventTitle(data.data.event.title || qTitle)
            }
          } else {
            console.error('GetTicketData 失敗/沒有 id：', data)
          }
        } else {
          setEventID(eid)
        }

        if (!eid) return

        // 查已購清單
        const avail = await fetch(`${API}/ticket/availability`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ event_id: eid })
        })
        if (!avail.ok) {
          const t = await avail.text()
          console.error('availability 錯誤', avail.status, t)
        } else {
          const j = await avail.json()
          setPurchased(j.purchased || [])
        }

        // 嘗試還原（自動展開之前鎖的座位 & 倒數）
        const restore = await fetch(`${API}/ticket/restore`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({})
        })
        const rj = await restore.json()
        if (rj?.status && Array.isArray(rj.seat)) {
          const [rid, area, row, column] = rj.seat
          if (Number(rid) === Number(eid)) {
            setSelected({ area: reverseAreaMap(area), row, col: column, disabled: false })
            setRestoring(true)
            setRestoreLeftSec(rj.time ?? 0)
            lockedSeatRef.current = { event_id: eid, area, row, column }
          }
        }
      } catch (e) {
        console.error('init error', e)
      }
    }

    init()
    return () => { cancelled = true }
  }, [qEventId, qTitle])

  // 還原倒數計時
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

  // 離開頁面自動釋放
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

  const reverseAreaMap = (displayName) => {
    // 從中文顯示名找回 id（還原用）
    const found = Object.entries(areaMap).find(([, zh]) => zh === displayName)
    return found ? found[0] : displayName
  }

  const handleSelect = async (seat) => {
    if (seat.disabled || !eventID) return

    // 一人一票檢查
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

    // 鎖座位（原子鎖）
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

    // 鎖成功才標記選取 & 保存 lockedSeat
    setSelected(seat)
    lockedSeatRef.current = {
      event_id: eventID,
      area: areaMap[seat.area] || seat.area,
      row: seat.row,
      column: seat.col
    }
    setRestoring(true)
    setRestoreLeftSec(lockRes.expire_seconds ?? 0)
  }

  const handleSubmit = () => {
    if (!selected) return alert('請先選擇一個座位')
    setShowConfirm(true)
  }

  const cancelLock = async () => {
    if (!lockedSeatRef.current) return
    const { event_id, area, row, column } = lockedSeatRef.current
    const cancel = await fetch(`${API}/ticket/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ event_id, area, row, column })
    }).then(r => r.json())
    if (!cancel?.status) {
      console.warn('取消鎖票失敗：', cancel?.notify)
    }
    lockedSeatRef.current = null
  }

  const confirmSubmit = async () => {
    if (!selected || !eventID) return
    if (!verifyCode) return alert('請輸入驗證碼')

    // 後端 /ticket 期望直接拿欄位，不要包 payload
    const body = {
      event_id: eventID,
      area: areaMap[selected.area] || selected.area,
      row: selected.row,
      column: selected.col,
      totpcode_input: verifyCode
    }

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

      const avail = await fetch(`${API}/ticket/availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ event_id: eventID })
      }).then(r => r.json())
      setPurchased(avail.purchased || [])
    } else {
      alert(data.notify || '購票失敗')
    }
  }

  const isDisabled = (area, row, col) =>
    purchased.some(
      ([dbArea, dbRow, dbCol]) =>
        dbArea === (areaMap[area] || area) && Number(dbRow) === row && Number(dbCol) === col
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
                disabled={used}
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
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          onClick={handleSubmit}
          disabled={!selected}
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
