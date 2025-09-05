import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function ShoppingCart() {
  const [cartItems, setCartItems] = useState([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const navigate = useNavigate();

  // 載入購物車資料與登入狀態
  useEffect(() => {
    const stored = localStorage.getItem('cart');
    if (stored) {
      setCartItems(JSON.parse(stored));
    }
    fetch('https://reactticketsystem-production.up.railway.app/auth/login/check', {
      credentials: 'include',
    })
      .then(res => res.json())
      .then(data => setIsLoggedIn(data.logged_in || false))
      .catch(() => setIsLoggedIn(false));
  }, []);

  // 移除單一項目
  function handleRemove(index) {
    const updated = cartItems.filter((_, i) => i !== index);
    setCartItems(updated);
    localStorage.setItem('cart', JSON.stringify(updated));
  }

  return (
    <div className="pt-20 px-6 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-semibold mb-6">演唱會收藏</h1>

      {cartItems.length === 0 ? (
        <div className="text-gray-600">你的演唱會收藏是空的。</div>
      ) : (
        <div className="space-y-6">
          {cartItems.map((item, idx) => (
            <div
              key={idx}
              className="bg-white p-4 rounded shadow flex items-center justify-between"
            >
              <div className="flex items-center space-x-4">
                {/* 歌手照片 */}
                <img
                  src={item.img}
                  alt={item.name}
                  className="w-24 h-24 object-cover rounded"
                />
                <div>
                  {/* 歌手名字 */}
                  <h2 className="text-xl font-medium">{item.name}</h2>
                  {/* 演唱會時間 */}
                  {item.date && (
                    <p className="text-sm text-gray-500">時間: {item.date}</p>
                  )}
                  {/* 地點 */}
                  {item.location && (
                    <p className="text-sm text-gray-500">地點: {item.location}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <button
                  onClick={() =>
                    isLoggedIn
                      ? navigate(`/ticket/${item.id}`)
                      : navigate(`/auth?redirect=/ticket/${item.id}`)
                  }
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Buy Tickets ↗
                </button>
                <button
                  onClick={() => handleRemove(idx)}
                  className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  移除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
