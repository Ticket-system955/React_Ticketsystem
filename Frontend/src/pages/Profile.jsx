import { useEffect, useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

export default function Profile() {
  const [user, setUser] = useState(null) // 後端 profileData 物件
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const controller = new AbortController()

    ;(async () => {
      try {
        const res = await axios.get(
          'https://reactticketsystem-production.up.railway.app/profile/full',
          { withCredentials: true, signal: controller.signal }
        )
        if (res.data?.status) {
          setUser(res.data.profileData) // 後端鍵為 profileData
        } else {
          // 不是 401 但 status=false
          setError(res.data?.notify || '取得會員資料失敗')
        }
      } catch (err) {
        // 若是未登入，後端通常回 401
        if (axios.isAxiosError(err) && err.response?.status === 401) {
          navigate('/auth')
          return
        }
        console.error(err)
        setError('載入失敗，請稍後再試')
      }
    })()

    return () => controller.abort()
  }, [navigate])

  if (error) {
    return (
      <div className="mt-20 max-w-3xl mx-auto bg-white shadow rounded-lg p-6">
        <p className="text-red-600">{error}</p>
        <div className="mt-4">
          <button
            onClick={() => navigate('/')}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            返回首頁
          </button>
        </div>
      </div>
    )
  }

  if (!user) return <div className="p-8">載入中...</div>

  // 欄位保險處理
  const {
    login_id,
    name,
    gender,
    birthday,
    email,
    phone_number,
    mobile_number,
    address,
    tickets = [],
  } = user

  const genderText =
    gender === 'M' || gender === 'Male' ? '男' :
    gender === 'F' || gender === 'Female' ? '女' :
    (gender || '—')

  const formatDate = (d) => {
    if (!d) return '—'
    try {
      // 若後端是 YYYY-MM-DD，可直接顯示或本地格式化
      return new Date(d).toLocaleDateString('zh-TW')
    } catch { return d }
  }

  return (
    <div className="mt-20 max-w-3xl mx-auto bg-white shadow rounded-lg p-6">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <span>👤</span> 會員中心
      </h2>

      <h3 className="text-lg font-semibold text-blue-600 mb-2">📄 個人資訊</h3>
      <table className="w-full border text-sm">
        <tbody>
          <tr><td className="border px-4 py-2">帳號/身分證</td><td className="border px-4 py-2">{login_id || '—'}</td></tr>
          {/* 密碼不顯示 */}
          <tr><td className="border px-4 py-2">姓名</td><td className="border px-4 py-2">{name || '—'}</td></tr>
          <tr><td className="border px-4 py-2">性別</td><td className="border px-4 py-2">{genderText}</td></tr>
          <tr><td className="border px-4 py-2">生日</td><td className="border px-4 py-2">{formatDate(birthday)}</td></tr>
          <tr><td className="border px-4 py-2">電子信箱</td><td className="border px-4 py-2">{email || '—'}</td></tr>
          <tr><td className="border px-4 py-2">電話號碼</td><td className="border px-4 py-2">{phone_number || '—'}</td></tr>
          <tr><td className="border px-4 py-2">手機號碼</td><td className="border px-4 py-2">{mobile_number || '—'}</td></tr>
          <tr><td className="border px-4 py-2">住家地址</td><td className="border px-4 py-2">{address || '—'}</td></tr>
        </tbody>
      </table>

      <h3 className="text-lg font-semibold text-blue-600 mt-6 mb-2">🎫 訂票紀錄</h3>
      <table className="w-full border text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-4 py-2">活動</th>
            <th className="border px-4 py-2">日期</th>
            <th className="border px-4 py-2">場地</th>
            <th className="border px-4 py-2">座位</th>
          </tr>
        </thead>
        <tbody>
          {tickets.length === 0 ? (
            <tr>
              <td className="border px-4 py-3 text-center" colSpan={4}>目前沒有訂票紀錄</td>
            </tr>
          ) : (
            tickets.map((t, idx) => (
              <tr key={idx}>
                {/* 後端欄位：title/date/location/area/row/column */}
                <td className="border px-4 py-2">{t.title || '—'}</td>
                <td className="border px-4 py-2">{formatDate(t.date)}</td>
                <td className="border px-4 py-2">{t.location || '—'}</td>
                <td className="border px-4 py-2">
                  {t.area ? `${t.area}區 ` : ''}
                  {Number.isFinite(Number(t.row)) ? `${t.row}排` : ''}
                  {Number.isFinite(Number(t.column)) ? `${t.column}號` : ''}
                  {!t.area && !t.row && !t.column ? '—' : ''}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div className="flex justify-center gap-4 mt-6">
        <button
          onClick={() => navigate('/')}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          返回首頁
        </button>
        <button
          onClick={async () => {
            try {
              await axios.get('https://reactticketsystem-production.up.railway.app/auth/logout', {
                withCredentials: true
              })
            } finally {
              // 若你的 Navbar 依賴 localStorage，可在這裡一併清掉
              localStorage.removeItem('auth_status')
              navigate('/')
            }
          }}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
        >
          登出
        </button>
      </div>
    </div>
  )
}
