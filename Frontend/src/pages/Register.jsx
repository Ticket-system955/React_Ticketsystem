import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import zipcodeData from '../data/zipcode.json'
import countryCodes from '../data/country_codes.json'

export default function Register() {
  const [loginType, setLoginType] = useState('id')
  const [IdType, setIdType] = useState('')
  const [loginValue, setLoginValue] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [realName, setRealName] = useState('')
  const [gender, setGender] = useState('')
  const [birthday, setBirthday] = useState('')
  const [email, setEmail] = useState('')
  const [confirmEmail, setConfirmEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [mobile, setMobile] = useState('')
  const [countryCode, setCountryCode] = useState('+886')
  const [zipCode, setZipCode] = useState('')
  const [address, setAddress] = useState('')
  const [error, setError] = useState(null)
  const [totpInput, setTotpInput] = useState('')
  const [showTOTP, setShowTOTP] = useState(false)
  const [totpSrc, setTotpSrc] = useState('')

  const [loadingInit, setLoadingInit] = useState(false)
  const [loadingSubmit, setLoadingSubmit] = useState(false)

  const navigate = useNavigate()

  const normalizeEmail = (s) => (s || '').trim().toLowerCase()
  const normalizeMobile = (cc, m) =>
    cc === '+886' ? cc + (m || '').replace(/^0/, '') : cc + (m || '')

  const handlePrepareTOTP = async () => {
    if (loadingInit) return
    setLoadingInit(true)
    setError(null)

    if (password !== confirmPassword) {
      setLoadingInit(false)
      return setError('密碼不一致')
    }
    if (email !== confirmEmail) {
      setLoadingInit(false)
      return setError('Email 不一致')
    }

    try {
      const res = await fetch('https://reactticketsystem-production.up.railway.app/auth/verify/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizeEmail(email) }),
        credentials: 'include'
      })

      let data = {}
      try { data = await res.json() } catch {}

      if (res.ok && data.status === true) {
        const src = (data.totpsrc || '').startsWith('data:')
          ? data.totpsrc
          : `data:image/png;base64,${data.totpsrc || ''}`

        if (!src || src === 'data:image/png;base64,') {
          setError('伺服器未回傳 QR Code')
        } else {
          setTotpSrc(src)
          setShowTOTP(true)
        }
      } else {
        setError(data.notify || data.message || data.error || `驗證階段失敗 (${res.status})`)
      }
    } catch (err) {
      setError(err?.message || '伺服器錯誤，請稍後再試')
    } finally {
      setLoadingInit(false)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    if (loadingSubmit) return
    setLoadingSubmit(true)
    setError(null)

    if (!/^\d{6}$/.test(totpInput)) {
      setLoadingSubmit(false)
      return setError('請輸入正確的 6 碼驗證碼')
    }

    try {
      const res = await fetch('https://reactticketsystem-production.up.railway.app/auth/verify/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          login_id: (loginValue || '').trim(),
          IdType,
          loginType,
          password, 
          name: (realName || '').trim(),
          gender,
          birthday,
          email: normalizeEmail(email),
          phone_number: (phone || '').trim(),
          mobile_number: normalizeMobile(countryCode, mobile),
          address: zipCode ? `${zipCode} ${(address || '').trim()}` : (address || '').trim(),
          user_input: totpInput
        }),
        credentials: 'include'
      })

      let data = {}
      try { data = await res.json() } catch {}

      if (res.ok && data.status === true) {
        alert('註冊成功')
        navigate('/login')
      } else {
        setError(data.notify || data.message || data.error || `註冊失敗 (${res.status})`)
      }
    } catch (err) {
      setError(err?.message || '伺服器錯誤，請稍後再試')
    } finally {
      setLoadingSubmit(false)
    }
  }

  return (
    <div className="max-w-md mx-auto mt-2 p-6 bg-white rounded shadow">
      <h1 className="text-2xl font-bold mb-4">註冊帳號</h1>
      <form onSubmit={handleRegister} className="space-y-4">

        <div>
          <label className="block text-sm font-medium">*Login ID（帳號）:</label>
          <div className="flex items-start space-x-6 mt-1 mb-2">
            <label className="flex flex-col text-sm text-[#734338]">
              <span className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="loginType"
                  value="id"
                  checked={loginType === 'id'}
                  onChange={(e) => setLoginType(e.target.value)}
                />
                <span>身分證字號</span>
              </span>
              <p className="text-xs text-red-600 ml-6">(本國人士)</p>
            </label>

            <label className="flex flex-col text-sm text-[#734338]">
              <span className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="loginType"
                  value="passport"
                  checked={loginType === 'passport'}
                  onChange={(e) => setLoginType(e.target.value)}
                />
                <span>護照或居留證號碼</span>
              </span>
              <p className="text-xs text-red-600 ml-6">(非本國人士)</p>
            </label>
          </div>

          <div className="flex space-x-2">
            <input
              type="text"
              className="flex-1 border px-3 py-2 rounded"
              placeholder={loginType === 'id' ? '請輸入身分證字號' : '請輸入護照/居留證號碼'}
              value={loginValue}
              onChange={(e) => setLoginValue(e.target.value)}
              required
            />

            {loginType === 'id' && (
              <select
                className="w-32 border px-2 py-2 rounded"
                value={IdType}
                onChange={(e) => setIdType(e.target.value)}
                required
              >
                <option value="">請選擇類別</option>
                <option value="initial">初發</option>
                <option value="reissue">補發</option>
                <option value="renewal">換發</option>
              </select>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium">*Password（密碼）:</label>
          <input
            type="password"
            className="w-full border px-3 py-2 rounded"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium">*Confirm Password（確認密碼）:</label>
          <input
            type="password"
            className="w-full border px-3 py-2 rounded"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium">*Name（會員姓名）:</label>
          <input
            type="text"
            className="w-full border px-3 py-2 rounded"
            value={realName}
            onChange={(e) => setRealName(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Gender（性別）:</label>
          <div className="flex flex-wrap gap-x-6 mt-1">
            {[
              { label: '女 Female', value: 'female' },
              { label: '男 Male', value: 'male' }
            ].map(opt => (
              <label key={opt.value} className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="gender"
                  value={opt.value}
                  checked={gender === opt.value}
                  onChange={(e) => setGender(e.target.value)}
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium">*Birthday（生日）:</label>
          <br />
          <input
            type="date"
            className="w-full border px-3 py-2 rounded"
            value={birthday}
            onChange={(e) => setBirthday(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium">*Email（電子郵件）:</label>
          <input
            type="email"
            className="w-full border px-3 py-2 rounded"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <p className="text-xs text-red-600 mt-1">（驗證信函將會寄送至您所填寫的電子郵件，請確認填寫）</p>
        </div>

        <div>
          <label className="block text-sm font-medium">*Confirm Email（確認電子郵件）:</label>
          <input
            type="email"
            className="w-full border px-3 py-2 rounded"
            value={confirmEmail}
            onChange={(e) => setConfirmEmail(e.target.value)}
            required
          />
          <p className="text-xs text-red-600 mt-1">請再次確認電子郵件是否正確。</p>
        </div>

        <div>
          <label className="block text-sm font-medium">Phone number（聯絡電話）:</label>
          <input
            type="tel"
            className="w-full border px-3 py-2 rounded"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium">*Mobile Phone（手機號碼）:</label>
          <div className="flex space-x-2">
            <select
              className="border px-3 py-2 rounded"
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
            >
              {countryCodes.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.country} ({item.code})
                </option>
              ))}
            </select>
            <input
              type="tel"
              className="flex-1 border px-3 py-2 rounded"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium">*Address（聯絡地址）:</label>

          <select
            className="w-full border px-3 py-2 rounded mb-2"
            value={zipCode}
            onChange={(e) => setZipCode(e.target.value)}
            required
          >
            <option value="">請選擇郵遞區號</option>
            {zipcodeData.map((item) => (
              <option key={item.zip} value={item.zip}>
                {item.zip} {item.area}
              </option>
            ))}
          </select>

          <input
            type="text"
            className="w-full border px-3 py-2 rounded"
            placeholder="請輸入地址（市/縣、區、街/路/號）"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
          />

          <p className="text-xs text-red-600 mt-1">
            非台灣會員請選擇「999其他」，並自行輸入詳細地址。<br />
            使用郵局、郵箱者請於地址後方註明（郵箱/手機號碼）以利郵寄通知。
          </p>
          <br />
        </div>

        {showTOTP && (
          <div>
            <label className="block text-sm font-medium">*驗證碼（6 碼 TOTP）:</label>
            <input
              type="text"
              inputMode="numeric"
              className="w-full border px-3 py-2 rounded tracking-widest text-center"
              placeholder="請輸入 6 碼驗證碼"
              value={totpInput}
              onChange={(e) => setTotpInput(e.target.value.replace(/\D/g, ''))}
              required
            />
            <p className="text-xs text-gray-500 mt-1">建議於 30 秒內輸入，過期請重按「確認註冊」更新 QR。</p>
          </div>
        )}

        {error && <p className="text-red-600 text-sm">{error}</p>}

        {!showTOTP ? (
          <button
            type="button"
            className="w-full bg-[#734338] text-white py-2 rounded hover:bg-[#947A6D] disabled:opacity-60"
            onClick={handlePrepareTOTP}
            disabled={loadingInit}
          >
            {loadingInit ? '處理中...' : '確認註冊'}
          </button>
        ) : (
          <>
            {totpSrc && (
              <div className="text-center my-4">
                <p className="text-sm text-gray-600 mb-2">請使用 Google Authenticator 掃描 QR Code 並輸入驗證碼：</p>
                <img src={totpSrc} alt="TOTP QR Code" className="mx-auto w-40 h-40" />
              </div>
            )}
            <button
              type="submit"
              className="w-full bg-[#734338] text-white py-2 rounded hover:bg-[#947A6D] disabled:opacity-60"
              disabled={loadingSubmit}
            >
              {loadingSubmit ? '送出中...' : '完成註冊'}
            </button>
          </>
        )}
      </form>
    </div>
  )
}
