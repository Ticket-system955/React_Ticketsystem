import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import AuthPage from './pages/Auth'
import ConcertList from './pages/ConcertList'
import SearchPage from './pages/SearchPage'
import Concert from './pages/Concert'
import Ticket from './pages/Ticket'
import Profile from './pages/Profile'
import Login from './pages/Login'
import Cart from './pages/Shoppingcart'
//import Register from './pages/Register'

export default function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/concert-list" element={<ConcertList />} /> 
        <Route path="/search" element={<SearchPage />} />
        <Route path="/concert/:id" element={<Concert />} />
        <Route path="/ticket/:id" element={<Ticket />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/shoppingcart" element={<Cart />} />
      </Routes>
    </Router>
  )
}
