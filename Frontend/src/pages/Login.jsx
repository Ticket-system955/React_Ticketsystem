import { useState } from 'react'
import { useNavigate, Link} from 'react-router-dom'

export default function Login({ setTab,setIsLoggedIn }) {
  const [login_id, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    const res = await fetch("https://reactticketsystem-production.up.railway.app/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login_id, password }),
      credentials: "include"
    })

  const data = await res.json()
    if (data.status) {
      alert(data.notify || "登入成功！")
      setIsLoggedIn(true)
      window.dispatchEvent(new Event('loginChange'))
      navigate ('/')
  } else {
    alert(data.notify || "登入失敗")
  }
}
  return (
    <div className="max-w-md mx-auto mt-2 p-6 bg-white rounded shadow border border-gray-300">
      <h2 className="text-xl font-bold text-center mb-6">請先登入會員方可購票及使用會員服務</h2>

      <form onSubmit={handleSubmit} className="space-y-4 text-sm text-gray-700">
        <div className="flex items-center">
          <label className="w-20 text-red-600 font-bold">＊帳號：</label>
          <input
            type="text"
            placeholder="身分證字號、護照或台灣通行證號碼"
            className="flex-1 border px-3 py-2 rounded border-gray-400"
            value={login_id}
            onChange={(e) => setLoginId(e.target.value)}
            required
          />
        </div>

        <div className="flex items-center">
          <label className="w-20 text-red-600 font-bold">＊密碼：</label>
          <input
            type="password"
            className="flex-1 border px-3 py-2 rounded border-gray-400"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <div className="flex justify-between items-center text-sm text-gray-600 mt-2">
          <Link to="/Auth/ForgotPassword" className="flex items-center gap-1 hover:text-gray-900">
            ❓ 忘記密碼
          </Link>
          <button type="button" onClick={() => setTab('register')} className="hover:text-red-600">
            ➕ 加入會員
          </button>
        </div>

        <div className="flex justify-center gap-4 mt-6">
          <button
            type="reset"
            className="bg-gray-400 text-white px-6 py-2 rounded hover:bg-gray-500"
          >
            重設
          </button>
          <button
            type="submit"
            className="bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700"
          >
            送出
          </button>
        </div>
      </form>
    </div>
  )
}
