import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import image from '../assets/image'


export default function Navbar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  const navigate = useNavigate()
  const location = useLocation()


 useEffect(() => {
  const check = async () => {
    try {
  const res = await fetch('https://reactticketsystem-production.up.railway.app/check_login', {
        credentials: 'include' 
      })
      const data = await res.json()
      setIsLoggedIn(data.logged_in || false)
    } catch (err) {
      console.error('登入檢查失敗:', err)
      setIsLoggedIn(false)
    }
  }

  check()

  const handleStorageChange = () => {
    check()
  }

  window.addEventListener('loginChange', handleStorageChange)
  return () => {
    window.removeEventListener('loginChange', handleStorageChange)
  }
}, [])


  useEffect(() => {
  const shouldLockScroll = isSearchOpen || isMenuOpen;
  document.body.style.overflow = shouldLockScroll ? 'hidden' : 'auto';

  return () => {
    document.body.style.overflow = 'auto';
  };
  }, [isSearchOpen, isMenuOpen]);

  useEffect(() => {
    setIsMenuOpen(false) 
  }, [location])

  const handleCartClick = () => {
    setIsSearchOpen(false)
    setIsMenuOpen(false)
    navigate(isLoggedIn ? '/shoppingcart' : '/auth')
  }  

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#D7C4BB] px-6 py-3 flex justify-between items-center shadow">
      <Link to="/" className="px-8 text-xl font-bold text-[#734338]">Live Band</Link>

      <div className="hidden md:flex gap-8 text-[#734338] font-medium">
        <Link to="/concert-list" className="hover:text-[#947A6D]">演唱會資訊</Link>
        <Link to="/tickets" className="hover:text-[#947A6D]">最新消息</Link>
        <Link to="/profile" className="hover:text-[#947A6D]">會員資訊</Link>
      </div>

      <div className="flex items-center gap-4">

        {!/^\/auth/.test(location.pathname) && location.pathname !== '/shoppingcart' && (

          <form
            onSubmit={(e) => {
              e.preventDefault()
              const keyword = e.target.keyword.value.trim()
              if (keyword) navigate(`/search?keyword=${encodeURIComponent(keyword)}`)
            }}
            className="hidden md:flex items-center gap-2"
          >

            <input
              type="text"
              name="keyword"
              placeholder="搜尋演唱會"
              className="px-2 py-1 border rounded text-sm"
            />
            <button type="submit" className="text-sm bg-[#734338] text-white px-2 py-1 rounded hover:bg-[#947A6D]">
              <img src={image.search} alt="search" className="w-4 h-4" />
            </button>
          </form>
        )}

          {isLoggedIn ? (
            <button
            onClick={async () => {
              await fetch('https://reactticketsystem-production.up.railway.app/auth/logout', {
                credentials: 'include'
              })
              setIsLoggedIn(false)
              window.dispatchEvent(new Event('loginChange'))
              navigate('/')
            }}
            >
              <img src={image.logout} alt="Logout" className="w-6 h-6 hover:opacity-80" />
            </button>
          ) : (
            <Link to="/auth">
              <img src={image.account} alt="Account" className="w-6 h-6 hover:opacity-80" />
            </Link>
          )}

        <button onClick={handleCartClick}>
          <img src={image.cart} alt="Cart" className="w-6 h-6 hover:opacity-80" />
        </button>   

        {!/^\/auth/.test(location.pathname) && location.pathname !== '/shoppingcart' && (

          <button className="md:hidden" onClick={() => {setIsSearchOpen(!isSearchOpen); setIsMenuOpen(false);}}>
            <img src={image.search} alt="search" className="w-5 h-5" />
          </button>
        )}
            {isSearchOpen && (
              <div
                className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center"
                onClick={() => setIsSearchOpen(false)} 
              >
                <form
                  onClick={(e) => e.stopPropagation()} 
                  onSubmit={(e) => {
                    e.preventDefault()
                    const keyword = e.target.keyword.value.trim()
                    if (keyword) {
                      navigate(`/search?keyword=${encodeURIComponent(keyword)}`)
                      setIsMenuOpen(false)
                    }
                  }}
                  className="md:hidden bg-white p-6 rounded shadow-md w-11/12 max-w-md"
                >
                  <h2 className="text-lg font-semibold mb-2 text-center">搜尋演唱會</h2>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      name="keyword"
                      placeholder="輸入關鍵字"
                      className="flex-1 px-3 py-2 border rounded"
                    />
                    <button
                      type="submit"
                      className="bg-[#734338] text-white px-4 py-2 rounded hover:bg-[#947A6D]"
                    >
                      搜尋
                    </button>
                  </div>
                </form>
              </div>
            )}

        <button className="md:hidden" 
                onClick={() => {
                  setIsMenuOpen(!isMenuOpen) 
                  setIsSearchOpen(false)}}>
          <img src={image.right} alt="Menu" className="w-6 h-6" />
        </button>
      </div>

      {isMenuOpen && (
        <div className="fixed inset-0 top-[50px] z-50 bg-white p-6 md:hidden overflow-y-auto">
          <div className="space-y-4">

            <Link to="/concert-list" className="block px-4 py-2 text-[#734338] hover:bg-[#D7C4BB]">演唱會資訊</Link>
            <Link to="/ticket-info" className="block px-4 py-2 text-[#734338] hover:bg-[#D7C4BB]">最新消息</Link>
            <Link to="/profile" className="block px-4 py-2 text-[#734338] hover:bg-[#D7C4BB]">會員資訊</Link>

          </div>
        </div>
      )}

    </nav>
  )
}