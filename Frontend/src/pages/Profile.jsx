import { useEffect, useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

export default function Profile() {
  const [user, setUser] = useState(null)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get('https://reactticketsystem-production.up.railway.app/profile', {
          withCredentials: true
        })
        if (res.data.status) {
          setUser(res.data.profileData)
        } else {
          navigate('/auth')
        }
      } catch (err) {
        console.error(err)
        navigate('/auth')
      }
    }
    fetchProfile()

  }, [])


  if (!user) return <div className="p-8">載入中...</div>

  return (
    <div className="mt-20 max-w-3xl mx-auto mt-8 bg-white shadow rounded-lg p-6">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <span>👤</span> 會員中心
      </h2>

      <h3 className="text-lg font-semibold text-blue-600 mb-2">📄 個人資訊</h3>
      <table className="w-full border">
        <tbody>
          <tr><td className="border px-4 py-2">帳號/身分證</td><td className="border px-4 py-2">{user.login_id}</td></tr>
          <tr><td className="border px-4 py-2">姓名</td><td className="border px-4 py-2">{user.name}</td></tr>
          <tr><td className="border px-4 py-2">性別</td><td className="border px-4 py-2">{user.gender}</td></tr>
          <tr><td className="border px-4 py-2">生日</td><td className="border px-4 py-2">{user.birthday}</td></tr>
          <tr><td className="border px-4 py-2">電子信箱</td><td className="border px-4 py-2">{user.email}</td></tr>
          <tr><td className="border px-4 py-2">電話號碼</td><td className="border px-4 py-2">{user.phone_number}</td></tr>
          <tr><td className="border px-4 py-2">手機號碼</td><td className="border px-4 py-2">{user.mobile_number}</td></tr>
          <tr><td className="border px-4 py-2">住家地址</td><td className="border px-4 py-2">{user.address}</td></tr>
        </tbody>
      </table>

      <h3 className="text-lg font-semibold text-blue-600 mt-6 mb-2">🎫 訂票紀錄</h3>
      <table className="w-full border">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-4 py-2">活動</th>
            <th className="border px-4 py-2">日期</th>
            <th className="border px-4 py-2">場地</th>
            <th className="border px-4 py-2">座位</th>
          </tr>
        </thead>
          <tbody>
            {user.tickets?.length ? user.tickets.map((ticket, idx) => (
              <tr key={idx}>
                <td className="border px-4 py-2">{ticket.title}</td>
                <td className="border px-4 py-2">{ticket.date}</td>
                <td className="border px-4 py-2">{ticket.location}</td>
                <td className="border px-4 py-2">
                  {ticket.area ? `${ticket.area}區 ` : ''}
                  {ticket.row ? `${ticket.row}排` : ''}   {/* 修正這裡 */}
                  {ticket.column ? `${ticket.column}號` : ''}
                  {!ticket.area && !ticket.row && !ticket.column ? '—' : ''}
                </td>
              </tr>
            )) : (
              <tr>
                <td className="border px-4 py-3 text-center" colSpan={4}>目前沒有訂票紀錄</td>
              </tr>
            )}
          </tbody>
      </table>

      <div className="flex justify-center gap-4 mt-6">
        <button
          onClick={() => navigate('/')}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          🔙 返回首頁
        </button>
        <button
          onClick={async () => {
            await axios.get('https://reactticketsystem-production.up.railway.app/auth/logout', {
              withCredentials: true
            })
            navigate('/')
          }}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
        >
          🚪 登出
        </button>
      </div>
    </div>
  )
}
