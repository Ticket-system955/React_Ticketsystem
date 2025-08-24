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
  const navigate = useNavigate()

  const handlePrepareTOTP = async () => {
    setError(null)
    if (password !== confirmPassword) return setError("密碼不一致")
    if (email !== confirmEmail) return setError("Email 不一致")

    try {
      const res = await fetch("https://reactticketsystem-production.up.railway.app/auth/verify/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
        credentials: "include"
      })

      const data = await res.json()
      if (data.status) {
        setTotpSrc(data.totpsrc)
        setShowTOTP(true)
      } else {
        setError(data.notify || "驗證階段失敗")
      }
    } catch (err) {
      setError("伺服器錯誤，請稍後再試")
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setError(null)

    if (!/^\d{6}$/.test(totpInput)) {
      return setError("請輸入正確的 6 碼驗證碼")
    }

    try {
      const res = await fetch("https://reactticketsystem-production.up.railway.app/auth/verify/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          login_id: loginValue,
          IdType,
          loginType,
          password,
          name: realName,
          gender,
          birthday,
          email,
          phone_number: phone,
          mobile_number: countryCode + mobile,
          address: zipCode + " " + address,
          user_input: totpInput
        }),
        credentials: "include"
      })

      const data = await res.json()
      if (data.status) {
        alert("註冊成功")
        navigate("/login")
      } else {
        setError(data.notify || "註冊失敗")
      }
    } catch (err) {
      setError("伺服器錯誤，請稍後再試")
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
              { label: '男 Male', value: 'male' },
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
          <br/>
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
          <p className="text-xs text-red-600 mt-1">
            （驗證信函將會寄送至您所填寫的電子郵件，請確認填寫）
          </p>
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

          <br/>
      {/* 聯絡地址 Address */}
      <div>
        <label className="block text-sm font-medium">*Address（聯絡地址）:</label>

        {/* 郵遞區號選擇器 */}
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

        {/* 詳細地址輸入 */}
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
              className="w-full border px-3 py-2 rounded"
              placeholder="請輸入 Google Authenticator 產生的驗證碼"
              value={totpInput}
              onChange={(e) => setTotpInput(e.target.value)}
              required
            />
          </div>
        )}

        {error && <p className="text-red-600 text-sm">{error}</p>}

        {!showTOTP ? (
          <button
            type="button"
            className="w-full bg-[#734338] text-white py-2 rounded hover:bg-[#947A6D]"
            onClick={handlePrepareTOTP}
          >
            確認註冊
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
              className="w-full bg-[#734338] text-white py-2 rounded hover:bg-[#947A6D]"
            >
              完成註冊
            </button>
          </>
        )}
      </form>
    </div>
  )
}
